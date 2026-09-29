import type { DisplayCategory } from "@/core/policy/decide";
import type { CategoryTone } from "../ui";

export type ColumnId = DisplayCategory | "none";

export const COLUMNS = ["needs_reply", "worth_reading", "commercial", "possible_scam", "unsure"] as const;

/** Business category -> presentation tone of the UI primitives. */
export const toneOf: Record<ColumnId, CategoryTone> = {
  needs_reply: "needs-reply",
  worth_reading: "worth-reading",
  commercial: "commercial",
  possible_scam: "possible-scam",
  unsure: "unsure",
  none: "none",
};

/** Reasons that are evidence against the sender: shown as "risk" chips. */
export const RISK_REASONS = new Set([
  "reason.resembles",
  "reason.authFailed",
  "reason.mismatchedLinks",
  "reason.replyToDiffers",
  "reason.riskyAttachment",
  "reason.impersonation",
  "reason.requestsSensitiveData",
  "reason.pressureTactics",
  "reason.addressesClassifier",
]);

export const percent = (v: number) => `${Math.round((Number.isFinite(v) ? v : 0) * 100)}%`;

/** USD with 4 decimals under a cent (Jev costs fractions of a cent), 2 otherwise. */
export function formatCost(usd: number, locale: string): string {
  const small = usd > 0 && usd < 0.01;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: small ? 4 : 2,
    maximumFractionDigits: small ? 4 : 2,
  }).format(usd);
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export function formatRelative(ms: number, now: number, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diff = (ms - now) / 1000;
  for (const [unit, secs] of UNITS) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return rtf.format(0, "second"); // "now"
}

/** Card date: time for today, short day + month otherwise (year only when different). */
export function formatMailDate(ms: number, now: number, locale: string): string {
  const d = new Date(ms);
  const n = new Date(now);
  if (d.toDateString() === n.toDateString()) {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
  }
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== n.getFullYear() ? { year: "numeric" } : {}),
  }).format(d);
}

export function formatFullDate(ms: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));
}
