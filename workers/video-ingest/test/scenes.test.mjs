import test from "node:test";
import assert from "node:assert/strict";
import { parseSceneTimestamps } from "../dist/scenes.js";

test("parses FFmpeg showinfo timestamps and removes near-duplicates", () => {
  const log = [
    "[Parsed_showinfo_1] n: 0 pts: 9000 pts_time:0.300 fmt:yuv420p",
    "[Parsed_showinfo_1] n: 1 pts: 9600 pts_time:0.320 fmt:yuv420p",
    "[Parsed_showinfo_1] n: 2 pts: 45000 pts_time:1.500 fmt:yuv420p",
    "[Parsed_showinfo_1] n: 3 pts: 99000 pts_time:3.300 fmt:yuv420p"
  ].join("\n");
  assert.deepEqual(parseSceneTimestamps(log, 3.5), [0.3, 1.5]);
});

test("ignores invalid timestamps and frames outside media duration", () => {
  const log = [
    "[Parsed_showinfo_1] pts_time:0.000",
    "[Parsed_showinfo_1] pts_time:N/A",
    "[Parsed_showinfo_1] pts_time:8.000",
    "[Parsed_showinfo_1] pts_time:-1.000"
  ].join("\n");
  assert.deepEqual(parseSceneTimestamps(log, 5), []);
  assert.deepEqual(parseSceneTimestamps(log, 0), []);
});
