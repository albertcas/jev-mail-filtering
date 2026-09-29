import { describe, expect, it, vi } from "vitest";

vi.mock("html-to-text", () => ({
  convert: () => {
    throw new Error("boom");
  },
}));
// mailparser derives text itself, so force the html-only fallback path that calls convert().
vi.mock("mailparser", () => ({
  simpleParser: async () => ({
    html: '<p>Hola <a href="https://x.es/a">x</a></p>',
    text: "",
    subject: "Asunto",
    messageId: "<m@x.es>",
    from: { value: [{ name: "X", address: "X@x.es" }] },
    attachments: [],
    headerLines: [],
  }),
}));

import { parseRawMessage } from "@/core/mail/parse";

describe("parseRawMessage when html-to-text throws", () => {
  it("keeps parsed headers and returns empty text", async () => {
    const m = await parseRawMessage(Buffer.from("x"), "INBOX", 10, 1);
    expect(m.subject).toBe("Asunto");
    expect(m.messageId).toBe("<m@x.es>");
    expect(m.from.address).toBe("x@x.es");
    expect(m.text).toBe("");
    expect(m.links).toEqual([{ text: "x", href: "https://x.es/a" }]);
  });
});
