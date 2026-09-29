import { afterEach, describe, expect, it, vi } from "vitest";
import { setupApi } from "@/app/components/setup/api";
import { resolveImapPassword } from "@/server/imap-password";
import { EnvSecretStore, MemorySecretStore } from "@/core/secrets";

const respond = (status: number, body: unknown) =>
  vi.fn(async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("setupApi error mapping", () => {
  it("passes invalid_key through from the key check", async () => {
    vi.stubGlobal("fetch", respond(200, { ok: false, error: "invalid_key" }));
    expect(await setupApi.verifyKey("ts_fake")).toEqual({ ok: false, error: "invalid_key" });
  });

  it("maps a non-JSON body to network", async () => {
    vi.stubGlobal("fetch", respond(500, "<html>Internal error</html>"));
    expect(await setupApi.verifyKey("ts_fake")).toEqual({ ok: false, error: "network" });
    expect(await setupApi.testImap({ provider: "gmail", user: "a@b.c", displayName: "" })).toEqual({ ok: false, error: "network" });
  });

  it("maps a rejected fetch to network", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    expect(await setupApi.testImap({ provider: "gmail", user: "a@b.c", displayName: "" })).toEqual({ ok: false, error: "network" });
    expect(await setupApi.sync()).toBe("failed");
  });

  it("keeps the IMAP route's own codes and maps a bare 400 to bad_request", async () => {
    vi.stubGlobal("fetch", respond(400, { ok: false, error: "bad_request" }));
    expect(await setupApi.testImap({ provider: "imap", user: "a@b.c", displayName: "" })).toEqual({ ok: false, error: "bad_request" });
    vi.stubGlobal("fetch", respond(400, { error: "something_else" }));
    expect(await setupApi.testImap({ provider: "imap", user: "a@b.c", displayName: "" })).toEqual({ ok: false, error: "bad_request" });
    vi.stubGlobal("fetch", respond(200, { ok: false, error: "auth" }));
    expect(await setupApi.testImap({ provider: "gmail", user: "a@b.c", displayName: "", password: "x" })).toEqual({ ok: false, error: "auth" });
  });

  it("maps estimate failures: 502 auth/network, 400 bad_request", async () => {
    vi.stubGlobal("fetch", respond(502, { error: "auth" }));
    expect(await setupApi.estimate("INBOX", 14)).toEqual({ ok: false, error: "auth" });
    vi.stubGlobal("fetch", respond(502, { error: "network" }));
    expect(await setupApi.estimate("INBOX", 14)).toEqual({ ok: false, error: "network" });
    vi.stubGlobal("fetch", respond(400, { error: "bad_request" }));
    expect(await setupApi.estimate("INBOX", 14)).toEqual({ ok: false, error: "bad_request" });
    vi.stubGlobal("fetch", respond(200, { count: 3, estimatedTokens: 4500, estimatedCostUsd: 0.0002 }));
    expect(await setupApi.estimate("INBOX", 14)).toEqual({ ok: true, count: 3, estimatedTokens: 4500, estimatedCostUsd: 0.0002 });
  });

  it("reports a refused first sync (409) as not_ready", async () => {
    vi.stubGlobal("fetch", respond(409, { error: "not_configured" }));
    expect(await setupApi.sync()).toBe("not_ready");
    vi.stubGlobal("fetch", respond(200, { fetched: 1, classified: 1, failed: 0, error: null }));
    expect(await setupApi.sync()).toBe("done");
  });

  it("omits the password from the IMAP request when none is typed", async () => {
    const f = respond(200, { ok: true, folders: ["INBOX"] });
    vi.stubGlobal("fetch", f);
    await setupApi.testImap({ provider: "gmail", user: "a@b.c", displayName: "" });
    const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(String(init.body))).not.toHaveProperty("password");
  });
});

describe("resolveImapPassword", () => {
  it("uses the typed password first", async () => {
    expect(await resolveImapPassword("typed", new EnvSecretStore({ IMAP_PASSWORD: "from-env" }))).toBe("typed");
  });

  it("falls back to IMAP_PASSWORD only in .env mode", async () => {
    expect(await resolveImapPassword(undefined, new EnvSecretStore({ IMAP_PASSWORD: "from-env" }))).toBe("from-env");
    expect(await resolveImapPassword("", new EnvSecretStore({ IMAP_PASSWORD: "from-env" }))).toBe("from-env");
    const stored = new MemorySecretStore();
    await stored.set("imap_password", "stored");
    expect(await resolveImapPassword(undefined, stored)).toBeNull();
  });

  it("returns null when neither is available (route answers bad_request)", async () => {
    expect(await resolveImapPassword(undefined, new EnvSecretStore({}))).toBeNull();
    expect(await resolveImapPassword("", new EnvSecretStore({ IMAP_PASSWORD: "" }))).toBeNull();
  });
});
