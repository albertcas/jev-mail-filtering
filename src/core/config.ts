import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

export const MAX_MESSAGES_PER_SYNC = 500;
export const JEV_PRICE_PER_TOKEN = 0.042 / 1_000_000;
export const AVG_TOKENS_PER_EMAIL = 1500;
export const CLASSIFY_CONCURRENCY = 4;

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
