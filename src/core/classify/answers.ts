import { z } from "zod";

export const CATEGORY_LABELS = ["needs_reply", "worth_reading", "commercial", "possible_scam", "none"] as const;
export type CategoryLabel = (typeof CATEGORY_LABELS)[number];

export const NOUL_IDS = [
  "asks_recipient_to_act",
  "personal_not_bulk",
  "promotional",
  "impersonation",
  "pressure_tactics",
  "requests_sensitive_data",
  "addresses_the_classifier",
] as const;
export type NoulId = (typeof NOUL_IDS)[number];

const prob = z.number().min(0).max(1);

export const JevAnswersSchema = z.object({
  model: z.string().min(1),
  inputTokens: z.number().int().nonnegative(),
  category: z.object({
    choice: z.enum(CATEGORY_LABELS),
    confidence: prob,
    probabilities: z.object(Object.fromEntries(CATEGORY_LABELS.map((l) => [l, prob])) as Record<CategoryLabel, typeof prob>),
  }),
  nouls: z.object(Object.fromEntries(NOUL_IDS.map((id) => [id, prob])) as Record<NoulId, typeof prob>),
  urgency: z.object({ score: z.number().min(0).max(3), confidence: prob }),
});
export type JevAnswers = z.infer<typeof JevAnswersSchema>;
