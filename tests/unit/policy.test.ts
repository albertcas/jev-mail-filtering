import { describe, expect, it } from "vitest";
import { decide } from "@/core/policy/decide";
import { DEFAULT_THRESHOLDS, parseThresholds } from "@/core/policy/thresholds";
import { sortForColumn } from "@/core/policy/sort";
import type { JevAnswers } from "@/core/classify/answers";
import type { Signals } from "@/core/types";

const cleanSignals: Signals = {
  sender_authentication: "pass", reply_to_differs_from_sender: false, domain_resembles: null,
  has_unsubscribe_header: false, recipient_has_replied_in_thread: false,
  recipient_has_written_to_sender_before: false, risky_attachments: false, mismatched_links: false,
};
function answers(over: Partial<{ choice: JevAnswers["category"]["choice"]; confidence: number; p: Partial<JevAnswers["category"]["probabilities"]>; nouls: Partial<JevAnswers["nouls"]>; urgency: number }> = {}): JevAnswers {
  const probabilities = { needs_reply: 0.05, worth_reading: 0.05, commercial: 0.05, possible_scam: 0.05, none: 0.05, ...over.p };
  return {
    model: "jev-1.13.0", inputTokens: 900,
    category: { choice: over.choice ?? "needs_reply", confidence: over.confidence ?? 0.8, probabilities },
    nouls: { asks_recipient_to_act: 0.1, personal_not_bulk: 0.1, promotional: 0.1, impersonation: 0.1, pressure_tactics: 0.1, requests_sensitive_data: 0.1, addresses_the_classifier: 0.1, ...over.nouls },
    urgency: { score: over.urgency ?? 1, confidence: 0.6 },
  };
}
const T = DEFAULT_THRESHOLDS;

describe("decide", () => {
  it("uses the top category when confident", () => {
    const d = decide(answers({ choice: "needs_reply", confidence: 0.8, p: { needs_reply: 0.85 }, urgency: 2.4 }), cleanSignals, T);
    expect(d).toMatchObject({ category: "needs_reply", confidence: 0.8, urgency: 2.4 });
  });
  it("falls back to unsure below minConfidence", () => {
    expect(decide(answers({ choice: "worth_reading", confidence: 0.3 }), cleanSignals, T).category).toBe("unsure");
  });
  it("safety first: scam probability overrides the choice", () => {
    const d = decide(answers({ choice: "worth_reading", confidence: 0.9, p: { possible_scam: 0.55 } }), cleanSignals, T);
    expect(d.category).toBe("possible_scam");
    expect(d.urgency).toBeNull();
  });
  it("safety first: sensitive-data request plus suspicious signal", () => {
    const d = decide(answers({ nouls: { requests_sensitive_data: 0.8 } }), { ...cleanSignals, sender_authentication: "fail" }, T);
    expect(d.category).toBe("possible_scam");
    expect(d.reasons.map((r) => r.key)).toEqual(expect.arrayContaining(["reason.authFailed", "reason.requestsSensitiveData"]));
  });
  it("sensitive-data request from an authenticated, non-lookalike sender is not auto-scam", () => {
    expect(decide(answers({ nouls: { requests_sensitive_data: 0.8 } }), cleanSignals, T).category).toBe("needs_reply");
  });
  it("text that addresses the classifier is treated as scam", () => {
    expect(decide(answers({ choice: "needs_reply", nouls: { addresses_the_classifier: 0.9 } }), cleanSignals, T).category).toBe("possible_scam");
  });
  it("scam choice below the scam threshold becomes unsure", () => {
    const d = decide(answers({ choice: "possible_scam", confidence: 0.6, p: { possible_scam: 0.7 } }), cleanSignals, { ...T, scam: 0.8 });
    expect(d.category).toBe("unsure");
  });
  it("commercial boost with unsubscribe header and promotional noul", () => {
    const d = decide(answers({ choice: "worth_reading", confidence: 0.7, nouls: { promotional: 0.9 } }), { ...cleanSignals, has_unsubscribe_header: true }, T);
    expect(d.category).toBe("commercial");
    expect(d.confidence).toBe(0.9);
  });
  it("never boosts needs_reply to commercial", () => {
    const d = decide(answers({ choice: "needs_reply", nouls: { promotional: 0.9 } }), { ...cleanSignals, has_unsubscribe_header: true }, T);
    expect(d.category).toBe("needs_reply");
  });
  it("builds reasons with params", () => {
    const d = decide(answers({ p: { possible_scam: 0.9 } }), { ...cleanSignals, domain_resembles: "paypal" }, T);
    expect(d.reasons[0]).toEqual({ key: "reason.resembles", params: { brand: "paypal" } });
  });
});

describe("parseThresholds (Review Focus #5)", () => {
  it("returns defaults for garbage and clamps out-of-range", () => {
    expect(parseThresholds(undefined)).toEqual(DEFAULT_THRESHOLDS);
    expect(parseThresholds({ scam: "abc", minConfidence: Number.NaN, strongNoul: -1 })).toEqual({ ...DEFAULT_THRESHOLDS, strongNoul: 0 });
    expect(parseThresholds({ scam: "0.3", minConfidence: 2 })).toEqual({ ...DEFAULT_THRESHOLDS, scam: 0.3, minConfidence: 1 });
  });
  it("treats blank/whitespace strings and null as invalid, falls back to defaults", () => {
    expect(parseThresholds({ scam: "", minConfidence: null, strongNoul: "  " })).toEqual(DEFAULT_THRESHOLDS);
  });
});

describe("sortForColumn", () => {
  it("orders needs_reply by urgency then date; others by date", () => {
    const mk = (id: number, category: "needs_reply" | "commercial", urgency: number | null, date: number) =>
      ({ id, date, decision: { category, confidence: 1, reasons: [], urgency } });
    const sorted = sortForColumn([mk(1, "needs_reply", 1, 300), mk(2, "needs_reply", 3, 100), mk(3, "needs_reply", 3, 200)]);
    expect(sorted.map((x) => x.id)).toEqual([3, 2, 1]);
    const other = sortForColumn([mk(1, "commercial", null, 100), mk(2, "commercial", null, 300)]);
    expect(other.map((x) => x.id)).toEqual([2, 1]);
  });
});
