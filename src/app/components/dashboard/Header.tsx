"use client";

import Link from "next/link";
import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowsClockwiseIcon, GearSixIcon } from "@phosphor-icons/react/ssr";
import { Button, cn } from "../ui";
import type { Status } from "./api";
import { formatCost, formatRelative } from "./format";

export type HeaderProps = {
  status: Status | null;
  demo: boolean;
  now: number;
  /** Emails classified and stored locally (all columns, Others included); null while loading. */
  analysed: number | null;
  /** A sync request from this page is in flight (status.syncing may lag behind). */
  syncing: boolean;
  onSync: () => void;
};

/**
 * Inbox title + last sync on the left; Sync now (the only dark button in the
 * view) on the right; analysed count, cost and connection as quiet metadata.
 */
export function Header({ status, demo, now, analysed, syncing, onSync }: HeaderProps) {
  const t = useTranslations();
  const locale = useLocale();
  const hintId = useId();
  const busy = syncing || Boolean(status?.syncing);
  const finishedAt = status?.lastRun?.finishedAt ?? null;
  const connectionError = Boolean(status?.lastRun?.error);

  return (
    <header className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <div className="min-w-0 flex-[1_1_16rem]">
        <h1 className="text-xl font-semibold tracking-[-0.01em] text-ink">{t("app.name")}</h1>
        <p className="mt-0.5 text-sm text-ink-2">
          {status === null ? (
            <span className="inline-block h-3 w-40 rounded-sm bg-sunken align-middle" aria-hidden />
          ) : finishedAt ? (
            t("dashboard.lastSync", { time: formatRelative(finishedAt, now, locale) })
          ) : (
            t("dashboard.never")
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/settings"
          className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-base font-medium text-ink-2 transition-colors duration-(--duration-fast) hover:bg-sunken hover:text-ink pointer-coarse:min-h-11"
        >
          <GearSixIcon aria-hidden size={16} weight="bold" />
          {t("dashboard.settings")}
        </Link>
        <span title={demo ? t("demo.readOnly") : undefined} className="inline-flex">
          <Button
            variant="primary"
            loading={busy && !demo}
            disabled={demo}
            aria-describedby={demo ? hintId : undefined}
            icon={<ArrowsClockwiseIcon size={16} weight="bold" />}
            onClick={onSync}
          >
            {busy && !demo ? t("dashboard.syncing") : t("dashboard.syncNow")}
          </Button>
        </span>
        {demo ? (
          <span id={hintId} className="sr-only">
            {t("demo.readOnly")}
          </span>
        ) : null}
      </div>

      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-3">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {!demo && status?.lastRun ? (
          <li className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn("size-1.5 rounded-full", connectionError ? "bg-warning" : "bg-success")}
            />
            {connectionError ? t("dashboard.connectionProblem") : t("dashboard.connected")}
          </li>
        ) : null}
        {analysed !== null ? <li className="tabular">{t("dashboard.analyzed", { count: analysed })}</li> : null}
        {status ? <li className="tabular">{t("dashboard.cost", { cost: formatCost(status.estimatedCostUsd, locale) })}</li> : null}
        </ul>
        {/* Always mounted so screen readers track it; empty until a sync has work queued. */}
        <p role="status" className="tabular">
          {busy && status && status.pending > 0 ? t("dashboard.pending", { count: status.pending }) : null}
        </p>
      </div>
    </header>
  );
}
