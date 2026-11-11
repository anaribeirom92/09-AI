import test from "node:test";
import assert from "node:assert/strict";
import { parseSilences } from "../dist/silence.js";

test("parses one closed silence interval", () => {
  assert.deepEqual(parseSilences("[silencedetect] silence_start: 1.250\n[silencedetect] silence_end: 2.750 | silence_duration: 1.500", 5), [
    { start: 1.25, end: 2.75, duration: 1.5 }
  ]);
});

test("keeps a trailing silence that reaches end of file", () => {
  assert.deepEqual(parseSilences("silence_start: 4.000", 6), [
    { start: 4, end: 6, duration: 2 }
  ]);
});

test("supports multiple intervals in chronological order", () => {
  const log = "silence_start: 3\nsilence_end: 4 | silence_duration: 1\nsilence_start: 0.5\nsilence_end: 1.5 | silence_duration: 1";
  assert.deepEqual(parseSilences(log, 5), [
    { start: 0.5, end: 1.5, duration: 1 },
    { start: 3, end: 4, duration: 1 }
  ]);
});

test("ignores invalid or negative intervals", () => {
  assert.deepEqual(parseSilences("silence_start: 2\nsilence_end: 1 | silence_duration: 1", 3), []);
});
