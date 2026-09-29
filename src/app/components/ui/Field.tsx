import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react/ssr";
import { cn } from "./cn";

/** Props a Field hands to its control so label, hint and error are wired up. */
export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
};

export type FieldProps = {
  label: ReactNode;
  /** Helper text, always visible, linked via aria-describedby. */
  hint?: ReactNode;
  /** Error shown under the control; sets aria-invalid. Name the problem and the fix. */
  error?: ReactNode;
  required?: boolean;
  children: (control: FieldControlProps) => ReactNode;
  className?: string;
};

/**
 * Label above, control, hint, error below. Never placeholder-as-label.
 * No "use client": useId works in Server Components, and the render-prop
 * children could not cross a client boundary anyway.
 */
export function Field({ label, hint, error, required, children, className }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <label htmlFor={id} className="text-base font-medium text-ink">
        {label}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        "aria-required": required ? true : undefined,
      })}
      {hint ? (
        <p id={hintId} className="text-sm text-ink-3">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-danger">
          <WarningCircleIcon aria-hidden size={16} weight="bold" className="mt-px shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

const control = cn(
  "h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink placeholder:text-ink-3",
  "transition-colors duration-(--duration-fast) hover:border-ink-3",
  "aria-invalid:border-danger disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-3 pointer-coarse:h-11",
);

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...rest} />;
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, "pr-8", className)} {...rest} />;
}
