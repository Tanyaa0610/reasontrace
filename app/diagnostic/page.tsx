"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { questions } from "@/lib/data/questions";
import { demoStudent } from "@/lib/data/demoStudent";
import { analyzeSolution, PreviousAttemptSignal } from "@/lib/utils/api";
import { saveDiagnosticResults } from "@/lib/utils/storage";
import { buttonPrimary } from "@/lib/ui/buttonStyles";
import { QuestionAttemptResult } from "@/types";

export default function DiagnosticPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [solution, setSolution] = useState("");
  const [results, setResults] = useState<QuestionAttemptResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const question = questions[index];
  const isLast = index === questions.length - 1;

  async function handleSubmit() {
    if (!solution.trim()) return;
    setStatus("loading");
    try {
      const previousAttempts: PreviousAttemptSignal[] = results.map((r) => ({
        concept: questions.find((q) => q.id === r.questionId)?.concept ?? "",
        misconceptionId: r.result.misconceptionId,
        correct: r.result.correct,
      }));
      const result = await analyzeSolution({
        question: question.question,
        expectedAnswer: question.answer,
        studentSolution: solution,
        concept: question.concept,
        previousAttempts,
      });
      const entry: QuestionAttemptResult = {
        questionId: question.id,
        question: question.question,
        solution,
        result,
      };
      const nextResults = [...results, entry];
      setResults(nextResults);
      setStatus("idle");
      setSolution("");

      if (isLast) {
        saveDiagnosticResults(nextResults);
        router.push("/results");
      } else {
        setIndex(index + 1);
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <AppShell studentName={demoStudent.name}>
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div>
          <div className="h-1 w-full rounded-full bg-background" aria-hidden="true">
            <div
              className="h-1 rounded-full bg-accent transition-all"
              style={{ width: `${(index / questions.length) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            Question {index + 1} of {questions.length} — {question.concept}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            {question.question}
          </h1>
        </div>

        <div>
          <label htmlFor="solution" className="mb-1 block text-sm font-medium text-foreground">
            Show your steps
          </label>
          <textarea
            id="solution"
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            rows={6}
            className="w-full rounded-md border border-border bg-surface p-3 text-sm text-foreground focus:border-accent focus:outline-none"
            placeholder={"2x + 6 = 14\n..."}
          />
        </div>

        {status === "error" && (
          <div role="alert" className="rounded-md border border-error/30 bg-error/5 p-3 text-sm text-error">
            We couldn&apos;t analyze this attempt right now. Your work is saved.
            <button
              onClick={handleSubmit}
              className="ml-2 font-medium underline transition-opacity hover:opacity-80"
            >
              Try again
            </button>
          </div>
        )}

        <div>
          <button
            onClick={handleSubmit}
            disabled={status === "loading" || !solution.trim()}
            className={buttonPrimary}
          >
            {status === "loading" ? "Analyzing..." : isLast ? "Finish diagnostic" : "Submit and continue"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
