"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import type { Thresholds } from "@/core/policy/thresholds";
import type { DisplayCategory } from "@/core/policy/decide";
import type { DashboardItem } from "@/server/dashboard";
import { Banner, Button, Sheet } from "../ui";
import { api, type Status } from "./api";
import { AdjustPopover } from "./AdjustPopover";
import { DemoBanner } from "./DemoBanner";
import { ErrorBanner } from "./ErrorBanner";
import type { ColumnId } from "./format";
import { NAV, focusAfterMove, groupByCategory, neighborId, resolveSelection } from "./inbox";
import { MessageList, type ActivateSource } from "./MessageList";
import { MessageDetail, ReadingPane } from "./ReadingPane";
import { MobileBar, Sidebar, StatusSummary } from "./Sidebar";

const PHONE_QUERY = "(max-width: 767.98px)";
const subscribePhone = (cb: () => void) => {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
/** Below md the reading pane becomes a full-screen sheet opened from the list. */
const useIsPhone = () =>
  useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_QUERY).matches, () => false);

/**
 * The mail-client dashboard: dark sidebar (categories + status), message list
 * and reading pane. This component owns the data (status, items, thresholds),
 * the selected category and the selected message; the zones are presentational.
 */
export function Dashboard({ demo, gmail }: { demo: boolean; gmail: boolean }) {
  const t = useTranslations();
  const [status, setStatus] = useState<Status | null>(null);
  const [items, setItems] = useState<DashboardItem[] | null>(null);
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [category, setCategory] = useState<ColumnId>("needs_reply");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // The email shown in the phone sheet. Kept (not derived from the selection)
  // so the sheet stays mounted with it while it closes after a move.
  const [sheetItem, setSheetItem] = useState<DashboardItem | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [moveError, setMoveError] = useState(false);
  const [moved, setMoved] = useState<ReadonlySet<number>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const isPhone = useIsPhone();
  const paneRef = useRef<HTMLElement>(null);
  // After a successful move: the row to focus once the list has refreshed
  // (desktop) or once the phone sheet has closed. null id = the list itself.
  const pendingFocus = useRef<{ id: number | null } | null>(null);

  // Latest request wins: slider drags and sync polling can overlap.
  const seq = useRef(0);
  // Category of each item at the previous refresh, to animate only rows that moved.
  const lastCategory = useRef<Map<number, string>>(new Map());
  // Thresholds the board is (or is about to be) computed with. Every refresh that
  // is not a slider change reads this at call time, so a sync that finishes
  // minutes later never recomputes the board with thresholds the sliders left behind.
  const latestThresholds = useRef<Thresholds | null>(null);

  /** Reload status + items. Pass `th` only for a new threshold choice; otherwise the latest one is used. */
  const refresh = useCallback(async (th?: Thresholds): Promise<boolean> => {
    if (th) latestThresholds.current = th;
    const mine = ++seq.current;
    try {
      const [s, m] = await Promise.all([api.status(), api.messages(latestThresholds.current ?? undefined)]);
      if (mine !== seq.current) return false;
      latestThresholds.current = m.thresholds;
      const prev = lastCategory.current;
      setMoved(new Set(m.items.filter((i) => prev.has(i.id) && prev.get(i.id) !== i.category).map((i) => i.id)));
      lastCategory.current = new Map(m.items.map((i) => [i.id, i.category]));
      setStatus(s);
      setItems(m.items);
      setThresholds(m.thresholds);
      setLoadError(false);
      return true;
    } catch {
      if (mine === seq.current) setLoadError(true);
      return false;
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

  // Idle poll: picks up a scheduled sync that starts later (then the fast poll above takes over).
  useEffect(() => {
    if (demo) return;
    const id = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(id);
  }, [demo, refresh]);

  // Keep "Last sync 3 minutes ago" honest.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const groups = useMemo(() => groupByCategory(items ?? []), [items]);
  const counts = useMemo(
    () => (items ? (Object.fromEntries(NAV.map((c) => [c, groups[c].length])) as Record<ColumnId, number>) : null),
    [items, groups],
  );
  const list = groups[category];
  // Side by side (768px and up) the pane always shows something: the chosen email, else the first.
  const selected = resolveSelection(list, selectedId, !isPhone);

  const onSync = async () => {
    if (demo || syncing) return;
    setSyncing(true);
    setSyncError(false);
    const run = api.sync().then(
      () => true,
      () => false,
    );
    // Pick up status.syncing early so polling streams new rows in while it runs.
    setTimeout(() => void refresh(), 400);
    const ok = await run;
    setSyncing(false);
    setSyncError(!ok);
    await refresh();
  };

  const selectCategory = (c: ColumnId) => {
    setCategory(c);
    setSelectedId(null);
    setMoveError(false);
  };

  const select = (id: number) => {
    if (id !== selectedId) setMoveError(false);
    setSelectedId(id);
  };

  const activate = (id: number, source: ActivateSource) => {
    select(id);
    if (isPhone) {
      setSheetItem(list.find((i) => i.id === id) ?? null);
      setSheetOpen(true);
    } else if (source === "keyboard") paneRef.current?.focus();
  };

  /** Focus a row of the current list by id, or the list container when id is null. */
  const focusInList = (id: number | null) => {
    const el =
      id === null
        ? document.getElementById("message-list")
        : document.querySelector<HTMLElement>(`#message-list [role=option][data-id="${id}"]`);
    el?.focus();
  };

  // Desktop: once the refreshed list is rendered, focus the row that took over
  // the selection (the moved row is gone, and focus must not fall to <body>).
  useEffect(() => {
    if (isPhone || !pendingFocus.current) return;
    const { id } = pendingFocus.current;
    pendingFocus.current = null;
    focusInList(focusAfterMove(list, id));
  }, [items, isPhone, list]);

  // Phone: the sheet has closed (focus went back to the opener, which may have
  // left the list): move focus to the neighbour row or the list.
  const onSheetClosed = () => {
    if (!pendingFocus.current) return;
    const { id } = pendingFocus.current;
    pendingFocus.current = null;
    focusInList(focusAfterMove(list, id));
  };

  // On phones the sheet's email is the one being moved; on wider screens, the selection.
  const sheetCurrent = (sheetItem && items?.find((i) => i.id === sheetItem.id)) || sheetItem;
  const moving = isPhone ? sheetCurrent : selected;

  const onMove = async (to: DisplayCategory | "none" | null) => {
    if (!moving) return;
    setMoveError(false);
    // When the email leaves this list, the selection moves on to its neighbour.
    const leaves = to !== null && to !== moving.category;
    const next = leaves ? neighborId(list, moving.id) : moving.id;
    try {
      await api.override(moving.id, to);
    } catch {
      setMoveError(true); // shown in the reading pane, where the user is
      return;
    }
    setSelectedId(next);
    pendingFocus.current = isPhone ? null : { id: next };
    const ok = await refresh();
    if (!ok) pendingFocus.current = null;
    if (isPhone) {
      // Close with the moved email still mounted; focus moves on in onSheetClosed.
      pendingFocus.current = ok ? { id: next } : null;
      setSheetOpen(false);
    }
  };

  const focusSelectedRow = () =>
    document.querySelector<HTMLElement>("#message-list [role=option][aria-selected=true]")?.focus();

  const loading = items === null;
  const notices = [
    demo ? (
      <div key="demo" className="xl:hidden">
        <DemoBanner />
      </div>
    ) : null,
    status?.lastRun?.error ? <ErrorBanner key="run" error={status.lastRun.error} /> : null,
    syncError ? (
      <Banner
        key="sync"
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
    ) : null,
    loadError ? (
      <Banner
        key="load"
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
    ) : null,
  ].filter(Boolean);
  const onlyDemoNotice = demo && notices.length === 1;

  const frame = { status, demo, now, counts, active: category, onSelect: selectCategory, syncing, onSync: () => void onSync() };
  const detail = { demo, thresholds, showGmailLink: gmail && !demo, moveError, onMove };

  return (
    <div className="flex min-h-dvh w-full bg-canvas max-md:flex-col md:h-dvh md:overflow-hidden">
      <a
        href="#message-list"
        className="sr-only rounded-md bg-accent px-3 py-2 text-base font-medium text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
      >
        {t("dashboard.skipToList")}
      </a>
      <Sidebar {...frame} />
      <MobileBar {...frame} />

      <main className="grid min-h-0 min-w-0 flex-1 md:grid-cols-[minmax(19rem,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(22rem,27rem)_minmax(0,1fr)]">
        <h1 className="sr-only">{t("app.name")}</h1>
        <MessageList
          category={category}
          items={list}
          loading={loading}
          inboxEmpty={!loading && items.length === 0}
          now={now}
          selectedId={selected?.id ?? null}
          onSelect={select}
          onActivate={activate}
          entering={moved}
          minConfidence={thresholds?.minConfidence}
          action={
            thresholds ? (
              <AdjustPopover
                value={thresholds}
                canSave={!demo}
                onChange={(th) => {
                  setThresholds(th);
                  void refresh(th);
                }}
                onSave={(th) => api.saveThresholds(th)}
              />
            ) : null
          }
          notices={notices.length ? notices : null}
          noticesClassName={onlyDemoNotice ? "xl:hidden" : undefined}
          footer={
            <div className="border-t border-line px-5 py-4 xl:hidden">
              <StatusSummary status={status} demo={demo} now={now} analysed={items?.length ?? null} tone="surface" />
            </div>
          }
          className="md:border-r md:border-line"
        />
        <ReadingPane
          ref={paneRef}
          item={isPhone ? null : selected}
          loading={loading}
          onEscape={focusSelectedRow}
          className="max-md:hidden"
          {...detail}
        />
      </main>

      {isPhone && sheetCurrent ? (
        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onAfterClose={onSheetClosed}
          closeLabel={t("detail.close")}
          title={sheetCurrent.subject || t("dashboard.noSubject")}
        >
          <MessageDetail key={sheetCurrent.id} item={sheetCurrent} inSheet {...detail} />
        </Sheet>
      ) : null}
    </div>
  );
}
