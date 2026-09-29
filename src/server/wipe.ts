import type { SecretStore } from "@/core/secrets";
import type { Repo } from "@/core/store/repo";
import type { SyncRunner } from "@/core/sync/run-sync";

/** "Delete all local data": nothing a sync was still writing may survive the wipe. */
export async function wipeLocalData(c: { repo: Repo; runner: SyncRunner; secrets: SecretStore }) {
  c.runner.stop();
  // A run already in flight would re-insert rows and recreate the mailbox cursor.
  await c.runner.whenIdle();
  c.repo.wipe();
  c.repo.compact();
  if (c.secrets.writable) {
    await c.secrets.delete("typesafe_api_key");
    await c.secrets.delete("imap_password");
  }
}
