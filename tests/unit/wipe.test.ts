import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { JevAnswers } from "@/core/classify/answers";
import { FixtureMailSource } from "@/core/mail/fixture-source";
import { MemorySecretStore } from "@/core/secrets";
import { openDatabase } from "@/core/store/db";
import { createRepo } from "@/core/store/repo";
import { SyncRunner } from "@/core/sync/run-sync";
import { wipeLocalData } from "@/server/wipe";

const fx = join(fileURLToPath(new URL(".", import.meta.url)), "../fixtures");
const answers: JevAnswers = {
  model: "jev-1.13.0", inputTokens: 700,
  category: { choice: "worth_reading", confidence: 0.7, probabilities: { needs_reply: 0.1, worth_reading: 0.7, commercial: 0.1, possible_scam: 0.05, none: 0.05 } },
  nouls: { asks_recipient_to_act: 0.1, personal_not_bulk: 0.2, promotional: 0.3, impersonation: 0, pressure_tactics: 0, requests_sensitive_data: 0, addresses_the_classifier: 0 },
  urgency: { score: 0.2, confidence: 0.7 },
};

describe("wipeLocalData", () => {
  it("waits for an in-flight sync so nothing is re-inserted after the wipe", async () => {
    const repo = createRepo(openDatabase(":memory:"));
    const secrets = new MemorySecretStore();
    await secrets.set("typesafe_api_key", "ts_dummy");
    await secrets.set("imap_password", "dummy");
    // The fetch finishes only after the wipe was requested.
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const source = new FixtureMailSource({ emlDir: fx, contextFile: join(fx, "context.json") });
    const fetchNew = source.fetchNew.bind(source);
    source.fetchNew = async (o) => { await gate; return fetchNew(o); };
    const runner = new SyncRunner(async () => ({
      repo, source, classifier: { classify: async () => answers },
      recipient: { name: "Yo", address: "yo@mail.com" }, folder: "INBOX", days: 14,
      now: () => new Date("2026-09-29T12:00:00Z"),
    }));
    runner.start(15);
    void runner.trigger();
    await new Promise((r) => setTimeout(r, 10));
    const wiping = wipeLocalData({ repo, runner, secrets });
    release();
    await wiping;
    expect(runner.isRunning).toBe(false);
    expect(repo.getMailbox("INBOX")).toBeNull();
    expect(repo.listClassified()).toHaveLength(0);
    expect(repo.countPending()).toBe(0);
    expect(repo.lastRun()).toBeNull();
    expect(await secrets.get("typesafe_api_key")).toBeNull();
    expect(await secrets.get("imap_password")).toBeNull();
  });
});
