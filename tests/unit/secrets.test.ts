import { afterEach, describe, expect, it, vi } from "vitest";
import { EnvSecretStore, MemorySecretStore, KeyringSecretStore, createSecretStore, type SecretStore } from "@/core/secrets";

describe("secret stores", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it("env store reads variables and is read-only", async () => {
    const s: SecretStore = new EnvSecretStore({ TYPESAFE_API_KEY: "k1", IMAP_PASSWORD: "p1" });
    expect(await s.get("typesafe_api_key")).toBe("k1");
    expect(await s.get("imap_password")).toBe("p1");
    expect(s.writable).toBe(false);
    await expect(s.set("imap_password", "x")).rejects.toThrow(/read-only/);
  });

  it("env store delete rejects", async () => {
    const s: SecretStore = new EnvSecretStore({});
    await expect(s.delete("typesafe_api_key")).rejects.toThrow(/read-only/);
  });

  it("env store missing var returns null", async () => {
    const s = new EnvSecretStore({});
    expect(await s.get("typesafe_api_key")).toBeNull();
    expect(await s.get("imap_password")).toBeNull();
  });

  it("env store empty string var returns null", async () => {
    const s = new EnvSecretStore({ TYPESAFE_API_KEY: "", IMAP_PASSWORD: "" });
    expect(await s.get("typesafe_api_key")).toBeNull();
    expect(await s.get("imap_password")).toBeNull();
  });

  it("memory store round-trips", async () => {
    const s = new MemorySecretStore();
    await s.set("typesafe_api_key", "abc");
    expect(await s.get("typesafe_api_key")).toBe("abc");
    await s.delete("typesafe_api_key");
    expect(await s.get("typesafe_api_key")).toBeNull();
  });

  describe("KeyringSecretStore", () => {
    it("get of missing entry returns null", async () => {
      const fakeMod = {
        Entry: class {
          constructor(private service: string, private user: string) {}
          getPassword() { return null; }
          setPassword() {}
          deletePassword() { return false; }
        },
      } as unknown as typeof import("@napi-rs/keyring");
      const s = new KeyringSecretStore(fakeMod);
      expect(await s.get("typesafe_api_key")).toBeNull();
    });

    it("backend error in get propagates", async () => {
      const fakeMod = {
        Entry: class {
          constructor(private service: string, private user: string) {}
          getPassword() { throw new Error("Backend locked"); }
          setPassword() {}
          deletePassword() { return false; }
        },
      } as unknown as typeof import("@napi-rs/keyring");
      const s = new KeyringSecretStore(fakeMod);
      await expect(s.get("typesafe_api_key")).rejects.toThrow("Backend locked");
    });

    it("delete of absent entry does not throw", async () => {
      const fakeMod = {
        Entry: class {
          constructor(private service: string, private user: string) {}
          getPassword() { return null; }
          setPassword() {}
          deletePassword() { return false; } // entry not found
        },
      } as unknown as typeof import("@napi-rs/keyring");
      const s = new KeyringSecretStore(fakeMod);
      await expect(s.delete("typesafe_api_key")).resolves.not.toThrow();
    });
  });

  describe("createSecretStore", () => {
    it("with JEV_SECRETS=env returns EnvSecretStore", async () => {
      vi.stubEnv("JEV_SECRETS", "env");
      const store = await createSecretStore();
      expect(store.kind).toBe("env");
    });

    it("loader that rejects falls back to env", async () => {
      const failLoader = vi.fn().mockRejectedValue(new Error("load failed"));
      const store = await createSecretStore(failLoader);
      expect(store.kind).toBe("env");
    });

    it("loader whose Entry throws on setPassword falls back to env", async () => {
      const failMod = {
        Entry: class {
          constructor(private service: string, private user: string) {}
          getPassword() { return null; }
          setPassword() { throw new Error("Backend unavailable"); }
          deletePassword() { return false; }
        },
      };
      const loader = vi.fn().mockResolvedValue(failMod);
      const store = await createSecretStore(loader);
      expect(store.kind).toBe("env");
    });

    it("working fake keyring loader returns KeyringSecretStore", async () => {
      const workingMod = {
        Entry: class {
          private pwd: string | null = null;
          constructor(private service: string, private user: string) {}
          getPassword() { return this.pwd; }
          setPassword(pwd: string) { this.pwd = pwd; }
          deletePassword() { const had = this.pwd !== null; this.pwd = null; return had; }
        },
      };
      const loader = vi.fn().mockResolvedValue(workingMod);
      const store = await createSecretStore(loader);
      expect(store.kind).toBe("keyring");
    });

    it("probe failure (getPassword mismatch) falls back to env", async () => {
      const probeMod = {
        Entry: class {
          constructor(private service: string, private user: string) {}
          getPassword() { return null; } // probe returns wrong value
          setPassword() {}
          deletePassword() { return true; }
        },
      };
      const loader = vi.fn().mockResolvedValue(probeMod);
      const store = await createSecretStore(loader);
      expect(store.kind).toBe("env");
    });
  });
});
