import { describe, expect, it } from "vitest";
import { EnvSecretStore, MemorySecretStore } from "@/core/secrets";

describe("secret stores", () => {
  it("env store reads variables and is read-only", async () => {
    const s = new EnvSecretStore({ TYPESAFE_API_KEY: "k1", IMAP_PASSWORD: "p1" });
    expect(await s.get("typesafe_api_key")).toBe("k1");
    expect(await s.get("imap_password")).toBe("p1");
    expect(s.writable).toBe(false);
    await expect(s.set("imap_password", "x")).rejects.toThrow(/read-only/);
  });
  it("memory store round-trips", async () => {
    const s = new MemorySecretStore();
    await s.set("typesafe_api_key", "abc");
    expect(await s.get("typesafe_api_key")).toBe("abc");
    await s.delete("typesafe_api_key");
    expect(await s.get("typesafe_api_key")).toBeNull();
  });
});
