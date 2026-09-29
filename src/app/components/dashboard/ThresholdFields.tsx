"use client";

import { useLocale, useTranslations } from "next-intl";
import { CheckIcon } from "@phosphor-icons/react/ssr";
import type { Thresholds } from "@/core/policy/thresholds";
import { Button, Slider, cn } from "../ui";
import { percent } from "./format";
import { THRESHOLD_KEYS, type SaveState, type ThresholdKey } from "./useThresholdDraft";

export type ThresholdFieldsProps = {
  draft: Thresholds;
  update: (key: ThresholdKey, v: number) => void;
  save: () => Promise<void>;
  saveState: SaveState;
  canSave: boolean;
  disabled?: boolean;
  /** row = three sliders side by side from md (Settings); stack = one column (popover). */
  layout: "row" | "stack";
};

/** The three threshold sliders, the "applies instantly" note and Save (when allowed). */
export function ThresholdFields({ draft, update, save, saveState, canSave, disabled = false, layout }: ThresholdFieldsProps) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <>
      <div className={cn("grid gap-y-4", layout === "row" && "gap-x-8 md:grid-cols-3")}>
        {THRESHOLD_KEYS.map((k) => (
          <Slider
            key={k}
            name={k}
            label={t(`settings.${k}`)}
            value={draft[k]}
            min={0}
            max={1}
            step={0.05}
            formatValue={(v) => percent(v, locale)}
            disabled={disabled}
            onValueChange={(v) => update(k, v)}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="min-w-[12rem] flex-1 text-sm text-ink-3">{t("settings.thresholdsHelp")}</p>
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
    </>
  );
}
