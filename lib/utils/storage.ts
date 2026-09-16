import { Intervention, QuestionAttemptResult } from "@/types";

const DIAGNOSTIC_RESULTS_KEY = "reasontrace:diagnosticResults";
const INTERVENTIONS_KEY = "reasontrace:interventions";

export function saveDiagnosticResults(results: QuestionAttemptResult[]): void {
  sessionStorage.setItem(DIAGNOSTIC_RESULTS_KEY, JSON.stringify(results));
}

export function loadDiagnosticResults(): QuestionAttemptResult[] {
  const raw = sessionStorage.getItem(DIAGNOSTIC_RESULTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveIntervention(record: Intervention): void {
  const all = loadInterventions();
  all[record.misconceptionId] = record;
  sessionStorage.setItem(INTERVENTIONS_KEY, JSON.stringify(all));
}

export function loadInterventions(): Record<string, Intervention> {
  const raw = sessionStorage.getItem(INTERVENTIONS_KEY);
  return raw ? JSON.parse(raw) : {};
}
