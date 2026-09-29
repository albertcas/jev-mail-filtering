"use client";

import { useCallback, useEffect, useReducer, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react/ssr";
import type { Status } from "../dashboard/api";
import { Banner, Button, cn } from "../ui";
import { setupApi } from "./api";
import { StepKey } from "./StepKey";
import { StepMailbox, type MailboxDraft } from "./StepMailbox";
import { StepScope, type Scope } from "./StepScope";
import { StepWelcome } from "./StepWelcome";
import { StepFrame } from "./StepFrame";
import {
  DEFAULT_DAYS,
  PROGRESS_STEPS,
  canAdvance,
  defaultFolder,
  initialWizardState,
  progressIndex,
  wizardReducer,
  type WizardStep,
} from "./wizard-state";

export type WizardProps = {
  /** A mailbox is already configured: this is a reconfiguration. */
  configured: boolean;
  /** Non-secret fields of the saved configuration, to prefill the mailbox step. */
  initialMailbox: MailboxDraft;
  initialScope: Pick<Scope, "days" | "intervalMinutes"> & { folder: string | null };
  demoUrl: string | null;
  maxPerSync: number;
};

const POLL_MS = 2000;
const PROGRESS_LABEL: Record<(typeof PROGRESS_STEPS)[number], string> = {
  key: "setup.stepKey",
  mailbox: "setup.stepMailbox",
  scope: "setup.stepScope",
};

/**
 * First-run (and reconfigure) flow: welcome → key → mailbox → scope → syncing → "/".
 * Only non-secret values live here; the key and the password stay inside their
 * step's input until sent and are cleared right after.
 */
export function Wizard({ configured, initialMailbox, initialScope, demoUrl, maxPerSync }: WizardProps) {
  const t = useTranslations();
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [state, dispatch] = useReducer(wizardReducer, { configured, keyReady: false }, initialWizardState);
  const [mailbox, setMailbox] = useState<MailboxDraft>(initialMailbox);
  const [scope, setScope] = useState<Scope>({ ...initialScope, folder: initialScope.folder ?? "INBOX", days: initialScope.days || DEFAULT_DAYS });
  const [syncError, setSyncError] = useState<"not_ready" | "failed" | null>(null);
  const [pending, setPending] = useState<number | null>(null);

  const applyStatus = useCallback((s: Status) => {
    setStatus(s);
    setStatusError(false);
    // A key already stored server-side (keychain or .env) lets the key step continue.
    if (s.hasApiKey) dispatch({ type: "keyReady", ready: true });
  }, []);

  const loadStatus = useCallback(
    () => setupApi.status().then(applyStatus, () => setStatusError(true)),
    [applyStatus],
  );

  useEffect(() => {
    let alive = true;
    setupApi.status().then(
      (s) => alive && applyStatus(s),
      () => alive && setStatusError(true),
    );
    return () => {
      alive = false;
    };
  }, [applyStatus]);

  // The first sync: save scope + frequency, run it, poll progress, then open the dashboard.
  useEffect(() => {
    if (state.step !== "syncing") return;
    let cancelled = false;
    const poll = setInterval(async () => {
      try {
        const s = await setupApi.status();
        if (!cancelled) setPending(s.syncing ? s.pending : null);
      } catch {
        // Keep the last reading; the sync request itself reports failure.
      }
    }, POLL_MS);
    (async () => {
      try {
        await setupApi.saveConfig({ folder: scope.folder, days: scope.days, intervalMinutes: scope.intervalMinutes });
      } catch {
        if (!cancelled) {
          setSyncError("failed");
          dispatch({ type: "syncFailed" });
        }
        return;
      }
      const outcome = await setupApi.sync();
      if (cancelled) return;
      if (outcome !== "done") {
        setSyncError(outcome);
        dispatch({ type: "syncFailed" });
        return;
      }
      // Wait for the runner to report idle (a scheduled run may have been in flight).
      for (;;) {
        const s = await setupApi.status().catch(() => null);
        if (cancelled) return;
        if (!s || !s.syncing) break;
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      router.push("/");
    })();
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
    // Runs once per entry into "syncing"; scope is fixed while syncing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step]);

  const index = progressIndex(state.step);
  const back = (
    <Button variant="ghost" icon={<ArrowLeftIcon size={16} weight="bold" />} onClick={() => dispatch({ type: "back" })}>
      {t("setup.back")}
    </Button>
  );
  const next = (label: string, onClick: () => void) => (
    <Button
      variant="primary"
      disabled={!canAdvance(state)}
      onClick={onClick}
      className="flex-row-reverse"
      icon={<ArrowRightIcon size={16} weight="bold" />}
    >
      {label}
    </Button>
  );

  let body: ReactNode;
  if (state.step === "welcome") {
    body = <StepWelcome demoUrl={demoUrl} onStart={() => dispatch({ type: "start" })} />;
  } else if (!status) {
    body = statusError ? (
      <Banner
        tone="warning"
        live="polite"
        action={
          <Button size="sm" onClick={() => void loadStatus()}>
            {t("errors.retry")}
          </Button>
        }
      >
        {t("setup.network")}
      </Banner>
    ) : (
      <div aria-hidden className="grid gap-3">
        <div className="h-7 w-2/3 rounded-sm bg-sunken" />
        <div className="h-5 w-full rounded-sm bg-sunken" />
        <div className="mt-4 h-40 rounded-lg bg-sunken" />
      </div>
    );
  } else if (state.step === "key") {
    body = (
      <StepKey
        status={status}
        onKeyReady={(ready) => dispatch({ type: "keyReady", ready })}
        onRecheck={async () => {
          await loadStatus();
        }}
        footer={
          <>
            {back}
            {next(t("setup.continue"), () => dispatch({ type: "next" }))}
          </>
        }
      />
    );
  } else if (state.step === "mailbox") {
    body = (
      <StepMailbox
        draft={mailbox}
        onDraftChange={(d) => {
          setMailbox(d);
          dispatch({ type: "mailEdited" });
        }}
        folders={state.folders}
        onConnected={(folders) => {
          dispatch({ type: "mailConnected", folders });
          setScope((s) => ({ ...s, folder: folders.includes(s.folder) ? s.folder : defaultFolder(folders) }));
        }}
        envMode={status.secretsKind === "env"}
        footer={
          <>
            {back}
            {next(t("setup.continue"), () => dispatch({ type: "next" }))}
          </>
        }
      />
    );
  } else if (state.step === "scope") {
    body = (
      <StepScope
        folders={state.folders ?? [scope.folder]}
        scope={scope}
        onScopeChange={(s) => {
          setScope(s);
          setSyncError(null);
        }}
        syncError={syncError}
        maxPerSync={maxPerSync}
        footer={
          <>
            {back}
            {next(t("setup.firstSync"), () => {
              setSyncError(null);
              setPending(null);
              dispatch({ type: "syncStarted" });
            })}
          </>
        }
      />
    );
  } else {
    body = <Syncing pending={pending} />;
  }

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canvas">
      <main className="mx-auto grid w-full max-w-[42rem] content-start gap-8 px-4 pt-6 pb-16 md:pt-12">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-semibold text-ink">{t("app.name")}</p>
          {configured && state.step !== "syncing" ? (
            <Link
              href="/"
              className="inline-flex h-9 items-center rounded-md px-3 text-base font-medium text-ink-2 transition-colors duration-(--duration-fast) hover:bg-sunken hover:text-ink pointer-coarse:min-h-11"
            >
              {t("setup.cancel")}
            </Link>
          ) : null}
        </header>
        {index !== null ? <Progress current={index} step={state.step} /> : null}
        <div key={state.step} className="animate-step">
          {body}
        </div>
      </main>
    </div>
  );
}

/** "Step 2 of 3" plus three labelled segments; done and current are ink, upcoming is a hairline. */
function Progress({ current, step }: { current: number; step: WizardStep }) {
  const t = useTranslations();
  const total = PROGRESS_STEPS.length;
  return (
    <nav aria-label={t("setup.progress")} className="grid gap-3">
      <p className="tabular text-sm text-ink-3">{t("setup.stepOf", { current, total })}</p>
      <ol className="grid grid-cols-3 gap-2">
        {PROGRESS_STEPS.map((s, i) => {
          const n = i + 1;
          const isCurrent = n === current && step !== "syncing";
          const done = n < current || step === "syncing";
          return (
            <li key={s} aria-current={isCurrent ? "step" : undefined} className="grid gap-2">
              <span
                aria-hidden
                className={cn(
                  "h-1 rounded-full transition-colors duration-(--duration-base)",
                  done || isCurrent ? "bg-ink" : "bg-line",
                )}
              />
              <span className={cn("truncate text-sm", isCurrent ? "font-medium text-ink" : done ? "text-ink-2" : "text-ink-3")}>
                {t(PROGRESS_LABEL[s])}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** First sync in progress: calm, indeterminate, with the pending count when known. */
function Syncing({ pending }: { pending: number | null }) {
  const t = useTranslations();
  return (
    <StepFrame title={t("setup.syncingTitle")} intro={t("setup.syncingBody")}>
      <div className="grid gap-3" aria-busy>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line-strong)]">
          <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-ink-2 animate-indeterminate motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-40" />
        </div>
        <p role="status" className="tabular text-base text-ink-2">
          {pending ? t("dashboard.pending", { count: pending }) : t("setup.syncingStarted")}
        </p>
      </div>
    </StepFrame>
  );
}
