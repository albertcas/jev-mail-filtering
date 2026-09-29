import type { JevAnswers, NoulId } from "@/core/classify/answers";
import type { Signals } from "@/core/types";

export type Reason = { key: string; params?: Record<string, string> };

const NOUL_REASON: Record<NoulId, string> = {
  impersonation: "reason.impersonation",
  requests_sensitive_data: "reason.requestsSensitiveData",
  pressure_tactics: "reason.pressureTactics",
  addresses_the_classifier: "reason.addressesClassifier",
  asks_recipient_to_act: "reason.asksToAct",
  personal_not_bulk: "reason.personal",
  promotional: "reason.promotional",
};

/** Ordered: scam evidence first, then relationship, then content. */
export function collectReasons(a: JevAnswers, s: Signals, strong: number): Reason[] {
  const r: Reason[] = [];
  if (s.domain_resembles) r.push({ key: "reason.resembles", params: { brand: s.domain_resembles } });
  if (s.sender_authentication === "fail") r.push({ key: "reason.authFailed" });
  if (s.mismatched_links) r.push({ key: "reason.mismatchedLinks" });
  if (s.reply_to_differs_from_sender) r.push({ key: "reason.replyToDiffers" });
  if (s.risky_attachments) r.push({ key: "reason.riskyAttachment" });
  for (const id of ["impersonation", "requests_sensitive_data", "pressure_tactics", "addresses_the_classifier"] as const) {
    if (a.nouls[id] >= strong) r.push({ key: NOUL_REASON[id] });
  }
  if (s.recipient_has_replied_in_thread) r.push({ key: "reason.ongoingThread" });
  if (s.recipient_has_written_to_sender_before) r.push({ key: "reason.knownSender" });
  for (const id of ["asks_recipient_to_act", "personal_not_bulk", "promotional"] as const) {
    if (a.nouls[id] >= strong) r.push({ key: NOUL_REASON[id] });
  }
  if (s.has_unsubscribe_header) r.push({ key: "reason.bulkUnsubscribe" });
  return r;
}
