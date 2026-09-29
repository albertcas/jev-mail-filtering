export type EvalRow = { expected: string; actual: string; lang: "es" | "en" };
export type Metrics = {
  total: number;
  accuracy: number;
  perClass: Record<string, { precision: number; recall: number; support: number }>;
  perLanguage: Record<string, number>;
  confusion: Record<string, Record<string, number>>;
};

const ratio = (a: number, b: number) => (b === 0 ? 0 : a / b);

export function computeMetrics(rows: EvalRow[]): Metrics {
  const labels = [...new Set(rows.flatMap((r) => [r.expected, r.actual]))].sort();
  const confusion: Metrics["confusion"] = Object.fromEntries(labels.map((l) => [l, Object.fromEntries(labels.map((k) => [k, 0]))]));
  for (const r of rows) confusion[r.expected]![r.actual]!++;
  const perClass: Metrics["perClass"] = {};
  for (const l of labels) {
    const tp = confusion[l]![l]!;
    const predicted = labels.reduce((s, e) => s + confusion[e]![l]!, 0);
    const support = labels.reduce((s, a) => s + confusion[l]![a]!, 0);
    perClass[l] = { precision: ratio(tp, predicted), recall: ratio(tp, support), support };
  }
  const perLanguage: Metrics["perLanguage"] = {};
  for (const lang of [...new Set(rows.map((r) => r.lang))]) {
    const sub = rows.filter((r) => r.lang === lang);
    perLanguage[lang] = ratio(sub.filter((r) => r.expected === r.actual).length, sub.length);
  }
  return { total: rows.length, accuracy: ratio(rows.filter((r) => r.expected === r.actual).length, rows.length), perClass, perLanguage, confusion };
}

export function renderMarkdown(m: Metrics, meta: { model: string; date: string }): string {
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
  const labels = Object.keys(m.confusion);
  // A ratio with a zero denominator is undefined, not 0%: show "–" (e.g. `unsure` is predicted but never expected).
  const predicted = (l: string) => labels.reduce((s, e) => s + m.confusion[e]![l]!, 0);
  const cell = (x: number, denominator: number) => (denominator === 0 ? "–" : pct(x));
  return [
    `# Evaluation results`,
    ``,
    `Model \`${meta.model}\` · ${meta.date} · ${m.total} emails · accuracy **${pct(m.accuracy)}**`,
    ``,
    `| Category | Precision | Recall | Support |`,
    `|---|---|---|---|`,
    ...Object.entries(m.perClass).map(([k, v]) => `| ${k} | ${cell(v.precision, predicted(k))} | ${cell(v.recall, v.support)} | ${v.support} |`),
    ``,
    `| Language | Accuracy |`,
    `|---|---|`,
    ...Object.entries(m.perLanguage).map(([k, v]) => `| ${k} | ${pct(v)} |`),
    ``,
    `Confusion matrix (rows = expected, columns = predicted)`,
    ``,
    `| | ${labels.join(" | ")} |`,
    `|---|${labels.map(() => "---").join("|")}|`,
    ...labels.map((e) => `| ${e} | ${labels.map((a) => m.confusion[e]![a]).join(" | ")} |`),
    ``,
  ].join("\n");
}
