import { desc, eq, sql } from "drizzle-orm";
import type { Db } from "./db";
import { classifications, mailboxes, messages, overrides, settings, syncRuns } from "./schema";
import { JevAnswersSchema, type JevAnswers } from "@/core/classify/answers";
import { AppConfigSchema, type AppConfig } from "@/core/config";
import { DEFAULT_THRESHOLDS, parseThresholds, type Thresholds } from "@/core/policy/thresholds";

export type NewMessage = typeof messages.$inferInsert;
export type StoredMessage = typeof messages.$inferSelect;
export type ClassifiedRow = StoredMessage & { answers: JevAnswers; model: string; override: string | null };
export type RunResult = { fetched: number; classified: number; failed: number; error: string | null };
export type RunRow = typeof syncRuns.$inferSelect;

export function createRepo(db: Db) {
  function getSetting(key: string): unknown {
    const row = db.select().from(settings).where(eq(settings.key, key)).get();
    return row ? JSON.parse(row.valueJson) : undefined;
  }
  function setSetting(key: string, value: unknown) {
    const valueJson = JSON.stringify(value);
    db.insert(settings).values({ key, valueJson }).onConflictDoUpdate({ target: settings.key, set: { valueJson } }).run();
  }

  return {
    getMailbox(folder: string) {
      return db.select().from(mailboxes).where(eq(mailboxes.folder, folder)).get() ?? null;
    },
    setMailbox(folder: string, uidValidity: number, lastUid: number) {
      db.insert(mailboxes).values({ folder, uidValidity, lastUid })
        .onConflictDoUpdate({ target: mailboxes.folder, set: { uidValidity, lastUid } }).run();
    },
    insertMessage(m: NewMessage): boolean {
      return db.insert(messages).values(m).onConflictDoNothing({ target: messages.messageId }).run().changes > 0;
    },
    listPending(limit: number): StoredMessage[] {
      return db.select().from(messages).where(eq(messages.status, "pending")).orderBy(desc(messages.date)).limit(limit).all();
    },
    countPending(): number {
      return db.select({ n: sql<number>`count(*)` }).from(messages).where(eq(messages.status, "pending")).get()!.n;
    },
    saveClassification(id: number, a: JevAnswers, now: Date) {
      db.transaction((tx) => {
        const values = { messageId: id, model: a.model, answersJson: JSON.stringify(a), inputTokens: a.inputTokens, classifiedAt: now.getTime() };
        tx.insert(classifications).values(values).onConflictDoUpdate({ target: classifications.messageId, set: values }).run();
        tx.update(messages).set({ status: "classified" }).where(eq(messages.id, id)).run();
      });
    },
    recordFailure(id: number) {
      db.update(messages).set({ attempts: sql`${messages.attempts} + 1` }).where(eq(messages.id, id)).run();
    },
    listClassified(): ClassifiedRow[] {
      const rows = db
        .select({ m: messages, c: classifications, o: overrides })
        .from(messages)
        .innerJoin(classifications, eq(classifications.messageId, messages.id))
        .leftJoin(overrides, eq(overrides.messageId, messages.id))
        .orderBy(desc(messages.date))
        .all();
      return rows.map(({ m, c, o }) => ({
        ...m,
        model: c.model,
        answers: JevAnswersSchema.parse(JSON.parse(c.answersJson)),
        override: o?.category ?? null,
      }));
    },
    setOverride(id: number, category: string | null, now: Date) {
      if (category === null) {
        db.delete(overrides).where(eq(overrides.messageId, id)).run();
        return;
      }
      db.insert(overrides).values({ messageId: id, category, createdAt: now.getTime() })
        .onConflictDoUpdate({ target: overrides.messageId, set: { category, createdAt: now.getTime() } }).run();
    },
    getConfig(): AppConfig | null {
      const raw = getSetting("config");
      const parsed = AppConfigSchema.safeParse(raw);
      return parsed.success ? parsed.data : null;
    },
    setConfig(c: AppConfig) {
      setSetting("config", AppConfigSchema.parse(c));
    },
    getThresholds(): Thresholds {
      const raw = getSetting("thresholds");
      return raw === undefined ? DEFAULT_THRESHOLDS : parseThresholds(raw);
    },
    setThresholds(t: Thresholds) {
      setSetting("thresholds", parseThresholds(t));
    },
    startRun(now: Date): number {
      return Number(db.insert(syncRuns).values({ startedAt: now.getTime() }).run().lastInsertRowid);
    },
    finishRun(id: number, r: RunResult, now: Date) {
      db.update(syncRuns).set({ ...r, finishedAt: now.getTime() }).where(eq(syncRuns.id, id)).run();
    },
    lastRun(): RunRow | null {
      return db.select().from(syncRuns).orderBy(desc(syncRuns.id)).limit(1).get() ?? null;
    },
    totalInputTokens(): number {
      return db.select({ n: sql<number>`coalesce(sum(${classifications.inputTokens}), 0)` }).from(classifications).get()!.n;
    },
    wipe() {
      db.transaction((tx) => {
        for (const t of [overrides, classifications, messages, mailboxes, syncRuns, settings]) tx.delete(t).run();
      });
    },
  };
}
export type Repo = ReturnType<typeof createRepo>;
