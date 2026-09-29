import { describe, expect, it } from "vitest";
import { parseAuthenticationResults } from "@/core/signals/auth-results";
import { resemblesBrand, registrableDomain } from "@/core/signals/lookalike";
import { hasMismatchedLinks } from "@/core/signals/links";
import { hasRiskyAttachment } from "@/core/signals/attachments";
import { computeSignals } from "@/core/signals";
import type { MailContext, RawMessage } from "@/core/types";

const base: RawMessage = {
  folder: "INBOX", uid: 1, messageId: "<m1@x>", inReplyTo: null, references: [],
  from: { name: "Ana", address: "ana@empresa.es" }, replyTo: null, to: ["yo@mail.com"],
  subject: "Hola", date: new Date("2026-09-20T10:00:00Z"), text: "Hola", links: [],
  attachments: [], authenticationResults: [], listUnsubscribe: null,
};
const ctx: MailContext = {
  recipient: { name: "Yo", address: "yo@mail.com" },
  sentMessageIds: new Set(["<sent-1@mail.com>"]),
  sentRecipients: new Set(["ana@empresa.es"]),
};

describe("parseAuthenticationResults", () => {
  it("uses DMARC when present", () => {
    expect(parseAuthenticationResults(["mx.google.com; dkim=pass header.i=@a.com; spf=pass; dmarc=fail (p=REJECT)"])).toBe("fail");
    expect(parseAuthenticationResults(["mx; spf=softfail; dmarc=pass"])).toBe("pass");
  });
  it("falls back to DKIM/SPF", () => {
    expect(parseAuthenticationResults(["mx; dkim=pass; spf=none"])).toBe("pass");
    expect(parseAuthenticationResults(["mx; spf=fail smtp.mailfrom=x.com"])).toBe("fail");
    expect(parseAuthenticationResults(["mx; spf=softfail"])).toBe("fail");
  });
  it("only reads the top-most header and handles absence", () => {
    expect(parseAuthenticationResults([])).toBe("none");
    expect(parseAuthenticationResults(["mx; dmarc=pass", "old; dmarc=fail"])).toBe("pass");
  });
});

describe("resemblesBrand", () => {
  it("flags lookalikes and brand tokens on foreign domains", () => {
    expect(resemblesBrand("paypa1-secure.com")).toBe("paypal");
    expect(resemblesBrand("paypal.com.verify-account.net")).toBe("paypal");
    expect(resemblesBrand("arnazon.es")).toBe("amazon");
    expect(resemblesBrand("dhl-tracking-parcel.info")).toBe("dhl");
  });
  it("does not flag official domains or unrelated ones", () => {
    expect(resemblesBrand("mail.paypal.com")).toBeNull();
    expect(resemblesBrand("amazon.es")).toBeNull();
    expect(resemblesBrand("empresa.es")).toBeNull();
    expect(resemblesBrand("amazing-deals.com")).toBeNull();
  });
  it("extracts registrable domains from hosts and addresses", () => {
    expect(registrableDomain("news@mail.shop.co.uk")).toBe("shop.co.uk");
    expect(registrableDomain("not a domain")).toBeNull();
  });
});

describe("links and attachments", () => {
  it("detects visible text showing a different domain than the href", () => {
    expect(hasMismatchedLinks([{ text: "www.bbva.es", href: "https://bbva-login.top/x" }])).toBe(true);
    expect(hasMismatchedLinks([{ text: "Ver pedido", href: "https://evil.top" }])).toBe(false);
    expect(hasMismatchedLinks([{ text: "https://www.bbva.es/", href: "https://bbva.es/a" }])).toBe(false);
  });
  it("detects risky attachments", () => {
    expect(hasRiskyAttachment([{ filename: "factura.pdf.exe", contentType: "application/octet-stream" }])).toBe(true);
    expect(hasRiskyAttachment([{ filename: "Factura.DOCM", contentType: "x" }])).toBe(true);
    expect(hasRiskyAttachment([{ filename: "factura.pdf", contentType: "application/pdf" }])).toBe(false);
  });
});

describe("computeSignals", () => {
  it("computes thread and relationship signals", () => {
    const s = computeSignals({ ...base, references: ["<sent-1@mail.com>"] }, ctx);
    expect(s.recipient_has_replied_in_thread).toBe(true);
    expect(s.recipient_has_written_to_sender_before).toBe(true);
    expect(s.sender_authentication).toBe("none");
  });
  it("computes scam-related signals", () => {
    const s = computeSignals({
      ...base,
      from: { name: "PayPal", address: "service@paypa1-secure.com" },
      replyTo: { name: "", address: "help@other.ru" },
      listUnsubscribe: "<mailto:u@x>",
    }, ctx);
    expect(s.domain_resembles).toBe("paypal");
    expect(s.reply_to_differs_from_sender).toBe(true);
    expect(s.has_unsubscribe_header).toBe(true);
    expect(s.recipient_has_written_to_sender_before).toBe(false);
  });
  it("flags lookalike domains found only in links", () => {
    const s = computeSignals({ ...base, links: [{ text: "Entrar", href: "https://correos-envio.top/p" }] }, ctx);
    expect(s.domain_resembles).toBe("correos");
  });
});
