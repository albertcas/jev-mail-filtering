"use client";

import { useId, type ChangeEvent } from "react";
import { cn } from "./cn";

export type SliderProps = {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Helper text under the control, linked with aria-describedby. */
  hint?: string;
  /** Formats the visible and announced value, e.g. v => `${Math.round(v * 100)}%`. */
  formatValue?: (value: number) => string;
  disabled?: boolean;
  name?: string;
  className?: string;
};

/**
 * A labelled native <input type="range">: keyboard (arrows, Home/End, PageUp/Down)
 * and screen-reader support come from the platform. onValueChange fires on every
 * input event so thresholds can recalculate while dragging.
 */
export function Slider({
  label,
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.01,
  hint,
  formatValue = (v) => String(v),
  disabled,
  name,
  className,
}: SliderProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const formatted = formatValue(value);

  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-base font-medium text-ink">
          {label}
        </label>
        <output htmlFor={id} className="tabular text-base text-ink-2">
          {formatted}
        </output>
      </div>
      <input
        id={id}
        name={name}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={formatted}
        aria-describedby={hint ? hintId : undefined}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onValueChange(Number(e.target.value))}
        className="h-6 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 pointer-coarse:h-11"
      />
      {hint ? (
        <p id={hintId} className="text-sm text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
