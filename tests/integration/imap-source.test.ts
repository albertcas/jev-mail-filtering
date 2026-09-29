import nodemailer from "nodemailer";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ImapMailSource, ImapAuthError } from "@/core/mail/imap-source";

const enabled = process.env.GREENMAIL === "1";
const user = `user${Date.now()}@localhost`;
const conf = { host: "127.0.0.1", port: 3143, secure: false, user, password: "secret" };

async function send(subject: string, extra: Record<string, string> = {}) {
  const t = nodemailer.createTransport({ host: "127.0.0.1", port: 3025, secure: false });
  await t.sendMail({ from: "ana@ejemplo.es", to: user, subject, text: `body ${subject}`, headers: extra });
}

describe.skipIf(!enabled)("ImapMailSource against GreenMail", () => {
  let src: ImapMailSource;
  beforeAll(async () => {
    const res = await fetch("http://127.0.0.1:8080/api/user", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: user, login: user, password: "secret" }) });
    if (!res.ok) throw new Error(`GreenMail setup failed: POST /api/user returned ${res.status}`);
    await send("one");
    await send("two");
    src = new ImapMailSource(conf);
  });
  afterAll(async () => { await src?.close(); });

  it("fetches incrementally and never marks as seen", async () => {
    const since = new Date(Date.now() - 86_400_000);
    const first = await src.fetchNew({ folder: "INBOX", sinceDate: since, afterUid: 0, uidValidity: null, maxMessages: 500 });
    expect(first.messages.map((m) => m.subject)).toEqual(["one", "two"]);
    const last = Math.max(...first.messages.map((m) => m.uid));
    await send("three");
    const second = await src.fetchNew({ folder: "INBOX", sinceDate: since, afterUid: last, uidValidity: first.uidValidity, maxMessages: 500 });
    expect(second.messages.map((m) => m.subject)).toEqual(["three"]);
    expect(await src.unseenCount("INBOX")).toBe(3);
  });

  it("caps to the newest maxMessages (Review Focus #2)", async () => {
    const r = await src.fetchNew({ folder: "INBOX", sinceDate: new Date(0), afterUid: 0, uidValidity: null, maxMessages: 1 });
    expect(r.messages.map((m) => m.subject)).toEqual(["three"]);
  });

  it("restarts from UID 0 when UIDVALIDITY changes (Review Focus #3)", async () => {
    const r = await src.fetchNew({ folder: "INBOX", sinceDate: new Date(0), afterUid: 999, uidValidity: -1, maxMessages: 500 });
    expect(r.messages).toHaveLength(3);
  });

  it("maps authentication failures to ImapAuthError", async () => {
    const bad = new ImapMailSource({ ...conf, password: "wrong" });
    await expect(bad.listFolders()).rejects.toBeInstanceOf(ImapAuthError);
    await bad.close();
    const unknown = new ImapMailSource({ ...conf, user: `nobody${Date.now()}@localhost` });
    await expect(unknown.listFolders()).rejects.toBeInstanceOf(ImapAuthError);
    await unknown.close();
  });
});
