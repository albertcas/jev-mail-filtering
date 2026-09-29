"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CaretDownIcon, CheckIcon, SlidersHorizontalIcon } from "@phosphor-icons/react/ssr";
import type { Thresholds } from "@/core/policy/thresholds";
import { Button, Slider, cn } from "../ui";
import { percent } from "./format";

export type ThresholdPanelProps = {
  value: Thresholds;
  /** Persisting is disabled in the demo; live recalculation still works. */
  canSave: boolean;
  onChange: (thresholds: Thresholds) => void;
  onSave: (thresholds: Thresholds) => Promise<unknown>;
  defaultOpen?: boolean;
};

const KEYS = ["scam", "minConfidence", "strongNoul"] as const;
const DEBOUNCE_MS = 150;

/**
 * Three decision thresholds that re-sort the columns while dragging (debounced
 * 150 ms, no apply button, never calls Jev again). Collapsed, the toggle still
 * shows the current values.
 */
export function ThresholdPanel({ value, canSave, onChange, onSave, defaultOpen = false }: ThresholdPanelProps) {
  const t = useTranslations();
  const locale = useLocale();
  const panelId = useId();
  // Only rendered once thresholds arrive from the client fetch, so reading the
  // viewport here cannot cause a hydration mismatch. Phones start collapsed.
  const [open, setOpen] = useState(
    () => defaultOpen && typeof window !== "undefined" && !window.matchMedia("(max-width: 767.98px)").matches,
  );
  // Local copy so the thumb follows the pointer instantly; the parent hears it debounced.
  const [draft, setDraft] = useState(value);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const update = (key: (typeof KEYS)[number], v: number) => {
    const next = { ...draft, [key]: Math.round(v * 100) / 100 };
    setDraft(next);
    setSaveState("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChangeRef.current(next), DEBOUNCE_MS);
  };

  const save = async () => {
    setSaveState("saving");
    try {
      await onSave(draft);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const summary = KEYS.map((k) => percent(draft[k], locale)).join(" · ");

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
        <div className="grid gap-x-8 gap-y-4 md:grid-cols-3">
          {KEYS.map((k) => (
            <Slider
              key={k}
              name={k}
              label={t(`settings.${k}`)}
              value={draft[k]}
              min={0}
              max={1}
              step={0.05}
              formatValue={(v) => percent(v, locale)}
              onValueChange={(v) => update(k, v)}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-ink-3">{t("settings.thresholdsHelp")}</p>
          {canSave ? (
            <div className="flex items-center gap-2">
              {saveState === "saved" ? (
                <span role="status" className="inline-flex items-center gap-1 text-sm text-success">
                  <CheckIcon aria-hidden size={14} weight="bold" />
                  {t("settings.saved")}
                </span>
              ) : saveState === "error" ? (
                <span role="alert" className="text-sm text-danger">
                  {t("setup.network")}
                </span>
              ) : null}
              <Button size="sm" loading={saveState === "saving"} onClick={() => void save()}>
                {t("settings.save")}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
