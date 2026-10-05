import { describe, expect, it, vi } from "vitest";
import { DEFAULT_MODEL } from "@/core/config";
import { buildState, BODY_EXCERPT_MAX } from "@/core/classify/state";
import { JevClassifier } from "@/core/classify/jev-classifier";
import { CachedClassifier, CacheMissError, RecordingClassifier, cacheKey } from "@/core/classify/cached-classifier";
import type { RawMessage, Signals } from "@/core/types";

const msg: RawMessage = {
  folder: "INBOX", uid: 7, messageId: "<a@b>", inReplyTo: null, references: [],
  from: { name: "Shop", address: "news@shop.com" }, replyTo: null, to: ["yo@mail.com"],
  subject: "Oferta", date: new Date("2026-09-01"), text: "x".repeat(1_000_000),
  links: [{ text: "a", href: "https://shop.com/a" }, { text: "b", href: "https://cdn.shop.com/b" }, { text: "c", href: "https://other.net" }],
  attachments: [{ filename: "cat.pdf", contentType: "application/pdf" }], authenticationResults: [], listUnsubscribe: null,
};
const signals: Signals = {
  sender_authentication: "pass", reply_to_differs_from_sender: false, domain_resembles: null,
  has_unsubscribe_header: true, recipient_has_replied_in_thread: false,
  recipient_has_written_to_sender_before: false, risky_attachments: false, mismatched_links: false,
};

describe("buildState (Review Focus #2)", () => {
  it("truncates the body and dedupes link domains", () => {
    const s = buildState(msg, signals, { name: "Yo", address: "yo@mail.com" });
    expect(s.email.body_excerpt.length).toBeLessThanOrEqual(BODY_EXCERPT_MAX);
    expect(s.email.link_domains).toEqual(["shop.com", "other.net"]);
    expect(s.email.attachment_names).toEqual(["cat.pdf"]);
    expect(JSON.stringify(s)).not.toContain("2026"); // no dates are sent
  });
});

const apiResponse = {
  model: "jev-1.13.0",
  usage: { input_tokens: 812, output_tokens: 0 },
  answers: {
    category: { type: "choice", choice: "commercial", confidence: 0.7, probabilities: { needs_reply: 0.02, worth_reading: 0.1, commercial: 0.8, possible_scam: 0.03, none: 0.05 } },
    asks_recipient_to_act: { type: "noul", noul: 0.1 },
    personal_not_bulk: { type: "noul", noul: 0.05 },
    promotional: { type: "noul", noul: 0.95 },
    impersonation: { type: "noul", noul: 0.01 },
    pressure_tactics: { type: "noul", noul: 0.2 },
    requests_sensitive_data: { type: "noul", noul: 0.01 },
    addresses_the_classifier: { type: "noul", noul: 0.0 },
    urgency: { type: "score", score: 0.4, confidence: 0.7, legend: {}, probabilities: {} },
  },
};

describe("JevClassifier", () => {
  it("sends one request with all questions and maps the answers", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(apiResponse), { status: 200, headers: { "content-type": "application/json" } }));
    const c = new JevClassifier({ apiKey: "test-key", fetch: fetchMock });
    const state = buildState(msg, signals, { name: "Yo", address: "yo@mail.com" });
    const a = await c.classify(state);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(Object.keys(body.questions)).toHaveLength(9);
    expect(body.model).toBe(DEFAULT_MODEL);
    expect(a).toMatchObject({ model: "jev-1.13.0", inputTokens: 812, category: { choice: "commercial" }, nouls: { promotional: 0.95 }, urgency: { score: 0.4 } });
  });
  it("rejects malformed answers", async () => {
    const bad = { ...apiResponse, answers: { ...apiResponse.answers, promotional: { type: "noul", noul: 7 } } };
    const c = new JevClassifier({ apiKey: "k", fetch: async () => new Response(JSON.stringify(bad), { status: 200, headers: { "content-type": "application/json" } }) });
    await expect(c.classify(buildState(msg, signals, { name: "", address: "yo@mail.com" }))).rejects.toThrow();
  });
});

describe("CachedClassifier / RecordingClassifier", () => {
  it("replays recorded answers by state hash and throws on miss", async () => {
    const state = buildState(msg, signals, { name: "Yo", address: "yo@mail.com" });
    const inner = { classify: vi.fn(async () => ({ model: "m", inputTokens: 1, category: { choice: "none" as const, confidence: 1, probabilities: { needs_reply: 0, worth_reading: 0, commercial: 0, possible_scam: 0, none: 1 } }, nouls: { asks_recipient_to_act: 0, personal_not_bulk: 0, promotional: 0, impersonation: 0, pressure_tactics: 0, requests_sensitive_data: 0, addresses_the_classifier: 0 }, urgency: { score: 0, confidence: 1 } })) };
    const rec = new RecordingClassifier(inner);
    const recorded = await rec.classify(state);
    const cached = new CachedClassifier(rec.entries());
    expect(await cached.classify(state)).toEqual(recorded);
    expect(Object.keys(rec.entries())).toEqual([cacheKey(state)]);
    await expect(cached.classify({ ...state, email: { ...state.email, subject: "otro" } })).rejects.toBeInstanceOf(CacheMissError);
  });
});
