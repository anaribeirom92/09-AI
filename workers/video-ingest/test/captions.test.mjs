import test from "node:test";
import assert from "node:assert/strict";
import { mapCaptionsToTimeline, parseSrt, serializeSrt } from "../dist/captions.js";

test("parses SRT timestamps and multiline captions", () => {
  assert.deepEqual(parseSrt("1\n00:00:01,250 --> 00:00:02,500\nOlá, mundo!\nSegunda linha"), [
    { index: 1, start_seconds: 1.25, end_seconds: 2.5, text: "Olá, mundo!\nSegunda linha" }
  ]);
});

test("accepts dot milliseconds, BOM and CRLF", () => {
  const cues = parseSrt("\uFEFF1\r\n00:00:00.000 --> 00:00:01.000\r\nTeste");
  assert.equal(cues[0].start_seconds, 0);
  assert.equal(cues[0].end_seconds, 1);
});

test("rejects invalid, reversed and out-of-order timestamps", () => {
  assert.throws(() => parseSrt("1\n00:00:61,000 --> 00:01:02,000\nTexto"));
  assert.throws(() => parseSrt("1\n00:00:02,000 --> 00:00:01,000\nTexto"));
  assert.throws(() => parseSrt("1\n00:00:02,000 --> 00:00:03,000\nA\n\n2\n00:00:01,000 --> 00:00:02,000\nB"));
});

test("rejects captions extending beyond known media duration", () => {
  assert.throws(() => parseSrt("1\n00:00:01,000 --> 00:00:03,000\nTexto", 2));
});

test("returns an empty list for empty subtitle files", () => {
  assert.deepEqual(parseSrt("  "), []);
});

test("maps captions onto the output timeline after approved cuts", () => {
  const cues = parseSrt("1\\n00:00:00,500 --> 00:00:02,000\\nOlá\\n\\n2\\n00:00:03,000 --> 00:00:04,000\\nTudo bem?", 5);
  const mapped = mapCaptionsToTimeline(cues, [
    { source_start_seconds: 0, source_end_seconds: 1, timeline_start_seconds: 0 },
    { source_start_seconds: 3, source_end_seconds: 5, timeline_start_seconds: 1 }
  ]);
  assert.deepEqual(mapped, [
    { index: 1, start_seconds: 0.5, end_seconds: 1, text: "Olá" },
    { index: 2, start_seconds: 1, end_seconds: 2, text: "Tudo bem?" }
  ]);
});

test("serializes timeline captions as valid SRT", () => {
  const cues = [{ index: 1, start_seconds: 1.25, end_seconds: 2.5, text: "Olá\\n mundo" }];
  assert.equal(serializeSrt(cues), "1\\n00:00:01,250 --> 00:00:02,500\\nOlá\\n mundo\\n");
});
