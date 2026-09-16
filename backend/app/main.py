import json
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.analysis.engine import analyze, apply_recurrence, determine_correctness
from app.analysis.llm import (
    analyze_image_with_llm,
    analyze_with_llm,
    generate_questions_with_llm,
    is_configured as is_llm_configured,
)
from app.analysis.taxonomy import TAXONOMY, get_misconception

MAX_IMAGE_BYTES = 6 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}

app = FastAPI(title="ReasonTrace API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PreviousAttempt(BaseModel):
    concept: Optional[str] = None
    misconceptionId: Optional[str] = None
    correct: Optional[bool] = None


class AnalyzeSolutionRequest(BaseModel):
    question: str
    expectedAnswer: str
    studentSolution: str
    concept: Optional[str] = None
    previousAttempts: List[PreviousAttempt] = []


class AnalyzeSolutionResponse(BaseModel):
    correct: bool
    errorType: Optional[str] = None
    concept: Optional[str] = None
    misconception: Optional[str] = None
    misconceptionId: Optional[str] = None
    confidence: float = 0.0
    errorStep: Optional[int] = None
    explanation: str
    evidence: List[str] = []
    recurrence: Optional[str] = None
    occurrenceCount: int = 0
    analysisSource: str = "rules"


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "aiConfigured": is_llm_configured()}


def _resolve_misconception(
    misconception_id: Optional[str], concept: Optional[str]
) -> tuple[Optional[str], Optional[str]]:
    """Cross-checks a model-proposed misconception id against the taxonomy,
    including that its concept actually matches the question's concept.

    The taxonomy list handed to the model is already filtered by concept, so
    this should rarely trigger — it's a defensive backstop, not the primary
    guard, against a model ignoring that and returning an id from an
    unrelated concept (which matters more now that arbitrary topics outside
    the taxonomy's coverage are possible).
    """
    if not misconception_id:
        return None, None
    entry = get_misconception(misconception_id)
    if entry is None:
        return None, None
    if concept is not None and entry.get("concept") != concept:
        return None, None
    return misconception_id, entry["name"]


def _analyze_text_submission(payload: AnalyzeSolutionRequest) -> AnalyzeSolutionResponse:
    """Original JSON-body path: typed solution text. Unchanged behavior —
    still used by the practice/retest flow."""
    previous_attempts = [a.model_dump() for a in payload.previousAttempts]

    is_correct = determine_correctness(
        payload.question, payload.expectedAnswer, payload.studentSolution
    )

    if not is_correct and is_llm_configured():
        llm_result = analyze_with_llm(
            question=payload.question,
            expected_answer=payload.expectedAnswer,
            student_solution=payload.studentSolution,
            concept=payload.concept,
            previous_attempts=previous_attempts,
        )
        if llm_result is not None:
            evidence = llm_result["evidence"]
            misconception_id, misconception_name = _resolve_misconception(
                llm_result["misconceptionId"], payload.concept
            )
            confidence, recurrence, occurrence_count = apply_recurrence(
                misconception_id,
                payload.concept,
                llm_result["confidence"],
                evidence,
                previous_attempts,
            )

            return AnalyzeSolutionResponse(
                correct=False,
                errorType=llm_result["errorType"],
                concept=payload.concept,
                misconception=misconception_name,
                misconceptionId=misconception_id,
                confidence=confidence,
                errorStep=llm_result["errorStep"],
                explanation=llm_result["explanation"] or "The submitted answer doesn't match the expected result.",
                evidence=evidence,
                recurrence=recurrence,
                occurrenceCount=occurrence_count,
                analysisSource="ai",
            )
        # LLM configured but the call/validation failed — fall through to the
        # deterministic engine below rather than surface an error.

    outcome = analyze(
        question=payload.question,
        expected_answer=payload.expectedAnswer,
        student_solution=payload.studentSolution,
        concept=payload.concept,
        previous_attempts=previous_attempts,
    )
    return AnalyzeSolutionResponse(**outcome.__dict__, analysisSource="rules")


def _determine_correctness_from_final_answer(expected_answer: str, final_answer: str) -> bool:
    expected = expected_answer.strip()
    final = final_answer.strip()
    try:
        return abs(float(expected) - float(final)) < 1e-6
    except ValueError:
        return expected.lower() == final.lower()


def _analyze_image_submission(
    question: str,
    expected_answer: str,
    concept: Optional[str],
    final_answer: str,
    previous_attempts: List[dict],
    image_bytes: bytes,
    image_content_type: str,
) -> AnalyzeSolutionResponse:
    """New multipart-body path: a photo of handwritten work, with an optional
    typed final answer.

    The typed final answer (when present) is always the source of truth for
    correctness — the AI is only asked to diagnose *why* an answer is wrong,
    never to override a known right/wrong fact. When no final answer is
    given, there is no other ground truth, so the AI's own correctness
    judgement is used instead (and if AI is unavailable, we say so plainly
    rather than guessing).
    """
    known_correct: Optional[bool] = None
    if final_answer and expected_answer.strip():
        known_correct = _determine_correctness_from_final_answer(expected_answer, final_answer)

    if known_correct is True:
        return AnalyzeSolutionResponse(
            correct=True,
            errorType="correct",
            concept=concept,
            confidence=1.0,
            explanation="Your final answer matches the expected result.",
            evidence=["Final answer matches the expected result."],
            analysisSource="rules",
        )

    ai_result = None
    if is_llm_configured():
        ai_result = analyze_image_with_llm(
            question=question,
            expected_answer=expected_answer,
            image_bytes=image_bytes,
            image_content_type=image_content_type,
            concept=concept,
            previous_attempts=previous_attempts,
        )

    if ai_result is None:
        if known_correct is False:
            return AnalyzeSolutionResponse(
                correct=False,
                concept=concept,
                explanation=(
                    "Your final answer doesn't match the expected result. "
                    "Image-based reasoning analysis isn't available right now."
                ),
                analysisSource="rules",
            )
        return AnalyzeSolutionResponse(
            correct=False,
            concept=concept,
            explanation="Image analysis is currently unavailable. Please enter your final answer to continue.",
            analysisSource="unavailable",
        )

    is_correct = known_correct if known_correct is not None else ai_result["correct"]

    if is_correct:
        return AnalyzeSolutionResponse(
            correct=True,
            errorType="correct",
            concept=concept,
            confidence=ai_result["confidence"] if known_correct is None else 1.0,
            explanation="Your final answer matches the expected result.",
            evidence=["Final answer matches the expected result."],
            analysisSource="ai_image" if known_correct is None else "rules",
        )

    evidence = ai_result["evidence"]
    misconception_id, misconception_name = _resolve_misconception(
        ai_result["misconceptionId"], concept
    )
    confidence, recurrence, occurrence_count = apply_recurrence(
        misconception_id, concept, ai_result["confidence"], evidence, previous_attempts
    )

    return AnalyzeSolutionResponse(
        correct=False,
        errorType=ai_result["errorType"],
        concept=concept,
        misconception=misconception_name,
        misconceptionId=misconception_id,
        confidence=confidence,
        errorStep=ai_result["errorStep"],
        explanation=ai_result["explanation"] or "The submitted answer doesn't match the expected result.",
        evidence=evidence,
        recurrence=recurrence,
        occurrenceCount=occurrence_count,
        analysisSource="ai_image",
    )


@app.post("/api/analyze-solution", response_model=AnalyzeSolutionResponse)
async def analyze_solution(request: Request) -> AnalyzeSolutionResponse:
    content_type = request.headers.get("content-type", "")

    if content_type.startswith("multipart/form-data"):
        form = await request.form()

        image = form.get("image")
        if image is None or not hasattr(image, "read"):
            raise HTTPException(status_code=400, detail="An image file is required.")

        image_bytes = await image.read()
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="The uploaded image is empty.")
        if len(image_bytes) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=400, detail="Image is too large (max 6MB).")

        image_content_type = image.content_type or ""
        if image_content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail="Unsupported image type. Use JPG, PNG, or WEBP.")

        previous_raw = form.get("previousAttempts")
        try:
            previous_attempts = json.loads(previous_raw) if previous_raw else []
            if not isinstance(previous_attempts, list):
                previous_attempts = []
        except (TypeError, ValueError, json.JSONDecodeError):
            previous_attempts = []

        concept_raw = form.get("concept")
        concept = str(concept_raw) if concept_raw else None
        final_answer_raw = form.get("finalAnswer")
        final_answer = str(final_answer_raw).strip() if final_answer_raw else ""

        return _analyze_image_submission(
            question=str(form.get("question", "")),
            expected_answer=str(form.get("expectedAnswer", "")),
            concept=concept,
            final_answer=final_answer,
            previous_attempts=previous_attempts,
            image_bytes=image_bytes,
            image_content_type=image_content_type,
        )

    payload = AnalyzeSolutionRequest(**(await request.json()))
    return _analyze_text_submission(payload)


class GenerateQuestionsRequest(BaseModel):
    topic: str
    count: int = 5


class GeneratedQuestion(BaseModel):
    id: str
    topic: str
    concept: str
    question: str
    expectedAnswer: Optional[str] = None
    difficulty: str


class GenerateQuestionsResponse(BaseModel):
    topic: str
    questions: List[GeneratedQuestion]


@app.post("/api/generate-questions", response_model=GenerateQuestionsResponse)
def generate_questions(payload: GenerateQuestionsRequest) -> GenerateQuestionsResponse:
    """Used for topics that aren't in the local seeded question bank — the
    frontend only calls this after checking there's no local match. Never
    fabricates questions itself; if the model is unavailable or its output
    doesn't validate, this fails clearly rather than inventing a fallback.
    """
    topic = payload.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required.")

    count = payload.count if payload.count and payload.count > 0 else 5
    count = min(count, 8)

    questions = generate_questions_with_llm(topic, count) if is_llm_configured() else None
    if questions is None:
        raise HTTPException(
            status_code=503,
            detail="We couldn't generate questions for this topic right now. Please try again.",
        )

    return GenerateQuestionsResponse(topic=topic, questions=questions)


@app.get("/api/misconceptions")
def list_misconceptions() -> List[dict]:
    return list(TAXONOMY.values())


@app.get("/api/misconceptions/{misconception_id}")
def get_misconception_detail(misconception_id: str) -> dict:
    entry = get_misconception(misconception_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Unknown misconception id")
    return entry
