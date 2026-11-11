import type { EditSegment } from "./edit-plan.js";

export type RenderFilterGraph = {
  filter_complex: string;
  video_map: string;
  audio_map?: string;
};

/** Build a deterministic FFmpeg concat graph from explicitly approved keep-segments. */
export function buildEditFilterGraph(segments: EditSegment[], hasAudio: boolean): RenderFilterGraph {
  if (!segments.length) throw new Error("O plano não contém segmentos para renderizar.");

  const filters: string[] = [];
  const concatInputs: string[] = [];
  const count = segments.length;

  if (count > 1) {
    filters.push(`[0:v:0]split=${count}${segments.map((_, index) => `[vsrc${index}]`).join("")}`);
    if (hasAudio) filters.push(`[0:a:0]asplit=${count}${segments.map((_, index) => `[asrc${index}]`).join("")}`);
  }

  segments.forEach((segment, index) => {
    const start = segment.source_start_seconds;
    const end = segment.source_end_seconds;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
      throw new Error(`Segmento ${index + 1} possui intervalo inválido.`);
    }
    const startText = start.toFixed(3);
    const endText = end.toFixed(3);
    const videoInput = count > 1 ? `[vsrc${index}]` : "[0:v:0]";
    filters.push(`${videoInput}trim=start=${startText}:end=${endText},setpts=PTS-STARTPTS,setsar=1[v${index}]`);
    concatInputs.push(`[v${index}]`);
    if (hasAudio) {
      const audioInput = count > 1 ? `[asrc${index}]` : "[0:a:0]";
      filters.push(`${audioInput}atrim=start=${startText}:end=${endText},asetpts=PTS-STARTPTS[a${index}]`);
      concatInputs.push(`[a${index}]`);
    }
  });

  const audioFlag = hasAudio ? 1 : 0;
  const outputLabels = hasAudio ? "[vout][aout]" : "[vout]";
  filters.push(`${concatInputs.join("")}concat=n=${count}:v=1:a=${audioFlag}${outputLabels}`);

  return {
    filter_complex: filters.join(";"),
    video_map: "[vout]",
    ...(hasAudio ? { audio_map: "[aout]" } : {})
  };
}
