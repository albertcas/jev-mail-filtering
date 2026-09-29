import type { CategoryLabel, JevAnswers } from "@/core/classify/answers";
import type { Signals } from "@/core/types";
import type { Thresholds } from "./thresholds";
import { collectReasons, type Reason } from "./reasons";

export type DisplayCategory = CategoryLabel | "unsure";
export type Decision = { category: DisplayCategory; confidence: number; reasons: Reason[]; urgency: number | null };

export function decide(a: JevAnswers, s: Signals, t: Thresholds): Decision {
  const reasons = collectReasons(a, s, t.strongNoul);
  const pScam = a.category.probabilities.possible_scam;
  const suspicious = s.sender_authentication === "fail" || s.domain_resembles !== null || s.mismatched_links;
  const sensitiveHit = a.nouls.requests_sensitive_data >= t.strongNoul && suspicious;
  const classifierHit = a.nouls.addresses_the_classifier >= t.strongNoul;

  if (pScam >= t.scam || sensitiveHit || classifierHit) {
    const confidence = Math.max(
      pScam,
      sensitiveHit ? a.nouls.requests_sensitive_data : 0,
      classifierHit ? a.nouls.addresses_the_classifier : 0,
    );
    return { category: "possible_scam", confidence, reasons, urgency: null };
  }

  let category: DisplayCategory = a.category.confidence >= t.minConfidence ? a.category.choice : "unsure";
  // A scam choice that did not pass the scam threshold is not trusted either way.
  if (category === "possible_scam") category = "unsure";

  let confidence = a.category.confidence;
  if (category !== "needs_reply" && s.has_unsubscribe_header && a.nouls.promotional >= t.strongNoul) {
    if (category !== "commercial") confidence = a.nouls.promotional;
    category = "commercial";
  }

  return { category, confidence, reasons, urgency: category === "needs_reply" ? a.urgency.score : null };
}
