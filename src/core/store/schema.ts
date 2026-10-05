import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const mailboxes = sqliteTable("mailboxes", {
  folder: text("folder").primaryKey(),
  uidValidity: integer("uid_validity").notNull(),
  lastUid: integer("last_uid").notNull(),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  messageId: text("message_id").notNull().unique(),
  folder: text("folder").notNull(),
  uid: integer("uid").notNull(),
  fromName: text("from_name").notNull(),
  fromAddress: text("from_address").notNull(),
  subject: text("subject").notNull(),
  date: integer("date").notNull(),
  excerpt: text("excerpt").notNull(),
  signalsJson: text("signals_json").notNull(),
  stateJson: text("state_json").notNull(),
  status: text("status", { enum: ["pending", "classified"] }).notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  /** Epoch ms before which a failed classification is not retried; 0 means "as soon as possible". */
  nextAttemptAt: integer("next_attempt_at").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const classifications = sqliteTable("classifications", {
  messageId: integer("message_id").primaryKey().references(() => messages.id, { onDelete: "cascade" }),
  model: text("model").notNull(),
  answersJson: text("answers_json").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  classifiedAt: integer("classified_at").notNull(),
});

export const overrides = sqliteTable("overrides", {
  messageId: integer("message_id").primaryKey().references(() => messages.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const syncRuns = sqliteTable("sync_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: integer("started_at").notNull(),
  finishedAt: integer("finished_at"),
  fetched: integer("fetched").notNull().default(0),
  classified: integer("classified").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  error: text("error"),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
});

export const SCHEMA_VERSION = 2;

/** Creates a current-version database. Databases created by an older version are upgraded in `openDatabase`. */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS mailboxes (folder TEXT PRIMARY KEY, uid_validity INTEGER NOT NULL, last_uid INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT, message_id TEXT NOT NULL UNIQUE, folder TEXT NOT NULL, uid INTEGER NOT NULL,
  from_name TEXT NOT NULL, from_address TEXT NOT NULL, subject TEXT NOT NULL, date INTEGER NOT NULL,
  excerpt TEXT NOT NULL, signals_json TEXT NOT NULL, state_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS messages_status ON messages(status);
CREATE TABLE IF NOT EXISTS classifications (message_id INTEGER PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
  model TEXT NOT NULL, answers_json TEXT NOT NULL, input_tokens INTEGER NOT NULL, classified_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS overrides (message_id INTEGER PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
  category TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sync_runs (id INTEGER PRIMARY KEY AUTOINCREMENT, started_at INTEGER NOT NULL, finished_at INTEGER,
  fetched INTEGER NOT NULL DEFAULT 0, classified INTEGER NOT NULL DEFAULT 0, failed INTEGER NOT NULL DEFAULT 0, error TEXT);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL);
`;
