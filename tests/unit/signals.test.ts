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
    expect(parseAuthenticationResults(["mx.google.com; dkim=pass header.i=@a.com; spf=pass; dmarc=fail (p=REJECT)"], "a.com")).toBe("fail");
    expect(parseAuthenticationResults(["mx; spf=softfail; dmarc=pass"], "a.com")).toBe("pass");
  });
  it("falls back to DKIM/SPF with domain alignment", () => {
    expect(parseAuthenticationResults(["mx; dkim=pass header.d=a.com; spf=none"], "a.com")).toBe("pass");
    expect(parseAuthenticationResults(["mx; spf=fail smtp.mailfrom=x.com"], "a.com")).toBe("fail");
    expect(parseAuthenticationResults(["mx; spf=softfail"], "a.com")).toBe("fail");
  });
  it("only reads the top-most header and handles absence", () => {
    expect(parseAuthenticationResults([], "a.com")).toBe("none");
    expect(parseAuthenticationResults(["mx; dmarc=pass", "old; dmarc=fail"], "a.com")).toBe("pass");
  });
  it("rejects DKIM pass without domain alignment", () => {
    expect(parseAuthenticationResults(["mx; dkim=pass header.d=attacker.com"], "paypal.com")).toBe("none");
  });
  it("fails on explicit dkim=fail even with spf=pass", () => {
    expect(parseAuthenticationResults(["mx; dkim=fail header.d=a.com; spf=pass smtp.mailfrom=a.com"], "a.com")).toBe("fail");
  });
  it("accepts aligned dkim=pass with header.d", () => {
    expect(parseAuthenticationResults(["mx; dmarc=none; dkim=pass header.d=a.com"], "a.com")).toBe("pass");
  });
  it("accepts aligned dkim=pass with header.i", () => {
    expect(parseAuthenticationResults(["mx; dkim=pass header.i=@mail.a.com"], "a.com")).toBe("pass");
  });
  it("fails on any dkim=fail in multi-clause header", () => {
    expect(parseAuthenticationResults(["mx; dkim=pass header.d=a.com; dkim=fail header.d=x.com"], "a.com")).toBe("fail");
  });
  it("fails on any spf=fail in multi-clause header", () => {
    expect(parseAuthenticationResults(["mx; spf=pass smtp.mailfrom=a.com; spf=fail smtp.mailfrom=a.com"], "a.com")).toBe("fail");
  });
  it("accepts second aligned dkim=pass when first is not aligned", () => {
    expect(parseAuthenticationResults(["mx; dkim=pass header.d=attacker.com; dkim=pass header.d=paypal.com"], "paypal.com")).toBe("pass");
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
  it("keeps the phishing patterns: confusables, brand tokens, official domain spelled in subdomains", () => {
    for (const [host, brand] of [
      ["paypa1-secure.com", "paypal"],
      ["arnazon.es", "amazon"],
      ["dhl-tracking-parcel.info", "dhl"],
      ["paypal.com.verify-account.net", "paypal"],
      ["www.paypal.com.verify-account.net", "paypal"],
      ["correos-envio.top", "correos"],
      ["amazom.com", "amazon"],
      ["micros0ftt.com", "microsoft"],
    ] as const) expect(resemblesBrand(host), host).toBe(brand);
  });
  it("treats the brand's own label on any public suffix as official", () => {
    for (const host of ["google.es", "amazon.ca", "amazon.com.mx", "paypal.co.uk", "santander.co.uk", "dhl.fr", "news.amazon.com.mx"]) {
      expect(resemblesBrand(host), host).toBeNull();
    }
  });
  it("does not flag brand-owned domains, subdomains of other platforms or unrelated near-names", () => {
    for (const host of ["google-analytics.com", "www.google-analytics.com", "amazon.mailchimp.com", "apply.com", "paypay.ne.jp"]) {
      expect(resemblesBrand(host), host).toBeNull();
    }
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
  it("ignores file names and non-ICANN suffixes in link text", () => {
    expect(hasMismatchedLinks([{ text: "Descargar factura.pdf", href: "https://cdn.proveedor.es/f/123" }])).toBe(false);
    for (const name of ["informe.zip", "contrato.docx", "datos.xlsx", "foto.png", "foto.JPG", "foto.jpeg", "anim.gif", "notas.txt", "lista.csv", "setup.exe", "pagina.html", "pagina.htm"]) {
      expect(hasMismatchedLinks([{ text: `Abrir ${name}`, href: "https://files.example.com/x" }]), name).toBe(false);
    }
    expect(hasMismatchedLinks([{ text: "config.local", href: "https://files.example.com/x" }])).toBe(false);
  });
  it("still finds a real domain after a file name in the same text", () => {
    expect(hasMismatchedLinks([{ text: "factura.pdf en www.bbva.es", href: "https://bbva-login.top/x" }])).toBe(true);
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
