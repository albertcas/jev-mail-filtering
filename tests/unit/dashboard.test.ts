import { describe, expect, it } from "vitest";
import { toDashboardItems } from "@/server/dashboard";
import { DEFAULT_THRESHOLDS } from "@/core/policy/thresholds";
import type { ClassifiedRow } from "@/core/store/repo";

const row = (over: Partial<ClassifiedRow>): ClassifiedRow => ({
  id: 1, messageId: "<a@b>", folder: "INBOX", uid: 1, fromName: "Ana", fromAddress: "ana@x.es", subject: "S",
  date: 1000, excerpt: "E", signalsJson: JSON.stringify({ sender_authentication: "pass", reply_to_differs_from_sender: false, domain_resembles: null, has_unsubscribe_header: false, recipient_has_replied_in_thread: false, recipient_has_written_to_sender_before: false, risky_attachments: false, mismatched_links: false }),
  stateJson: "{}", status: "classified", attempts: 0, createdAt: 1, model: "jev-1.13.0", override: null,
  answers: {
    model: "jev-1.13.0", inputTokens: 1,
    category: { choice: "worth_reading", confidence: 0.9, probabilities: { needs_reply: 0.02, worth_reading: 0.9, commercial: 0.04, possible_scam: 0.02, none: 0.02 } },
    nouls: { asks_recipient_to_act: 0, personal_not_bulk: 0, promotional: 0, impersonation: 0, pressure_tactics: 0, requests_sensitive_data: 0, addresses_the_classifier: 0 },
    urgency: { score: 0, confidence: 1 },
  },
  ...over,
});

describe("toDashboardItems", () => {
  it("applies the policy and exposes detail without secrets or state", () => {
    const [item] = toDashboardItems([row({})], DEFAULT_THRESHOLDS);
    expect(item!.category).toBe("worth_reading");
    expect(item!.detail.probabilities.worth_reading).toBe(0.9);
    expect(JSON.stringify(item)).not.toContain("stateJson");
  });
  it("manual override wins and is flagged", () => {
    const [item] = toDashboardItems([row({ override: "commercial" })], DEFAULT_THRESHOLDS);
    expect(item!.category).toBe("commercial");
    expect(item!.reasons[0]).toEqual({ key: "reason.manualOverride" });
  });
});
