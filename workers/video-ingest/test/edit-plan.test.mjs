import test from "node:test";
import assert from "node:assert/strict";
import { createReviewEditPlan, validateEditPlan } from "../dist/edit-plan.js";

const analysis = {
  input: "entrevista.mp4",
  duration_seconds: 30,
  edit_suggestions: [
    { id: "silence-1", type: "review_pause", start_seconds: 8, end_seconds: 9, duration_seconds: 1, automatic_cut: false, note: "Revisar pausa." },
    { id: "bad-1", type: "review_pause", start_seconds: -2, end_seconds: 1, duration_seconds: 3, automatic_cut: false, note: "Inválido." },
    { id: "bad-2", type: "review_pause", start_seconds: 10, end_seconds: 40, duration_seconds: 30, automatic_cut: false, note: "Fora do vídeo." }
  ]
};

test("creates a conservative plan that keeps the complete source", () => {
  const plan = createReviewEditPlan(analysis, { aspect: "9:16", height: 1080 });
  assert.equal(plan.status, "needs_review");
  assert.equal(plan.segments.length, 1);
  assert.equal(plan.segments[0].source_start_seconds, 0);
  assert.equal(plan.segments[0].source_end_seconds, 30);
  assert.equal(plan.review_items.length, 1);
  assert.equal(plan.safety.cuts_applied, false);
  assert.deepEqual(validateEditPlan(plan), []);
});

test("rejects a zero-length source", () => {
  assert.throws(() => createReviewEditPlan({ ...analysis, duration_seconds: 0 }, { aspect: "9:16", height: 1080 }));
});

test("validator catches segments beyond the source duration", () => {
  const plan = createReviewEditPlan(analysis, { aspect: "16:9", height: 720 });
  plan.segments[0].source_end_seconds = 40;
  assert.ok(validateEditPlan(plan).some(error => error.includes("ultrapassa")));
});

test("validator catches a plan that claims cuts were already applied", () => {
  const plan = createReviewEditPlan(analysis, { aspect: "1:1", height: 1440 });
  plan.safety.cuts_applied = true;
  assert.ok(validateEditPlan(plan).some(error => error.includes("cortes já aplicados")));
});
