import { sortForColumn } from "@/core/policy/sort";
import type { DashboardItem } from "@/server/dashboard";
import { COLUMNS, type ColumnId } from "./format";

/** Sidebar order: the five decided categories, then Others (emails Jev put in no category). */
export const NAV = [...COLUMNS, "none"] as const satisfies readonly ColumnId[];

/** Items per category, each list in sortForColumn order (urgency first, then newest). */
export function groupByCategory(items: readonly DashboardItem[]): Record<ColumnId, DashboardItem[]> {
  const groups = Object.fromEntries(NAV.map((c) => [c, [] as DashboardItem[]])) as Record<ColumnId, DashboardItem[]>;
  for (const it of items) groups[it.category]?.push(it);
  for (const c of NAV) {
    groups[c] = sortForColumn(
      groups[c].map((item) => ({
        item,
        date: item.date,
        decision: { category: item.category, confidence: item.confidence, reasons: item.reasons, urgency: item.urgency },
      })),
    ).map((x) => x.item);
  }
  return groups;
}

/**
 * Listbox keyboard model (single select, selection follows focus).
 * Returns the index to select for `key`, or null when the key is not a
 * navigation key (or the list is empty). From "nothing selected" (-1) any
 * arrow lands on the first item.
 */
export function nextIndex(key: string, index: number, length: number): number | null {
  if (length <= 0) return null;
  const last = length - 1;
  switch (key) {
    case "ArrowDown":
      return index < 0 ? 0 : Math.min(index + 1, last);
    case "ArrowUp":
      return index < 0 ? 0 : Math.max(index - 1, 0);
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
}

/**
 * The item shown in the reading pane: the chosen one if it is still in this
 * list, otherwise (when auto-select is on, i.e. list and pane side by side)
 * the first item, otherwise nothing.
 */
export function resolveSelection(list: readonly DashboardItem[], selectedId: number | null, autoSelect: boolean): DashboardItem | null {
  const chosen = selectedId === null ? undefined : list.find((i) => i.id === selectedId);
  if (chosen) return chosen;
  return autoSelect ? (list[0] ?? null) : null;
}

/** The id to select after `id` leaves the list (the next item, else the previous one). */
export function neighborId(list: readonly DashboardItem[], id: number): number | null {
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return null;
  return (list[i + 1] ?? list[i - 1])?.id ?? null;
}

export type UrgencyLevel = "today" | "days" | "week" | "none";

/** Jev's 0-3 urgency score, read as the four criteria it was asked with. */
export function urgencyLevel(score: number): UrgencyLevel {
  const s = Number.isFinite(score) ? Math.round(Math.min(3, Math.max(0, score))) : 0;
  return (["none", "week", "days", "today"] as const)[s]!;
}

const NON_TEXT_INPUTS = new Set(["range", "checkbox", "radio", "button", "submit", "reset", "color", "file"]);

/** True when a single-letter shortcut must not fire: the user is typing into a field. */
export function isTypingTarget(el: { tagName?: string; type?: string; isContentEditable?: boolean } | null): boolean {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName?.toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") return !NON_TEXT_INPUTS.has((el.type ?? "text").toLowerCase());
  return false;
}
