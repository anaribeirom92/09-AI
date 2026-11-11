import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const cli = join(root, "dist", "index.js");
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.status !== 0) throw new Error(result.stderr || `${command} exited with ${result.status}`);
  return result.stdout;
};

test("full local pipeline analyzes, exports EDL and renders a synthetic video", async () => {
  const dir = await mkdtemp(join(tmpdir(), "09-video-ai-smoke-"));
  try {
    const input = join(dir, "synthetic.mp4");
    const report = join(dir, "analysis.json");
    const plan = join(dir, "edit-plan.json");
    const output = join(dir, "render.mp4");

    run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", "color=c=blue:s=320x240:r=25:d=2",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=2:sample_rate=44100",
      "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", input
    ]);

    run("node", [cli, "--input", input, "--analyze-only", "--report", report, "--plan", plan]);
    const analysis = JSON.parse(await readFile(report, "utf8"));
    const editPlan = JSON.parse(await readFile(plan, "utf8"));
    assert.equal(analysis.status, "analysis_only");
    assert.equal(analysis.safety.automatic_cuts_applied, false);
    assert.equal(editPlan.status, "needs_review");
    assert.equal(editPlan.segments[0].source_end_seconds, 2);

    run("node", [cli, "--input", input, "--output", output, "--aspect", "9:16", "--height", "720"]);
    const probe = JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-of", "json", output]));
    const video = probe.streams.find(stream => stream.codec_type === "video");
    assert.equal(video.width, 406);
    assert.equal(video.height, 720);
    assert.ok(probe.streams.some(stream => stream.codec_type === "audio"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
