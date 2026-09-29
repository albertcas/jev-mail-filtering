import type { ReactNode } from "react";
import { cn } from "./cn";
import { categoryMark, categoryTint, type CategoryTone } from "./tones";

export type BadgeProps = {
  tone: CategoryTone;
  children: ReactNode;
  /** Optional leading icon (decorative). Possible scam passes a shield so the
   *  category never relies on color alone. Without an icon a solid dot is shown. */
  icon?: ReactNode;
  className?: string;
};

/** Static category label. Never interactive: rendered as a <span>. */
export function Badge({ tone, children, icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
        categoryTint[tone],
        className,
      )}
    >
      {icon ? (
        <span aria-hidden className="inline-flex shrink-0">
          {icon}
        </span>
      ) : (
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", categoryMark[tone])} />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}
