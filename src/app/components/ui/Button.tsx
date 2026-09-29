import type { ButtonHTMLAttributes, ReactNode } from "react";
import { CircleNotchIcon } from "@phosphor-icons/react/ssr";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner, sets aria-busy and blocks further clicks. Keep the label visible. */
  loading?: boolean;
  /** Leading icon (decorative; the label names the action). */
  icon?: ReactNode;
};

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-sunken",
  ghost: "text-ink-2 hover:bg-sunken hover:text-ink",
  danger: "bg-surface text-danger border border-danger hover:bg-danger-tint",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 gap-1.5 text-sm",
  md: "h-9 px-4 gap-2 text-base",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const inert = disabled || loading;
  return (
    <button
      type={type}
      disabled={inert}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-md font-medium",
        "transition-[background-color,color,transform] duration-(--duration-fast) ease-(--ease-out)",
        "active:translate-y-px pointer-coarse:min-h-11",
        "disabled:active:translate-y-0",
        // Loading keeps full strength (work in progress, not unavailable); disabled fades.
        loading ? "cursor-progress" : "disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <CircleNotchIcon aria-hidden size={16} className="animate-spin motion-reduce:animate-none" />
      ) : icon ? (
        <span aria-hidden className="inline-flex">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}
