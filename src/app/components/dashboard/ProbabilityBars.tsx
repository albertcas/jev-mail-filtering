"use client";

import { useLocale, useTranslations } from "next-intl";
import type { CategoryLabel } from "@/core/classify/answers";
import { Meter, cn } from "../ui";
import { percent, toneOf, type ColumnId } from "./format";

export type ProbabilityBarsProps = {
  probabilities: Record<CategoryLabel, number>;
  /** The category the card sits in: the only bar painted in its category color. */
  highlight: ColumnId;
  /** Current scam threshold, drawn as a tick on the Possible scam bar. */
  scamThreshold?: number;
};

/**
 * Jev's category distribution: one series over nominal categories, so bars are
 * neutral ink, sorted high to low, labelled directly (name left, value right).
 * Only the chosen category takes its color mark and a semibold label.
 */
export function ProbabilityBars({ probabilities, highlight, scamThreshold }: ProbabilityBarsProps) {
  const t = useTranslations();
  const locale = useLocale();
  const rows = (Object.entries(probabilities) as [CategoryLabel, number][])
    .map(([c, p]) => [c, Number.isFinite(p) ? p : 0] as const)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <ul className="grid gap-2.5">
        {rows.map(([category, p]) => {
          const chosen = category === highlight;
          const name = t(`categories.${category}`);
          return (
            <li key={category} className="grid grid-cols-[minmax(0,9.5rem)_1fr_2.75rem] items-center gap-3">
              <span className={cn("truncate text-sm", chosen ? "font-semibold text-ink" : "text-ink-2")}>{name}</span>
              <span className="relative flex items-center">
                <Meter
                  value={p}
                  label={name}
                  valueText={percent(p, locale)}
                  showValue={false}
                  size="md"
                  width="100%"
                  tone={chosen ? toneOf[category] : "neutral"}
                  className="w-full"
                />
                {category === "possible_scam" && scamThreshold !== undefined ? (
                  <span
                    aria-hidden
                    className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-ink transition-[left] duration-(--duration-base) ease-(--ease-out)"
                    style={{ left: `${scamThreshold * 100}%` }}
                  />
                ) : null}
              </span>
              <span aria-hidden className={cn("tabular text-right text-sm", chosen ? "font-semibold text-ink" : "text-ink-2")}>
                {percent(p, locale)}
              </span>
            </li>
          );
        })}
      </ul>
      {scamThreshold !== undefined ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-ink-3">
          <span aria-hidden className="h-3 w-0.5 rounded-full bg-ink" />
          <span className="tabular">{t("detail.scamThreshold", { value: percent(scamThreshold, locale) })}</span>
        </p>
      ) : null}
    </div>
  );
}
