import { ImapFlow, type MailboxObject } from "imapflow";
import type { MailContext, RawMessage } from "@/core/types";
import { parseRawMessage } from "./parse";
import type { FetchResult, FetchWindow, MailSource } from "./source";

export class ImapAuthError extends Error {
  constructor(cause?: unknown) {
    super("IMAP authentication failed", { cause });
    this.name = "ImapAuthError";
  }
}

const SENT_WINDOW_MS = 180 * 86_400_000;

/** Path of the \Sent special-use folder, or null when the server exposes none. */
export function findSentFolder(list: { path: string; specialUse?: string }[]): string | null {
  return list.find((b) => b.specialUse === "\\Sent")?.path ?? null;
}

type Conf = { host: string; port: number; secure: boolean; user: string; password: string };

export class ImapMailSource implements MailSource {
  #client: ImapFlow | null = null;
  constructor(private readonly conf: Conf) {}

  private async client(): Promise<ImapFlow> {
    if (this.#client?.usable) return this.#client;
    const c = new ImapFlow({
      host: this.conf.host,
      port: this.conf.port,
      secure: this.conf.secure,
      auth: { user: this.conf.user, pass: this.conf.password },
      logger: false,
    });
    // imapflow emits 'error' after connect (socket reset/timeout); without a listener Node would crash.
    // `usable` turns false on such failures, so the next client() call rebuilds the connection.
    c.on("error", () => undefined);
    try {
      await c.connect();
    } catch (err) {
      try { c.close(); } catch { /* half-open client: best effort */ }
      if ((err as { authenticationFailed?: boolean }).authenticationFailed) throw new ImapAuthError(err);
      throw err;
    }
    this.#client = c;
    return c;
  }

  async fetchNew(w: FetchWindow): Promise<FetchResult> {
    const c = await this.client();
    const lock = await c.getMailboxLock(w.folder, { readOnly: true }); // EXAMINE: read-only
    try {
      const uidValidity = Number((c.mailbox as MailboxObject).uidValidity);
      const afterUid = w.uidValidity === uidValidity ? w.afterUid : 0;
      const found = (await c.search({ since: w.sinceDate, uid: `${afterUid + 1}:*` }, { uid: true })) || [];
      const uids = found.filter((u) => u > afterUid).sort((a, b) => a - b).slice(-w.maxMessages);
      const messages: RawMessage[] = [];
      if (uids.length > 0) {
        // `source` is fetched with BODY.PEEK[] by imapflow: the \Seen flag is never set.
        for await (const m of c.fetch(uids, { uid: true, source: true }, { uid: true })) {
          if (m.source) messages.push(await parseRawMessage(m.source, w.folder, m.uid, uidValidity));
        }
      }
      return { uidValidity, messages };
    } finally {
      lock.release();
    }
  }

  async loadContext(recipient: { name: string; address: string }): Promise<MailContext> {
    const c = await this.client();
    const sentPath = findSentFolder(await c.list());
    const ctx: MailContext = { recipient, sentMessageIds: new Set(), sentRecipients: new Set() };
    if (!sentPath) return ctx;
    const lock = await c.getMailboxLock(sentPath, { readOnly: true });
    try {
      const since = new Date(Date.now() - SENT_WINDOW_MS);
      for await (const m of c.fetch({ since }, { envelope: true })) {
        const id = m.envelope?.messageId?.trim();
        if (id) ctx.sentMessageIds.add(id);
        for (const to of [...(m.envelope?.to ?? []), ...(m.envelope?.cc ?? [])]) {
          if (to.address) ctx.sentRecipients.add(to.address.trim().toLowerCase());
        }
      }
    } finally {
      lock.release();
    }
    return ctx;
  }

  async countSince(folder: string, sinceDate: Date): Promise<number> {
    const c = await this.client();
    const lock = await c.getMailboxLock(folder, { readOnly: true });
    try {
      return ((await c.search({ since: sinceDate }, { uid: true })) || []).length;
    } finally {
      lock.release();
    }
  }

  /** Test helper: proves we never set \Seen. */
  async unseenCount(folder: string): Promise<number> {
    const c = await this.client();
    const lock = await c.getMailboxLock(folder, { readOnly: true });
    try {
      return ((await c.search({ seen: false }, { uid: true })) || []).length;
    } finally {
      lock.release();
    }
  }

  async listFolders(): Promise<string[]> {
    const c = await this.client();
    return (await c.list()).map((b) => b.path);
  }

  async close(): Promise<void> {
    await this.#client?.logout().catch(() => undefined);
    this.#client = null;
  }
}
