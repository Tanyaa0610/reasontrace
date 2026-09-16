"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { demoStudent } from "@/lib/data/demoStudent";
import { loadDiagnosticResults, loadDiagnosticTopic } from "@/lib/utils/storage";
import { groupPatterns, PRIORITY_LABEL } from "@/lib/utils/patterns";
import { linkAccent, buttonSecondarySmall } from "@/lib/ui/buttonStyles";
import { QuestionAttemptResult } from "@/types";

export default function ResultsPage() {
  const [results, setResults] = useState<QuestionAttemptResult[] | null>(null);
  const [topic, setTopic] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser-only storage, no SSR value exists
    setResults(loadDiagnosticResults());
    setTopic(loadDiagnosticTopic());
  }, []);

  if (results === null) {
    return (
      <AppShell studentName={demoStudent.name}>
        <p className="text-sm text-muted">Loading results...</p>
      </AppShell>
    );
  }

  if (results.length === 0) {
    return (
      <AppShell studentName={demoStudent.name}>
        <p className="text-sm text-muted">
          No diagnostic results yet.{" "}
          <Link href="/diagnostic" className={linkAccent}>
            Start a diagnostic
          </Link>
        </p>
      </AppShell>
    );
  }

  const correctCount = results.filter((r) => r.result.correct).length;
  const score = Math.round((correctCount / results.length) * 100);
  const patterns = groupPatterns(results);

  return (
    <AppShell studentName={demoStudent.name}>
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Your diagnostic results
          </h1>
          {topic && <p className="mt-0.5 text-sm text-muted">{topic}</p>}
          <p className="mt-1 text-3xl font-semibold text-foreground">{score}%</p>
          <p className="text-sm text-muted">Overall mastery this session</p>
        </div>

        {patterns.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-medium text-foreground">
              {patterns.length} {patterns.length === 1 ? "pattern" : "patterns"} worth working
              on
            </p>
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
              {patterns.map((p, i) => (
                <div
                  key={p.misconceptionId}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="text-xs text-muted">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="text-sm font-medium text-foreground">
                      {p.misconceptionName}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {PRIORITY_LABEL[p.recurrence]} · Detected in {p.occurrenceCount}{" "}
                      {p.occurrenceCount === 1 ? "attempt" : "attempts"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-sm">
                    <Link
                      href={`/results/${p.misconceptionId}?concept=${encodeURIComponent(p.concept)}`}
                      className={linkAccent}
                    >
                      See why
                    </Link>
                    <Link
                      href={`/practice/${p.misconceptionId}?concept=${encodeURIComponent(p.concept)}`}
                      className={buttonSecondarySmall}
                    >
                      Practice
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-3 text-sm font-medium text-foreground">All questions</p>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
            {results.map((r) => (
              <div key={r.questionId} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {r.question}
                  </span>
                  <span
                    className={
                      r.result.correct
                        ? "text-sm font-medium text-success"
                        : r.result.analysisSource === "unavailable"
                        ? "text-sm font-medium text-warning"
                        : "text-sm font-medium text-error"
                    }
                  >
                    {r.result.correct
                      ? "Correct"
                      : r.result.analysisSource === "unavailable"
                      ? "Needs your answer"
                      : "Incorrect"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {r.result.explanation}
                  {!r.result.correct && r.result.analysisSource === "ai" && (
                    <span className="ml-2 text-xs text-muted">— analyzed by AI</span>
                  )}
                  {r.result.analysisSource === "ai_image" && (
                    <span className="ml-2 text-xs text-muted">
                      — analyzed from your uploaded solution
                    </span>
                  )}
                </p>
                {!r.result.correct &&
                  r.result.errorType &&
                  !r.result.misconceptionId &&
                  (r.result.analysisSource === "ai" || r.result.analysisSource === "ai_image") && (
                    <p className="mt-1 text-xs text-muted">
                      Reasoning error detected, but this pattern isn&apos;t in the current
                      misconception library yet.
                    </p>
                  )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
