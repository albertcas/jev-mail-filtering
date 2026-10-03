import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

export const MAX_MESSAGES_PER_SYNC = 500;
export const JEV_PRICE_PER_TOKEN = 0.042 / 1_000_000;
export const AVG_TOKENS_PER_EMAIL = 1500;
export const CLASSIFY_CONCURRENCY = 4;
/** A message whose classification keeps failing waits longer each time, so it cannot be retried on every sync forever. */
export const RETRY_BASE_MS = 10 * 60_000;
export const RETRY_MAX_MS = 24 * 60 * 60_000;

/** Delay before the next attempt after `attempts` failures: 10 min, 20 min, 40 min… capped at 24 h from the ninth on. */
export function retryDelayMs(attempts: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1), RETRY_MAX_MS);
}

export const AppConfigSchema = z.object({
  provider: z.enum(["gmail", "icloud", "yahoo", "imap"]),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().min(1),
  displayName: z.string().default(""),
  folder: z.string().min(1).default("INBOX"),
  days: z.number().int().min(1).max(90).default(14),
  intervalMinutes: z.number().int().min(5).max(1440).default(15),
  model: z.string().min(1).default("jev-latest"),
});
export type AppConfig = z.infer<typeof AppConfigSchema>;

export function dataDir(): string {
  return process.env.JEV_DATA_DIR ?? join(homedir(), ".jev-mail-filtering");
}
