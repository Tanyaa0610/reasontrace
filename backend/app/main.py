from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.analysis.engine import analyze, apply_recurrence, determine_correctness
from app.analysis.llm import analyze_with_llm, is_configured as is_llm_configured
from app.analysis.taxonomy import TAXONOMY, get_misconception

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


@app.post("/api/analyze-solution", response_model=AnalyzeSolutionResponse)
def analyze_solution(payload: AnalyzeSolutionRequest) -> AnalyzeSolutionResponse:
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


@app.get("/api/misconceptions")
def list_misconceptions() -> List[dict]:
    return list(TAXONOMY.values())


@app.get("/api/misconceptions/{misconception_id}")
def get_misconception_detail(misconception_id: str) -> dict:
    entry = get_misconception(misconception_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Unknown misconception id")
    return entry
