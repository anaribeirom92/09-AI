import test from "node:test";
import assert from "node:assert/strict";
import { serializeAssTitles, validateTitles } from "../dist/titles.js";

test("validates and serializes animated title and lower-third overlays", () => {
  const titles = validateTitles([
    { text: "09 Comunicação\nIdeias em movimento", start_seconds: 0.5, end_seconds: 3, position: "center", style: "title", fade_in_seconds: 0.3, fade_out_seconds: 0.3 },
    { text: "Direção | Ana Paula", start_seconds: 1, end_seconds: 4, position: "bottom", style: "lower-third" }
  ], 5);
  const ass = serializeAssTitles(titles, 1080, 1920);
  assert.match(ass, /Style: Main/);
  assert.match(ass, /Style: Lower/);
  assert.match(ass, /\\fad\(300,300\)/);
  assert.match(ass, /Direção \| Ana Paula/);
  assert.match(ass, /\\N/);
});

test("rejects invalid title intervals and unsupported positions", () => {
  assert.throws(() => validateTitles([{ text: "Fora", start_seconds: 4, end_seconds: 6 }], 5), /intervalo inválido/);
  assert.throws(() => validateTitles([{ text: "Posição", start_seconds: 0, end_seconds: 1, position: "left" }], 5), /posição inválida/);
});

test("rejects unsafe oversized title payloads", () => {
  assert.throws(() => validateTitles([{ text: "x".repeat(181), start_seconds: 0, end_seconds: 1 }], 5), /180 caracteres/);
  assert.throws(() => validateTitles(Array.from({ length: 31 }, (_, index) => ({ text: String(index), start_seconds: 0, end_seconds: 1 })), 5), /30 títulos/);
});

test("escapes ASS control characters in supplied title text", () => {
  const [title] = validateTitles([{ text: "{\\an7}\\override", start_seconds: 0, end_seconds: 1 }], 2);
  const ass = serializeAssTitles([title], 1080, 1920);
  assert.ok(ass.includes(String.raw`\\{\\\\an7\\}\\\\override`));
});
