"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { XIcon } from "@phosphor-icons/react/ssr";
import { cn } from "./cn";

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Accessible label for the close button (i18n: detail.close). */
  closeLabel: string;
  /** Optional line under the title (sender, date...). */
  description?: ReactNode;
  children: ReactNode;
  /** Sticky footer, e.g. "Not this? Move to...". */
  footer?: ReactNode;
  /** Runs once the panel has closed and focus went back to its opener, e.g. to
   *  move focus elsewhere when the opener no longer exists. */
  onAfterClose?: () => void;
  className?: string;
};

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Side panel built on a modal <dialog>:
 * - showModal() makes the page behind inert and renders ::backdrop;
 * - Esc closes through a single "cancel" handler that calls onClose once
 *   (open state stays in React; a native close is re-synced once too);
 * - Tab / Shift+Tab are trapped inside the panel;
 * - focus returns to the element that opened it;
 * - the scrollable body is focusable (tabIndex=0, named by the title);
 * - clicking the backdrop closes only if the press also started on it.
 * Right-hand panel from md (768px) up, full-screen sheet below it.
 */
export function Sheet({ open, onClose, title, closeLabel, description, children, footer, onAfterClose, className }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const onAfterCloseRef = useRef(onAfterClose);
  const openRef = useRef(open);
  // Set once a close has been requested for the current open cycle, so onClose fires exactly once.
  const closeRequested = useRef(false);
  // A backdrop close needs both pointerdown and click on the backdrop (a text
  // selection dragged out of the panel must not close it).
  const pressedBackdrop = useRef(false);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
    onAfterCloseRef.current = onAfterClose;
    openRef.current = open;
  });

  const requestClose = () => {
    if (closeRequested.current) return;
    closeRequested.current = true;
    onCloseRef.current();
  };

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      closeRequested.current = false;
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Esc: the single path. Keep the dialog open until React closes it.
    const onCancel = (e: Event) => {
      e.preventDefault();
      requestClose();
    };
    const onDialogClose = () => {
      // The browser may still close natively (e.g. a repeated Esc without user
      // activation skips "cancel"); keep React state in sync, once.
      if (openRef.current) requestClose();
      returnFocus.current?.focus();
      returnFocus.current = null;
      onAfterCloseRef.current?.();
    };
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", onDialogClose);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onDialogClose);
    };
  }, []);

  function onKeyDown(e: KeyboardEvent<HTMLDialogElement>) {
    if (e.key !== "Tab" || !ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.getClientRects().length > 0,
    );
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !ref.current.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !ref.current.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onKeyDown={onKeyDown}
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressedBackdrop.current && e.target === e.currentTarget) requestClose();
        pressedBackdrop.current = false;
      }}
      className={cn(
        "fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-none bg-transparent p-0 text-ink md:w-[min(30rem,100vw)]",
        "transition-[translate,display,overlay] transition-discrete duration-(--duration-move) ease-(--ease-out)",
        "translate-x-full open:translate-x-0 starting:open:translate-x-full",
        className,
      )}
    >
      <div className="flex h-full flex-col border-l border-line bg-surface shadow-raised md:rounded-l-xl">
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold text-balance text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-0.5 text-sm text-ink-3">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={closeLabel}
            className="-mr-1.5 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-ink-2 transition-colors duration-(--duration-fast) hover:bg-sunken hover:text-ink pointer-coarse:size-11"
          >
            <XIcon aria-hidden size={18} weight="bold" />
          </button>
        </header>
        {/* Focusable so keyboard users can scroll long content; named by the title. */}
        <div
          role="region"
          aria-labelledby={titleId}
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4"
        >
          {children}
        </div>
        {footer ? <footer className="border-t border-line px-5 py-3">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
