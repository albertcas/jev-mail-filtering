"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../ui";

export type StepFrameProps = {
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  /** Back / Continue row. */
  footer?: ReactNode;
  /** Move focus to the heading on mount (every step change after the first render). */
  autoFocus?: boolean;
};

/**
 * One wizard step: heading, a short reading intro, the step's content and its
 * navigation. The heading takes focus when the step changes so keyboard and
 * screen-reader users land at the top of the new step.
 */
export function StepFrame({ title, intro, children, footer, autoFocus = true }: StepFrameProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (autoFocus) heading.current?.focus();
  }, [autoFocus]);

  return (
    <section className="grid gap-6">
      <div className="grid gap-2">
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold tracking-[-0.01em] text-balance text-ink focus:outline-none">
          {title}
        </h1>
        {intro ? <p className="max-w-[60ch] text-md text-pretty text-ink-2">{intro}</p> : null}
      </div>
      {children}
      {footer ? <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">{footer}</div> : null}
    </section>
  );
}

/** The surface that holds a step's form, separated from the instructions on the canvas. */
export function FormCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 rounded-lg border border-line bg-surface p-4 shadow-card md:p-5", className)}>{children}</div>;
}
