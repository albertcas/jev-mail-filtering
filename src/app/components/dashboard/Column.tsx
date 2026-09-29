"use client";

import { useId, type HTMLAttributes } from "react";
import { useTranslations } from "next-intl";
import { ShieldWarningIcon } from "@phosphor-icons/react/ssr";
import type { DashboardItem } from "@/server/dashboard";
import { cn } from "../ui";
import { categoryMark } from "../ui/tones";
import { toneOf, type ColumnId } from "./format";
import { MailCard, MailCardSkeleton } from "./MailCard";

/** The column's identity mark: a dot, or a shield for Possible scam (never color alone). */
export function CategoryMark({ category, className }: { category: ColumnId; className?: string }) {
  return category === "possible_scam" ? (
    <ShieldWarningIcon aria-hidden size={15} weight="fill" className={cn("shrink-0 text-cat-possible-scam", className)} />
  ) : (
    <span aria-hidden className={cn("size-2 shrink-0 rounded-full", categoryMark[toneOf[category]], className)} />
  );
}

export type ColumnProps = {
  category: ColumnId;
  items: DashboardItem[];
  now: number;
  loading?: boolean;
  /** Ids that just changed column: they enter with the move transition. */
  entering?: ReadonlySet<number>;
  onOpen: (item: DashboardItem) => void;
  minConfidence?: number;
  /** Hidden below md when another tab is selected. */
  hiddenOnMobile?: boolean;
  /** Part of the phone tab set: the tab carries name and count below md, so the header hides there. */
  tabbed?: boolean;
  /** Tab panel wiring on phones (id / role / aria-labelledby). */
  panelProps?: HTMLAttributes<HTMLElement> & { id?: string };
  className?: string;
};

/**
 * A zone of the canvas, not a card: header (mark, name, tabular count) over a
 * 1px rule, then the list. Empty columns say so quietly.
 */
export function Column({ category, items, now, loading, entering, onOpen, minConfidence, hiddenOnMobile, tabbed, panelProps, className }: ColumnProps) {
  const t = useTranslations();
  const headingId = useId();

  return (
    <section
      aria-labelledby={panelProps?.role === "tabpanel" ? undefined : headingId}
      {...panelProps}
      className={cn("flex min-w-0 flex-col", hiddenOnMobile && "max-md:hidden", className)}
    >
      <header className={cn("sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-canvas pt-1 pb-2.5", tabbed && "max-md:hidden")}>
        <CategoryMark category={category} />
        {/* The count is part of the heading ("Unsure 3"): headings list and tests read both. */}
        <h2 id={headingId} className="flex min-w-0 flex-1 items-baseline gap-2 text-base font-medium text-ink">
          <span className="min-w-0 flex-1 truncate">{t(`categories.${category}`)}</span>
          <span
            className={cn(
              "tabular text-sm",
              category === "needs_reply" && items.length > 0 ? "font-semibold text-ink" : "font-normal text-ink-3",
            )}
          >
            {loading ? "" : items.length}
          </span>
        </h2>
      </header>

      {loading ? (
        <div className="grid gap-2 pt-3">
          <MailCardSkeleton />
          <MailCardSkeleton />
        </div>
      ) : items.length === 0 ? (
        <p className="pt-3 text-sm text-ink-3">{t("dashboard.emptyColumn")}</p>
      ) : (
        <ul className="grid gap-2 pt-3">
          {items.map((item) => (
            <li key={item.id}>
              <MailCard item={item} now={now} entering={entering?.has(item.id)} minConfidence={minConfidence} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
