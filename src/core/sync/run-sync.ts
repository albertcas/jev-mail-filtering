import { AuthenticationError, PermissionDeniedError } from "@typesafe-ai/sdk";
import type { Classifier } from "@/core/classify/jev-classifier";
import { buildState, excerpt, type JevState } from "@/core/classify/state";
import { CLASSIFY_CONCURRENCY, MAX_MESSAGES_PER_SYNC } from "@/core/config";
import { ImapAuthError } from "@/core/mail/imap-source";
import type { FetchResult, MailSource } from "@/core/mail/source";
import { computeSignals } from "@/core/signals";
import type { Repo } from "@/core/store/repo";
import type { MailContext, Person } from "@/core/types";

export type SyncDeps = {
  repo: Repo; source: MailSource; classifier: Classifier; recipient: Person;
  folder: string; days: number; now?: () => Date; concurrency?: number;
};
export type SyncReport = { fetched: number; classified: number; failed: number; error: null | "imap_auth" | "imap_unavailable" | "jev_auth" };

export async function runSync(d: SyncDeps): Promise<SyncReport> {
  const now = d.now ?? (() => new Date());
  const report: SyncReport = { fetched: 0, classified: 0, failed: 0, error: null };
  const runId = d.repo.startRun(now());
  try {
    // 1. Fetch new messages (read-only). Only source errors map to imap_* codes.
    const cursor = d.repo.getMailbox(d.folder);
    let fetched: FetchResult | null = null;
    let ctx: MailContext | null = null;
    try {
      const sinceDate = new Date(now().getTime() - d.days * 86_400_000);
      fetched = await d.source.fetchNew({
        folder: d.folder, sinceDate, afterUid: cursor?.lastUid ?? 0,
        uidValidity: cursor?.uidValidity ?? null, maxMessages: MAX_MESSAGES_PER_SYNC,
      });
      ctx = await d.source.loadContext(d.recipient);
    } catch (err) {
      fetched = null;
      report.error = err instanceof ImapAuthError ? "imap_auth" : "imap_unavailable";
      if (report.error === "imap_auth") return report;
      // Unavailable IMAP: still try to classify what is already pending.
    }
    if (fetched && ctx) {
      const { uidValidity, messages } = fetched;
      let lastUid = cursor && cursor.uidValidity === uidValidity ? cursor.lastUid : 0;
      for (const m of messages) {
        try {
          const signals = computeSignals(m, ctx);
          const state = buildState(m, signals, d.recipient);
          const inserted = d.repo.insertMessage({
            messageId: m.messageId, folder: m.folder, uid: m.uid, fromName: m.from.name, fromAddress: m.from.address,
            subject: m.subject, date: m.date.getTime(), excerpt: excerpt(m.text).slice(0, 280),
            signalsJson: JSON.stringify(signals), stateJson: JSON.stringify(state), createdAt: now().getTime(),
          });
          if (inserted) report.fetched++;
          lastUid = Math.max(lastUid, m.uid);
        } catch (err) {
          // Isolate a bad message: skip it without aborting the whole fetch.
          console.error(`sync: skipping message uid=${m.uid} in ${m.folder}: ${err instanceof Error ? err.name : "error"}`);
        }
      }
      d.repo.setMailbox(d.folder, uidValidity, lastUid);
    }

    // 2. Classify pending messages with bounded concurrency.
    const pending = d.repo.listPending(MAX_MESSAGES_PER_SYNC);
    let next = 0;
    let stopped = false;
    const worker = async () => {
      while (!stopped && next < pending.length) {
        const msg = pending[next++]!;
        try {
          const answers = await d.classifier.classify(JSON.parse(msg.stateJson) as JevState);
          d.repo.saveClassification(msg.id, answers, now());
          report.classified++;
        } catch (err) {
          if (err instanceof AuthenticationError || err instanceof PermissionDeniedError) {
            // jev_auth takes precedence over imap_unavailable.
            report.error = "jev_auth";
            stopped = true;
            return;
          }
          d.repo.recordFailure(msg.id);
          report.failed++;
        }
      }
    };
    await Promise.all(Array.from({ length: d.concurrency ?? CLASSIFY_CONCURRENCY }, worker));
    return report;
  } finally {
    d.repo.finishRun(runId, report, now());
  }
}

export class SyncRunner {
  #current: Promise<SyncReport | null> | null = null;
  #timer: NodeJS.Timeout | null = null;
  constructor(private readonly makeDeps: () => Promise<SyncDeps | null>) {}

  get isRunning(): boolean {
    return this.#current !== null;
  }

  trigger(): Promise<SyncReport | null> {
    this.#current ??= (async () => {
      try {
        const d = await Promise.resolve().then(() => this.makeDeps());
        if (!d) return null;
        try {
          return await runSync(d);
        } finally {
          await d.source.close();
        }
      } finally {
        this.#current = null;
      }
    })();
    return this.#current;
  }

  start(intervalMinutes: number) {
    this.stop();
    this.#timer = setInterval(() => {
      this.trigger().catch((err: unknown) => {
        console.error(`sync: scheduled run failed: ${err instanceof Error ? err.name : "error"}`);
      });
    }, intervalMinutes * 60_000);
    this.#timer.unref?.();
  }

  stop() {
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = null;
  }
}
