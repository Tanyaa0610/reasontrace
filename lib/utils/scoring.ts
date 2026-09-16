import { Question } from "@/types";

export interface ScoredResult {
  questionId: string;
  result: { correct: boolean };
}

export function conceptScore(
  results: ScoredResult[],
  concept: string,
  questionBank: Question[]
): { correct: number; total: number; percent: number } {
  const byId = new Map(questionBank.map((q) => [q.id, q]));
  const relevant = results.filter((r) => byId.get(r.questionId)?.concept === concept);
  const correct = relevant.filter((r) => r.result.correct).length;
  const total = relevant.length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { correct, total, percent };
}

export type ResolutionStatus = "resolved" | "improving" | "needs_more_practice";

export function classifyResolution(
  baselinePercent: number,
  postCorrect: number,
  postTotal: number
): ResolutionStatus {
  const postPercent = postTotal === 0 ? 0 : (postCorrect / postTotal) * 100;
  if (postCorrect === postTotal && postTotal > 0 && postPercent > baselinePercent) {
    return "resolved";
  }
  if (postPercent > baselinePercent) {
    return "improving";
  }
  return "needs_more_practice";
}
