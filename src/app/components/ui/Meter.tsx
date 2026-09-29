import { cn } from "./cn";
import { categoryMark, type CategoryTone } from "./tones";

export type MeterProps = {
  value: number;
  min?: number;
  max?: number;
  /** Accessible name, e.g. "Confidence". Required: a meter is never color alone. */
  label: string;
  /** Human reading of the value, e.g. "82%". Announced as aria-valuetext and shown when showValue. */
  valueText?: string;
  /** Render the valueText next to the bar (default true). */
  showValue?: boolean;
  /** Fill color: neutral ink, or a category mark when the bar stands for that category. */
  tone?: "neutral" | CategoryTone;
  /** sm = 6px bar inside cards; md = 8px bar in the detail panel. */
  size?: "sm" | "md";
  /** Bar width (CSS length). The label column is the caller's job. */
  width?: string;
  className?: string;
};

/**
 * A bounded scalar (confidence, a probability, urgency) drawn as a thin bar.
 * role="meter" with aria-valuenow/min/max; the number is always shown in text
 * too, because a thin bar alone is not readable.
 * The track is --surface with a 1px --line-strong inset ring, so every fill
 * (neutral ink or any category mark) keeps >= 3:1 against what it sits on,
 * in both modes; category marks never sit on --sunken.
 */
export function Meter({
  value,
  min = 0,
  max = 1,
  label,
  valueText,
  showValue = true,
  tone = "neutral",
  size = "sm",
  width = "3rem",
  className,
}: MeterProps) {
  // NaN / Infinity (e.g. a missing probability) render as the minimum.
  const safe = Number.isFinite(value) ? value : min;
  const clamped = Math.min(max, Math.max(min, safe));
  const fraction = max === min ? 0 : (clamped - min) / (max - min);
  const text = valueText ?? `${Math.round(fraction * 100)}%`;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={text}
        className={cn(
          "relative min-w-0 overflow-hidden rounded-sm bg-surface shadow-[inset_0_0_0_1px_var(--line-strong)]",
          size === "sm" ? "h-1.5" : "h-2",
        )}
        style={{ width }}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-sm transition-[width] duration-(--duration-base) ease-(--ease-out)",
            tone === "neutral" ? "bg-ink-2" : categoryMark[tone],
          )}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      {showValue ? (
        <span aria-hidden className="tabular shrink-0 text-xs text-ink-2">
          {text}
        </span>
      ) : null}
    </div>
  );
}
