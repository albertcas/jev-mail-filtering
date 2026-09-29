"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatCost } from "../dashboard/format";
import { Banner, Field, Input, Select } from "../ui";
import { intervalOptions } from "../settings/intervals";
import { useIntervalLabel } from "../settings/useIntervalLabel";
import { setupApi, type EstimateResult } from "./api";
import { FormCard, StepFrame } from "./StepFrame";
import { MAX_DAYS, MIN_DAYS, clampDays } from "./wizard-state";

export type Scope = { folder: string; days: number; intervalMinutes: number };

export type StepScopeProps = {
  folders: string[];
  scope: Scope;
  onScopeChange: (scope: Scope) => void;
  /** Why the last attempt to start the first sync failed, if it did. */
  syncError: "not_ready" | "failed" | null;
  /** Emails fetched per sync at most (server constant, passed down: core/config is server-only). */
  maxPerSync: number;
  footer: ReactNode;
};

const DEBOUNCE_MS = 300;

/**
 * Folder, how far back and how often; the estimate (emails × average tokens ×
 * price) refreshes 300 ms after the last change so the cost is known before starting.
 */
export function StepScope({ folders, scope, onScopeChange, syncError, maxPerSync, footer }: StepScopeProps) {
  const t = useTranslations();
  const intervalLabel = useIntervalLabel();
  const locale = useLocale();
  // The days input is edited as text so it can be empty mid-typing; the scope keeps a valid number.
  const [daysText, setDaysText] = useState(String(scope.days));
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setLoading(true);
      const r = await setupApi.estimate(scope.folder, scope.days, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setEstimate(r);
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [scope.folder, scope.days]);


  return (
    <StepFrame title={t("setup.scopeTitle")} intro={t("setup.scopeIntro")} footer={footer}>
      <FormCard>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <Field label={t("setup.folder")}>
            {(p) => (
              <Select {...p} name="folder" value={scope.folder} onChange={(e) => onScopeChange({ ...scope, folder: e.target.value })}>
                {folders.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t("setup.days")} hint={t("setup.daysHint")}>
            {(p) => (
              <Input
                {...p}
                type="number"
                name="days"
                inputMode="numeric"
                min={MIN_DAYS}
                max={MAX_DAYS}
                value={daysText}
                onChange={(e) => {
                  setDaysText(e.target.value);
                  if (e.target.value !== "") onScopeChange({ ...scope, days: clampDays(Number(e.target.value)) });
                }}
                onBlur={() => setDaysText(String(scope.days))}
                className="tabular"
              />
            )}
          </Field>
        </div>
        <Field label={t("settings.frequency")} hint={t("settings.syncHelp")}>
          {(p) => (
            <Select
              {...p}
              name="interval"
              value={scope.intervalMinutes}
              onChange={(e) => onScopeChange({ ...scope, intervalMinutes: Number(e.target.value) })}
              className="sm:max-w-[16rem]"
            >
              {intervalOptions(scope.intervalMinutes).map((m) => (
                <option key={m} value={m}>
                  {intervalLabel(m)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div className="grid gap-1 border-t border-line pt-4" aria-live="polite" aria-busy={loading || undefined}>
          {estimate === null || (loading && !estimate.ok) ? (
            <p className="text-lg text-ink-3">{t("setup.estimating")}</p>
          ) : estimate.ok ? (
            <p className={loading ? "tabular text-lg font-medium text-ink-3 transition-colors" : "tabular text-lg font-medium text-ink transition-colors"}>
              {t("setup.estimate", { count: estimate.count, cost: formatCost(estimate.estimatedCostUsd, locale) })}
            </p>
          ) : (
            <p className="text-base text-ink-2">
              {estimate.error === "auth" ? t("setup.mailAuth") : estimate.error === "network" ? t("setup.network") : t("setup.estimateUnavailable")}
            </p>
          )}
          <p className="text-sm text-ink-3">{t("setup.estimateHint", { max: maxPerSync })}</p>
        </div>
      </FormCard>

      {syncError ? (
        <Banner tone={syncError === "not_ready" ? "danger" : "warning"} live="assertive">
          {syncError === "not_ready" ? t("setup.syncNotReady") : t("errors.syncFailed")}
        </Banner>
      ) : null}
    </StepFrame>
  );
}
