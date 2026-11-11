export function parseSceneTimestamps(log: string, mediaDuration: number): number[] {
  if (!Number.isFinite(mediaDuration) || mediaDuration <= 0) return [];
  const timestamps: number[] = [];
  for (const line of log.split(/\r?\n/)) {
    const match = line.match(/showinfo.*?pts_time:([-+]?[0-9]+(?:\.[0-9]+)?)/);
    if (!match) continue;
    const time = Number(match[1]);
    if (!Number.isFinite(time) || time <= 0 || time >= mediaDuration) continue;
    if (timestamps.length === 0 || time - timestamps[timestamps.length - 1] >= 0.25) {
      timestamps.push(Number(time.toFixed(3)));
    }
  }
  return timestamps;
}
