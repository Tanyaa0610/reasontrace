"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { questions } from "@/lib/data/questions";
import { demoStudent } from "@/lib/data/demoStudent";
import { analyzeSolutionFromImage, PreviousAttemptSignal } from "@/lib/utils/api";
import { validateImageFile } from "@/lib/utils/image";
import { saveDiagnosticResults } from "@/lib/utils/storage";
import { buttonPrimary } from "@/lib/ui/buttonStyles";
import { QuestionAttemptResult } from "@/types";

const TOPICS = Array.from(new Set(questions.map((q) => q.concept)));

type Status = "idle" | "loading" | "error";

export default function DiagnosticPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [topic, setTopic] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<QuestionAttemptResult[]>([]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [finalAnswer, setFinalAnswer] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [unavailableNotice, setUnavailableNotice] = useState(false);

  const topicQuestions = topic ? questions.filter((q) => q.concept === topic) : [];
  const question = topicQuestions[index];
  const isLast = index === topicQuestions.length - 1;

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  function selectTopic(nextTopic: string) {
    setTopic(nextTopic);
    setIndex(0);
    setResults([]);
    resetSubmissionState();
  }

  function resetSubmissionState() {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    setFileError(null);
    setFinalAnswer("");
    setUnavailableNotice(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const error = validateImageFile(file);
    if (error) {
      setFileError(error);
      setImageFile(null);
      setImagePreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFileError(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!imageFile || !question) return;
    setStatus("loading");
    try {
      const previousAttempts: PreviousAttemptSignal[] = results.map((r) => ({
        concept: topicQuestions.find((q) => q.id === r.questionId)?.concept ?? topic ?? "",
        misconceptionId: r.result.misconceptionId,
        correct: r.result.correct,
      }));
      const result = await analyzeSolutionFromImage({
        question: question.question,
        expectedAnswer: question.answer,
        concept: question.concept,
        finalAnswer: finalAnswer.trim() || undefined,
        image: imageFile,
        previousAttempts,
      });

      if (result.analysisSource === "unavailable") {
        setUnavailableNotice(true);
        setStatus("idle");
        return;
      }

      const entry: QuestionAttemptResult = {
        questionId: question.id,
        question: question.question,
        solution: finalAnswer.trim()
          ? `Final answer: ${finalAnswer.trim()}`
          : "Submitted as an uploaded image.",
        result,
      };
      const nextResults = [...results, entry];
      setResults(nextResults);
      setStatus("idle");
      resetSubmissionState();

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

  if (!topic) {
    return (
      <AppShell studentName={demoStudent.name}>
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Choose what you want to practice
            </h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {TOPICS.map((t) => (
              <button
                key={t}
                onClick={() => selectTopic(t)}
                className="rounded-md border border-border bg-surface px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-background sm:min-w-[180px]"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell studentName={demoStudent.name}>
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div>
          <div className="h-1 w-full rounded-full bg-background" aria-hidden="true">
            <div
              className="h-1 rounded-full bg-accent transition-all"
              style={{ width: `${(index / topicQuestions.length) * 100}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted">
              Question {index + 1} of {topicQuestions.length} — {topic}
            </p>
            <button
              onClick={() => {
                setTopic(null);
                setIndex(0);
                setResults([]);
                resetSubmissionState();
              }}
              className="text-xs font-medium text-accent underline transition-opacity hover:opacity-80"
            >
              Choose a different topic
            </button>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            {question.question}
          </h1>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-foreground">Show your working</p>

          {!imagePreviewUrl && (
            <label
              htmlFor="solution-image"
              className="relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-surface px-4 py-10 text-center transition-colors hover:bg-background"
            >
              <input
                ref={fileInputRef}
                id="solution-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="peer sr-only"
              />
              <span className="pointer-events-none absolute inset-0 rounded-md peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent" />
              <span className="text-sm font-medium text-foreground">Upload your solution</span>
              <span className="text-xs text-muted">JPG, PNG or WEBP, up to 5MB</span>
            </label>
          )}

          {imagePreviewUrl && (
            <div className="rounded-md border border-border bg-surface p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt="Preview of your uploaded solution"
                className="mx-auto max-h-64 rounded-md object-contain"
              />
              <div className="mt-2 flex justify-center">
                <button
                  onClick={handleRemoveImage}
                  className="text-xs font-medium text-accent underline transition-opacity hover:opacity-80"
                >
                  Remove image
                </button>
              </div>
            </div>
          )}

          {fileError && (
            <p role="alert" className="mt-2 text-xs text-error">
              {fileError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="final-answer" className="mb-1 block text-sm font-medium text-foreground">
            Final answer (optional)
          </label>
          <input
            id="final-answer"
            type="text"
            value={finalAnswer}
            onChange={(e) => setFinalAnswer(e.target.value)}
            className="w-full max-w-xs rounded-md border border-border bg-surface p-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
            placeholder="e.g. 4"
          />
        </div>

        {unavailableNotice && (
          <div role="alert" className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
            Image analysis is currently unavailable. Please enter your final answer above to continue.
          </div>
        )}

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
            disabled={status === "loading" || !imageFile}
            className={buttonPrimary}
          >
            {status === "loading"
              ? "Analyzing..."
              : isLast
              ? "Finish diagnostic"
              : "Analyze solution"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
