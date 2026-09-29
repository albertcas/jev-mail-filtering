/** Sync frequencies offered in the UI (minutes). The config accepts 5–1440. */
export const INTERVAL_CHOICES = [5, 15, 30, 60, 120, 360, 720, 1440] as const;

/** The choices, plus the saved value when it was set to something else (e.g. by hand). */
export function intervalOptions(current: number): number[] {
  const all = new Set<number>(INTERVAL_CHOICES);
  if (Number.isInteger(current) && current >= 5 && current <= 1440) all.add(current);
  return [...all].sort((a, b) => a - b);
}

/** Splits minutes into the unit used to label it: whole hours read as hours. */
export function intervalUnit(minutes: number): { unit: "minutes" | "hours"; count: number } {
  return minutes >= 60 && minutes % 60 === 0 ? { unit: "hours", count: minutes / 60 } : { unit: "minutes", count: minutes };
}

/** A pinned model id: non-empty, no spaces, at most 64 characters. */
export function normalizeModel(v: string): string | null {
  const m = v.trim();
  return m.length > 0 && m.length <= 64 && !/\s/.test(m) ? m : null;
}
