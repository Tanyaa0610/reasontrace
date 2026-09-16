"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { demoStudent } from "@/lib/data/demoStudent";
import { loadDiagnosticResults } from "@/lib/utils/storage";
import { getMisconception } from "@/lib/utils/api";
import { buttonPrimary } from "@/lib/ui/buttonStyles";
import { Misconception, QuestionAttemptResult } from "@/types";

type Step = "loading" | "error" | "ready";

export default function MisconceptionDetailPage() {
  const params = useParams<{ misconceptionId: string }>();
  const searchParams = useSearchParams();
  const concept = searchParams.get("concept") || "";

  const [step, setStep] = useState<Step>("loading");
  const [misconception, setMisconception] = useState<Misconception | null>(null);
  const [evidence, setEvidence] = useState<QuestionAttemptResult[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const detail = await getMisconception(params.misconceptionId);
        const diagnosticResults = loadDiagnosticResults();
        const matching = diagnosticResults.filter(
          (r) => r.result.misconceptionId === params.misconceptionId
        );
        if (!cancelled) {
          setMisconception(detail);
          setEvidence(matching);
          setStep("ready");
        }
      } catch {
        if (!cancelled) setStep("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [params.misconceptionId]);

  if (step === "loading") {
    return (
      <AppShell studentName={demoStudent.name}>
        <p className="text-sm text-muted">Loading...</p>
      </AppShell>
    );
  }

  if (step === "error" || !misconception) {
    return (
      <AppShell studentName={demoStudent.name}>
        <div role="alert" className="rounded-md border border-error/30 bg-error/5 p-4 text-sm text-error">
          We couldn&apos;t load this misconception right now.
          <Link href="/results" className="ml-2 font-medium underline transition-opacity hover:opacity-80">
            Back to results
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell studentName={demoStudent.name}>
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <div>
          <p className="text-xs text-muted">{misconception.concept}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            {misconception.name}
          </h1>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            What we noticed
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            {misconception.description}
          </p>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Evidence
          </h2>
          {evidence.length > 0 ? (
            <div className="mt-2 flex flex-col gap-3">
              {evidence.map((e, i) => (
                <div
                  key={e.questionId}
                  className="rounded-lg border border-border bg-surface p-3 text-sm"
                >
                  <div className="text-xs text-muted">Attempt {i + 1}</div>
                  <div className="mt-1 text-foreground">{e.question}</div>
                  <pre className="mt-1 whitespace-pre-wrap font-sans text-muted">
                    {e.solution}
                  </pre>
                  {e.result.evidence.length > 0 && (
                    <p className="mt-1 text-xs text-muted">{e.result.evidence[0]}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted">
              No attempts from this session are on record for this pattern yet.
            </p>
          )}
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            What to work on
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            {misconception.remediationStrategy}
          </p>
        </div>

        <div>
          <Link
            href={`/practice/${misconception.id}?concept=${encodeURIComponent(
              concept || misconception.concept
            )}`}
            className={buttonPrimary}
          >
            Start 2-minute practice
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
