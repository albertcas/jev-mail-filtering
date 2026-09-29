"use client";

import { useId, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowCounterClockwiseIcon,
  ArrowSquareOutIcon,
  CheckIcon,
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
import { Badge, Button, Chip, Meter, Sheet, cn } from "../ui";
import { CategoryMark } from "./Column";
import { RISK_REASONS, formatFullDate, formatScore, percent, toneOf, type ColumnId } from "./format";
import { gmailSearchUrl } from "./gmail-link";
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

export type DetailSheetProps = {
  open: boolean;
  item: DashboardItem | null;
  demo: boolean;
  thresholds: Thresholds | null;
  /** Show "Open in Gmail" (the account is Gmail, or the demo). */
  showGmailLink: boolean;
  /** The last "Move to…" / "Undo" request failed. */
  moveError?: boolean;
  onClose: () => void;
  onMove: (category: DisplayCategory | "none" | null) => Promise<void>;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="grid gap-3 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h3 id={id} className="text-sm font-semibold text-ink">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function DetailSheet({ open, item, demo, thresholds, showGmailLink, moveError, onClose, onMove }: DetailSheetProps) {
  const t = useTranslations();
  const locale = useLocale();
  if (!item) return null;

  const strong = thresholds?.strongNoul ?? 0.7;
  const nouls = [...NOUL_IDS].sort((a, b) => item.detail.nouls[b] - item.detail.nouls[a]);
  const sender = item.fromName ? `${item.fromName} <${item.fromAddress}>` : item.fromAddress;

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

  const moveFooter = (
    <div className="grid gap-2.5">
      <p className="text-sm font-medium text-ink" id={`move-${item.id}`}>
        {t("detail.moveTo")}
      </p>
      <div role="group" aria-labelledby={`move-${item.id}`} className="flex flex-wrap gap-1.5">
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
      <p role="alert" className={moveError ? "flex items-start gap-1.5 text-sm text-danger" : "sr-only"}>
        {moveError ? (
          <>
            <WarningCircleIcon aria-hidden size={16} weight="bold" className="mt-px shrink-0" />
            {t("errors.overrideFailed")}
          </>
        ) : null}
      </p>
      <div className="flex flex-wrap items-center gap-2 empty:hidden">
        {item.overridden ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={demo}
            icon={<ArrowCounterClockwiseIcon size={16} weight="bold" />}
            onClick={() => void onMove(null)}
          >
            {t("detail.undo")}
          </Button>
        ) : null}
        {showGmailLink ? (
          <a
            href={gmailSearchUrl(item.messageId)}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-ink-2 underline decoration-line-strong hover:text-ink pointer-coarse:min-h-11"
          >
            {t("detail.openInGmail")}
            <ArrowSquareOutIcon aria-hidden size={14} weight="bold" />
          </a>
        ) : null}
      </div>
    </div>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      closeLabel={t("detail.close")}
      title={item.subject || t("dashboard.noSubject")}
      description={
        <>
          <span className="break-all">{sender}</span> · <time dateTime={new Date(item.date).toISOString()}>{formatFullDate(item.date, locale)}</time>
        </>
      }
      footer={moveFooter}
    >
      <div className="grid gap-5">
        <Section title={t("detail.title")}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Badge
              tone={toneOf[item.category]}
              icon={item.category === "possible_scam" ? <ShieldWarningIcon size={13} weight="fill" /> : undefined}
            >
              {t(`categories.${item.category}`)}
            </Badge>
            <Meter
              value={item.confidence}
              label={t("dashboard.confidence", { value: percent(item.confidence, locale) })}
              valueText={t("dashboard.confidence", { value: percent(item.confidence, locale) })}
              width="4rem"
            />
          </div>
          {item.reasons.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {item.reasons.map((r) => (
                <li key={r.key} className="max-w-full">
                  <Chip tone={RISK_REASONS.has(r.key) ? "risk" : "neutral"}>{t(r.key, r.params)}</Chip>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        <Section title={t("detail.probabilities")}>
          <ProbabilityBars probabilities={item.detail.probabilities} highlight={item.category} scamThreshold={thresholds?.scam} />
        </Section>

        <Section title={t("detail.judgments")}>
          <ul className="grid gap-2">
            {nouls.map((id) => {
              const v = item.detail.nouls[id];
              const hit = v >= strong;
              return (
                <li key={id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <span className={cn("truncate text-sm", hit ? "font-medium text-ink" : "text-ink-2")}>{t(`detail.noul.${id}`)}</span>
                  <Meter value={v} label={t(`detail.noul.${id}`)} valueText={percent(v, locale)} width="5rem" className="[&>span]:w-10 [&>span]:text-right" />
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
                className="[&>span]:w-10 [&>span]:text-right"
              />
            </li>
          </ul>
        </Section>

        <Section title={t("detail.signals")}>
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
        </Section>

        <p className="border-t border-line pt-4 font-mono text-xs break-all text-ink-3">
          {t("detail.model", { model: item.detail.model })}
        </p>
      </div>
    </Sheet>
  );
}
