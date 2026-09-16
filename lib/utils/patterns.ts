import { QuestionAttemptResult, Recurrence } from "@/types";

export interface MisconceptionPattern {
  misconceptionId: string;
  misconceptionName: string;
  concept: string;
  occurrenceCount: number;
  recurrence: Recurrence;
  attempts: QuestionAttemptResult[];
}

const SEVERITY_RANK: Record<Recurrence, number> = {
  recurring_misconception: 0,
  pattern_emerging: 1,
  possible_mistake: 2,
};

export const PRIORITY_LABEL: Record<Recurrence, string> = {
  recurring_misconception: "High priority",
  pattern_emerging: "Moderate",
  possible_mistake: "Low priority",
};

export function groupPatterns(results: QuestionAttemptResult[]): MisconceptionPattern[] {
  const byId = new Map<string, MisconceptionPattern>();

  for (const r of results) {
    const id = r.result.misconceptionId;
    if (!id) continue;
    const recurrence = r.result.recurrence ?? "possible_mistake";
    const existing = byId.get(id);
    if (existing) {
      existing.attempts.push(r);
      if (r.result.occurrenceCount >= existing.occurrenceCount) {
        existing.occurrenceCount = r.result.occurrenceCount;
        existing.recurrence = recurrence;
      }
    } else {
      byId.set(id, {
        misconceptionId: id,
        misconceptionName: r.result.misconception ?? id,
        concept: r.result.concept ?? "",
        occurrenceCount: r.result.occurrenceCount,
        recurrence,
        attempts: [r],
      });
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => SEVERITY_RANK[a.recurrence] - SEVERITY_RANK[b.recurrence]
  );
}
