import { expect, it } from "vitest";
import { computeMetrics } from "@/core/eval/metrics";

it("computes accuracy, per-class precision/recall and per-language accuracy", () => {
  const m = computeMetrics([
    { expected: "possible_scam", actual: "possible_scam", lang: "en" },
    { expected: "possible_scam", actual: "worth_reading", lang: "es" },
    { expected: "commercial", actual: "commercial", lang: "es" },
    { expected: "worth_reading", actual: "possible_scam", lang: "en" },
  ]);
  expect(m.accuracy).toBe(0.5);
  expect(m.perClass.possible_scam).toEqual({ precision: 0.5, recall: 0.5, support: 2 });
  expect(m.perLanguage).toEqual({ en: 0.5, es: 0.5 });
  expect(m.confusion.possible_scam!.worth_reading).toBe(1);
});
