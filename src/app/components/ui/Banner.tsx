import type { ReactNode } from "react";
import { CheckCircleIcon, InfoIcon, WarningCircleIcon, WarningIcon } from "@phosphor-icons/react/ssr";
import { cn } from "./cn";
import { statusTint, type StatusTone } from "./tones";

const icons: Record<StatusTone, ReactNode> = {
  info: <InfoIcon size={18} weight="bold" />,
  success: <CheckCircleIcon size={18} weight="bold" />,
  warning: <WarningIcon size={18} weight="bold" />,
  danger: <WarningCircleIcon size={18} weight="bold" />,
};

export type BannerProps = {
  tone?: StatusTone;
  children: ReactNode;
  /** Trailing action (a link or Button), e.g. "Fix it" or "Install it locally". */
  action?: ReactNode;
  /**
   * How assistive tech hears it. "polite" (role=status) for state that appears
   * after load (IMAP unavailable); "assertive" (role=alert) only for errors that
   * block the task (Jev key rejected); "off" for static notices like the demo banner.
   */
  live?: "off" | "polite" | "assertive";
  className?: string;
};

/** A full-width notice. Tone is carried by icon + text + tint, never by color alone. */
export function Banner({ tone = "info", children, action, live = "off", className }: BannerProps) {
  const role = live === "assertive" ? "alert" : live === "polite" ? "status" : undefined;
  return (
    <div
      role={role}
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-4 py-2.5 text-base",
        statusTint[tone],
        className,
      )}
    >
      <span aria-hidden className="inline-flex shrink-0">
        {icons[tone]}
      </span>
      <div className="min-w-0 flex-1 text-ink">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
