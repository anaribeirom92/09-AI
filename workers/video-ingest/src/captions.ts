export type CaptionCue = {
  index: number;
  start_seconds: number;
  end_seconds: number;
  text: string;
};

function parseTimestamp(value: string): number {
  const match = value.trim().match(/^(\\d{2,}):(\\d{2}):(\\d{2})[,.](\\d{3})$/);
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
  const normalized = content.replace(/^\\uFEFF/, "").replace(/\\r/g, "").trim();
  if (!normalized) return [];
  const blocks = normalized.split(/\\n\\s*\\n/);
  const cues: CaptionCue[] = [];
  let previousStart = -1;

  for (const [blockIndex, block] of blocks.entries()) {
    const lines = block.split("\\n").map(line => line.trimEnd());
    const timingIndex = lines.findIndex(line => line.includes("-->"));
    if (timingIndex < 0) throw new Error(`Bloco ${blockIndex + 1}: linha de tempo ausente.`);
    const timing = lines[timingIndex].match(/^\\s*(\\d{2,}:\\d{2}:\\d{2}[,.]\\d{3})\\s+-->\\s+(\\d{2,}:\\d{2}:\\d{2}[,.]\\d{3})(?:\\s+.*)?$/);
    if (!timing) throw new Error(`Bloco ${blockIndex + 1}: linha de tempo inválida.`);
    const start = parseTimestamp(timing[1]);
    const end = parseTimestamp(timing[2]);
    if (end <= start) throw new Error(`Bloco ${blockIndex + 1}: fim deve ser posterior ao início.`);
    if (start < previousStart) throw new Error("As legendas precisam estar em ordem cronológica.");
    if (mediaDuration !== undefined && end > mediaDuration + 0.05) {
      throw new Error(`Bloco ${blockIndex + 1}: legenda ultrapassa a duração do vídeo.`);
    }
    const text = lines.slice(timingIndex + 1).join("\\n").trim();
    if (!text) throw new Error(`Bloco ${blockIndex + 1}: texto da legenda vazio.`);
    cues.push({ index: cues.length + 1, start_seconds: start, end_seconds: end, text });
    previousStart = start;
  }
  return cues;
}
