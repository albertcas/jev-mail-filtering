import type { ReactNode } from "react";

/**
 * Numbered instructions. The numbers carry meaning (the order matters), so this
 * is a real <ol>; the markers are drawn so they stay aligned with wrapped lines.
 */
export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="grid gap-3">
      {items.map((item, i) => (
        <li key={i} className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-3 text-md text-ink">
          <span
            aria-hidden
            className="tabular mt-0.5 inline-flex size-6 items-center justify-center rounded-full border border-line-strong bg-surface text-xs font-medium text-ink-2"
          >
            {i + 1}
          </span>
          <span className="max-w-[60ch] text-pretty">{item}</span>
        </li>
      ))}
    </ol>
  );
}
