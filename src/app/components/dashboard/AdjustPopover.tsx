"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SlidersHorizontalIcon, XIcon } from "@phosphor-icons/react/ssr";
import type { Thresholds } from "@/core/policy/thresholds";
import { cn } from "../ui";
import { isTypingTarget } from "./inbox";
import { ThresholdFields } from "./ThresholdFields";
import { useThresholdDraft } from "./useThresholdDraft";

export type AdjustPopoverProps = {
  value: Thresholds;
  /** Persisting is disabled in the demo; live recalculation still works. */
  canSave: boolean;
  onChange: (thresholds: Thresholds) => void;
  onSave: (thresholds: Thresholds) => Promise<unknown>;
};

/**
 * "Adjust" in the list header: a non-modal dialog with the three threshold
 * sliders. Moving one recomputes the list and the counters instantly (GET
 * /api/messages, never Jev). Keyboard: the button or `A` (outside text fields)
 * toggles it, focus lands on the first slider, Esc closes and returns focus
 * to the button; a click outside or tabbing away closes it too. The panel
 * stays mounted while closed so a pending debounced change is never lost.
 */
export function AdjustPopover({ value, canSave, onChange, onSave }: AdjustPopoverProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const panelId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const state = useThresholdDraft(value, onChange, onSave);

  const close = useCallback(() => {
    // Give focus back only if it was inside the panel (a click elsewhere keeps its own target).
    if (panel.current?.contains(document.activeElement)) trigger.current?.focus();
    setOpen(false);
  }, []);

  const toggle = useCallback(() => {
    if (open) close();
    else setOpen(true);
  }, [open, close]);

  // Focus the first slider when it opens.
  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLElement>("input")?.focus();
  }, [open]);

  // `A` toggles it from anywhere on the page, except while typing or when a modal is up.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "a" || e.repeat || e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target as HTMLElement | null)) return;
      if (document.querySelector("dialog[open]")) return;
      e.preventDefault();
      toggle();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);

  // A press outside closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-keyshortcuts="A"
        onClick={toggle}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium transition-colors duration-(--duration-fast) pointer-coarse:min-h-11",
          open ? "border-ink bg-accent text-on-accent" : "border-line-strong bg-surface text-ink hover:bg-sunken",
        )}
      >
        <SlidersHorizontalIcon aria-hidden size={15} weight="bold" />
        {t("dashboard.adjust")}
        <kbd
          aria-hidden
          className={cn(
            "ml-0.5 rounded-sm border px-1 font-sans text-xs leading-4 pointer-coarse:hidden",
            open ? "border-on-accent/40 text-on-accent" : "border-line-strong text-ink-2",
          )}
        >
          A
        </kbd>
      </button>

      <div
        ref={panel}
        id={panelId}
        role="dialog"
        aria-labelledby={titleId}
        hidden={!open}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            close();
          }
        }}
        onBlur={(e) => {
          // Tabbing out of the panel (not to the toggle) closes it.
          const next = e.relatedTarget as Node | null;
          if (next && !wrap.current?.contains(next)) setOpen(false);
        }}
        className={cn(
          "absolute top-full right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-4 shadow-raised",
          "origin-top-right transition-[opacity,scale] transition-discrete duration-(--duration-base) ease-(--ease-out) starting:scale-95 starting:opacity-0",
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <h2 id={titleId} className="flex-1 text-base font-semibold text-ink">
            {t("settings.thresholds")}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label={t("detail.close")}
            className="-mr-1.5 inline-flex size-8 items-center justify-center rounded-md text-ink-2 hover:bg-sunken hover:text-ink pointer-coarse:size-11"
          >
            <XIcon aria-hidden size={16} weight="bold" />
          </button>
        </div>
        <ThresholdFields {...state} canSave={canSave} layout="stack" />
      </div>
    </div>
  );
}
