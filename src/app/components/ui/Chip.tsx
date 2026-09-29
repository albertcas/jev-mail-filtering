import type { ReactNode } from "react";
import { cn } from "./cn";

type ChipTone = "neutral" | "risk" | "trust";

const tones: Record<ChipTone, string> = {
  neutral: "border-line text-ink-2",
  risk: "border-transparent bg-cat-possible-scam-tint text-cat-possible-scam-ink",
  trust: "border-transparent bg-success-tint text-success",
};

const base =
  "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs leading-4 whitespace-nowrap";

export type ChipProps = {
  children: ReactNode;
  /** risk = evidence against the sender, trust = evidence for it. */
  tone?: ChipTone;
  icon?: ReactNode;
  className?: string;
};

/** A reason or signal label. Non-interactive, so it is a plain <span>. */
export function Chip({ children, tone = "neutral", icon, className }: ChipProps) {
  return (
    <span className={cn(base, tones[tone], className)}>
      {icon ? (
        <span aria-hidden className="inline-flex shrink-0">
          {icon}
        </span>
      ) : null}
      <span className="truncate">{children}</span>
    </span>
  );
}
