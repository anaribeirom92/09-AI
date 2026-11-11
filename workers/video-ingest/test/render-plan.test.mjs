import test from "node:test";
import assert from "node:assert/strict";
import { buildEditFilterGraph } from "../dist/render-plan.js";

const segments = [
  { id: "keep-1", source_start_seconds: 0, source_end_seconds: 4.25, timeline_start_seconds: 0, duration_seconds: 4.25, decision: "keep" },
  { id: "keep-2", source_start_seconds: 7, source_end_seconds: 10, timeline_start_seconds: 4.25, duration_seconds: 3, decision: "keep" }
];

test("builds synchronized video/audio concat graph for approved cuts", () => {
  const graph = buildEditFilterGraph(segments, true);
  assert.match(graph.filter_complex, /trim=start=0\.000:end=4\.250/);
  assert.match(graph.filter_complex, /atrim=start=7\.000:end=10\.000/);
  assert.match(graph.filter_complex, /concat=n=2:v=1:a=1\[vout\]\[aout\]/);
  assert.equal(graph.video_map, "[vout]");
  assert.equal(graph.audio_map, "[aout]");
});

test("builds a video-only graph when the source has no audio", () => {
  const graph = buildEditFilterGraph(segments, false);
  assert.match(graph.filter_complex, /concat=n=2:v=1:a=0\[vout\]/);
  assert.equal(graph.audio_map, undefined);
});

test("rejects empty and invalid segments", () => {
  assert.throws(() => buildEditFilterGraph([], false));
  assert.throws(() => buildEditFilterGraph([{ ...segments[0], source_end_seconds: 0 }], false));
});
