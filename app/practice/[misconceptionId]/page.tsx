"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { demoStudent } from "@/lib/data/demoStudent";
import { questions } from "@/lib/data/questions";
import { practiceQuestions } from "@/lib/data/practiceQuestions";
import { analyzeSolution, getMisconception, PreviousAttemptSignal } from "@/lib/utils/api";
import { loadDiagnosticResults, saveIntervention } from "@/lib/utils/storage";
import { conceptScore, classifyResolution, ResolutionStatus } from "@/lib/utils/scoring";
import { buttonPrimary, linkAccent } from "@/lib/ui/buttonStyles";
import { Misconception, QuestionAttemptResult } from "@/types";

type Step = "loading" | "error" | "intervention" | "practice" | "result";

const STATUS_COPY: Record<ResolutionStatus, { label: string; className: string }> = {
  resolved: { label: "Resolved", className: "text-success" },
  improving: { label: "Improving", className: "text-warning" },
  needs_more_practice: { label: "Needs more practice", className: "text-error" },
};

export default function PracticePage() {
  const params = useParams<{ misconceptionId: string }>();
  const searchParams = useSearchParams();
  const concept = searchParams.get("concept") || "Linear Equations";
  const misconceptionId = params.misconceptionId;

  const [step, setStep] = useState<Step>("loading");
  const [misconception, setMisconception] = useState<Misconception | null>(null);
  const [baseline, setBaseline] = useState({ correct: 0, total: 0, percent: 0 });
  const [priorAttempts, setPriorAttempts] = useState<PreviousAttemptSignal[]>([]);

  const practiceSet = useMemo(() => practiceQuestions[concept] ?? [], [concept]);

  const [index, setIndex] = useState(0);
  const [solution, setSolution] = useState("");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "error">("idle");
  const [retestResults, setRetestResults] = useState<QuestionAttemptResult[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const detail = await getMisconception(misconceptionId);
        const diagnosticResults = loadDiagnosticResults();
        const score = conceptScore(diagnosticResults, concept, questions);
        const signals: PreviousAttemptSignal[] = diagnosticResults.map((r) => ({
          concept: questions.find((q) => q.id === r.questionId)?.concept ?? "",
          misconceptionId: r.result.misconceptionId,
          correct: r.result.correct,
        }));
        if (!cancelled) {
          setMisconception(detail);
          setBaseline(score);
          setPriorAttempts(signals);
          setStep("intervention");
        }
      } catch {
        if (!cancelled) setStep("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [misconceptionId, concept]);

  async function handleSubmitPractice() {
    if (!solution.trim()) return;
    const question = practiceSet[index];
    setSubmitStatus("loading");
    try {
      const result = await analyzeSolution({
        question: question.question,
        expectedAnswer: question.answer,
        studentSolution: solution,
        concept,
        previousAttempts: [
          ...priorAttempts,
          ...retestResults.map((r) => ({
            concept,
            misconceptionId: r.result.misconceptionId,
            correct: r.result.correct,
          })),
        ],
      });
      const entry: QuestionAttemptResult = {
        questionId: question.id,
        question: question.question,
        solution,
        result,
      };
      const next = [...retestResults, entry];
      setRetestResults(next);
      setSubmitStatus("idle");
      setSolution("");

      if (index === practiceSet.length - 1) {
        const postCorrect = next.filter((r) => r.result.correct).length;
        const status = classifyResolution(baseline.percent, postCorrect, next.length);
        saveIntervention({
          id: `${demoStudent.id}-${misconceptionId}-${Date.now()}`,
          studentId: demoStudent.id,
          misconceptionId,
          concept,
          baselineScore: baseline.percent,
          postScore: Math.round((postCorrect / next.length) * 100),
          status,
          createdAt: new Date().toISOString(),
        });
        setStep("result");
      } else {
        setIndex(index + 1);
      }
    } catch {
      setSubmitStatus("error");
    }
  }

  if (step === "loading") {
    return (
      <AppShell studentName={demoStudent.name}>
        <p className="text-sm text-muted">Loading...</p>
      </AppShell>
    );
  }

  if (step === "error") {
    return (
      <AppShell studentName={demoStudent.name}>
        <div role="alert" className="rounded-md border border-error/30 bg-error/5 p-4 text-sm text-error">
          We couldn&apos;t load this practice session right now.
          <Link href="/results" className="ml-2 font-medium underline transition-opacity hover:opacity-80">
            Back to results
          </Link>
        </div>
      </AppShell>
    );
  }

  if (step === "intervention" && misconception) {
    return (
      <AppShell studentName={demoStudent.name}>
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <div>
            <p className="text-xs text-muted">{misconception.concept}</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              {misconception.name}
            </h1>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              What went wrong
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-foreground">
              {misconception.description}
            </p>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Remember
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-foreground">
              {misconception.remediationStrategy}
            </p>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Try it
            </h2>
            {practiceSet.length > 0 ? (
              <ul className="mt-1 list-inside list-decimal text-sm text-foreground">
                {practiceSet.map((q) => (
                  <li key={q.id}>{q.question}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted">
                Practice questions for this concept aren&apos;t available yet.
              </p>
            )}
          </div>

          <div>
            {practiceSet.length > 0 ? (
              <button onClick={() => setStep("practice")} className={buttonPrimary}>
                Start 2-minute practice
              </button>
            ) : (
              <Link href="/results" className={linkAccent}>
                Back to results
              </Link>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  if (step === "practice" && practiceSet[index]) {
    const question = practiceSet[index];
    return (
      <AppShell studentName={demoStudent.name}>
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <div>
            <div className="h-1 w-full rounded-full bg-background" aria-hidden="true">
              <div
                className="h-1 rounded-full bg-accent transition-all"
                style={{ width: `${(index / practiceSet.length) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              Practice {index + 1} of {practiceSet.length}
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              {question.question}
            </h1>
          </div>

          <div>
            <label htmlFor="practice-solution" className="mb-1 block text-sm font-medium text-foreground">
              Show your steps
            </label>
            <textarea
              id="practice-solution"
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-border bg-surface p-3 text-sm text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          {submitStatus === "error" && (
            <div role="alert" className="rounded-md border border-error/30 bg-error/5 p-3 text-sm text-error">
              We couldn&apos;t check this attempt right now. Your work is saved.
              <button
                onClick={handleSubmitPractice}
                className="ml-2 font-medium underline transition-opacity hover:opacity-80"
              >
                Try again
              </button>
            </div>
          )}

          <div>
            <button
              onClick={handleSubmitPractice}
              disabled={submitStatus === "loading" || !solution.trim()}
              className={buttonPrimary}
            >
              {submitStatus === "loading"
                ? "Checking..."
                : index === practiceSet.length - 1
                ? "Finish practice"
                : "Submit and continue"}
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (step === "result") {
    const postCorrect = retestResults.filter((r) => r.result.correct).length;
    const postTotal = retestResults.length;
    const postPercent = postTotal === 0 ? 0 : Math.round((postCorrect / postTotal) * 100);
    const status = classifyResolution(baseline.percent, postCorrect, postTotal);
    const copy = STATUS_COPY[status];

    return (
      <AppShell studentName={demoStudent.name}>
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Practice complete
          </h1>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="text-xs text-muted">Before intervention</div>
              <div className="mt-1 text-2xl font-semibold text-foreground">
                {baseline.total > 0 ? `${baseline.percent}%` : "—"}
              </div>
              <div className="text-xs text-muted">{concept}</div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="text-xs text-muted">After intervention</div>
              <div className="mt-1 text-2xl font-semibold text-foreground">{postPercent}%</div>
              <div className="text-xs text-muted">{concept}</div>
            </div>
          </div>

          <div>
            <span className={`text-sm font-medium ${copy.className}`}>{copy.label}</span>
          </div>

          <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
            {retestResults.map((r) => (
              <div key={r.questionId} className="flex items-center justify-between p-4 text-sm">
                <span className="text-foreground">{r.question}</span>
                <span className={r.result.correct ? "text-success" : "text-error"}>
                  {r.result.correct ? "Correct" : "Incorrect"}
                </span>
              </div>
            ))}
          </div>

          <div>
            <Link href="/dashboard" className={buttonPrimary}>
              Back to dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return null;
}
