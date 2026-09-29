import { join } from "node:path";
import { CachedClassifier, loadCache } from "@/core/classify/cached-classifier";
import { JevClassifier } from "@/core/classify/jev-classifier";
import { dataDir, type AppConfig } from "@/core/config";
import { FixtureMailSource } from "@/core/mail/fixture-source";
import { ImapMailSource } from "@/core/mail/imap-source";
import type { MailSource } from "@/core/mail/source";
import { createSecretStore, MemorySecretStore, type SecretStore } from "@/core/secrets";
import { openDatabase } from "@/core/store/db";
import { createRepo, type Repo } from "@/core/store/repo";
import { SyncRunner } from "@/core/sync/run-sync";

export type AppContext = {
  demo: boolean;
  repo: Repo;
  secrets: SecretStore;
  runner: SyncRunner;
  imapSource(config: AppConfig, password: string): MailSource;
};

const DEMO_DIR = join(process.cwd(), "fixtures", "demo");
export const DEMO_RECIPIENT = { name: "Alex Rivera", address: "alex@example.com" };

// Held on globalThis so instrumentation.ts and the route bundles (which Next may
// evaluate as separate module instances) share one context, DB handle and scheduler.
const g = globalThis as typeof globalThis & { __jevCtx?: Promise<AppContext> };

export function getContext(): Promise<AppContext> {
  if (!g.__jevCtx) {
    const p = build();
    g.__jevCtx = p;
    // A failed build must not stay cached forever: let the next request retry.
    p.catch(() => {
      if (g.__jevCtx === p) g.__jevCtx = undefined;
    });
  }
  return g.__jevCtx;
}

async function build(): Promise<AppContext> {
  const demo = process.env.DEMO_MODE === "1";
  const repo = createRepo(openDatabase(demo ? ":memory:" : join(dataDir(), "data.db")));
  const secrets = demo ? new MemorySecretStore() : await createSecretStore();
  const imapSource = (c: AppConfig, password: string) =>
    new ImapMailSource({ host: c.host, port: c.port, secure: c.secure, user: c.user, password });

  const runner = new SyncRunner(async () => {
    if (demo) {
      return {
        repo,
        source: new FixtureMailSource({ emlDir: join(DEMO_DIR, "eml"), contextFile: join(DEMO_DIR, "context.json") }),
        classifier: new CachedClassifier(loadCache(join(DEMO_DIR, "jev-cache.json"))),
        recipient: DEMO_RECIPIENT, folder: "INBOX", days: 3650,
      };
    }
    const config = repo.getConfig();
    const [apiKey, password] = await Promise.all([secrets.get("typesafe_api_key"), secrets.get("imap_password")]);
    if (!config || !apiKey || !password) return null;
    return {
      repo,
      source: imapSource(config, password),
      classifier: new JevClassifier({ apiKey, model: config.model }),
      recipient: { name: config.displayName, address: config.user },
      folder: config.folder,
      days: config.days,
    };
  });

  if (demo) await runner.trigger(); // seed the in-memory demo inbox once per instance
  return { demo, repo, secrets, runner, imapSource };
}
