import type { ProviderId } from "@/core/mail/providers";
import type { Status } from "../dashboard/api";

export type KeyResult = { ok: true; models: string[] } | { ok: false; error: "invalid_key" | "network" };
export type ImapResult = { ok: true; folders: string[] } | { ok: false; error: "auth" | "network" | "bad_request" };
export type Estimate = { count: number; estimatedTokens: number; estimatedCostUsd: number };
export type EstimateResult = ({ ok: true } & Estimate) | { ok: false; error: "auth" | "network" | "bad_request" };

export type ImapInput = {
  provider: ProviderId;
  user: string;
  password: string;
  displayName: string;
  host?: string;
  port?: number;
  secure?: boolean;
};

const post = (url: string, body: unknown, method = "POST") =>
  fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

/** Any failure to reach the local server reads as "network". */
const safe = async <T,>(p: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await p();
  } catch {
    return fallback;
  }
};

/**
 * Setup calls. Secrets are passed straight through to the local server and never
 * kept here; the server answers only with ok/error codes (never the secret).
 */
export const setupApi = {
  status: () =>
    fetch("/api/status", { cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json() as Promise<Status>;
    }),

  verifyKey: (apiKey: string) =>
    safe<KeyResult>(async () => {
      const r = await post("/api/setup/typesafe-key", { apiKey });
      const b = (await r.json()) as KeyResult;
      return "ok" in b ? b : { ok: false, error: "network" };
    }, { ok: false, error: "network" }),

  testImap: (input: ImapInput) =>
    safe<ImapResult>(async () => {
      const r = await post("/api/setup/imap", input);
      const b = (await r.json()) as ImapResult;
      return "ok" in b ? b : { ok: false, error: r.status === 400 ? "bad_request" : "network" };
    }, { ok: false, error: "network" }),

  estimate: (folder: string, days: number, signal?: AbortSignal) =>
    safe<EstimateResult>(async () => {
      const r = await fetch("/api/setup/estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ folder, days }),
        signal,
      });
      const b = (await r.json()) as Partial<Estimate> & { error?: string };
      if (r.ok && typeof b.count === "number") return { ok: true, ...(b as Estimate) };
      return { ok: false, error: b.error === "auth" ? "auth" : b.error === "network" ? "network" : "bad_request" };
    }, { ok: false, error: "network" }),

  saveConfig: (config: Record<string, unknown>) =>
    post("/api/settings", { config }, "PUT").then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
    }),

  /** Resolves when the run ends; "not_ready" when the server lacks the key or password (409). */
  sync: () =>
    safe<"done" | "not_ready" | "failed">(async () => {
      const r = await fetch("/api/sync", { method: "POST" });
      return r.ok ? "done" : r.status === 409 ? "not_ready" : "failed";
    }, "failed"),

  wipe: () =>
    fetch("/api/data", { method: "DELETE" }).then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
    }),

  setLocale: (locale: "en" | "es") =>
    post("/api/locale", { locale }).then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
    }),
};
