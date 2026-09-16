import json
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.analysis.engine import analyze, apply_recurrence, determine_correctness
from app.analysis.llm import (
    analyze_image_with_llm,
    analyze_with_llm,
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
            confidence, recurrence, occurrence_count = apply_recurrence(
                llm_result["misconceptionId"],
                payload.concept,
                llm_result["confidence"],
                evidence,
                previous_attempts,
            )
            misconception_name = None
            if llm_result["misconceptionId"]:
                entry = get_misconception(llm_result["misconceptionId"])
                misconception_name = entry["name"] if entry else None

            return AnalyzeSolutionResponse(
                correct=False,
                errorType=llm_result["errorType"],
                concept=payload.concept,
                misconception=misconception_name,
                misconceptionId=llm_result["misconceptionId"],
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
    if final_answer:
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
    confidence, recurrence, occurrence_count = apply_recurrence(
        ai_result["misconceptionId"], concept, ai_result["confidence"], evidence, previous_attempts
    )
    misconception_name = None
    if ai_result["misconceptionId"]:
        entry = get_misconception(ai_result["misconceptionId"])
        misconception_name = entry["name"] if entry else None

    return AnalyzeSolutionResponse(
        correct=False,
        errorType=ai_result["errorType"],
        concept=concept,
        misconception=misconception_name,
        misconceptionId=ai_result["misconceptionId"],
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


@app.get("/api/misconceptions")
def list_misconceptions() -> List[dict]:
    return list(TAXONOMY.values())


@app.get("/api/misconceptions/{misconception_id}")
def get_misconception_detail(misconception_id: str) -> dict:
    entry = get_misconception(misconception_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Unknown misconception id")
    return entry
