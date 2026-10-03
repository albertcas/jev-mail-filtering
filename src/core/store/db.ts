import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { chmodSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";

export function openDatabase(file: string) {
  // Owner-only: the DB holds mail excerpts. Modes are a no-op on Windows (per-user profile ACLs apply there).
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const sqlite = new Database(file);
  if (file !== ":memory:") chmodSync(file, 0o600);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(schema.SCHEMA_SQL);
  // v1 → v2: `CREATE TABLE IF NOT EXISTS` leaves an existing v1 table untouched, so add the retry column here.
  const columns = sqlite.pragma("table_info(messages)") as { name: string }[];
  if (!columns.some((c) => c.name === "next_attempt_at")) {
    sqlite.exec("ALTER TABLE messages ADD COLUMN next_attempt_at INTEGER NOT NULL DEFAULT 0");
  }
  sqlite.pragma(`user_version = ${schema.SCHEMA_VERSION}`);
  return drizzle(sqlite, { schema });
}
export type Db = ReturnType<typeof openDatabase>;
