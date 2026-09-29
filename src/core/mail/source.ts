import type { MailContext, RawMessage } from "@/core/types";

export type FetchWindow = { folder: string; sinceDate: Date; afterUid: number; uidValidity: number | null; maxMessages: number };
export type FetchResult = { uidValidity: number; messages: RawMessage[] };

export interface MailSource {
  /** Messages newer than `afterUid` (or all since `sinceDate` if UIDVALIDITY changed), newest `maxMessages` only. Never modifies the mailbox. */
  fetchNew(w: FetchWindow): Promise<FetchResult>;
  loadContext(recipient: { name: string; address: string }): Promise<MailContext>;
  countSince(folder: string, sinceDate: Date): Promise<number>;
  listFolders(): Promise<string[]>;
  close(): Promise<void>;
}
