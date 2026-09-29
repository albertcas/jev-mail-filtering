"use client";

import { useId, type KeyboardEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowBendDownRightIcon, InfoIcon, TrayIcon } from "@phosphor-icons/react/ssr";
import type { DashboardItem } from "@/server/dashboard";
import { Chip, cn } from "../ui";
import { CategoryIcon, surfaceMark } from "./CategoryIcon";
import { RISK_REASONS, formatFullDate, formatMailDate, percent, type ColumnId } from "./format";
import { displayExcerpt, nextIndex, urgencyLevel } from "./inbox";

export type ActivateSource = "pointer" | "keyboard";

export type MessageListProps = {
  category: ColumnId;
  items: DashboardItem[];
  loading: boolean;
  /** Nothing has been analysed yet (all categories empty). */
  inboxEmpty: boolean;
  now: number;
  /** The item in the reading pane, if any. */
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** Click, Enter or Space on a row: the parent decides (open the phone sheet / focus the pane). */
  onActivate: (id: number, source: ActivateSource) => void;
  /** Ids that just changed category: they enter with the move transition. */
  entering: ReadonlySet<number>;
  minConfidence?: number;
  /** Header action (the Adjust popover). */
  action?: ReactNode;
  /** Notices at the top of the list (errors, the demo notice below 1280px). */
  notices?: ReactNode;
  noticesClassName?: string;
  /** Shown after the rows (status summary below 1280px). */
  footer?: ReactNode;
  className?: string;
};

/** DOM id of a row, so the parent can move focus to it. */
export const optionDomId = (listId: string, id: number) => `${listId}-opt-${id}`;

const selectedTint: Record<ColumnId, string> = {
  needs_reply: "bg-cat-needs-reply-tint",
  worth_reading: "bg-cat-worth-reading-tint",
  commercial: "bg-cat-commercial-tint",
  possible_scam: "bg-cat-possible-scam-tint",
  unsure: "bg-cat-unsure-tint",
  none: "bg-cat-none-tint",
};

const selectedBar: Record<ColumnId, string> = {
  needs_reply: "bg-cat-needs-reply",
  worth_reading: "bg-cat-worth-reading",
  commercial: "bg-cat-commercial",
  possible_scam: "bg-cat-possible-scam",
  unsure: "bg-cat-unsure",
  none: "bg-cat-none",
};

function UrgencyChip({ score }: { score: number }) {
  const t = useTranslations();
  const level = urgencyLevel(score);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs leading-4 whitespace-nowrap",
        level === "today"
          ? "border-cat-needs-reply bg-cat-needs-reply-tint font-semibold text-cat-needs-reply-ink"
          : level === "days"
            ? "border-line font-medium text-cat-needs-reply-ink"
            : "border-line text-ink-2",
      )}
    >
      <span className="sr-only">{t("dashboard.urgency")}: </span>
      {t(`dashboard.urgencyLevel.${level}`)}
    </span>
  );
}

function Row({
  item,
  listId,
  now,
  selected,
  focusable,
  entering,
  minConfidence,
  onClick,
}: {
  item: DashboardItem;
  listId: string;
  now: number;
  selected: boolean;
  focusable: boolean;
  entering: boolean;
  minConfidence?: number;
  onClick: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const base = optionDomId(listId, item.id);
  const sender = item.fromName || item.fromAddress;
  const explainUnsure =
    item.category === "unsure" && !item.overridden && minConfidence !== undefined && item.confidence < minConfidence;
  const reasons = item.reasons.filter((r) => r.key !== "reason.manualOverride").slice(0, explainUnsure ? 1 : 2);
  const hasChips = item.overridden || reasons.length > 0 || explainUnsure || (item.category === "needs_reply" && item.urgency !== null);

  return (
    <div
      id={base}
      role="option"
      aria-selected={selected}
      aria-labelledby={`${base}-from ${base}-subject ${base}-date`}
      aria-describedby={hasChips ? `${base}-chips` : undefined}
      tabIndex={focusable ? 0 : -1}
      data-id={item.id}
      onClick={onClick}
      className={cn(
        "group relative grid cursor-pointer gap-0.5 rounded-lg py-2.5 pr-3 pl-4 outline-offset-[-2px] select-none",
        "transition-[background-color,translate,opacity] duration-(--duration-move) ease-(--ease-out)",
        selected ? selectedTint[item.category] : "hover:bg-sunken",
        entering && "starting:translate-y-1.5 starting:opacity-0",
      )}
    >
      {/* Selection accent: an inset bar in the category's mark color (plus the tint and aria-selected). */}
      <span
        aria-hidden
        className={cn(
          "absolute top-2.5 bottom-2.5 left-1.5 w-[3px] rounded-full transition-opacity duration-(--duration-fast)",
          selectedBar[item.category],
          selected ? "opacity-100" : "opacity-0",
        )}
      />
      <span className="flex items-baseline gap-2">
        <span id={`${base}-from`} className="min-w-0 flex-1 truncate text-sm font-semibold text-ink" title={item.fromAddress}>
          {sender}
        </span>
        <time
          id={`${base}-date`}
          dateTime={new Date(item.date).toISOString()}
          title={formatFullDate(item.date, locale)}
          className="shrink-0 text-xs text-ink-3"
        >
          {formatMailDate(item.date, now, locale)}
        </time>
      </span>
      <span id={`${base}-subject`} className="truncate text-base text-ink">
        {item.subject || t("dashboard.noSubject")}
      </span>
      {item.excerpt ? <span className="truncate text-sm text-ink-3">{displayExcerpt(item.excerpt)}</span> : null}
      {hasChips ? (
        <span id={`${base}-chips`} className="mt-1.5 flex flex-wrap gap-1">
          {item.category === "needs_reply" && item.urgency !== null ? <UrgencyChip score={item.urgency} /> : null}
          {item.overridden ? (
            <Chip icon={<ArrowBendDownRightIcon size={12} weight="bold" />} className="border-ink-3 font-medium text-ink">
              {t("reason.manualOverride")}
            </Chip>
          ) : null}
          {explainUnsure ? (
            <Chip className="border-line-strong">{t("dashboard.minConfidenceChip", { value: percent(minConfidence ?? 0, locale) })}</Chip>
          ) : null}
          {reasons.map((r) => (
            <Chip key={r.key} tone={RISK_REASONS.has(r.key) ? "risk" : "neutral"}>
              {t(r.key, r.params)}
            </Chip>
          ))}
        </span>
      ) : null}
    </div>
  );
}

/** Loading placeholder with a row's shape (no spinner in content). */
function RowSkeleton() {
  return (
    <div aria-hidden className="grid gap-2 rounded-lg py-3 pr-3 pl-4">
      <div className="flex justify-between">
        <div className="h-3 w-1/3 rounded-sm bg-sunken" />
        <div className="h-3 w-10 rounded-sm bg-sunken" />
      </div>
      <div className="h-3.5 w-4/5 rounded-sm bg-sunken" />
      <div className="h-3 w-full rounded-sm bg-sunken" />
    </div>
  );
}

/**
 * The middle zone: the category's heading, its sort order and Adjust, then
 * the emails as a single-select listbox. Keyboard: ↑/↓, Home/End move the
 * selection (selection follows focus, roving tabindex so Tab enters at the
 * selected row); Enter or Space activates it. Mail content is untrusted and
 * only rendered as text.
 */
export function MessageList({
  category,
  items,
  loading,
  inboxEmpty,
  now,
  selectedId,
  onSelect,
  onActivate,
  entering,
  minConfidence,
  action,
  notices,
  noticesClassName,
  footer,
  className,
}: MessageListProps) {
  const t = useTranslations();
  const listId = useId();
  const headingId = useId();
  const advisoryId = useId();
  const advisory = category === "possible_scam";
  const selectedIndex = items.findIndex((i) => i.id === selectedId);

  const focusRow = (id: number) => document.getElementById(optionDomId(listId, id))?.focus();

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>("[role=option]");
    const current = row ? items.findIndex((i) => String(i.id) === row.dataset.id) : selectedIndex;
    if ((e.key === "Enter" || e.key === " ") && current >= 0) {
      e.preventDefault();
      onActivate(items[current]!.id, "keyboard");
      return;
    }
    const next = nextIndex(e.key, current, items.length);
    if (next === null) return;
    e.preventDefault();
    const id = items[next]!.id;
    onSelect(id);
    focusRow(id);
  };

  return (
    <section aria-labelledby={headingId} className={cn("flex min-h-0 min-w-0 flex-col bg-surface", className)}>
      <div className="flex items-start gap-3 border-b border-line px-4 pt-4 pb-3 md:px-5">
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="flex items-center gap-2 text-lg font-semibold tracking-[-0.01em] text-ink">
            <CategoryIcon category={category} size={18} className={surfaceMark[category]} />
            <span className="truncate">{t(`categories.${category}`)}</span>
            <span className="tabular text-base font-normal text-ink-3">{loading ? "" : items.length}</span>
          </h2>
          <p className="mt-0.5 text-sm text-ink-3">{category === "needs_reply" ? t("dashboard.sortUrgency") : t("dashboard.sortDate")}</p>
        </div>
        {action}
      </div>

      <div id="message-list" tabIndex={-1} className="min-h-0 flex-1 outline-none md:overflow-y-auto md:overscroll-contain">
        {notices ? <div className={cn("grid gap-2 px-3 pt-3 md:px-4", noticesClassName)}>{notices}</div> : null}
        {advisory && items.length > 0 ? (
          <p id={advisoryId} className="mx-4 mt-3 flex items-start gap-1.5 text-xs text-ink-3 md:mx-5">
            <InfoIcon aria-hidden size={14} className="mt-px shrink-0" />
            {t("dashboard.scamAdvisory")}
          </p>
        ) : null}

        {loading ? (
          <div className="grid gap-1 p-2">
            {Array.from({ length: 6 }, (_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="grid justify-items-center gap-2 px-6 py-16 text-center">
            <TrayIcon aria-hidden size={28} className="text-ink-3" />
            {inboxEmpty ? (
              <>
                <p className="text-base font-semibold text-ink">{t("dashboard.emptyTitle")}</p>
                <p className="max-w-[38ch] text-sm text-ink-2">{t("dashboard.emptyBody")}</p>
              </>
            ) : (
              <p className="max-w-[32ch] text-sm text-ink-2">{t(`dashboard.empty.${category}`)}</p>
            )}
          </div>
        ) : (
          <div
            role="listbox"
            aria-labelledby={headingId}
            aria-describedby={advisory ? advisoryId : undefined}
            onKeyDown={onKeyDown}
            className="grid gap-0.5 p-2"
          >
            {items.map((item, i) => (
              <Row
                key={item.id}
                item={item}
                listId={listId}
                now={now}
                selected={item.id === selectedId}
                focusable={selectedIndex >= 0 ? i === selectedIndex : i === 0}
                entering={entering.has(item.id)}
                minConfidence={minConfidence}
                onClick={() => {
                  onSelect(item.id);
                  onActivate(item.id, "pointer");
                }}
              />
            ))}
          </div>
        )}
        {footer}
      </div>
    </section>
  );
}
