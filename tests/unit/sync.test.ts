import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { AuthenticationError, PermissionDeniedError } from "@typesafe-ai/sdk";
import { openDatabase } from "@/core/store/db";
import { createRepo } from "@/core/store/repo";
import { FixtureMailSource } from "@/core/mail/fixture-source";
import { ImapAuthError } from "@/core/mail/imap-source";
import type { MailSource } from "@/core/mail/source";
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

function failingSource(err: Error): MailSource {
  return {
    fetchNew: async () => { throw err; },
    loadContext: async (recipient) => ({ recipient, sentMessageIds: new Set(), sentRecipients: new Set() }),
    countSince: async () => 0,
    listFolders: async () => [],
    close: async () => {},
  };
}

describe("runSync failure modes", () => {
  it("imap auth error: no classification, run recorded", async () => {
    const classify = vi.fn(async () => okAnswers);
    const d = { ...deps({ classify }), source: failingSource(new ImapAuthError()) };
    expect((await runSync(d)).error).toBe("imap_auth");
    expect(classify).not.toHaveBeenCalled();
    expect(d.repo.lastRun()).toMatchObject({ error: "imap_auth" });
    expect(d.repo.lastRun()?.finishedAt).not.toBeNull();
  });
  it("imap unavailable still classifies pending messages", async () => {
    const base = deps({ classify: async () => { throw new Error("boom"); } });
    await runSync(base);
    expect(base.repo.countPending()).toBe(3);
    const d = { ...base, classifier: { classify: async () => okAnswers }, source: failingSource(new Error("down")) };
    expect(await runSync(d)).toMatchObject({ error: "imap_unavailable", classified: 3, failed: 0 });
    expect(d.repo.countPending()).toBe(0);
  });
  it("jev auth stops all workers before returning", async () => {
    let calls = 0;
    const classify = async () => {
      if (calls++ === 0) throw new AuthenticationError(401, undefined, new Headers(), "bad key");
      await new Promise((r) => setTimeout(r, 20));
      return okAnswers;
    };
    const d = { ...deps({ classify }), concurrency: 4 };
    const report = await runSync(d);
    expect(report.error).toBe("jev_auth");
    const before = calls;
    await new Promise((r) => setTimeout(r, 60));
    expect(calls).toBe(before);
    expect(d.repo.lastRun()).toMatchObject({ fetched: report.fetched, classified: report.classified, failed: report.failed, error: "jev_auth" });
  });
  it("permission denied is also jev_auth", async () => {
    const d = deps({ classify: async () => { throw new PermissionDeniedError(403, undefined, new Headers(), "no"); } });
    expect((await runSync(d)).error).toBe("jev_auth");
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
  it("closes the source, and can run again after completion", async () => {
    const d = deps({ classify: async () => okAnswers });
    const close = vi.spyOn(d.source, "close");
    const make = vi.fn(async () => d);
    const r = new SyncRunner(make);
    await r.trigger();
    expect(close).toHaveBeenCalledTimes(1);
    expect(r.isRunning).toBe(false);
    await r.trigger();
    expect(make).toHaveBeenCalledTimes(2);
  });
  it("recovers when makeDeps throws synchronously", async () => {
    const d = deps({ classify: async () => okAnswers });
    let first = true;
    const r = new SyncRunner((() => {
      if (first) { first = false; throw new Error("sync boom"); }
      return Promise.resolve(d);
    }) as () => Promise<SyncDeps | null>);
    await expect(r.trigger()).rejects.toThrow("sync boom");
    expect(r.isRunning).toBe(false);
    expect(await r.trigger()).toMatchObject({ classified: 3 });
  });
  it("whenIdle resolves at once when idle and only after the in-flight run otherwise", async () => {
    await new SyncRunner(async () => null).whenIdle();
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const d = deps({ classify: async () => { await gate; return okAnswers; } });
    const r = new SyncRunner(async () => d);
    void r.trigger();
    let idle = false;
    const waiting = r.whenIdle().then(() => { idle = true; });
    await new Promise((res) => setTimeout(res, 20));
    expect(idle).toBe(false);
    release();
    await waiting;
    expect(r.isRunning).toBe(false);
    expect(d.repo.countPending()).toBe(0);
  });
  it("whenIdle never rejects, even when the run fails", async () => {
    const r = new SyncRunner(async () => { throw new Error("boom"); });
    const run = r.trigger();
    await expect(r.whenIdle()).resolves.toBeUndefined();
    await expect(run).rejects.toThrow("boom");
  });
});
