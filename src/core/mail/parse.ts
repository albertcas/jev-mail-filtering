import { simpleParser, type AddressObject } from "mailparser";
import { convert } from "html-to-text";
import type { Person, RawMessage } from "@/core/types";

function firstPerson(a: AddressObject | AddressObject[] | undefined): Person | null {
  const obj = Array.isArray(a) ? a[0] : a;
  const v = obj?.value[0];
  return v?.address ? { name: v.name ?? "", address: v.address.toLowerCase() } : null;
}
function allAddresses(a: AddressObject | AddressObject[] | undefined): string[] {
  const list = Array.isArray(a) ? a : a ? [a] : [];
  return list.flatMap((o) => o.value.map((v) => v.address?.toLowerCase()).filter((x): x is string => !!x));
}
function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
function extractLinks(html: string): { text: string; href: string }[] {
  const out: { text: string; href: string }[] = [];
  const re = /<a\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(re)) {
    const href = m[1]!.trim();
    if (/^https?:\/\//i.test(href)) out.push({ text: stripTags(m[2]!), href });
  }
  return out.slice(0, 50);
}
function headerLines(lines: readonly { key: string; line: string }[], key: string): string[] {
  return lines.filter((l) => l.key === key).map((l) => l.line.slice(l.line.indexOf(":") + 1).replace(/\s+/g, " ").trim());
}

function degraded(folder: string, uid: number, uidValidity: number): RawMessage {
  return {
    folder,
    uid,
    messageId: `<${folder}.${uidValidity}.${uid}@jev.local>`,
    inReplyTo: null,
    references: [],
    from: { name: "", address: "unknown@invalid" },
    replyTo: null,
    to: [],
    subject: "",
    date: new Date(0),
    text: "",
    links: [],
    attachments: [],
    authenticationResults: [],
    listUnsubscribe: null,
  };
}

const MAX_LINK_HTML = 500_000;

/** Never throws: a hostile message degrades to empty fields instead of rejecting the batch. */
export async function parseRawMessage(source: Buffer, folder: string, uid: number, uidValidity: number): Promise<RawMessage> {
  const base = degraded(folder, uid, uidValidity);
  try {
    const p = await simpleParser(source, { skipImageLinks: true, skipTextToHtml: true });
    const html = typeof p.html === "string" ? p.html : "";
    let text = "";
    try {
      text = p.text?.trim() ? p.text : html ? convert(html, { wordwrap: false, selectors: [{ selector: "img", format: "skip" }] }) : "";
    } catch {
      text = "";
    }
    let links: { text: string; href: string }[] = [];
    try {
      links = html ? extractLinks(html.slice(0, MAX_LINK_HTML)) : [];
    } catch {
      links = [];
    }
    const refs = Array.isArray(p.references) ? p.references : p.references ? p.references.split(/\s+/) : [];
    return {
      ...base,
      messageId: p.messageId ?? base.messageId,
      inReplyTo: p.inReplyTo ?? null,
      references: refs.filter(Boolean),
      from: firstPerson(p.from) ?? base.from,
      replyTo: firstPerson(p.replyTo),
      to: allAddresses(p.to),
      subject: p.subject ?? "",
      date: p.date ?? base.date,
      text,
      links,
      attachments: p.attachments.map((a) => ({ filename: a.filename ?? "", contentType: a.contentType })),
      authenticationResults: headerLines(p.headerLines, "authentication-results"),
      listUnsubscribe: headerLines(p.headerLines, "list-unsubscribe")[0] ?? null,
    };
  } catch {
    return base;
  }
}
