export type Thresholds = { scam: number; minConfidence: number; strongNoul: number };

export const DEFAULT_THRESHOLDS: Thresholds = { scam: 0.5, minConfidence: 0.5, strongNoul: 0.7 };

function toUnit(value: unknown, fallback: number): number {
  if (value === null) return fallback;
  if (typeof value === "string") {
    if (!value.trim()) return fallback;
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(1, Math.max(0, n));
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

export function parseThresholds(input: unknown): Thresholds {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    scam: toUnit(o.scam, DEFAULT_THRESHOLDS.scam),
    minConfidence: toUnit(o.minConfidence, DEFAULT_THRESHOLDS.minConfidence),
    strongNoul: toUnit(o.strongNoul, DEFAULT_THRESHOLDS.strongNoul),
  };
}
