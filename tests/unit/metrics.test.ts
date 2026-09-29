import { expect, it } from "vitest";
import { computeMetrics, renderMarkdown } from "@/core/eval/metrics";

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

it("returns zeroed metrics for empty input", () => {
  expect(computeMetrics([])).toEqual({ total: 0, accuracy: 0, perClass: {}, perLanguage: {}, confusion: {} });
});

it("renders tables and shows – when precision or recall is undefined", () => {
  const m = computeMetrics([
    { expected: "needs_reply", actual: "needs_reply", lang: "es" },
    { expected: "needs_reply", actual: "unsure", lang: "en" },
  ]);
  const md = renderMarkdown(m, { model: "jev-test", date: "2026-09-29" });
  expect(md).toContain("Model `jev-test` · 2026-09-29 · 2 emails · accuracy **50%**");
  expect(md).toContain("| needs_reply | 100% | 50% | 2 |");
  // `unsure` is predicted but never expected: precision 0/1, recall undefined (support 0).
  expect(md).toContain("| unsure | 0% | – | 0 |");
  expect(md).toContain("| es | 100% |");
  expect(md).toContain("| en | 0% |");
  expect(md).toContain("| needs_reply | 1 | 1 |");
});

it("shows – for precision when a class is never predicted", () => {
  const md = renderMarkdown(computeMetrics([{ expected: "commercial", actual: "none", lang: "en" }]), { model: "m", date: "d" });
  expect(md).toContain("| commercial | – | 0% | 1 |");
});
