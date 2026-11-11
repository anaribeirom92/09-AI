export type ReviewItem = {
  id: string;
  type: "review_pause";
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  automatic_cut: false;
  note: string;
};

export type EditSegment = {
  id: string;
  source_start_seconds: number;
  source_end_seconds: number;
  timeline_start_seconds: number;
  duration_seconds: number;
  decision: "keep";
};

export type EditPlan = {
  schema_version: 1;
  status: "needs_review" | "approved";
  source: { filename: string; duration_seconds: number };
  output: { aspect: "9:16" | "16:9" | "1:1"; height: 720 | 1080 | 1440 | 2160 };
  segments: EditSegment[];
  review_items: ReviewItem[];
  audio: { normalize: true; target_integrated_lufs: -16; true_peak_db: -1.5 };
  captions: { mode: "not_provided"; tracks: [] };
  overlays: [];
  safety: { source_modified: false; cuts_applied: false; requires_human_review: boolean };
};

type AnalysisInput = {
  input: string;
  duration_seconds: number;
  edit_suggestions: ReviewItem[];
};

type OutputOptions = {
  aspect: EditPlan["output"]["aspect"];
  height: EditPlan["output"]["height"];
};

/** Create a conservative EDL: keep the entire source and mark pauses for human review. */
export function createReviewEditPlan(analysis: AnalysisInput, output: OutputOptions): EditPlan {
  if (!Number.isFinite(analysis.duration_seconds) || analysis.duration_seconds <= 0) {
    throw new Error("A duração do vídeo precisa ser maior que zero.");
  }

  const reviewItems = analysis.edit_suggestions.filter(item =>
    item.type === "review_pause" &&
    Number.isFinite(item.start_seconds) &&
    Number.isFinite(item.end_seconds) &&
    item.start_seconds >= 0 &&
    item.end_seconds > item.start_seconds &&
    item.end_seconds <= analysis.duration_seconds &&
    item.automatic_cut === false
  );

  return {
    schema_version: 1,
    status: "needs_review",
    source: { filename: analysis.input, duration_seconds: analysis.duration_seconds },
    output,
    segments: [{
      id: "segment-1",
      source_start_seconds: 0,
      source_end_seconds: analysis.duration_seconds,
      timeline_start_seconds: 0,
      duration_seconds: analysis.duration_seconds,
      decision: "keep"
    }],
    review_items: reviewItems,
    audio: { normalize: true, target_integrated_lufs: -16, true_peak_db: -1.5 },
    captions: { mode: "not_provided", tracks: [] },
    overlays: [],
    safety: { source_modified: false, cuts_applied: false, requires_human_review: true }
  };
}

/** Validate timeline invariants before a plan can be rendered. */
export function validateEditPlan(plan: EditPlan): string[] {
  const errors: string[] = [];
  if (plan.schema_version !== 1) errors.push("Versão de schema não suportada.");
  if (plan.source.duration_seconds <= 0 || !Number.isFinite(plan.source.duration_seconds)) {
    errors.push("Duração da origem inválida.");
  }
  if (!plan.segments.length) errors.push("O plano precisa conter ao menos um segmento.");
  let expectedTimelineStart = 0;
  let previousSourceStart = -1;
  for (const [index, segment] of plan.segments.entries()) {
    if (!Number.isFinite(segment.source_start_seconds) || segment.source_start_seconds < 0) errors.push(`Segmento ${index + 1}: início inválido.`);
    if (!Number.isFinite(segment.source_end_seconds) || segment.source_end_seconds <= segment.source_start_seconds) errors.push(`Segmento ${index + 1}: intervalo inválido.`);
    if (segment.source_end_seconds > plan.source.duration_seconds) errors.push(`Segmento ${index + 1}: ultrapassa a duração original.`);
    if (Math.abs(segment.duration_seconds - (segment.source_end_seconds - segment.source_start_seconds)) > 0.01) {
      errors.push(`Segmento ${index + 1}: duração inconsistente.`);
    }
    if (Math.abs(segment.timeline_start_seconds - expectedTimelineStart) > 0.01) errors.push(`Segmento ${index + 1}: timeline precisa ser contínua.`);
    if (segment.source_start_seconds < previousSourceStart) errors.push(`Segmento ${index + 1}: ordem da origem inválida.`);
    expectedTimelineStart += segment.duration_seconds;
    previousSourceStart = segment.source_start_seconds;
  }
  if (plan.safety.source_modified || plan.safety.cuts_applied) {
    errors.push("Plano não pode declarar alterações no original ou cortes já aplicados.");
  }
  if (plan.status === "approved" && (plan.safety.requires_human_review || plan.review_items.length > 0)) {
    errors.push("Plano aprovado não pode manter revisões humanas pendentes.");
  }
  if (plan.status === "needs_review" && !plan.safety.requires_human_review) {
    errors.push("Plano pendente precisa exigir revisão humana.");
  }
  return errors;
}
