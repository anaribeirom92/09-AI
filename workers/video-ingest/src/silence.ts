export type SilenceInterval = { start: number; end: number; duration: number };

/** Parse FFmpeg silencedetect diagnostics, including a silence that reaches EOF. */
export function parseSilences(log: string, mediaDuration = 0): SilenceInterval[] {
  const openStarts: number[] = [];
  const intervals: SilenceInterval[] = [];
  for (const line of log.split(/\r?\n/)) {
    const startMatch = line.match(/silence_start:\s*([0-9.]+)/);
    if (startMatch) openStarts.push(Number(startMatch[1]));
    const endMatch = line.match(/silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/);
    if (endMatch) {
      const end = Number(endMatch[1]);
      const duration = Number(endMatch[2]);
      const start = openStarts.shift() ?? Math.max(0, end - duration);
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
        intervals.push({ start: Number(start.toFixed(3)), end: Number(end.toFixed(3)), duration: Number((end - start).toFixed(3)) });
      }
    }
  }
  for (const start of openStarts) {
    if (Number.isFinite(mediaDuration) && mediaDuration > start) {
      intervals.push({ start: Number(start.toFixed(3)), end: Number(mediaDuration.toFixed(3)), duration: Number((mediaDuration - start).toFixed(3)) });
    }
  }
  return intervals.sort((a, b) => a.start - b.start);
}
