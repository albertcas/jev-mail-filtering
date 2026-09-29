import type { DashboardItem } from "@/server/dashboard";
import type { Thresholds } from "@/core/policy/thresholds";
import type { DisplayCategory } from "@/core/policy/decide";

export type Status = {
  demo: boolean; configured: boolean; hasApiKey: boolean; hasImapPassword: boolean; syncing: boolean; pending: number;
  totalTokens: number; estimatedCostUsd: number; secretsKind: "keyring" | "env" | "memory";
  lastRun: { finishedAt: number | null; error: string | null; fetched: number; classified: number; failed: number } | null;
};

const json = async <T,>(r: Response): Promise<T> => {
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json() as Promise<T>;
};

// Same-origin fetches: the browser adds Origin to POST/PUT, which satisfies the server guard.
export const api = {
  status: () => fetch("/api/status", { cache: "no-store" }).then(json<Status>),
  messages: (t?: Thresholds) =>
    fetch(`/api/messages${t ? `?${new URLSearchParams(Object.entries(t).map(([k, v]) => [k, String(v)]))}` : ""}`, { cache: "no-store" })
      .then(json<{ items: DashboardItem[]; thresholds: Thresholds }>),
  // A run that reached the mailbox resolves (its own error, e.g. imap_auth, shows up in /api/status);
  // a refused request (not configured, demo, guard) rejects so the page can say so.
  sync: () => fetch("/api/sync", { method: "POST" }).then(json<{ fetched: number; classified: number; failed: number; error: string | null }>),
  override: (id: number, category: DisplayCategory | "none" | null) =>
    fetch(`/api/messages/${id}/override`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ category }) }).then(json),
  saveThresholds: (thresholds: Thresholds) =>
    fetch("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ thresholds }) }).then(json),
};
