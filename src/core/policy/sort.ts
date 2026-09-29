import type { Decision } from "./decide";

export function sortForColumn<T extends { decision: Decision; date: number }>(items: T[]): T[] {
  return [...items].sort((x, y) => {
    const ux = x.decision.urgency ?? -1;
    const uy = y.decision.urgency ?? -1;
    if (ux !== uy) return uy - ux;
    return y.date - x.date;
  });
}
