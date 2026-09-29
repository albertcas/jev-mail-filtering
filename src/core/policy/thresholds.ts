export type Thresholds = { scam: number; minConfidence: number; strongNoul: number };

export const DEFAULT_THRESHOLDS: Thresholds = { scam: 0.5, minConfidence: 0.5, strongNoul: 0.7 };

function toUnit(value: unknown, fallback: number): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

export function parseThresholds(input: unknown): Thresholds {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    scam: toUnit(o.scam, DEFAULT_THRESHOLDS.scam),
    minConfidence: toUnit(o.minConfidence, DEFAULT_THRESHOLDS.minConfidence),
    strongNoul: toUnit(o.strongNoul, DEFAULT_THRESHOLDS.strongNoul),
  };
}
