"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { questions } from "@/lib/data/questions";
import { demoStudent } from "@/lib/data/demoStudent";
import { analyzeSolutionFromImage, generateQuestions, PreviousAttemptSignal } from "@/lib/utils/api";
import { validateImageFile } from "@/lib/utils/image";
import { saveDiagnosticResults, saveDiagnosticTopic } from "@/lib/utils/storage";
import { buttonPrimary } from "@/lib/ui/buttonStyles";
import { Question, QuestionAttemptResult } from "@/types";

const POPULAR_TOPICS = Array.from(new Set(questions.map((q) => q.concept)));

type Status = "idle" | "loading" | "error";
type TopicStatus = "idle" | "loading" | "error";

export default function DiagnosticPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [topicInput, setTopicInput] = useState("");
  const [topicStatus, setTopicStatus] = useState<TopicStatus>("idle");
  const [topic, setTopic] = useState<string | null>(null);
  const [topicQuestions, setTopicQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<QuestionAttemptResult[]>([]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [finalAnswer, setFinalAnswer] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [unavailableNotice, setUnavailableNotice] = useState(false);

  const question = topicQuestions[index];
  const isLast = index === topicQuestions.length - 1;

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  function beginTopicSession(resolvedTopic: string, resolvedQuestions: Question[]) {
    setTopic(resolvedTopic);
    setTopicQuestions(resolvedQuestions);
    setIndex(0);
    setResults([]);
    resetSubmissionState();
  }

  function changeTopic() {
    setTopic(null);
    setTopicQuestions([]);
    setTopicInput("");
    setIndex(0);
    setResults([]);
    setTopicStatus("idle");
    resetSubmissionState();
  }

  async function handleStartPractice() {
    const trimmed = topicInput.trim();
    if (!trimmed) return;

    setTopicStatus("idle");

    const localMatch = POPULAR_TOPICS.find(
      (t) => t.toLowerCase() === trimmed.toLowerCase()
    );
    if (localMatch) {
      beginTopicSession(
        localMatch,
        questions.filter((q) => q.concept === localMatch)
      );
      return;
    }

    setTopicStatus("loading");
    try {
      const result = await generateQuestions(trimmed, 5);
      const generated: Question[] = result.questions.map((q) => ({
        id: q.id,
        subject: result.topic,
        concept: q.concept,
        question: q.question,
        answer: q.expectedAnswer ?? "",
        misconceptions: [],
      }));
      if (generated.length === 0) throw new Error("No questions generated");
      setTopicStatus("idle");
      beginTopicSession(result.topic || trimmed, generated);
    } catch {
      setTopicStatus("error");
    }
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
        if (topic) saveDiagnosticTopic(topic);
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
        <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-4 sm:gap-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              What do you want to practice?
            </h1>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleStartPractice();
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor="topic-input" className="text-sm font-medium text-foreground">
              Search a topic or concept
            </label>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
              <input
                id="topic-input"
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="Search a topic or concept..."
                className="w-full min-w-0 flex-1 rounded-md border border-border bg-surface p-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={topicStatus === "loading" || !topicInput.trim()}
                className={buttonPrimary}
              >
                {topicStatus === "loading" ? "Preparing questions..." : "Start practice"}
              </button>
            </div>
          </form>

          {topicStatus === "error" && (
            <div
              role="alert"
              className="rounded-md border border-error/30 bg-error/5 p-3 text-sm text-error"
            >
              We couldn&apos;t generate questions for this topic right now. Please try again.
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Popular topics
            </p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopicInput(t)}
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell studentName={demoStudent.name}>
      <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-4 sm:gap-6">
        <div>
          <div className="h-1 w-full rounded-full bg-background" aria-hidden="true">
            <div
              className="h-1 rounded-full bg-accent transition-all"
              style={{ width: `${(index / topicQuestions.length) * 100}%` }}
            />
          </div>
          <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">
              Question {index + 1} of {topicQuestions.length} — {topic}
            </p>
            <button
              type="button"
              onClick={changeTopic}
              className="self-start text-xs font-medium text-accent underline transition-opacity hover:opacity-80 sm:self-auto"
            >
              Choose a different topic
            </button>
          </div>
          <h1 className="mt-1 break-words text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {question.question}
          </h1>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-foreground">Show your working</p>

          {!imagePreviewUrl && (
            <label
              htmlFor="solution-image"
              className="relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-surface px-4 py-8 text-center transition-colors hover:bg-background sm:py-10"
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
                className="mx-auto h-auto max-h-64 w-full max-w-full rounded-md object-contain"
              />
              <div className="mt-2 flex justify-center">
                <button
                  type="button"
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
              type="button"
              onClick={handleSubmit}
              className="ml-2 font-medium underline transition-opacity hover:opacity-80"
            >
              Try again
            </button>
          </div>
        )}

        <div>
          <button
            type="button"
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
