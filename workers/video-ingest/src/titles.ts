export type TitleOverlay = {
  text: string;
  start_seconds: number;
  end_seconds: number;
  position?: "top" | "center" | "bottom";
  style?: "title" | "lower-third";
  fade_in_seconds?: number;
  fade_out_seconds?: number;
};

function assTime(seconds: number): string {
  const cs = Math.max(0, Math.round(seconds * 100));
  return \`\${Math.floor(cs / 360000)}:\${String(Math.floor((cs % 360000) / 6000)).padStart(2, "0")}:\${String(Math.floor((cs % 6000) / 100)).padStart(2, "0")}.\${String(cs % 100).padStart(2, "0")}\`;
}

function escapeAssText(text: string): string {
  return text.replace(/\\\\/g, "\\\\\\\\").replace(/{/g, "\\\\{").replace(/}/g, "\\\\}").replace(/\\r?\\n/g, "\\\\N");
}

export function validateTitles(value: unknown, duration: number): TitleOverlay[] {
  if (!Array.isArray(value)) throw new Error("O arquivo de títulos precisa conter uma lista JSON.");
  if (value.length > 30) throw new Error("O limite é de 30 títulos por vídeo.");
  return value.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(\`Título \${index + 1}: objeto inválido.\`);
    const title = item as Record<string, unknown>;
    if (typeof title.text !== "string" || !title.text.trim() || title.text.length > 180) throw new Error(\`Título \${index + 1}: texto obrigatório (máximo 180 caracteres).\`);
    const start = title.start_seconds, end = title.end_seconds;
    if (typeof start !== "number" || typeof end !== "number" || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > duration + 0.01) throw new Error(\`Título \${index + 1}: intervalo inválido ou fora da duração final.\`);
    const position = title.position ?? "center";
    const style = title.style ?? "title";
    const fadeIn = title.fade_in_seconds ?? 0.25;
    const fadeOut = title.fade_out_seconds ?? 0.25;
    if (!["top", "center", "bottom"].includes(String(position))) throw new Error(\`Título \${index + 1}: posição inválida.\`);
    if (!["title", "lower-third"].includes(String(style))) throw new Error(\`Título \${index + 1}: estilo inválido.\`);
    if (typeof fadeIn !== "number" || typeof fadeOut !== "number" || !Number.isFinite(fadeIn) || !Number.isFinite(fadeOut) || fadeIn < 0 || fadeOut < 0 || fadeIn > (end - start) / 2 || fadeOut > (end - start) / 2) throw new Error(\`Título \${index + 1}: duração de fade inválida.\`);
    return { text: title.text.trim(), start_seconds: start, end_seconds: end, position: position as TitleOverlay["position"], style: style as TitleOverlay["style"], fade_in_seconds: fadeIn, fade_out_seconds: fadeOut };
  });
}

/** Build an ASS overlay track; times refer to the final edited timeline. */
export function serializeAssTitles(titles: TitleOverlay[], width: number, height: number): string {
  const header = \`[Script Info]
ScriptType: v4.00+
PlayResX: \${width}
PlayResY: \${height}
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Main,Arial,\${Math.round(height * 0.052)},&H00FFFFFF,&H000000FF,&H00101010,&H99000000,1,0,0,0,100,100,0,0,1,3,1,5,64,64,64,1
Style: Lower,Arial,\${Math.round(height * 0.036)},&H00FFFFFF,&H000000FF,&H00101010,&HAA000000,1,0,0,0,100,100,0,0,3,0,0,2,72,72,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
\`;
  const events = titles.map(title => {
    const x = Math.round(width / 2);
    const y = title.position === "top" ? Math.round(height * 0.16) : title.position === "bottom" ? Math.round(height * 0.82) : Math.round(height * 0.5);
    const style = title.style === "lower-third" ? "Lower" : "Main";
    const alignment = title.position === "top" ? 8 : title.position === "bottom" ? 2 : 5;
    const fadeIn = Math.round((title.fade_in_seconds ?? 0) * 1000);
    const fadeOut = Math.round((title.fade_out_seconds ?? 0) * 1000);
    const overrides = \`{\\\\an\${alignment}\\\\pos(\${x},\${y})\\\\fad(\${fadeIn},\${fadeOut})}\`;
    return \`Dialogue: 0,\${assTime(title.start_seconds)},\${assTime(title.end_seconds)},\${style},,0,0,0,,\${overrides}\${escapeAssText(title.text)}\`;
  });
  return header + events.join("\\n") + (events.length ? "\\n" : "");
}
