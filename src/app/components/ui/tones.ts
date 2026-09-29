/**
 * Visual tones shared by the primitives. These are presentation keys, not
 * business categories: the dashboard maps its DisplayCategory to a tone.
 * Class names are written out in full so Tailwind can see them.
 */
export type CategoryTone =
  | "needs-reply"
  | "worth-reading"
  | "commercial"
  | "possible-scam"
  | "unsure"
  | "none";

export type StatusTone = "info" | "success" | "warning" | "danger";

/** Text in the category's voice on its quiet tint (>= 4.5:1 in both modes). */
export const categoryTint: Record<CategoryTone, string> = {
  "needs-reply": "bg-cat-needs-reply-tint text-cat-needs-reply-ink",
  "worth-reading": "bg-cat-worth-reading-tint text-cat-worth-reading-ink",
  commercial: "bg-cat-commercial-tint text-cat-commercial-ink",
  "possible-scam": "bg-cat-possible-scam-tint text-cat-possible-scam-ink",
  unsure: "bg-cat-unsure-tint text-cat-unsure-ink",
  none: "bg-cat-none-tint text-cat-none-ink",
};

/** Solid category mark (dots, meter fills, rules). >= 3:1 on canvas/surface. */
export const categoryMark: Record<CategoryTone, string> = {
  "needs-reply": "bg-cat-needs-reply",
  "worth-reading": "bg-cat-worth-reading",
  commercial: "bg-cat-commercial",
  "possible-scam": "bg-cat-possible-scam",
  unsure: "bg-cat-unsure",
  none: "bg-cat-none",
};

export const statusTint: Record<StatusTone, string> = {
  info: "bg-info-tint text-info",
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning",
  danger: "bg-danger-tint text-danger",
};
