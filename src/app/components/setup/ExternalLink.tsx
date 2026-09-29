import type { ReactNode } from "react";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/ssr";
import { cn } from "../ui";

export type ExternalLinkProps = {
  href: string;
  children: ReactNode;
  /** Screen-reader note that the link opens a new tab (i18n: setup.newTab). */
  newTabLabel: string;
  /** "button" draws it as a secondary button; "inline" as an underlined link. */
  variant?: "button" | "inline";
  className?: string;
};

/** A link to another site, always in a new tab without an opener reference. */
export function ExternalLink({ href, children, newTabLabel, variant = "inline", className }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        variant === "button"
          ? "inline-flex h-9 items-center gap-2 rounded-md border border-line-strong bg-surface px-4 text-base font-medium text-ink no-underline transition-colors duration-(--duration-fast) hover:bg-sunken active:translate-y-px pointer-coarse:min-h-11"
          : "inline-flex items-center gap-1 text-base font-medium text-ink underline decoration-current/40 underline-offset-[0.2em] hover:decoration-current",
        className,
      )}
    >
      {children}
      <ArrowSquareOutIcon aria-hidden size={variant === "button" ? 16 : 14} weight="bold" className="shrink-0 text-ink-2" />
      <span className="sr-only">{newTabLabel}</span>
    </a>
  );
}
