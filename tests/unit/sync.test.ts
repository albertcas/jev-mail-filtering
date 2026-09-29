import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { AuthenticationError } from "@typesafe-ai/sdk";
import { openDatabase } from "@/core/store/db";
import { createRepo } from "@/core/store/repo";
import { FixtureMailSource } from "@/core/mail/fixture-source";
import { runSync, SyncRunner, type SyncDeps } from "@/core/sync/run-sync";
import type { Classifier } from "@/core/classify/jev-classifier";
import type { JevAnswers } from "@/core/classify/answers";

const fx = join(fileURLToPath(new URL(".", import.meta.url)), "../fixtures");
const okAnswers: JevAnswers = {
  model: "jev-1.13.0", inputTokens: 700,
  category: { choice: "worth_reading", confidence: 0.7, probabilities: { needs_reply: 0.1, worth_reading: 0.7, commercial: 0.1, possible_scam: 0.05, none: 0.05 } },
  nouls: { asks_recipient_to_act: 0.1, personal_not_bulk: 0.2, promotional: 0.3, impersonation: 0, pressure_tactics: 0, requests_sensitive_data: 0, addresses_the_classifier: 0 },
  urgency: { score: 0.2, confidence: 0.7 },
};
function deps(classifier: Classifier): SyncDeps {
  return {
    repo: createRepo(openDatabase(":memory:")),
    source: new FixtureMailSource({ emlDir: fx, contextFile: join(fx, "context.json") }),
    classifier,
    recipient: { name: "Yo", address: "yo@mail.com" },
    folder: "INBOX",
    days: 14,
    now: () => new Date("2026-09-29T12:00:00Z"),
  };
}

describe("runSync", () => {
  it("ingests, classifies and advances the cursor; second run is a no-op", async () => {
    const classify = vi.fn(async () => okAnswers);
    const d = deps({ classify });
    expect(await runSync(d)).toEqual({ fetched: 3, classified: 3, failed: 0, error: null });
    expect(d.repo.getMailbox("INBOX")).toMatchObject({ uidValidity: 1, lastUid: 3 });
    expect(await runSync(d)).toEqual({ fetched: 0, classified: 0, failed: 0, error: null });
    expect(classify).toHaveBeenCalledTimes(3);
  });
  it("keeps failures pending and retries them next run", async () => {
    let fail = true;
    const d = deps({ classify: async () => { if (fail) throw new Error("boom"); return okAnswers; } });
    expect(await runSync(d)).toMatchObject({ classified: 0, failed: 3, error: null });
    fail = false;
    expect(await runSync(d)).toMatchObject({ fetched: 0, classified: 3, failed: 0 });
  });
  it("stops on Jev authentication errors", async () => {
    const d = deps({ classify: async () => { throw new AuthenticationError(401, undefined, new Headers(), "bad key"); } });
    expect((await runSync(d)).error).toBe("jev_auth");
  });
  it("re-reads the window without duplicates when UIDVALIDITY changes (Review Focus #3)", async () => {
    const d = deps({ classify: async () => okAnswers });
    await runSync(d);
    d.repo.setMailbox("INBOX", 999, 3);
    expect(await runSync(d)).toMatchObject({ fetched: 0, classified: 0 });
    expect(d.repo.listClassified()).toHaveLength(3);
  });
});

describe("SyncRunner", () => {
  it("coalesces concurrent triggers", async () => {
    const d = deps({ classify: async () => okAnswers });
    const make = vi.fn(async () => d);
    const r = new SyncRunner(make);
    const [a, b] = await Promise.all([r.trigger(), r.trigger()]);
    expect(a).toBe(b);
    expect(make).toHaveBeenCalledTimes(1);
  });
  it("returns null when not configured", async () => {
    expect(await new SyncRunner(async () => null).trigger()).toBeNull();
  });
});
