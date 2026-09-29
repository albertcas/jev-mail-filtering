"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CaretDownIcon, SlidersHorizontalIcon } from "@phosphor-icons/react/ssr";
import type { Thresholds } from "@/core/policy/thresholds";
import { cn } from "../ui";
import { percent } from "./format";
import { ThresholdFields } from "./ThresholdFields";
import { THRESHOLD_KEYS, useThresholdDraft } from "./useThresholdDraft";

export type ThresholdPanelProps = {
  value: Thresholds;
  /** Persisting is disabled in the demo; live recalculation still works. */
  canSave: boolean;
  onChange: (thresholds: Thresholds) => void;
  onSave: (thresholds: Thresholds) => Promise<unknown>;
  defaultOpen?: boolean;
  /** Sliders locked (Settings in the demo, where nothing can change). */
  disabled?: boolean;
};

/**
 * The three decision thresholds as a collapsible panel (Settings). Collapsed,
 * the toggle still shows the current values. The dashboard uses the same
 * fields inside its Adjust popover.
 */
export function ThresholdPanel({ value, canSave, onChange, onSave, defaultOpen = false, disabled = false }: ThresholdPanelProps) {
  const t = useTranslations();
  const locale = useLocale();
  const panelId = useId();
  // Only rendered once hydrated, so reading the viewport here cannot cause a
  // hydration mismatch. Phones start collapsed.
  const [open, setOpen] = useState(
    () => defaultOpen && typeof window !== "undefined" && !window.matchMedia("(max-width: 767.98px)").matches,
  );
  const state = useThresholdDraft(value, onChange, onSave);
  const summary = THRESHOLD_KEYS.map((k) => percent(state.draft[k], locale)).join(" · ");

  return (
    <div className="rounded-lg border border-line bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-base font-medium text-ink hover:bg-sunken pointer-coarse:min-h-11"
      >
        <SlidersHorizontalIcon aria-hidden size={16} weight="bold" className="text-ink-2" />
        <span className="flex-1">{t("settings.thresholds")}</span>
        <span className="tabular text-sm font-normal text-ink-3 max-sm:hidden">{summary}</span>
        <CaretDownIcon
          aria-hidden
          size={14}
          weight="bold"
          className={cn("text-ink-2 transition-transform duration-(--duration-fast)", open && "rotate-180")}
        />
      </button>
      <div id={panelId} hidden={!open} className="border-t border-line px-3 pt-3 pb-3.5">
        <ThresholdFields {...state} canSave={canSave} disabled={disabled} layout="row" />
      </div>
    </div>
  );
}
