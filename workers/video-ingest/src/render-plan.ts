import type { EditSegment } from "./edit-plan.js";

export type RenderFilterGraph = {
  filter_complex: string;
  video_map: string;
  audio_map?: string;
};

/**
 * Build a deterministic FFmpeg concat graph from approved keep-segments.
 * Gaps between source ranges become cuts; retained segments are joined without
 * timeline gaps. This function never changes the source file.
 */
export function buildEditFilterGraph(segments: EditSegment[], hasAudio: boolean): RenderFilterGraph {
  if (!segments.length) throw new Error("O plano não contém segmentos para renderizar.");

  const filters: string[] = [];
  const concatInputs: string[] = [];

  segments.forEach((segment, index) => {
    const start = segment.source_start_seconds;
    const end = segment.source_end_seconds;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
      throw new Error(`Segmento ${index + 1} possui intervalo inválido.`);
    }
    const startText = start.toFixed(3);
    const endText = end.toFixed(3);
    filters.push(`[0:v:0]trim=start=${startText}:end=${endText},setpts=PTS-STARTPTS,setsar=1[v${index}]`);
    concatInputs.push(`[v${index}]`);
    if (hasAudio) {
      filters.push(`[0:a:0]atrim=start=${startText}:end=${endText},asetpts=PTS-STARTPTS[a${index}]`);
      concatInputs.push(`[a${index}]`);
    }
  });

  const audioFlag = hasAudio ? 1 : 0;
  const outputLabels = hasAudio ? "[vout][aout]" : "[vout]";
  filters.push(`${concatInputs.join("")}concat=n=${segments.length}:v=1:a=${audioFlag}${outputLabels}`);

  return {
    filter_complex: filters.join(";"),
    video_map: "[vout]",
    ...(hasAudio ? { audio_map: "[aout]" } : {})
  };
}
