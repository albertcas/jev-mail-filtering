import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import MailComposer from "nodemailer/lib/mail-composer";

type Entry = {
  file: string; label: string; lang: "es" | "en"; from: string; subject: string; date: string; auth?: string;
  replyTo?: string; inReplyTo?: string; listUnsubscribe?: string; text?: string; html?: string;
  attachments?: { filename: string; contentType: string }[];
};

const dir = join(process.cwd(), "fixtures", "demo");
const entries = JSON.parse(readFileSync(join(dir, "source.json"), "utf8")) as Entry[];
const out = join(dir, "eml");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const e of entries) {
  const headers: Record<string, string> = {};
  if (e.auth) headers["Authentication-Results"] = e.auth;
  if (e.listUnsubscribe) headers["List-Unsubscribe"] = e.listUnsubscribe;
  const mail = new MailComposer({
    from: e.from,
    to: "Alex Rivera <alex@example.com>",
    replyTo: e.replyTo,
    subject: e.subject,
    date: new Date(e.date),
    messageId: `<${e.file}@demo.jev.local>`,
    inReplyTo: e.inReplyTo,
    references: e.inReplyTo,
    text: e.text,
    html: e.html,
    headers,
    attachments: e.attachments?.map((a) => ({ ...a, content: "demo" })),
  });
  const buf = await mail.compile().build();
  writeFileSync(join(out, `${e.file}.eml`), buf);
}
console.log(`Wrote ${entries.length} emails to ${out}`);
