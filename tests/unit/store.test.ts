import { existsSync, mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { openDatabase } from "@/core/store/db";
import { createRepo, type NewMessage, type Repo } from "@/core/store/repo";
import { DEFAULT_THRESHOLDS } from "@/core/policy/thresholds";
import type { JevAnswers } from "@/core/classify/answers";

const answers: JevAnswers = {
  model: "jev-1.13.0", inputTokens: 900,
  category: { choice: "needs_reply", confidence: 0.8, probabilities: { needs_reply: 0.8, worth_reading: 0.1, commercial: 0.05, possible_scam: 0.03, none: 0.02 } },
  nouls: { asks_recipient_to_act: 0.9, personal_not_bulk: 0.9, promotional: 0.1, impersonation: 0, pressure_tactics: 0.1, requests_sensitive_data: 0, addresses_the_classifier: 0 },
  urgency: { score: 2, confidence: 0.6 },
};
function msg(id: string, date = 1000): NewMessage {
  return {
    messageId: id, folder: "INBOX", uid: 1, fromName: "Ana", fromAddress: "ana@x.es", subject: "Hola",
    date, excerpt: "Hola", signalsJson: "{}", stateJson: "{}", createdAt: 1,
  };
}

let repo: Repo;
beforeEach(() => { repo = createRepo(openDatabase(":memory:")); });

describe("repo", () => {
  it("inserts messages idempotently by Message-ID (Review Focus #4)", () => {
    expect(repo.insertMessage(msg("<a@x>"))).toBe(true);
    expect(repo.insertMessage(msg("<a@x>"))).toBe(false);
    expect(repo.countPending()).toBe(1);
  });
  it("moves a message from pending to classified", () => {
    repo.insertMessage(msg("<a@x>"));
    const [p] = repo.listPending(10, new Date());
    repo.saveClassification(p!.id, answers, new Date(5));
    expect(repo.countPending()).toBe(0);
    const [row] = repo.listClassified();
    expect(row!.answers.category.choice).toBe("needs_reply");
    expect(repo.totalInputTokens()).toBe(900);
  });
  it("keeps failed messages pending, counts attempts and holds them back until the retry time", () => {
    repo.insertMessage(msg("<a@x>"));
    const [p] = repo.listPending(10, new Date(1000));
    repo.recordFailure(p!.id, new Date(5000));
    expect(repo.countPending()).toBe(1);
    expect(repo.listPending(10, new Date(4999))).toEqual([]);
    expect(repo.listPending(10, new Date(5000))[0]!.attempts).toBe(1);
  });
  it("clearRetryDelays makes held-back messages due again without resetting their attempts", () => {
    repo.insertMessage(msg("<a@x>"));
    repo.recordFailure(repo.listPending(10, new Date(1000))[0]!.id, new Date(5000));
    repo.clearRetryDelays();
    expect(repo.listPending(10, new Date(1000))).toMatchObject([{ attempts: 1, nextAttemptAt: 0 }]);
  });
  it("stores overrides and removes them with null", () => {
    repo.insertMessage(msg("<a@x>"));
    const id = repo.listPending(10, new Date())[0]!.id;
    repo.saveClassification(id, answers, new Date());
    repo.setOverride(id, "commercial", new Date());
    expect(repo.listClassified()[0]!.override).toBe("commercial");
    repo.setOverride(id, null, new Date());
    expect(repo.listClassified()[0]!.override).toBeNull();
  });
  it("persists mailbox cursor, config, thresholds and runs; wipe clears all", () => {
    repo.setMailbox("INBOX", 42, 100);
    expect(repo.getMailbox("INBOX")).toEqual({ folder: "INBOX", uidValidity: 42, lastUid: 100 });
    expect(repo.getThresholds()).toEqual(DEFAULT_THRESHOLDS);
    repo.setThresholds({ scam: 0.4, minConfidence: 0.6, strongNoul: 0.8 });
    expect(repo.getThresholds().scam).toBe(0.4);
    const run = repo.startRun(new Date(1));
    repo.finishRun(run, { fetched: 3, classified: 2, failed: 1, error: null }, new Date(2));
    expect(repo.lastRun()).toMatchObject({ fetched: 3, classified: 2, failed: 1, error: null });
    repo.wipe();
    expect(repo.getMailbox("INBOX")).toBeNull();
    expect(repo.lastRun()).toBeNull();
  });
  it("compact vacuums and truncates the WAL after a wipe", () => {
    const dir = mkdtempSync(join(tmpdir(), "jev-store-"));
    const file = join(dir, "data.db");
    const disk = createRepo(openDatabase(file));
    for (let i = 0; i < 50; i++) disk.insertMessage({ ...msg(`<m${i}@x>`), excerpt: "x".repeat(2000) });
    disk.wipe();
    disk.compact();
    expect(disk.countPending()).toBe(0);
    const wal = `${file}-wal`;
    if (existsSync(wal)) expect(statSync(wal).size).toBe(0);
    expect(statSync(file).size).toBeLessThan(50 * 2000);
  });
  it.skipIf(process.platform === "win32")("creates the data dir and DB file owner-only", () => {
    const dir = join(mkdtempSync(join(tmpdir(), "jev-perm-")), "nested");
    openDatabase(join(dir, "data.db"));
    expect(statSync(dir).mode & 0o777).toBe(0o700);
    expect(statSync(join(dir, "data.db")).mode & 0o777).toBe(0o600);
  });
  it("upgrades a database created before retry delays existed, keeping its messages", () => {
    const file = join(mkdtempSync(join(tmpdir(), "jev-v1-")), "data.db");
    const v1 = new Database(file);
    v1.exec(`CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, message_id TEXT NOT NULL UNIQUE, folder TEXT NOT NULL, uid INTEGER NOT NULL,
      from_name TEXT NOT NULL, from_address TEXT NOT NULL, subject TEXT NOT NULL, date INTEGER NOT NULL,
      excerpt TEXT NOT NULL, signals_json TEXT NOT NULL, state_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
      INSERT INTO messages (message_id, folder, uid, from_name, from_address, subject, date, excerpt, signals_json, state_json, attempts, created_at)
        VALUES ('<old@x>', 'INBOX', 1, 'Ana', 'ana@x.es', 'Hola', 1000, 'Hola', '{}', '{}', 7, 1);
      PRAGMA user_version = 1;`);
    v1.close();
    const db = openDatabase(file);
    const upgraded = createRepo(db);
    expect(db.$client.pragma("user_version", { simple: true })).toBe(2);
    // An old failing message is due at once, with its attempt count intact so its next delay is already long.
    expect(upgraded.listPending(10, new Date(0))).toMatchObject([{ messageId: "<old@x>", attempts: 7, nextAttemptAt: 0 }]);
    openDatabase(file); // opening an already-upgraded database is a no-op
  });
});
