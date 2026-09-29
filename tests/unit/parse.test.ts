import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseRawMessage } from "@/core/mail/parse";

const here = fileURLToPath(new URL(".", import.meta.url));
const load = (f: string) => readFileSync(join(here, "../fixtures", f));

describe("parseRawMessage (Review Focus #1)", () => {
  it("extracts text and links from HTML-only mail without loading images", async () => {
    const m = await parseRawMessage(load("html-only.eml"), "INBOX", 10, 1);
    expect(m.subject).toBe("Rebajas de otoño");
    expect(m.text).toContain("Hasta un 50%");
    expect(m.links).toEqual([{ text: "www.tienda.es", href: "https://tienda.es/ofertas" }]);
    expect(m.listUnsubscribe).toBe("<https://tienda.es/unsub>");
    expect(m.authenticationResults[0]).toContain("dmarc=pass");
  });
  it("decodes legacy charsets and thread headers", async () => {
    const m = await parseRawMessage(load("latin1.eml"), "INBOX", 11, 1);
    expect(m.text).toContain("¿Podemos quedar el jueves? Confírmame");
    expect(m.inReplyTo).toBe("<sent-1@mail.com>");
    expect(m.references).toEqual(["<sent-0@mail.com>", "<sent-1@mail.com>"]);
    expect(m.from).toEqual({ name: "Pepe", address: "pepe@ejemplo.es" });
  });
  it("captures reply-to and attachments", async () => {
    const m = await parseRawMessage(load("phishing.eml"), "INBOX", 12, 1);
    expect(m.replyTo?.address).toBe("help@other-domain.ru");
    expect(m.attachments).toEqual([{ filename: "invoice.pdf.exe", contentType: "application/octet-stream" }]);
    expect(m.links[0]).toEqual({ text: "https://www.paypal.com/verify", href: "https://paypa1-secure.com/login" });
  });
  it("never throws on garbage and synthesizes a Message-ID", async () => {
    const m = await parseRawMessage(Buffer.from("not an email"), "INBOX", 13, 99);
    expect(m.messageId).toBe("<INBOX.99.13@jev.local>");
    expect(typeof m.text).toBe("string");
  });
});
