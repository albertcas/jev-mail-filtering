import { decide, type DisplayCategory } from "@/core/policy/decide";
import type { Reason } from "@/core/policy/reasons";
import type { Thresholds } from "@/core/policy/thresholds";
import type { ClassifiedRow } from "@/core/store/repo";
import type { Signals } from "@/core/types";
import type { CategoryLabel, NoulId } from "@/core/classify/answers";

export type DashboardItem = {
  id: number;
  messageId: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  excerpt: string;
  date: number;
  category: DisplayCategory;
  confidence: number;
  urgency: number | null;
  reasons: Reason[];
  overridden: boolean;
  detail: {
    probabilities: Record<CategoryLabel, number>;
    nouls: Record<NoulId, number>;
    urgencyScore: number;
    signals: Signals;
    model: string;
  };
};

export function toDashboardItems(rows: ClassifiedRow[], t: Thresholds): DashboardItem[] {
  return rows.map((r) => {
    const signals = JSON.parse(r.signalsJson) as Signals;
    const d = decide(r.answers, signals, t);
    const overridden = r.override !== null;
    return {
      id: r.id,
      messageId: r.messageId,
      fromName: r.fromName,
      fromAddress: r.fromAddress,
      subject: r.subject,
      excerpt: r.excerpt,
      date: r.date,
      category: overridden ? (r.override as DisplayCategory) : d.category,
      confidence: overridden ? 1 : d.confidence,
      urgency: d.urgency,
      reasons: overridden ? [{ key: "reason.manualOverride" }, ...d.reasons] : d.reasons,
      overridden,
      detail: {
        probabilities: r.answers.category.probabilities,
        nouls: r.answers.nouls,
        urgencyScore: r.answers.urgency.score,
        signals,
        model: r.model,
      },
    };
  });
}
