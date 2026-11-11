import { access, copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { parseSilences, type SilenceInterval } from "./silence.js";
import { createReviewEditPlan, type ReviewItem } from "./edit-plan.js";

type Aspect = "9:16" | "16:9" | "1:1";
type Options = { input: string; output?: string; aspect: Aspect; height: 720 | 1080 | 1440 | 2160; analyzeOnly: boolean; silenceNoise: string; silenceDuration: number; report?: string; plan?: string };
type ProcessResult = { stdout: string; stderr: string };
function parseArgs(args: string[]): Options {
  const values = new Map<string, string>();
  const flags = new Set(["analyze-only"]);
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key.startsWith("--")) {
      const name = key.slice(2);
      if (flags.has(name)) { values.set(name, "true"); continue; }
      const value = args[i + 1];
      if (!value || value.startsWith("--")) throw new Error("Informe um valor para " + key);
      values.set(name, value); i++;
    }
  }
  const input = values.get("input"), output = values.get("output");
  const analyzeOnly = values.has("analyze-only");
  if (!input || (!output && !analyzeOnly)) throw new Error("Uso: npm start -- --input ./bruto.mp4 --output ./final.mp4 [--aspect 9:16|16:9|1:1] [--height 720|1080|1440|2160] [--analyze-only] [--report ./analise.json] [--plan ./plano-edicao.json]");
  const aspect = (values.get("aspect") ?? "9:16") as Aspect;
  const height = Number(values.get("height") ?? "1080") as Options["height"];
  const silenceDuration = Number(values.get("silence-duration") ?? "0.45");
  if (!["9:16", "16:9", "1:1"].includes(aspect)) throw new Error("Proporção inválida.");
  if (![720, 1080, 1440, 2160].includes(height)) throw new Error("Resolução inválida.");
  if (!Number.isFinite(silenceDuration) || silenceDuration < 0.1 || silenceDuration > 10) throw new Error("Duração mínima de silêncio deve estar entre 0.1 e 10 segundos.");
  return { input: resolve(input), output: output ? resolve(output) : undefined, aspect, height, analyzeOnly, silenceNoise: values.get("silence-noise") ?? "-35dB", silenceDuration, report: values.get("report") ? resolve(values.get("report")!) : undefined, plan: values.get("plan") ? resolve(values.get("plan")!) : undefined };
}
function run(command: string, args: string[]): Promise<ProcessResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.setEncoding("utf8").on("data", chunk => stdout += chunk);
    child.stderr.setEncoding("utf8").on("data", chunk => stderr += chunk);
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolvePromise({ stdout, stderr }) : reject(new Error(stderr.slice(-5000) || command + " falhou (" + code + ")")));
  });
}
async function analyze(options: Options, probe: { format?: { duration?: string; format_name?: string }; streams?: Array<{ codec_type?: string; width?: number; height?: number; codec_name?: string; sample_rate?: string; channels?: number; side_data_list?: Array<{ rotation?: number }> }> }) {
  const video = probe.streams?.find(stream => stream.codec_type === "video");
  if (!video) throw new Error("O arquivo não contém uma faixa de vídeo.");
  const audioStream = probe.streams?.find(stream => stream.codec_type === "audio");
  let silences: SilenceInterval[] = [];
  if (audioStream) {
    const result = await run("ffmpeg", ["-hide_banner", "-i", options.input, "-vn", "-af", `silencedetect=noise=${options.silenceNoise}:d=${options.silenceDuration}`, "-f", "null", "-"]);
    silences = parseSilences(result.stderr, Number(probe.format?.duration ?? 0));
  }
  const duration = Number(probe.format?.duration ?? 0);
  const totalSilence = silences.reduce((sum, item) => sum + item.duration, 0);
  return {
    schema_version: 1,
    status: "analysis_only",
    input: basename(options.input),
    duration_seconds: duration,
    source: { format: probe.format?.format_name ?? null, width: video.width ?? null, height: video.height ?? null, rotation_degrees: video.side_data_list?.find(item => typeof item.rotation === "number")?.rotation ?? 0, video_codec: video.codec_name ?? null, audio: audioStream ? { codec: audioStream.codec_name ?? null, sample_rate: audioStream.sample_rate ?? null, channels: audioStream.channels ?? null } : null },
    audio_analysis: { silence_threshold: options.silenceNoise, minimum_silence_seconds: options.silenceDuration, detected_silence_count: silences.length, total_detected_silence_seconds: Number(totalSilence.toFixed(3)), intervals: silences },
    edit_suggestions: silences.map((item, index) => ({ id: `silence-${index + 1}`, type: "review_pause", start_seconds: item.start, end_seconds: item.end, duration_seconds: item.duration, automatic_cut: false, note: "Revisar contexto antes de remover; pode ser uma pausa natural de fala." })),
    safety: { source_modified: false, automatic_cuts_applied: false, temporary_media_created: false }
  };
}
async function main() {
  const options = parseArgs(process.argv.slice(2));
  await access(options.input);
  if (options.output && options.input === options.output) throw new Error("O arquivo de saída não pode sobrescrever o original.");
  if (options.report && options.input === options.report) throw new Error("O relatório não pode sobrescrever o vídeo original.");
  if (options.plan && !options.analyzeOnly) throw new Error("A geração de plano exige --analyze-only.");
  if (options.plan && options.input === options.plan) throw new Error("O plano não pode sobrescrever o vídeo original.");
  if (options.plan && options.report && options.plan === options.report) throw new Error("Relatório e plano precisam de caminhos diferentes.");
  const probeResult = await run("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", options.input]);
  const probe = JSON.parse(probeResult.stdout) as { format?: { duration?: string; format_name?: string }; streams?: Array<{ codec_type?: string; width?: number; height?: number; codec_name?: string; sample_rate?: string; channels?: number; side_data_list?: Array<{ rotation?: number }> }> };
  const analysis = await analyze(options, probe);
  if (options.analyzeOnly) {
    const reportPath = options.report ?? resolve(dirname(options.input), basename(options.input).replace(/\.[^.]+$/, "") + ".09-video-analysis.json");
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, JSON.stringify(analysis, null, 2) + "\n", "utf8");
    let planPath: string | undefined;
    if (options.plan) {
      const plan = createReviewEditPlan({ ...analysis, edit_suggestions: analysis.edit_suggestions as ReviewItem[] }, { aspect: options.aspect, height: options.height });
      await mkdir(dirname(options.plan), { recursive: true });
      await writeFile(options.plan, JSON.stringify(plan, null, 2) + "\n", "utf8");
      planPath = options.plan;
    }
    console.log(JSON.stringify({ ok: true, mode: "analysis", report: reportPath, plan: planPath ?? null, duration_seconds: analysis.duration_seconds, detected_silences: analysis.audio_analysis.detected_silence_count, automatic_cuts_applied: false }, null, 2));
    return;
  }
  const video = probe.streams?.find(stream => stream.codec_type === "video");
  if (!video || !options.output) throw new Error("Não foi possível preparar a renderização.");
  await mkdir(dirname(options.output), { recursive: true });
  const temp = await mkdtemp(resolve(tmpdir(), "09-video-ai-"));
  try {
    const audio = probe.streams?.some(stream => stream.codec_type === "audio");
    const [w, h] = options.aspect === "9:16" ? [9, 16] : options.aspect === "16:9" ? [16, 9] : [1, 1];
    const width = Math.round(options.height * w / h / 2) * 2;
    const scaleCrop = `scale=${width}:${options.height}:force_original_aspect_ratio=increase,crop=${width}:${options.height},setsar=1`;
    const outputTemp = resolve(temp, "render.mp4");
    const args = ["-hide_banner", "-y", "-i", options.input, "-map", "0:v:0"];
    if (audio) args.push("-map", "0:a:0?");
    args.push("-vf", `${scaleCrop},fps=30`, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p");
    let audioNormalized = false;
    if (audio) {
      const volume = await run("ffmpeg", ["-hide_banner", "-i", options.input, "-vn", "-af", "volumedetect", "-f", "null", "-"]);
      const maxVolume = volume.stderr.match(/max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/i);
      const hasAudibleAudio = maxVolume !== null && Number.isFinite(Number(maxVolume[1]));
      if (hasAudibleAudio) {
        args.push("-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k");
        audioNormalized = true;
      } else {
        args.push("-c:a", "aac", "-b:a", "192k");
      }
    }
    args.push("-movflags", "+faststart", "-shortest", outputTemp);
    await run("ffmpeg", args);
    await run("ffmpeg", ["-v", "error", "-i", outputTemp, "-f", "null", "-"]);
    await copyFile(outputTemp, options.output);
    console.log(JSON.stringify({ ok: true, input: basename(options.input), output: options.output, duration_seconds: analysis.duration_seconds, detected_silences_for_review: analysis.audio_analysis.detected_silence_count, source: analysis.source, render: { aspect: options.aspect, width, height: options.height, video_codec: "h264", audio_normalized: audioNormalized, silent_audio_preserved_without_normalization: audio && !audioNormalized } }, null, 2));
  } finally { await rm(temp, { recursive: true, force: true }); }
}
main().catch(error => { console.error("[09 VIDEO AI]", error instanceof Error ? error.message : error); process.exitCode = 1; });
