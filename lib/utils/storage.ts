import { Intervention, QuestionAttemptResult } from "@/types";

const DIAGNOSTIC_RESULTS_KEY = "reasontrace:diagnosticResults";
const DIAGNOSTIC_TOPIC_KEY = "reasontrace:diagnosticTopic";
const INTERVENTIONS_KEY = "reasontrace:interventions";

export function saveDiagnosticResults(results: QuestionAttemptResult[]): void {
  sessionStorage.setItem(DIAGNOSTIC_RESULTS_KEY, JSON.stringify(results));
}

export function loadDiagnosticResults(): QuestionAttemptResult[] {
  const raw = sessionStorage.getItem(DIAGNOSTIC_RESULTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveDiagnosticTopic(topic: string): void {
  sessionStorage.setItem(DIAGNOSTIC_TOPIC_KEY, topic);
}

export function loadDiagnosticTopic(): string | null {
  return sessionStorage.getItem(DIAGNOSTIC_TOPIC_KEY);
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
