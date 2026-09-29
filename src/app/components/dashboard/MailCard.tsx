"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowBendDownRightIcon } from "@phosphor-icons/react/ssr";
import type { DashboardItem } from "@/server/dashboard";
import { Chip, Meter, cn } from "../ui";
import { RISK_REASONS, formatFullDate, formatMailDate, percent } from "./format";

export type MailCardProps = {
  item: DashboardItem;
  now: number;
  /** Just changed column (override or threshold move): plays the one entry transition. */
  entering?: boolean;
  /** Current minimum confidence: Unsure cards say which bar they did not clear. */
  minConfidence?: number;
  onOpen: (item: DashboardItem) => void;
};

/**
 * One email as a single button that opens the detail sheet. Mail content
 * (sender, subject, excerpt) is untrusted and only ever rendered as text.
 */
export function MailCard({ item, now, entering, minConfidence, onOpen }: MailCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const compact = item.category === "commercial";
  const explainUnsure =
    item.category === "unsure" && !item.overridden && minConfidence !== undefined && item.confidence < minConfidence;
  const reasons = item.reasons.slice(0, explainUnsure ? 2 : 3);
  const sender = item.fromName || item.fromAddress;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cn(
        "group grid w-full gap-1.5 rounded-lg border border-transparent bg-surface p-3 text-left shadow-card",
        "transition-[border-color,translate,opacity] duration-(--duration-move) ease-(--ease-out)",
        "hover:border-line-strong active:translate-y-px",
        entering && "starting:translate-y-2 starting:opacity-0",
      )}
    >
      <span className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-2" title={item.fromAddress}>
          {sender}
        </span>
        <time dateTime={new Date(item.date).toISOString()} title={formatFullDate(item.date, locale)} className="shrink-0 text-xs text-ink-3">
          {formatMailDate(item.date, now, locale)}
        </time>
      </span>

      <span className="line-clamp-2 text-base font-medium text-pretty text-ink group-hover:underline decoration-line-strong">
        {item.subject || "—"}
      </span>

      {!compact && item.excerpt ? (
        <span className="line-clamp-2 text-sm text-ink-3">{item.excerpt}</span>
      ) : null}

      <span className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-3">
          <Meter
            value={item.confidence}
            label={t("dashboard.confidence", { value: percent(item.confidence) })}
            valueText={percent(item.confidence)}
          />
        </span>
        {item.category === "needs_reply" && item.urgency !== null ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-3">
            <span aria-hidden>{t("dashboard.urgency")}</span>
            <Meter
              value={item.urgency}
              max={3}
              tone="needs-reply"
              label={t("dashboard.urgency")}
              valueText={`${item.urgency.toFixed(1)}/3`}
              width="2.5rem"
            />
          </span>
        ) : null}
      </span>

      {reasons.length > 0 || explainUnsure ? (
        <span className="flex flex-wrap gap-1">
          {explainUnsure ? (
            <Chip className="border-line-strong">
              {t("settings.minConfidence")} <span className="tabular">{percent(minConfidence ?? 0)}</span>
            </Chip>
          ) : null}
          {reasons.map((r) =>
            r.key === "reason.manualOverride" ? (
              <Chip key={r.key} icon={<ArrowBendDownRightIcon size={12} weight="bold" />} className="border-ink-3 font-medium text-ink">
                {t(r.key, r.params)}
              </Chip>
            ) : (
              <Chip key={r.key} tone={RISK_REASONS.has(r.key) ? "risk" : "neutral"}>
                {t(r.key, r.params)}
              </Chip>
            ),
          )}
        </span>
      ) : null}
    </button>
  );
}

/** Loading placeholder with the card's shape (no spinner in content). */
export function MailCardSkeleton() {
  return (
    <div aria-hidden className="grid gap-2 rounded-lg bg-surface p-3 shadow-card">
      <div className="h-3 w-1/3 rounded-sm bg-sunken" />
      <div className="h-3.5 w-4/5 rounded-sm bg-sunken" />
      <div className="h-3 w-full rounded-sm bg-sunken" />
      <div className="h-3 w-1/2 rounded-sm bg-sunken" />
    </div>
  );
}
