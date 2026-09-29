import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { MailContext, RawMessage } from "@/core/types";
import { parseRawMessage } from "./parse";
import type { FetchResult, FetchWindow, MailSource } from "./source";

type ContextFile = { sentMessageIds: string[]; sentRecipients: string[] };

/** Reads `.eml` files in lexical order; UID = 1-based index. Used by demo mode, eval and tests. */
export class FixtureMailSource implements MailSource {
  constructor(private readonly opts: { emlDir: string; contextFile: string }) {}

  private files(): string[] {
    return readdirSync(this.opts.emlDir).filter((f) => f.endsWith(".eml")).sort();
  }

  async fetchNew(w: FetchWindow): Promise<FetchResult> {
    const uidValidity = 1;
    const afterUid = w.uidValidity === uidValidity ? w.afterUid : 0;
    const files = this.files();
    const messages: RawMessage[] = [];
    for (let i = afterUid; i < files.length; i++) {
      messages.push(await parseRawMessage(readFileSync(join(this.opts.emlDir, files[i]!)), w.folder, i + 1, uidValidity));
    }
    return { uidValidity, messages: messages.slice(-w.maxMessages) };
  }

  async loadContext(recipient: { name: string; address: string }): Promise<MailContext> {
    const ctx = JSON.parse(readFileSync(this.opts.contextFile, "utf8")) as ContextFile;
    return { recipient, sentMessageIds: new Set(ctx.sentMessageIds), sentRecipients: new Set(ctx.sentRecipients.map((a) => a.toLowerCase())) };
  }

  async countSince(): Promise<number> {
    return this.files().length;
  }
  async listFolders(): Promise<string[]> {
    return ["INBOX"];
  }
  async close(): Promise<void> {}
}
