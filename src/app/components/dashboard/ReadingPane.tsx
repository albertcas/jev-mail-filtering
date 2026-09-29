"use client";

import { forwardRef, useId, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowCounterClockwiseIcon,
  ArrowSquareOutIcon,
  CaretDownIcon,
  CheckIcon,
  EnvelopeSimpleIcon,
  InfoIcon,
  MinusIcon,
  ShieldWarningIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react/ssr";
import { NOUL_IDS } from "@/core/classify/answers";
import type { DisplayCategory } from "@/core/policy/decide";
import type { Thresholds } from "@/core/policy/thresholds";
import type { Signals } from "@/core/types";
import type { DashboardItem } from "@/server/dashboard";
import { Badge, Button, Chip, Meter, cn } from "../ui";
import { CategoryMark } from "./CategoryIcon";
import { RISK_REASONS, formatFullDate, formatScore, percent, toneOf, type ColumnId } from "./format";
import { gmailSearchUrl } from "./gmail-link";
import { displayExcerpt, urgencyLevel } from "./inbox";
import { ProbabilityBars } from "./ProbabilityBars";

const MOVE_TARGETS: ColumnId[] = ["needs_reply", "worth_reading", "commercial", "possible_scam", "none"];
const SIGNAL_KEYS = [
  "sender_authentication",
  "domain_resembles",
  "mismatched_links",
  "reply_to_differs_from_sender",
  "risky_attachments",
  "recipient_has_replied_in_thread",
  "recipient_has_written_to_sender_before",
  "has_unsubscribe_header",
] as const satisfies readonly (keyof Signals)[];

/** Signals whose "yes" counts against the sender. */
const RISKY_WHEN_TRUE = new Set<keyof Signals>(["reply_to_differs_from_sender", "risky_attachments", "mismatched_links"]);

export type MessageDetailProps = {
  item: DashboardItem;
  demo: boolean;
  thresholds: Thresholds | null;
  /** Show "Open in Gmail" (a real Gmail account; never the demo, whose Message-IDs are fictional). */
  showGmailLink: boolean;
  /** The last "Move to…" / "Undo" request failed. */
  moveError?: boolean;
  onMove: (category: DisplayCategory | "none" | null) => Promise<void>;
  /** Inside the phone sheet the subject is the sheet's title, so it is not repeated. */
  inSheet?: boolean;
  /** Id for the subject heading (the pane is labelled by it). */
  subjectId?: string;
};

function Subsection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn("grid content-start gap-3", className)}>
      <h4 id={id} className="text-sm font-medium text-ink-2">
        {title}
      </h4>
      {children}
    </section>
  );
}

/**
 * One email: category chip with confidence, urgency, subject, sender and date,
 * the plain-text excerpt, then "Why" (probabilities, Jev judgments, verified
 * signals, model) and the actions. Mail content is rendered as text only.
 */
export function MessageDetail({ item, demo, thresholds, showGmailLink, moveError, onMove, inSheet = false, subjectId }: MessageDetailProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [moveOpen, setMoveOpen] = useState(false);
  const moveId = useId();
  const whyId = useId();
  const excerptId = useId();

  const strong = thresholds?.strongNoul ?? 0.7;
  const nouls = [...NOUL_IDS].sort((a, b) => item.detail.nouls[b] - item.detail.nouls[a]);
  const scam = item.category === "possible_scam";

  const signalValue = (key: (typeof SIGNAL_KEYS)[number]): { text: string; risky: boolean; ok: boolean } => {
    const s = item.detail.signals;
    if (key === "sender_authentication") {
      const v = s.sender_authentication;
      return { text: t(`detail.value.${v}`), risky: v === "fail", ok: v === "pass" };
    }
    if (key === "domain_resembles") {
      return s.domain_resembles
        ? { text: s.domain_resembles, risky: true, ok: false }
        : { text: t("detail.value.no"), risky: false, ok: false };
    }
    const v = s[key];
    return { text: t(v ? "detail.value.yes" : "detail.value.no"), risky: v && RISKY_WHEN_TRUE.has(key), ok: false };
  };

  return (
    <article className="grid gap-6">
      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={toneOf[item.category]} icon={scam ? <ShieldWarningIcon size={13} weight="fill" /> : undefined}>
            {t(`categories.${item.category}`)}
            <span className="tabular font-normal"> {percent(item.confidence, locale)}</span>
          </Badge>
          <span className="sr-only">{t("dashboard.confidence", { value: percent(item.confidence, locale) })}</span>
          {item.category === "needs_reply" && item.urgency !== null ? (
            <span className="inline-flex items-center rounded-sm border border-line px-1.5 py-1 text-sm leading-4 text-ink-2">
              {t("dashboard.urgency")}: <span className="ml-1 font-medium text-cat-needs-reply-ink">{t(`dashboard.urgencyLevel.${urgencyLevel(item.urgency)}`)}</span>
            </span>
          ) : null}
          {item.overridden ? (
            <span className="inline-flex items-center gap-1 rounded-sm border border-ink-3 px-1.5 py-1 text-sm leading-4 font-medium text-ink">
              {t("reason.manualOverride")}
            </span>
          ) : null}
        </div>

        {inSheet ? null : (
          <h2 id={subjectId} className="text-xl font-semibold tracking-[-0.01em] text-balance text-ink">
            {item.subject || t("dashboard.noSubject")}
          </h2>
        )}

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
          {item.fromName ? <span className="font-medium text-ink">{item.fromName}</span> : null}
          <span className="break-all text-ink-2">{item.fromName ? `<${item.fromAddress}>` : item.fromAddress}</span>
          <time dateTime={new Date(item.date).toISOString()} className="text-ink-3 sm:ml-auto">
            {formatFullDate(item.date, locale)}
          </time>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {showGmailLink ? (
            <a
              href={gmailSearchUrl(item.messageId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-ink transition-colors duration-(--duration-fast) hover:bg-sunken pointer-coarse:min-h-11"
            >
              {t("detail.openInGmail")}
              <ArrowSquareOutIcon aria-hidden size={14} weight="bold" />
            </a>
          ) : null}
          <Button
            size="sm"
            aria-expanded={moveOpen}
            aria-controls={moveId}
            onClick={() => setMoveOpen((o) => !o)}
          >
            {t("detail.moveTo")}
            <CaretDownIcon aria-hidden size={13} weight="bold" className={cn("transition-transform duration-(--duration-fast)", moveOpen && "rotate-180")} />
          </Button>
          {item.overridden ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={demo}
              title={demo ? t("demo.readOnly") : undefined}
              icon={<ArrowCounterClockwiseIcon size={16} weight="bold" />}
              onClick={() => void onMove(null)}
            >
              {t("detail.undo")}
            </Button>
          ) : null}
        </div>

        <div id={moveId} hidden={!moveOpen} className="grid gap-2 rounded-lg border border-line bg-canvas p-3">
          <div role="group" aria-label={t("detail.moveTo")} className="flex flex-wrap gap-1.5">
            {MOVE_TARGETS.filter((c) => c !== item.category).map((c) => (
              <Button
                key={c}
                size="sm"
                disabled={demo}
                title={demo ? t("demo.readOnly") : undefined}
                icon={<CategoryMark category={c} />}
                onClick={() => void onMove(c)}
              >
                {t(`categories.${c}`)}
              </Button>
            ))}
          </div>
          {demo ? <p className="text-xs text-ink-3">{t("demo.readOnly")}</p> : null}
        </div>
        <p role="alert" className={moveError ? "flex items-start gap-1.5 text-sm text-danger" : "sr-only"}>
          {moveError ? (
            <>
              <WarningCircleIcon aria-hidden size={16} weight="bold" className="mt-px shrink-0" />
              {t("errors.overrideFailed")}
            </>
          ) : null}
        </p>
      </header>

      {scam ? (
        <p className="flex items-start gap-2 rounded-lg bg-cat-possible-scam-tint px-3.5 py-3 text-sm text-ink">
          <InfoIcon aria-hidden size={17} weight="bold" className="mt-px shrink-0 text-cat-possible-scam-ink" />
          {t("dashboard.scamAdvisory")}
        </p>
      ) : null}

      {item.excerpt ? (
        <section aria-labelledby={excerptId} className="grid gap-2">
          <h3 id={excerptId} className="text-sm font-medium text-ink-3">
            {t("detail.excerpt")}
          </h3>
          <p className="max-w-[68ch] rounded-lg border border-line bg-canvas px-4 py-3.5 text-md whitespace-pre-line text-ink-2">
            {displayExcerpt(item.excerpt)}
          </p>
        </section>
      ) : null}

      <section aria-labelledby={whyId} className="grid gap-5 border-t border-line pt-5">
        <h3 id={whyId} className="text-lg font-semibold text-ink">
          {t("detail.why")}
        </h3>

        {item.reasons.length > 0 ? (
          <Subsection title={t("detail.reasons")}>
            <ul className="flex flex-wrap gap-1.5">
              {item.reasons.map((r) => (
                <li key={r.key} className="max-w-full">
                  <Chip tone={RISK_REASONS.has(r.key) ? "risk" : "neutral"}>{t(r.key, r.params)}</Chip>
                </li>
              ))}
            </ul>
          </Subsection>
        ) : null}

        <div className="grid gap-x-10 gap-y-6 2xl:grid-cols-2">
          <Subsection title={t("detail.probabilities")}>
            <ProbabilityBars probabilities={item.detail.probabilities} highlight={item.category} scamThreshold={thresholds?.scam} />
          </Subsection>

          <Subsection title={t("detail.signals")}>
            <dl className="grid gap-y-1.5">
              {SIGNAL_KEYS.map((key) => {
                const v = signalValue(key);
                return (
                  <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <dt className="truncate text-sm text-ink-2">{t(`detail.signal.${key}`)}</dt>
                    <dd
                      className={cn(
                        "inline-flex items-center gap-1.5 text-sm",
                        v.risky ? "font-medium text-cat-possible-scam-ink" : v.ok ? "text-ink" : "text-ink-3",
                      )}
                    >
                      {v.risky ? (
                        <WarningIcon aria-hidden size={14} weight="bold" />
                      ) : v.ok ? (
                        <CheckIcon aria-hidden size={14} weight="bold" />
                      ) : (
                        <MinusIcon aria-hidden size={14} />
                      )}
                      {v.text}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </Subsection>
        </div>

        <Subsection title={t("detail.judgments")}>
          <ul className="grid gap-x-10 gap-y-2 lg:grid-cols-2">
            {nouls.map((id) => {
              const v = item.detail.nouls[id];
              const hit = v >= strong;
              return (
                <li key={id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <span className={cn("truncate text-sm", hit ? "font-medium text-ink" : "text-ink-2")}>{t(`detail.noul.${id}`)}</span>
                  <Meter value={v} label={t(`detail.noul.${id}`)} valueText={percent(v, locale)} width="5rem" className="[&>span:last-child]:w-10 [&>span:last-child]:text-right" />
                </li>
              );
            })}
            <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <span className="truncate text-sm text-ink-2">{t("dashboard.urgency")}</span>
              <Meter
                value={item.detail.urgencyScore}
                max={3}
                label={t("dashboard.urgency")}
                valueText={t("dashboard.urgencyValue", { value: formatScore(item.detail.urgencyScore, locale) })}
                width="5rem"
                className="[&>span:last-child]:w-10 [&>span:last-child]:text-right"
              />
            </li>
          </ul>
        </Subsection>

        <p className="font-mono text-xs break-all text-ink-3">{t("detail.model", { model: item.detail.model })}</p>
      </section>
    </article>
  );
}

export type ReadingPaneProps = Omit<MessageDetailProps, "item" | "inSheet" | "subjectId"> & {
  item: DashboardItem | null;
  loading: boolean;
  /** Esc inside the pane: hand focus back to the list. */
  onEscape: () => void;
  className?: string;
};

/**
 * The right-hand zone (768px and up). Focusable (tabIndex -1) so Enter in
 * the list can move focus here; it is a region named by the subject.
 */
export const ReadingPane = forwardRef<HTMLElement, ReadingPaneProps>(function ReadingPane(
  { item, loading, onEscape, className, ...detail },
  ref,
) {
  const t = useTranslations();
  const subjectId = useId();
  const emptyId = useId();

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby={item ? subjectId : emptyId}
      onKeyDown={(e) => {
        if (e.key === "Escape") onEscape();
      }}
      className={cn("min-h-0 min-w-0 overflow-y-auto overscroll-contain bg-surface outline-offset-[-2px]", className)}
    >
      {item ? (
        <div className="mx-auto w-full max-w-[52rem] px-6 py-6 xl:px-10 xl:py-8">
          <MessageDetail key={item.id} item={item} subjectId={subjectId} {...detail} />
        </div>
      ) : loading ? (
        <div className="mx-auto grid w-full max-w-[52rem] gap-3 px-6 py-8 xl:px-10">
          <span id={emptyId} className="sr-only">
            {t("detail.emptyTitle")}
          </span>
          <div aria-hidden className="h-5 w-40 rounded-sm bg-sunken" />
          <div aria-hidden className="h-6 w-3/4 rounded-sm bg-sunken" />
          <div aria-hidden className="h-3 w-1/2 rounded-sm bg-sunken" />
          <div aria-hidden className="mt-4 h-24 w-full rounded-lg bg-sunken" />
        </div>
      ) : (
        <div className="grid h-full min-h-64 place-content-center justify-items-center gap-2 px-8 text-center">
          <span aria-hidden className="mb-1 grid size-12 place-items-center rounded-full bg-sunken text-ink-3">
            <EnvelopeSimpleIcon size={22} weight="bold" />
          </span>
          <h2 id={emptyId} className="text-base font-semibold text-ink">
            {t("detail.emptyTitle")}
          </h2>
          <p className="max-w-[34ch] text-sm text-ink-3">{t("detail.emptyHint")}</p>
        </div>
      )}
    </section>
  );
});
