import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FixtureMailSource } from "@/core/mail/fixture-source";

const emlDir = join(fileURLToPath(new URL(".", import.meta.url)), "../fixtures");
const src = new FixtureMailSource({ emlDir, contextFile: join(emlDir, "context.json") });
const w = { folder: "INBOX", sinceDate: new Date(0), afterUid: 0, uidValidity: null, maxMessages: 100 };

describe("FixtureMailSource.fetchNew", () => {
  it("assigns UIDs 1..3 in lexical order", async () => {
    const r = await src.fetchNew(w);
    expect(r.messages.map((m) => m.uid)).toEqual([1, 2, 3]);
    expect(r.messages.map((m) => m.messageId)).toEqual(["<html-only@tienda.es>", "<latin1@ejemplo.es>", "<phish-1@paypa1-secure.com>"]);
  });
  it("afterUid 1 returns 2 messages when UIDVALIDITY matches", async () => {
    const r = await src.fetchNew({ ...w, afterUid: 1, uidValidity: 1 });
    expect(r.messages.map((m) => m.uid)).toEqual([2, 3]);
  });
  it("maxMessages 1 returns only the last", async () => {
    const r = await src.fetchNew({ ...w, maxMessages: 1 });
    expect(r.messages.map((m) => m.uid)).toEqual([3]);
  });
  it("maxMessages 0 returns nothing", async () => {
    const r = await src.fetchNew({ ...w, maxMessages: 0 });
    expect(r.messages).toEqual([]);
  });
});
