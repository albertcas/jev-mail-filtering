"use client";

import Link from "next/link";
import { useId, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowsClockwiseIcon, CircleNotchIcon, EnvelopeSimpleOpenIcon, GearSixIcon, InfoIcon } from "@phosphor-icons/react/ssr";
import { cn } from "../ui";
import type { Status } from "./api";
import { CategoryIcon, sidebarMark } from "./CategoryIcon";
import { REPO_README_URL } from "./DemoBanner";
import { formatCost, formatRelative, type ColumnId } from "./format";
import { NAV } from "./inbox";

export type SidebarProps = {
  status: Status | null;
  demo: boolean;
  now: number;
  /** Items per category; null while loading. */
  counts: Record<ColumnId, number> | null;
  active: ColumnId;
  onSelect: (category: ColumnId) => void;
  /** A sync request from this page is in flight (status.syncing may lag behind). */
  syncing: boolean;
  onSync: () => void;
};

/** Hover/focus label for the icon rail (768-1279px). The button's own sr-only text is its name. */
function RailTip({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-1/2 left-full z-30 ml-2.5 -translate-y-1/2 rounded-md bg-ink px-2 py-1 text-xs font-medium whitespace-nowrap text-canvas shadow-raised",
        "opacity-0 transition-opacity duration-(--duration-fast) group-hover:opacity-100 group-focus-visible:opacity-100",
        "max-md:hidden xl:hidden",
      )}
    >
      {children}
    </span>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  const t = useTranslations();
  return (
    <p className="flex items-center gap-2.5 text-base font-semibold tracking-[-0.01em] text-sidebar-ink">
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-accent text-sidebar-on-accent">
        <EnvelopeSimpleOpenIcon size={18} weight="bold" />
      </span>
      <span className={cn(compact ? "" : "max-xl:sr-only")}>{t("app.shortName")}</span>
    </p>
  );
}

/** The count next to a category: Needs reply gets the one attention pill; Possible scam its warm ink. */
function Count({ category, value, active, rail = false }: { category: ColumnId; value: number | undefined; active: boolean; rail?: boolean }) {
  if (value === undefined) return <span aria-hidden className="h-3 w-4 rounded-sm bg-sidebar-raised" />;
  const attention = category === "needs_reply" && value > 0;
  return (
    <span
      data-count
      className={cn(
        "tabular shrink-0 text-xs leading-5",
        attention
          ? "rounded-full bg-sidebar-cat-needs-reply px-1.5 font-semibold text-sidebar"
          : category === "possible_scam" && value > 0
            ? "font-medium text-sidebar-cat-possible-scam-ink"
            : active
              ? "font-medium text-sidebar-ink"
              : "text-sidebar-ink-3",
        rail && "leading-4",
      )}
    >
      {value}
    </span>
  );
}

function SyncButton({ status, demo, syncing, onSync, variant }: Pick<SidebarProps, "status" | "demo" | "syncing" | "onSync"> & { variant: "sidebar" | "icon" }) {
  const t = useTranslations();
  const hintId = useId();
  const busy = (syncing || Boolean(status?.syncing)) && !demo;
  const label = busy ? t("dashboard.syncing") : t("dashboard.syncNow");
  return (
    <>
      <button
        type="button"
        disabled={demo}
        aria-busy={busy || undefined}
        aria-disabled={busy || undefined}
        aria-describedby={demo ? hintId : undefined}
        title={demo ? t("demo.readOnly") : undefined}
        onClick={() => {
          if (!busy) onSync();
        }}
        className={cn(
          "group relative inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-sidebar-accent font-medium text-sidebar-on-accent",
          "transition-[background-color,transform] duration-(--duration-fast) ease-(--ease-out) hover:bg-sidebar-accent-hover",
          // Disabled (the demo) reads as unavailable without a muddy translucent slab.
          busy
            ? "cursor-progress"
            : "active:translate-y-px disabled:cursor-not-allowed disabled:bg-sidebar-raised disabled:text-sidebar-ink-3 disabled:active:translate-y-0",
          variant === "sidebar" ? "h-9 w-full px-3 text-base max-xl:size-10 max-xl:px-0" : "size-10 pointer-coarse:size-11",
        )}
      >
        {busy ? (
          <CircleNotchIcon aria-hidden size={17} weight="bold" className="animate-spin motion-reduce:animate-none" />
        ) : (
          <ArrowsClockwiseIcon aria-hidden size={17} weight="bold" />
        )}
        <span className={variant === "sidebar" ? "max-xl:sr-only" : "sr-only"}>{label}</span>
        {variant === "sidebar" ? <RailTip>{label}</RailTip> : null}
      </button>
      {demo ? (
        <span id={hintId} className="sr-only">
          {t("demo.readOnly")}
        </span>
      ) : null}
    </>
  );
}

/** Last sync, emails analysed, cost and connection. Shared by the sidebar and the list footer (below 1280px). */
export function StatusSummary({ status, demo, now, analysed, tone }: { status: Status | null; demo: boolean; now: number; analysed: number | null; tone: "sidebar" | "surface" }) {
  const t = useTranslations();
  const locale = useLocale();
  const finishedAt = status?.lastRun?.finishedAt ?? null;
  const connectionError = Boolean(status?.lastRun?.error);
  const busy = Boolean(status?.syncing);
  const dark = tone === "sidebar";
  return (
    <div className={cn("grid gap-0.5 text-sm", dark ? "text-sidebar-ink-3" : "text-ink-3")}>
      <p className={dark ? "text-sidebar-ink-2" : "text-ink-2"}>
        {status === null ? (
          <span aria-hidden className={cn("inline-block h-3 w-32 rounded-sm align-middle", dark ? "bg-sidebar-raised" : "bg-sunken")} />
        ) : finishedAt ? (
          t("dashboard.lastSync", { time: formatRelative(finishedAt, now, locale) })
        ) : (
          t("dashboard.never")
        )}
      </p>
      {!demo && status?.lastRun ? (
        <p className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn("size-1.5 rounded-full", connectionError ? "bg-warning" : "bg-success")} />
          {connectionError ? t("dashboard.connectionProblem") : t("dashboard.connected")}
        </p>
      ) : null}
      {analysed !== null ? <p className="tabular">{t("dashboard.analyzed", { count: analysed })}</p> : null}
      {status ? <p className="tabular">{t("dashboard.cost", { cost: formatCost(status.estimatedCostUsd, locale) })}</p> : null}
      {/* Always mounted so screen readers track it; empty until a sync has work queued. */}
      <p role="status" className="tabular empty:hidden">
        {busy && status && status.pending > 0 ? t("dashboard.pending", { count: status.pending }) : null}
      </p>
    </div>
  );
}

/**
 * The dark frame of the mail client (768px and up): logo, Sync now, the six
 * categories with counters, then status and Settings. From 1280px it is a
 * full sidebar; between 768 and 1279px an icon rail whose buttons keep their
 * names (sr-only text) and show a tooltip on hover and keyboard focus.
 */
export function Sidebar({ status, demo, now, counts, active, onSelect, syncing, onSync }: SidebarProps) {
  const t = useTranslations();
  const analysed = counts ? NAV.reduce((n, c) => n + counts[c], 0) : null;

  return (
    <header className="sidebar-scope relative z-20 flex h-dvh flex-col gap-5 border-r border-sidebar-line bg-sidebar px-3 py-4 text-sidebar-ink max-md:hidden xl:w-64">
      <div className="flex flex-col gap-4 max-xl:items-center">
        <div className="xl:px-1.5">
          <Logo />
        </div>
        <SyncButton status={status} demo={demo} syncing={syncing} onSync={onSync} variant="sidebar" />
      </div>

      <nav aria-label={t("dashboard.columns")} className="min-h-0 xl:-mx-1 xl:overflow-y-auto xl:px-1">
        <ul className="grid gap-0.5 max-xl:justify-items-center">
          {NAV.map((c) => {
            const on = c === active;
            const name = t(`categories.${c}`);
            return (
              <li key={c} className={cn(c === "unsure" && "mt-3 border-t border-sidebar-line pt-3 max-xl:w-full")}>
                <button
                  type="button"
                  aria-current={on ? "true" : undefined}
                  onClick={() => onSelect(c)}
                  className={cn(
                    "group relative flex items-center rounded-md text-left transition-colors duration-(--duration-fast)",
                    "xl:h-9 xl:w-full xl:gap-3 xl:px-2.5",
                    "max-xl:size-12 max-xl:flex-col max-xl:justify-center max-xl:gap-0.5",
                    on ? "bg-sidebar-raised text-sidebar-ink" : "text-sidebar-ink-2 hover:bg-sidebar-hover hover:text-sidebar-ink",
                  )}
                >
                  <CategoryIcon category={c} size={18} className={sidebarMark[c]} />
                  <span className={cn("min-w-0 flex-1 truncate text-base max-xl:sr-only", on && "font-medium")}>{name}</span>
                  <Count category={c} value={counts?.[c]} active={on} rail />
                  <RailTip>{name}</RailTip>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto grid gap-4 max-xl:justify-items-center">
        {demo ? (
          <div className="grid gap-1.5 rounded-lg border border-sidebar-line px-3 py-2.5 text-sm max-xl:hidden">
            <p className="flex items-center gap-1.5 font-medium text-sidebar-ink">
              <InfoIcon aria-hidden size={15} weight="bold" className="shrink-0" />
              {t("demo.banner")}
            </p>
            <a
              href={REPO_README_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sidebar-ink-2 underline decoration-sidebar-ink-3 hover:text-sidebar-ink hover:decoration-sidebar-ink"
            >
              {t("demo.install")}
            </a>
          </div>
        ) : null}
        <div className="px-1.5 max-xl:hidden">
          <StatusSummary status={status} demo={demo} now={now} analysed={analysed} tone="sidebar" />
        </div>
        <Link
          href="/settings"
          className={cn(
            "group relative flex items-center gap-3 rounded-md text-base font-medium text-sidebar-ink-2 transition-colors duration-(--duration-fast) hover:bg-sidebar-hover hover:text-sidebar-ink",
            "xl:h-9 xl:px-2.5 max-xl:size-11 max-xl:justify-center",
          )}
        >
          <GearSixIcon aria-hidden size={18} weight="bold" />
          <span className="max-xl:sr-only">{t("dashboard.settings")}</span>
          <RailTip>{t("dashboard.settings")}</RailTip>
        </Link>
      </div>
    </header>
  );
}

/**
 * Phones (< 768px): the same dark frame collapses into a top bar with the
 * logo, Sync and Settings, and a scrollable row of categories with counters.
 */
export function MobileBar({ status, demo, counts, active, onSelect, syncing, onSync }: SidebarProps) {
  const t = useTranslations();
  return (
    <header className="sidebar-scope sticky top-0 z-20 bg-sidebar text-sidebar-ink md:hidden">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <Logo compact />
        </div>
        <SyncButton status={status} demo={demo} syncing={syncing} onSync={onSync} variant="icon" />
        <Link
          href="/settings"
          className="inline-flex size-11 items-center justify-center rounded-md text-sidebar-ink-2 hover:bg-sidebar-hover hover:text-sidebar-ink"
        >
          <GearSixIcon aria-hidden size={19} weight="bold" />
          <span className="sr-only">{t("dashboard.settings")}</span>
        </Link>
      </div>
      <nav aria-label={t("dashboard.columns")}>
        <ul className="flex gap-1.5 overflow-x-auto px-4 pt-1 pb-3 [scrollbar-width:none]">
          {NAV.map((c) => {
            const on = c === active;
            return (
              <li key={c} className="shrink-0">
                <button
                  type="button"
                  aria-current={on ? "true" : undefined}
                  onClick={() => onSelect(c)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-base whitespace-nowrap transition-colors duration-(--duration-fast)",
                    on
                      ? "border-sidebar-ink-3 bg-sidebar-raised font-medium text-sidebar-ink"
                      : "border-sidebar-line text-sidebar-ink-2 hover:bg-sidebar-hover",
                  )}
                >
                  <CategoryIcon category={c} size={16} className={sidebarMark[c]} />
                  {t(`categories.${c}`)}
                  <Count category={c} value={counts?.[c]} active={on} />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
