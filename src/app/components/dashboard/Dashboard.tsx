"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { TrayIcon } from "@phosphor-icons/react/ssr";
import { sortForColumn } from "@/core/policy/sort";
import type { Thresholds } from "@/core/policy/thresholds";
import type { DisplayCategory } from "@/core/policy/decide";
import type { DashboardItem } from "@/server/dashboard";
import { Banner, Button, ToggleChip, cn } from "../ui";
import { api, type Status } from "./api";
import { Header } from "./Header";
import { CategoryMark, Column } from "./Column";
import { DetailSheet } from "./DetailSheet";
import { ThresholdPanel } from "./ThresholdPanel";
import { DemoBanner } from "./DemoBanner";
import { ErrorBanner } from "./ErrorBanner";
import { COLUMNS } from "./format";

type Col = (typeof COLUMNS)[number];

const PHONE_QUERY = "(max-width: 767.98px)";
const subscribePhone = (cb: () => void) => {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
/** Below md the columns become tabs; ARIA tab roles only exist while they are tabs. */
const useIsPhone = () =>
  useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_QUERY).matches, () => false);

export function Dashboard({ demo, gmail }: { demo: boolean; gmail: boolean }) {
  const t = useTranslations();
  const [status, setStatus] = useState<Status | null>(null);
  const [items, setItems] = useState<DashboardItem[] | null>(null);
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [selected, setSelected] = useState<DashboardItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [moveError, setMoveError] = useState(false);
  const [moved, setMoved] = useState<ReadonlySet<number>>(new Set());
  const [tab, setTab] = useState<Col>("needs_reply");
  const [now, setNow] = useState(() => Date.now());
  const isPhone = useIsPhone();
  const tabsId = useId();

  // Latest request wins: slider drags and sync polling can overlap.
  const seq = useRef(0);
  // Column of each item at the previous refresh, to animate only cards that moved.
  const lastColumn = useRef<Map<number, string>>(new Map());
  // Thresholds the board is (or is about to be) computed with. Every refresh that
  // is not a slider change reads this at call time, so a sync that finishes
  // minutes later never recomputes the board with thresholds the sliders left behind.
  const latestThresholds = useRef<Thresholds | null>(null);

  /** Reload status + items. Pass `th` only for a new threshold choice; otherwise the latest one is used. */
  const refresh = useCallback(async (th?: Thresholds) => {
    if (th) latestThresholds.current = th;
    const mine = ++seq.current;
    try {
      const [s, m] = await Promise.all([api.status(), api.messages(latestThresholds.current ?? undefined)]);
      if (mine !== seq.current) return;
      latestThresholds.current = m.thresholds;
      const prev = lastColumn.current;
      setMoved(new Set(m.items.filter((i) => prev.has(i.id) && prev.get(i.id) !== i.category).map((i) => i.id)));
      lastColumn.current = new Map(m.items.map((i) => [i.id, i.category]));
      setStatus(s);
      setItems(m.items);
      setThresholds(m.thresholds);
      setLoadError(false);
    } catch {
      if (mine === seq.current) setLoadError(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Poll while a sync runs (cheap local request).
  useEffect(() => {
    if (!status?.syncing) return;
    const id = setInterval(() => void refresh(), 2000);
    return () => clearInterval(id);
  }, [status?.syncing, refresh]);

  // Keep "Last sync 3 minutes ago" honest.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const byColumn = useMemo(() => {
    const groups = Object.fromEntries([...COLUMNS, "none"].map((c) => [c, [] as DashboardItem[]]));
    for (const it of items ?? []) groups[it.category]?.push(it);
    for (const k of Object.keys(groups)) {
      groups[k] = sortForColumn(
        groups[k]!.map((i) => ({ ...i, decision: { category: i.category, confidence: i.confidence, reasons: i.reasons, urgency: i.urgency } })),
      );
    }
    return groups as Record<Col | "none", DashboardItem[]>;
  }, [items]);

  const onSync = async () => {
    if (demo || syncing) return;
    setSyncing(true);
    setSyncError(false);
    const run = api.sync().then(
      () => true,
      () => false,
    );
    // Pick up status.syncing early so polling streams new cards in while it runs.
    setTimeout(() => void refresh(), 400);
    const ok = await run;
    setSyncing(false);
    setSyncError(!ok);
    await refresh();
  };

  const open = (item: DashboardItem) => {
    setMoveError(false);
    setSelected(item);
    setSheetOpen(true);
  };

  const onMove = async (category: DisplayCategory | "none" | null) => {
    if (!selected) return;
    setMoveError(false);
    try {
      await api.override(selected.id, category);
    } catch {
      setMoveError(true); // shown inside the sheet, where the user is
      return;
    }
    setSheetOpen(false);
    await refresh();
  };

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = COLUMNS.indexOf(tab);
    const next =
      e.key === "ArrowRight" ? COLUMNS[(i + 1) % COLUMNS.length]
      : e.key === "ArrowLeft" ? COLUMNS[(i - 1 + COLUMNS.length) % COLUMNS.length]
      : e.key === "Home" ? COLUMNS[0]
      : e.key === "End" ? COLUMNS[COLUMNS.length - 1]
      : null;
    if (!next) return;
    e.preventDefault();
    setTab(next);
    document.getElementById(`${tabsId}-tab-${next}`)?.focus();
  };

  const loading = items === null;
  const empty = !loading && items.length === 0;
  // Fresh item data for the open sheet (it can change under a threshold drag).
  const current = (selected && items?.find((i) => i.id === selected.id)) || selected;

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canvas">
      <main className="mx-auto grid w-full max-w-[1680px] content-start gap-5 px-4 pt-4 pb-10 md:px-6 md:pt-6 xl:px-8">
        {demo ? <DemoBanner /> : null}
        <Header status={status} demo={demo} now={now} analysed={items?.length ?? null} syncing={syncing} onSync={() => void onSync()} />
        {status?.lastRun?.error ? <ErrorBanner error={status.lastRun.error} /> : null}
        {syncError ? (
          <Banner
            tone="warning"
            live="polite"
            action={
              <Button size="sm" onClick={() => void onSync()}>
                {t("errors.retry")}
              </Button>
            }
          >
            {t("errors.syncFailed")}
          </Banner>
        ) : null}
        {loadError ? (
          <Banner
            tone="warning"
            live="polite"
            action={
              <Button size="sm" onClick={() => void refresh()}>
                {t("errors.retry")}
              </Button>
            }
          >
            {t("setup.network")}
          </Banner>
        ) : null}
        {thresholds ? (
          <ThresholdPanel
            value={thresholds}
            canSave={!demo}
            defaultOpen={demo}
            onChange={(th) => {
              setThresholds(th);
              void refresh(th);
            }}
            onSave={(th) => api.saveThresholds(th)}
          />
        ) : null}

        {empty ? (
          <section className="grid justify-items-start gap-2 rounded-lg border border-dashed border-line-strong px-6 py-10 md:justify-items-center md:text-center">
            <TrayIcon aria-hidden size={28} className="text-ink-3" />
            <h2 className="text-lg font-semibold text-ink">{t("dashboard.emptyTitle")}</h2>
            <p className="max-w-[52ch] text-base text-ink-2">{t("dashboard.emptyBody")}</p>
          </section>
        ) : (
          <div className="grid gap-3">
            {/* Phones: one list at a time, picked from tabs that carry the counts. */}
            <div
              role={isPhone ? "tablist" : undefined}
              aria-label={isPhone ? t("dashboard.columns") : undefined}
              onKeyDown={isPhone ? onTabKey : undefined}
              className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] md:hidden"
            >
              {COLUMNS.map((c) => {
                const active = c === tab;
                return (
                  <button
                    key={c}
                    type="button"
                    id={`${tabsId}-tab-${c}`}
                    role={isPhone ? "tab" : undefined}
                    aria-selected={isPhone ? active : undefined}
                    aria-controls={isPhone ? `${tabsId}-panel-${c}` : undefined}
                    tabIndex={isPhone && !active ? -1 : 0}
                    onClick={() => setTab(c)}
                    className={cn(
                      "-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-2.5 text-base whitespace-nowrap transition-colors duration-(--duration-fast)",
                      active ? "border-ink font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink",
                    )}
                  >
                    <CategoryMark category={c} />
                    {t(`categories.${c}`)}
                    <span className={cn("tabular text-sm", active ? "text-ink-2" : "text-ink-3")}>{loading ? "" : byColumn[c].length}</span>
                  </button>
                );
              })}
            </div>

            <section
              aria-label={t("dashboard.columns")}
              className={cn(
                "md:-mx-6 md:flex md:snap-x md:snap-mandatory md:scroll-px-6 md:gap-5 md:overflow-x-auto md:px-6 md:pb-2",
                "xl:mx-0 xl:grid xl:grid-cols-5 xl:overflow-visible xl:px-0 xl:pb-0",
              )}
            >
              {COLUMNS.map((c) => (
                <Column
                  key={c}
                  category={c}
                  items={byColumn[c]}
                  now={now}
                  loading={loading}
                  entering={moved}
                  onOpen={open}
                  minConfidence={thresholds?.minConfidence}
                  tabbed
                  hiddenOnMobile={c !== tab}
                  panelProps={
                    isPhone
                      ? { id: `${tabsId}-panel-${c}`, role: "tabpanel", "aria-labelledby": `${tabsId}-tab-${c}` }
                      : undefined
                  }
                  className="md:w-72 md:shrink-0 md:snap-start xl:w-auto"
                />
              ))}
            </section>
          </div>
        )}

        {!loading && !empty ? (
          <div className="grid gap-4 border-t border-line pt-4 xl:grid-cols-5">
            <div className="xl:col-span-5">
              <ToggleChip pressed={showOthers} onClick={() => setShowOthers((v) => !v)}>
                {showOthers ? t("dashboard.hideOthers") : t("dashboard.showOthers", { count: byColumn.none.length })}
              </ToggleChip>
            </div>
            {showOthers ? (
              <Column category="none" items={byColumn.none} now={now} entering={moved} onOpen={open} className="md:max-w-72 xl:max-w-none" />
            ) : null}
          </div>
        ) : null}
      </main>

      <DetailSheet
        open={sheetOpen}
        item={current}
        demo={demo}
        thresholds={thresholds}
        showGmailLink={gmail || demo}
        moveError={moveError}
        onClose={() => setSheetOpen(false)}
        onMove={onMove}
      />
    </div>
  );
}
