export type Subject = "Mathematics";

export interface Question {
  id: string;
  subject: Subject;
  concept: string;
  question: string;
  answer: string;
  steps?: string[];
  misconceptions: string[];
}

export type ErrorType =
  | "correct"
  | "arithmetic"
  | "procedural"
  | "conceptual"
  | "misread_question"
  | "incomplete_reasoning";

export type Recurrence =
  | "possible_mistake"
  | "pattern_emerging"
  | "recurring_misconception";

export interface AnalysisResult {
  correct: boolean;
  errorType: ErrorType | null;
  concept: string | null;
  misconception: string | null;
  misconceptionId: string | null;
  confidence: number;
  errorStep: number | null;
  explanation: string;
  evidence: string[];
  recurrence: Recurrence | null;
  occurrenceCount: number;
  analysisSource: "ai" | "ai_image" | "rules" | "unavailable";
}

export interface Attempt {
  id: string;
  studentId: string;
  questionId: string;
  solution: string;
  correct: boolean;
  errorType: ErrorType | null;
  misconceptionId: string | null;
  confidence: number;
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  overallMastery: number;
}

export interface Misconception {
  id: string;
  name: string;
  description: string;
  subject: Subject;
  concept: string;
  remediationStrategy: string;
}

export interface QuestionAttemptResult {
  questionId: string;
  question: string;
  solution: string;
  result: AnalysisResult;
}

export interface Intervention {
  id: string;
  studentId: string;
  misconceptionId: string;
  concept: string;
  baselineScore: number;
  postScore: number | null;
  status: "resolved" | "improving" | "needs_more_practice" | "pending";
  createdAt: string;
}
