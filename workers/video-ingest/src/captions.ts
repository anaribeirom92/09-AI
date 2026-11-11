export type CaptionCue = {
  index: number;
  start_seconds: number;
  end_seconds: number;
  text: string;
};

function parseTimestamp(value: string): number {
  const match = value.trim().match(/^(\d{2,}):(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match) throw new Error(`Timestamp inválido: ${value}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4]);
  if (minutes > 59 || seconds > 59) throw new Error(`Timestamp fora do intervalo: ${value}`);
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

/** Parse SRT cues, accepting comma or dot milliseconds and preserving multiline text. */
export function parseSrt(content: string, mediaDuration?: number): CaptionCue[] {
  if (mediaDuration !== undefined && (!Number.isFinite(mediaDuration) || mediaDuration <= 0)) {
    throw new Error("A duração do vídeo precisa ser positiva.");
  }
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r/g, "").trim();
  if (!normalized) return [];
  const blocks = normalized.split(/\n\s*\n/);
  const cues: CaptionCue[] = [];
  let previousStart = -1;

  for (const [blockIndex, block] of blocks.entries()) {
    const lines = block.split("\n").map(line => line.trimEnd());
    const timingIndex = lines.findIndex(line => line.includes("-->"));
    if (timingIndex < 0) throw new Error(`Bloco ${blockIndex + 1}: linha de tempo ausente.`);

    const timingParts = lines[timingIndex].split("-->");
    if (timingParts.length !== 2) throw new Error(`Bloco ${blockIndex + 1}: linha de tempo inválida.`);
    const startToken = timingParts[0].trim();
    const endToken = timingParts[1].trim().split(/\s+/)[0];
    if (!startToken || !endToken) throw new Error(`Bloco ${blockIndex + 1}: linha de tempo inválida.`);

    const start = parseTimestamp(startToken);
    const end = parseTimestamp(endToken);
    if (end <= start) throw new Error(`Bloco ${blockIndex + 1}: fim deve ser posterior ao início.`);
    if (start < previousStart) throw new Error("As legendas precisam estar em ordem cronológica.");
    if (mediaDuration !== undefined && end > mediaDuration + 0.05) {
      throw new Error(`Bloco ${blockIndex + 1}: legenda ultrapassa a duração do vídeo.`);
    }
    const text = lines.slice(timingIndex + 1).join("\n").trim();
    if (!text) throw new Error(`Bloco ${blockIndex + 1}: texto da legenda vazio.`);
    cues.push({ index: cues.length + 1, start_seconds: start, end_seconds: end, text });
    previousStart = start;
  }
  return cues;
}


/** Re-time source captions onto the concatenated timeline of approved keep segments. */
export function mapCaptionsToTimeline(cues: CaptionCue[], segments: Array<{ source_start_seconds: number; source_end_seconds: number; timeline_start_seconds: number }>): CaptionCue[] {
  const mapped: CaptionCue[] = [];
  for (const cue of cues) {
    for (const segment of segments) {
      const start = Math.max(cue.start_seconds, segment.source_start_seconds);
      const end = Math.min(cue.end_seconds, segment.source_end_seconds);
      if (end <= start) continue;
      mapped.push({
        index: mapped.length + 1,
        start_seconds: Number((segment.timeline_start_seconds + start - segment.source_start_seconds).toFixed(3)),
        end_seconds: Number((segment.timeline_start_seconds + end - segment.source_start_seconds).toFixed(3)),
        text: cue.text
      });
    }
  }
  return mapped;
}

/** Serialize validated cues as an SRT subtitle track. */
export function serializeSrt(cues: CaptionCue[]): string {
  const stamp = (seconds: number) => {
    const ms = Math.max(0, Math.round(seconds * 1000));
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return [hours, minutes, secs].map(value => String(value).padStart(2, "0")).join(":") + "," + String(millis).padStart(3, "0");
  };
  return cues.map((cue, index) => `${index + 1}\\n${stamp(cue.start_seconds)} --> ${stamp(cue.end_seconds)}\\n${cue.text}`).join("\\n\\n") + (cues.length ? "\\n" : "");
}
