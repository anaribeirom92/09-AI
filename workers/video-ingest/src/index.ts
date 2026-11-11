import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { parseSilences, type SilenceInterval } from "./silence.js";
import { createReviewEditPlan, validateEditPlan, type EditPlan, type EditSegment, type ReviewItem } from "./edit-plan.js";
import { buildEditFilterGraph } from "./render-plan.js";
import { mapCaptionsToTimeline, parseSrt, serializeSrt } from "./captions.js";

type Aspect = "9:16" | "16:9" | "1:1";
type Options = { input: string; output?: string; aspect: Aspect; height: 720 | 1080 | 1440 | 2160; analyzeOnly: boolean; transcribe: boolean; whisperBin: string; whisperModel?: string; language: string; silenceNoise: string; silenceDuration: number; report?: string; plan?: string; editPlan?: string; captions?: string };
type ProcessResult = { stdout: string; stderr: string };
function parseArgs(args: string[]): Options {
  const values = new Map<string, string>();
  const flags = new Set(["analyze-only", "transcribe"]);
  const valueOptions = new Set(["input", "output", "aspect", "height", "silence-noise", "silence-duration", "report", "plan", "whisper-model", "whisper-bin", "language", "edit-plan", "captions"]);
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key.startsWith("--")) {
      const name = key.slice(2);
      if (!flags.has(name) && !valueOptions.has(name)) throw new Error("Opção desconhecida: " + key);
      if (flags.has(name)) { values.set(name, "true"); continue; }
      const value = args[i + 1];
      if (!value || value.startsWith("--")) throw new Error("Informe um valor para " + key);
      values.set(name, value); i++;
    }
  }
  const input = values.get("input"), output = values.get("output");
  const analyzeOnly = values.has("analyze-only");
  const transcribe = values.has("transcribe");
  const whisperModel = values.get("whisper-model");
  if (transcribe && !whisperModel) throw new Error("--transcribe exige --whisper-model com o caminho do modelo local.");
  if (transcribe && analyzeOnly) throw new Error("--transcribe não pode ser combinado com --analyze-only.");
  if (!input || (!output && !analyzeOnly)) throw new Error("Uso: npm start -- --input ./bruto.mp4 --output ./final.mp4 [--aspect 9:16|16:9|1:1] [--height 720|1080|1440|2160] [--analyze-only] [--transcribe --whisper-model ./ggml-base.bin] [--language pt] [--report ./analise.json] [--plan ./plano-edicao.json]");
  const aspect = (values.get("aspect") ?? "9:16") as Aspect;
  const height = Number(values.get("height") ?? "1080") as Options["height"];
  const silenceDuration = Number(values.get("silence-duration") ?? "0.45");
  const silenceNoise = values.get("silence-noise") ?? "-35dB";
  if (!/^-?\d+(?:\.\d+)?dB$/i.test(silenceNoise) || Number.parseFloat(silenceNoise) > 0 || Number.parseFloat(silenceNoise) < -100) throw new Error("Limite de silêncio inválido; use um valor entre -100dB e 0dB.");
  if (!["9:16", "16:9", "1:1"].includes(aspect)) throw new Error("Proporção inválida.");
  if (![720, 1080, 1440, 2160].includes(height)) throw new Error("Resolução inválida.");
  if (!Number.isFinite(silenceDuration) || silenceDuration < 0.1 || silenceDuration > 10) throw new Error("Duração mínima de silêncio deve estar entre 0.1 e 10 segundos.");
  return { input: resolve(input), output: output ? resolve(output) : undefined, aspect, height, analyzeOnly, transcribe, whisperBin: values.get("whisper-bin") ?? "whisper-cli", whisperModel: whisperModel ? resolve(whisperModel) : undefined, language: values.get("language") ?? "pt", silenceNoise, silenceDuration, report: values.get("report") ? resolve(values.get("report")!) : undefined, plan: values.get("plan") ? resolve(values.get("plan")!) : undefined, editPlan: values.get("edit-plan") ? resolve(values.get("edit-plan")!) : undefined, captions: values.get("captions") ? resolve(values.get("captions")!) : undefined };
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
  if (options.transcribe && !options.output) throw new Error("A transcrição exige --output ./legendas.srt.");\n  if (options.captions && options.transcribe) throw new Error("--captions não pode ser combinado com --transcribe.");\n  if (options.captions) await access(options.captions);
  if (options.transcribe && options.output && !options.output.toLowerCase().endsWith(".srt")) throw new Error("A saída da transcrição precisa ter extensão .srt.");
  if (options.transcribe && options.whisperModel) await access(options.whisperModel);
  if (options.report && options.input === options.report) throw new Error("O relatório não pode sobrescrever o vídeo original.");
  if (options.plan && !options.analyzeOnly) throw new Error("A geração de plano exige --analyze-only.");
  if (options.editPlan && options.analyzeOnly) throw new Error("--edit-plan só pode ser usado durante a renderização.");
  if (options.editPlan && (options.editPlan === options.input || options.editPlan === options.output)) throw new Error("O plano de edição precisa ter caminho exclusivo.");
  if (options.plan && options.input === options.plan) throw new Error("O plano não pode sobrescrever o vídeo original.");
  if (options.plan && options.report && options.plan === options.report) throw new Error("Relatório e plano precisam de caminhos diferentes.");
  if (options.output && (options.output === options.report || options.output === options.plan)) throw new Error("Vídeo de saída, relatório e plano precisam de caminhos diferentes.");
  if (options.transcribe && (options.output === options.report || options.output === options.plan)) throw new Error("O SRT de saída precisa ter caminho exclusivo.");
  const probeResult = await run("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", options.input]);
  const probe = JSON.parse(probeResult.stdout) as { format?: { duration?: string; format_name?: string }; streams?: Array<{ codec_type?: string; width?: number; height?: number; codec_name?: string; sample_rate?: string; channels?: number; side_data_list?: Array<{ rotation?: number }> }> };
  const analysis = await analyze(options, probe);
  if (options.transcribe) {
    if (!probe.streams?.some(stream => stream.codec_type === "audio")) throw new Error("Não há faixa de áudio para transcrever.");
    const duration = Number(probe.format?.duration ?? 0);
    const temp = await mkdtemp(resolve(tmpdir(), "09-video-ai-transcribe-"));
    try {
      const wavPath = resolve(temp, "audio-16khz-mono.wav");
      const srtPrefix = resolve(temp, "transcript");
      const srtTemp = srtPrefix + ".srt";
      await run("ffmpeg", ["-hide_banner", "-y", "-i", options.input, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wavPath]);
      await run(options.whisperBin, ["-m", options.whisperModel!, "-f", wavPath, "-l", options.language, "-osrt", "-of", srtPrefix, "-t", "4", "-ng", "-np"]);
      const srt = await readFile(srtTemp, "utf8");
      const cues = parseSrt(srt, duration);
      if (cues.length === 0) throw new Error("O Whisper não retornou legendas; confira o áudio e o modelo.");
      await mkdir(dirname(options.output!), { recursive: true });
      await writeFile(options.output!, srt, "utf8");
      console.log(JSON.stringify({ ok: true, mode: "transcription", input: basename(options.input), output: options.output, language: options.language, model: basename(options.whisperModel!), captions: cues.length, engine: "whisper.cpp", processing: "local_cpu" }, null, 2));
    } finally { await rm(temp, { recursive: true, force: true }); }
    return;
  }
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
  const audio = probe.streams?.some(stream => stream.codec_type === "audio");
  let segments: EditSegment[] = [{ id: "full-source", source_start_seconds: 0, source_end_seconds: analysis.duration_seconds, timeline_start_seconds: 0, duration_seconds: analysis.duration_seconds, decision: "keep" }];
  if (options.editPlan) {
    const suppliedPlan = JSON.parse(await readFile(options.editPlan, "utf8")) as EditPlan;
    const errors = validateEditPlan(suppliedPlan);
    if (errors.length) throw new Error("Plano de edição inválido: " + errors.join(" "));
    if (suppliedPlan.status !== "approved" || suppliedPlan.safety.requires_human_review) throw new Error("O plano ainda não foi aprovado. Revise os segmentos e marque status como approved e requires_human_review como false.");
    if (suppliedPlan.source.filename !== basename(options.input)) throw new Error("O plano foi criado para outro arquivo de vídeo.");
    if (Math.abs(suppliedPlan.source.duration_seconds - analysis.duration_seconds) > 0.1) throw new Error("A duração do plano não corresponde ao vídeo enviado.");
    segments = suppliedPlan.segments;
  }
  const temp = await mkdtemp(resolve(tmpdir(), "09-video-ai-"));
  try {
    const [w, h] = options.aspect === "9:16" ? [9, 16] : options.aspect === "16:9" ? [16, 9] : [1, 1];
    const width = Math.round(options.height * w / h / 2) * 2;
    const scaleCrop = `scale=${width}:${options.height}:force_original_aspect_ratio=increase,crop=${width}:${options.height},setsar=1`;
    const outputTemp = resolve(temp, "render.mp4");
    const graph = buildEditFilterGraph(segments, Boolean(audio));
    let filter = `${graph.filter_complex};[vout]${scaleCrop},fps=30[vscaled]`;\n    let captionCount = 0;\n    if (options.captions) {\n      const sourceCues = parseSrt(await readFile(options.captions, "utf8"), analysis.duration_seconds);\n      const timelineCues = mapCaptionsToTimeline(sourceCues, segments);\n      captionCount = timelineCues.length;\n      if (timelineCues.length) {\n        const subtitlePath = resolve(temp, "captions.srt");\n        await writeFile(subtitlePath, serializeSrt(timelineCues), "utf8");\n        const escapedPath = subtitlePath.replace(/\\\\/g, "\\\\\\\\").replace(/:/g, "\\\\:").replace(/\'/g, "\\\\\'");\n        filter += `;[vscaled]subtitles=filename=\'${escapedPath}\':force_style=\'FontName=Arial,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=48\'[vfinal]`;\n      } else {\n        filter += ";[vscaled]null[vfinal]";\n      }\n    } else {\n      filter += ";[vscaled]null[vfinal]";\n    }
    let audioMap = graph.audio_map;
    let audioNormalized = false;
    if (audio) {
      const volume = await run("ffmpeg", ["-hide_banner", "-i", options.input, "-vn", "-af", "volumedetect", "-f", "null", "-"]);
      const maxVolume = volume.stderr.match(/max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/i);
      const hasAudibleAudio = maxVolume !== null && Number.isFinite(Number(maxVolume[1])) && Number(maxVolume[1]) > -90;
      if (hasAudibleAudio) {
        filter += ";[aout]loudnorm=I=-16:TP=-1.5:LRA=11[anorm]";
        audioMap = "[anorm]";
        audioNormalized = true;
      }
    }
    const args = ["-hide_banner", "-y", "-i", options.input, "-filter_complex", filter, "-map", "[vfinal]"];
    if (audioMap) args.push("-map", audioMap);
    args.push("-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p");
    if (audio) args.push("-c:a", "aac", "-b:a", "192k");
    args.push("-movflags", "+faststart", "-shortest", outputTemp);
    await run("ffmpeg", args);
    await run("ffmpeg", ["-v", "error", "-i", outputTemp, "-f", "null", "-"]);
    const renderedProbe = JSON.parse((await run("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", outputTemp])).stdout) as {
      format?: { duration?: string };
      streams?: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number }>;
    };
    const renderedVideo = renderedProbe.streams?.find(stream => stream.codec_type === "video");
    const renderedAudio = renderedProbe.streams?.find(stream => stream.codec_type === "audio");
    const expectedDuration = segments.reduce((sum, segment) => sum + segment.duration_seconds, 0);
    const renderedDuration = Number(renderedProbe.format?.duration ?? 0);
    if (!renderedVideo || renderedVideo.codec_name !== "h264") throw new Error("Validação final: faixa de vídeo H.264 ausente.");
    if (renderedVideo.width !== width || renderedVideo.height !== options.height) throw new Error("Validação final: dimensões do vídeo diferentes das solicitadas.");
    if (audio && (!renderedAudio || renderedAudio.codec_name !== "aac")) throw new Error("Validação final: faixa de áudio AAC ausente.");
    if (!audio && renderedAudio) throw new Error("Validação final: foi criada uma faixa de áudio que não existia na origem.");
    if (!Number.isFinite(renderedDuration) || Math.abs(renderedDuration - expectedDuration) > Math.max(0.35, expectedDuration * 0.01)) {
      throw new Error("Validação final: duração renderizada incompatível com o plano de edição.");
    }
    await copyFile(outputTemp, options.output);
    console.log(JSON.stringify({ ok: true, input: basename(options.input), output: options.output, duration_seconds: analysis.duration_seconds, detected_silences_for_review: analysis.audio_analysis.detected_silence_count, source: analysis.source, render: { aspect: options.aspect, width, height: options.height, video_codec: renderedVideo.codec_name, audio_codec: renderedAudio?.codec_name ?? null, duration_seconds: renderedDuration, audio_normalized: audioNormalized, silent_audio_preserved_without_normalization: audio && !audioNormalized, edit_segments_rendered: segments.length, edited_duration_seconds: expectedDuration, captions_burned_in: captionCount, validation: "passed" } }, null, 2));
  } finally { await rm(temp, { recursive: true, force: true }); }
}
main().catch(error => { console.error("[09 VIDEO AI]", error instanceof Error ? error.message : error); process.exitCode = 1; });
