import { AnalysisResult, Misconception } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getMisconception(id: string): Promise<Misconception> {
  const response = await fetch(`${API_URL}/api/misconceptions/${id}`);
  if (!response.ok) {
    throw new Error(`Misconception lookup failed with status ${response.status}`);
  }
  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    subject: data.subject,
    concept: data.concept,
    remediationStrategy: data.remediationStrategy,
  };
}

export interface PreviousAttemptSignal {
  concept: string;
  misconceptionId: string | null;
  correct: boolean;
}

export interface AnalyzeSolutionInput {
  question: string;
  expectedAnswer: string;
  studentSolution: string;
  concept: string;
  previousAttempts?: PreviousAttemptSignal[];
}

export async function analyzeSolution(
  input: AnalyzeSolutionInput
): Promise<AnalysisResult> {
  const response = await fetch(`${API_URL}/api/analyze-solution`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: input.question,
      expectedAnswer: input.expectedAnswer,
      studentSolution: input.studentSolution,
      concept: input.concept,
      previousAttempts: input.previousAttempts ?? [],
    }),
  });

  if (!response.ok) {
    throw new Error(`Analysis request failed with status ${response.status}`);
  }

  return response.json();
}

export interface AnalyzeSolutionImageInput {
  question: string;
  expectedAnswer: string;
  concept: string;
  finalAnswer?: string;
  image: File;
  previousAttempts?: PreviousAttemptSignal[];
}

export async function analyzeSolutionFromImage(
  input: AnalyzeSolutionImageInput
): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append("question", input.question);
  formData.append("expectedAnswer", input.expectedAnswer);
  formData.append("concept", input.concept);
  if (input.finalAnswer) {
    formData.append("finalAnswer", input.finalAnswer);
  }
  formData.append("previousAttempts", JSON.stringify(input.previousAttempts ?? []));
  formData.append("image", input.image);

  const response = await fetch(`${API_URL}/api/analyze-solution`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Analysis request failed with status ${response.status}`);
  }

  return response.json();
}
