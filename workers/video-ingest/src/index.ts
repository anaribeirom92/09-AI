import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as tus from "tus-js-client";
import { createWriteStream, createReadStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const BUCKET = "09-video-ai";
const POLL_MS = Number(process.env.POLL_INTERVAL_MS ?? 4000);
const MAX_CONCURRENT = Math.max(1, Number(process.env.WORKER_CONCURRENCY ?? 1));
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

type VideoJob = {
  id: string;
  organization_id: string;
  project_id: string;
  job_type: string;
  payload: { asset_id?: string; storage_path?: string };
  attempt_count: number;
  max_attempts: number;
};

type Probe = {
  format?: { duration?: string; format_name?: string; size?: string; bit_rate?: string };
  streams?: Array<{
    codec_type?: string; codec_name?: string; width?: number; height?: number;
    r_frame_rate?: string; sample_rate?: string; channels?: number;
  }>;
};

function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", chunk => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(stdout) : reject(new Error(stderr.slice(-5000) || command + " terminou com código " + code)));
  });
}

async function downloadToFile(client: SupabaseClient, storagePath: string, target: string) {
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(storagePath, 300);
  if (error || !data?.signedUrl) throw error ?? new Error("Não foi possível gerar URL temporária do original.");
  const response = await fetch(data.signedUrl);
  if (!response.ok || !response.body) throw new Error("Falha ao baixar o original: HTTP " + response.status);
  await pipeline(response.body, createWriteStream(target));
}

function uploadTus(filePath: string, storagePath: string, contentType: string): Promise<void> {
  const projectRef = new URL(supabaseUrl!).hostname.split(".")[0];
  const endpoint = `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
  return new Promise(async (resolve, reject) => {
    try {
      const fileStats = await stat(filePath);
      const upload = new tus.Upload(createReadStream(filePath), {
        endpoint,
        uploadSize: fileStats.size,
        chunkSize: 6 * 1024 * 1024,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: { authorization: `Bearer ${serviceKey}`, apikey: serviceKey!, "x-upsert": "false" },
        metadata: { bucketName: BUCKET, objectName: storagePath, contentType, cacheControl: "3600" },
        onError: reject,
        onSuccess: () => resolve()
      });
      upload.start();
    } catch (error) { reject(error); }
  });
}


async function claimJob(): Promise<VideoJob | null> {
  const { data: candidate, error: selectError } = await supabase
    .from("video_jobs")
    .select("id,organization_id,project_id,job_type,payload,attempt_count,max_attempts")
    .eq("status", "queued")
    .eq("job_type", "ingest")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (selectError) throw selectError;
  if (!candidate) return null;

  // Conditional UPDATE is the atomic claim: only one worker can move queued -> running.
  const { data, error } = await supabase.from("video_jobs")
    .update({ status: "running", started_at: new Date().toISOString(), attempt_count: candidate.attempt_count + 1, last_error: null })
    .eq("id", candidate.id)
    .eq("status", "queued")
    .select("id,organization_id,project_id,job_type,payload,attempt_count,max_attempts")
    .maybeSingle();
  if (error) throw error;
  return data as VideoJob | null;
}

async function finishJob(job: VideoJob, result: Record<string, unknown>) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("video_jobs").update({
    status: "succeeded", result, finished_at: now, last_error: null
  }).eq("id", job.id).eq("status", "running");
  if (error) throw error;
  await supabase.from("video_projects").update({ status: "analyzing", updated_at: now }).eq("id", job.project_id);
}

async function failJob(job: VideoJob, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const terminal = job.attempt_count >= job.max_attempts;
  await supabase.from("video_jobs").update({
    status: terminal ? "failed" : "queued",
    last_error: message.slice(0, 4000),
    finished_at: terminal ? new Date().toISOString() : null
  }).eq("id", job.id).eq("status", "running");
  if (terminal) await supabase.from("video_projects").update({ status: "failed" }).eq("id", job.project_id);
}

async function processJob(job: VideoJob) {
  const storagePath = job.payload.storage_path;
  const assetId = job.payload.asset_id;
  if (!storagePath || !assetId) throw new Error("Job sem asset_id ou storage_path.");
  const workDir = await mkdtemp(join(tmpdir(), "09-video-"));
  try {
    const original = join(workDir, "original" + (extname(storagePath) || ".bin"));
    const thumbnail = join(workDir, "thumbnail.jpg");
    const proxy = join(workDir, "proxy.mp4");
    await downloadToFile(supabase, storagePath, original);

    const probeRaw = await run("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", original]);
    const probe = JSON.parse(probeRaw) as Probe;
    const duration = Number(probe.format?.duration ?? 0);
    const videoStream = probe.streams?.find(stream => stream.codec_type === "video");
    const audioStream = probe.streams?.find(stream => stream.codec_type === "audio");
    if (!videoStream && !audioStream) throw new Error("O arquivo não contém uma faixa de áudio ou vídeo reconhecível.");

    const thumbnailPath = videoStream ? `${job.project_id}/${randomUUID()}/thumbnail.jpg` : null;
    const proxyPath = videoStream ? `${job.project_id}/${randomUUID()}/proxy.mp4` : null;
    if (videoStream) {
      const seek = Math.max(0, Math.min(duration * 0.1, Math.max(0, duration - 0.1)));
      await run("ffmpeg", ["-y", "-ss", String(seek), "-i", original, "-frames:v", "1", "-vf", "scale='min(640,iw)':-2", "-q:v", "4", thumbnail]);
      await run("ffmpeg", ["-y", "-i", original, "-vf", "scale='min(960,iw)':-2", "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", proxy]);
      await uploadTus(thumbnail, thumbnailPath!, "image/jpeg");
      await uploadTus(proxy, proxyPath!, "video/mp4");
    }

    const baseMetadata = {
      duration_ms: Math.round(duration * 1000),
      source_format: probe.format?.format_name ?? null,
      video: videoStream ? { codec: videoStream.codec_name ?? null, width: videoStream.width ?? null, height: videoStream.height ?? null, frame_rate: videoStream.r_frame_rate ?? null } : null,
      audio: audioStream ? { codec: audioStream.codec_name ?? null, sample_rate: audioStream.sample_rate ?? null, channels: audioStream.channels ?? null } : null
    };
    const assets = [];
    if (thumbnailPath) assets.push({ id: randomUUID(), organization_id: job.organization_id, project_id: job.project_id, kind: "thumbnail", storage_path: thumbnailPath, original_filename: "thumbnail.jpg", mime_type: "image/jpeg", size_bytes: (await stat(thumbnail)).size, duration_ms: null, metadata: { generated_by: "ingest_worker", source_asset_id: assetId }, created_by: null });
    if (proxyPath) assets.push({ id: randomUUID(), organization_id: job.organization_id, project_id: job.project_id, kind: "proxy", storage_path: proxyPath, original_filename: "proxy.mp4", mime_type: "video/mp4", size_bytes: (await stat(proxy)).size, duration_ms: Math.round(duration * 1000), metadata: { generated_by: "ingest_worker", source_asset_id: assetId }, created_by: null });
    if (assets.length) {
      const { error } = await supabase.from("video_assets").insert(assets);
      if (error) throw error;
    }
    const { error: updateError } = await supabase.from("video_assets").update({
      duration_ms: Math.round(duration * 1000), metadata: { ...baseMetadata, ingested_at: new Date().toISOString() }
    }).eq("id", assetId);
    if (updateError) throw updateError;

    await finishJob(job, { asset_id: assetId, ...baseMetadata, thumbnail_path: thumbnailPath, proxy_path: proxyPath });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function loop() {
  console.log("[09-video-ingest] worker online; concurrency=" + MAX_CONCURRENT);
  const active = new Set<Promise<void>>();
  while (true) {
    while (active.size < MAX_CONCURRENT) {
      const job = await claimJob();
      if (!job) break;
      const task = processJob(job)
        .catch(async error => { console.error("[09-video-ingest] job failed", job.id, error); await failJob(job, error); })
        .finally(() => active.delete(task));
      active.add(task);
    }
    if (active.size === 0) await new Promise(resolve => setTimeout(resolve, POLL_MS));
    else await Promise.race([new Promise(resolve => setTimeout(resolve, POLL_MS)), ...active]);
  }
}

loop().catch(error => { console.error("[09-video-ingest] fatal", error); process.exit(1); });