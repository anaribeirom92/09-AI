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

    const fadedOutput = join(dir, "faded-render.mp4");
    const fadedResult = JSON.parse(run("node", [cli, "--input", input, "--output", fadedOutput, "--aspect", "16:9", "--height", "720", "--fade-in", "0.25", "--fade-out", "0.25"]));
    assert.equal(fadedResult.render.fade_in_seconds, 0.25);
    assert.equal(fadedResult.render.fade_out_seconds, 0.25);
    const fadedProbe = JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-of", "json", fadedOutput]));
    assert.ok(fadedProbe.streams.some(stream => stream.codec_type === "video"));
    assert.ok(fadedProbe.streams.some(stream => stream.codec_type === "audio"));
    const captions = join(dir, "captions.srt");
    const captionedOutput = join(dir, "captioned-render.mp4");
    await import("node:fs/promises").then(({ writeFile }) => writeFile(captions, "1\n00:00:00,250 --> 00:00:01,500\nLegenda de teste", "utf8"));
    const captionResult = JSON.parse(run("node", [cli, "--input", input, "--output", captionedOutput, "--captions", captions, "--aspect", "16:9", "--height", "720"]));
    assert.equal(captionResult.render.captions_burned_in, 1);
    const captionProbe = JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-of", "json", captionedOutput]));
    assert.ok(captionProbe.streams.some(stream => stream.codec_type === "video"));
    const titlesPath = join(dir, "titles.json");
    const titledOutput = join(dir, "titled-render.mp4");
    await import("node:fs/promises").then(({ writeFile }) => writeFile(titlesPath, JSON.stringify([
      { text: "09 Comunicação\\nIdeias em movimento", start_seconds: 0.2, end_seconds: 1.7, position: "center", style: "title", fade_in_seconds: 0.2, fade_out_seconds: 0.2 },
      { text: "Ana Paula | Direção", start_seconds: 0.5, end_seconds: 1.8, position: "bottom", style: "lower-third" }
    ]), "utf8"));
    const titleResult = JSON.parse(run("node", [cli, "--input", input, "--output", titledOutput, "--titles", titlesPath, "--aspect", "16:9", "--height", "720"]));
    assert.equal(titleResult.render.titles_burned_in, 2);
    const titleProbe = JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-of", "json", titledOutput]));
    assert.ok(titleProbe.streams.some(stream => stream.codec_type === "video"));


    const approvedPlanPath = join(dir, "approved-plan.json");
    const editedOutput = join(dir, "edited-render.mp4");
    const approvedPlan = {
      schema_version: 1,
      status: "approved",
      source: { filename: "synthetic.mp4", duration_seconds: 2 },
      output: { aspect: "9:16", height: 720 },
      segments: [
        { id: "keep-1", source_start_seconds: 0, source_end_seconds: 0.5, timeline_start_seconds: 0, duration_seconds: 0.5, decision: "keep" },
        { id: "keep-2", source_start_seconds: 1, source_end_seconds: 2, timeline_start_seconds: 0.5, duration_seconds: 1, decision: "keep" }
      ],
      review_items: [],
      audio: { normalize: true, target_integrated_lufs: -16, true_peak_db: -1.5 },
      captions: { mode: "not_provided", tracks: [] },
      overlays: [],
      safety: { source_modified: false, cuts_applied: false, requires_human_review: false }
    };
    await import("node:fs/promises").then(({ writeFile }) => writeFile(approvedPlanPath, JSON.stringify(approvedPlan), "utf8"));
    const editedResult = JSON.parse(run("node", [cli, "--input", input, "--output", editedOutput, "--edit-plan", approvedPlanPath, "--aspect", "9:16", "--height", "720"]));
    assert.equal(editedResult.render.edit_segments_rendered, 2);
    assert.ok(editedResult.render.edited_duration_seconds < 2);
    const editedProbe = JSON.parse(run("ffprobe", ["-v", "error", "-show_format", "-of", "json", editedOutput]));
    assert.ok(Number(editedProbe.format.duration) > 1.4 && Number(editedProbe.format.duration) < 1.6);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("renders video-only sources without inventing an audio track", async () => {
  const dir = await mkdtemp(join(tmpdir(), "09-video-ai-no-audio-"));
  try {
    const input = join(dir, "silent-source.mp4");
    const output = join(dir, "silent-render.mp4");
    run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", "color=c=black:s=320x240:r=25:d=1",
      "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", input
    ]);
    run("node", [cli, "--input", input, "--output", output, "--aspect", "16:9", "--height", "720"]);
    const probe = JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-of", "json", output]));
    assert.ok(probe.streams.some(stream => stream.codec_type === "video"));
    assert.ok(!probe.streams.some(stream => stream.codec_type === "audio"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("preserves a silent audio stream without applying loudness normalization", async () => {
  const dir = await mkdtemp(join(tmpdir(), "09-video-ai-silent-audio-"));
  try {
    const input = join(dir, "silent-audio-source.mp4");
    const output = join(dir, "silent-audio-render.mp4");
    run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", "color=c=black:s=320x240:r=25:d=1",
      "-f", "lavfi", "-i", "aevalsrc=0:d=1:s=44100",
      "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", input
    ]);
    const result = JSON.parse(run("node", [cli, "--input", input, "--output", output, "--aspect", "1:1", "--height", "720"]));
    assert.equal(result.render.audio_normalized, false);
    assert.equal(result.render.silent_audio_preserved_without_normalization, true);
    const probe = JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-of", "json", output]));
    assert.ok(probe.streams.some(stream => stream.codec_type === "audio"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
