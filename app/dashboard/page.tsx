"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import {
  demoStudent,
  demoConceptMastery,
  demoStats,
} from "@/lib/data/demoStudent";
import { loadDiagnosticResults, loadInterventions } from "@/lib/utils/storage";
import { groupPatterns } from "@/lib/utils/patterns";
import { buttonPrimary, buttonPrimarySmall } from "@/lib/ui/buttonStyles";
import { QuestionAttemptResult, Intervention } from "@/types";

export default function DashboardPage() {
  const [results, setResults] = useState<QuestionAttemptResult[]>([]);
  const [interventions, setInterventions] = useState<Record<string, Intervention>>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser-only storage, no SSR value exists
    setResults(loadDiagnosticResults());
    setInterventions(loadInterventions());
  }, []);

  const patterns = groupPatterns(results);
  const topPattern = patterns[0];

  const conceptsAttempted = Array.from(
    new Set(results.map((r) => r.result.concept).filter((c): c is string => Boolean(c)))
  );

  return (
    <AppShell studentName={demoStudent.name}>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Good evening, {demoStudent.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Here&apos;s what you&apos;re working on today.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryStat label="Overall mastery" value={`${demoStudent.overallMastery}%`} />
          <SummaryStat label="Questions completed" value={String(demoStats.questionsCompleted)} />
          <SummaryStat label="Concepts improved" value={String(demoStats.conceptsImproved)} />
          <SummaryStat label="Current focus" value={demoStats.currentFocus} />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground">Concepts</h2>
          <div className="mt-3 flex flex-col gap-3">
            {demoConceptMastery.map((c) => (
              <div key={c.concept}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-foreground">{c.concept}</span>
                  <span className="text-muted">{c.mastery}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-background">
                  <div
                    className="h-2 rounded-full bg-accent transition-all"
                    style={{ width: `${c.mastery}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {topPattern && (
          <div className="rounded-lg border border-border bg-surface p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Your current focus
            </h2>
            <p className="mt-1 text-base font-semibold text-foreground">
              {topPattern.misconceptionName}
            </p>
            <p className="mt-1 text-sm text-muted">
              We&apos;ve seen this pattern in {topPattern.occurrenceCount} recent{" "}
              {topPattern.occurrenceCount === 1 ? "attempt" : "attempts"}.
            </p>
            <Link
              href={`/practice/${topPattern.misconceptionId}?concept=${encodeURIComponent(
                topPattern.concept
              )}`}
              className={`mt-3 ${buttonPrimarySmall}`}
            >
              Practice this
            </Link>
          </div>
        )}

        {conceptsAttempted.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
            <div className="mt-3 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
              {conceptsAttempted.map((concept) => {
                const conceptResults = results.filter((r) => r.result.concept === concept);
                const correct = conceptResults.filter((r) => r.result.correct).length;
                const percent = Math.round((correct / conceptResults.length) * 100);
                const conceptIntervention = Object.values(interventions).find(
                  (iv) => iv.concept === concept
                );

                let label = "Needs practice";
                let labelClassName = "text-muted";
                if (conceptIntervention?.status === "resolved") {
                  label = "Resolved";
                  labelClassName = "text-success";
                } else if (conceptIntervention?.status === "improving") {
                  label = "Improving";
                  labelClassName = "text-warning";
                } else if (percent >= 80) {
                  label = "Strong";
                  labelClassName = "text-success";
                }

                return (
                  <div key={concept} className="flex items-center justify-between p-3 text-sm">
                    <span className="text-foreground">{concept}</span>
                    <span className={labelClassName}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <Link href="/diagnostic" className={buttonPrimary}>
            Start a diagnostic
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}
