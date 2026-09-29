import { describe, expect, it } from "vitest";
import { ImapAuthError, ImapMailSource } from "@/core/mail/imap-source";
import { PROVIDERS } from "@/core/mail/providers";

describe("ImapMailSource (no server)", () => {
  it("rejects with a connection error that is not an ImapAuthError", async () => {
    const src = new ImapMailSource({ host: "127.0.0.1", port: 1, secure: false, user: "u", password: "p" });
    const err = await src.listFolders().then(() => null, (e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(ImapAuthError);
    await src.close();
  });
});

describe("PROVIDERS", () => {
  it("has the three presets", () => {
    expect(PROVIDERS.gmail.host).toBe("imap.gmail.com");
    expect(PROVIDERS.icloud.host).toBe("imap.mail.me.com");
    expect(PROVIDERS.yahoo.host).toBe("imap.mail.yahoo.com");
    for (const p of Object.values(PROVIDERS)) {
      expect(p.port).toBe(993);
      expect(p.secure).toBe(true);
    }
  });
});
