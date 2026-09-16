"""Server-side LLM integration for reasoning analysis.

This is additive to the deterministic engine, not a replacement for it:
- The API key lives only in the backend environment; the frontend never sees it.
- If no key is configured, or the call fails, times out, or returns anything
  that doesn't validate, callers get None and fall back to the deterministic
  engine. The endpoint must never depend on this succeeding.
- The model is never trusted to invent a misconception label. Any id it
  returns that isn't in our taxonomy is dropped rather than passed through.
"""

import json
import os
from typing import List, Optional

from app.analysis.taxonomy import TAXONOMY

DEFAULT_MODEL = "gpt-4o-mini"
REQUEST_TIMEOUT_SECONDS = 15

SYSTEM_PROMPT = """You are an educational reasoning analyst.

Your job is NOT simply to mark an answer correct or incorrect.

Analyze the student's solution step by step.

Identify:
1. The first incorrect reasoning step.
2. Whether the error is arithmetic, procedural, conceptual, misread_question, or incomplete_reasoning.
3. The most likely misconception id from the provided taxonomy (or null if none fits).
4. Evidence from the student's own work — quote or reference their actual steps.
5. Confidence from 0 to 1.

Do not invent evidence.
Do not diagnose a misconception from a single weak signal unless the evidence is strong.
Only use misconception ids from the taxonomy provided. If none fits, use null.

Return strict JSON with exactly these keys:
{
  "correct": boolean,
  "errorType": "arithmetic" | "procedural" | "conceptual" | "misread_question" | "incomplete_reasoning" | null,
  "misconceptionId": string | null,
  "errorStep": number | null,
  "explanation": string,
  "evidence": string[],
  "confidence": number
}
"""


def is_configured() -> bool:
    return bool(os.environ.get("OPENAI_API_KEY"))


def _taxonomy_for_concept(concept: Optional[str]) -> List[dict]:
    return [
        {"id": entry["id"], "name": entry["name"], "description": entry["description"]}
        for entry in TAXONOMY.values()
        if concept is None or entry["concept"] == concept
    ]


def _validate(data: dict) -> Optional[dict]:
    if not isinstance(data, dict) or "correct" not in data:
        return None

    misconception_id = data.get("misconceptionId")
    if misconception_id is not None and misconception_id not in TAXONOMY:
        misconception_id = None

    try:
        confidence = float(data.get("confidence", 0))
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))

    error_step = data.get("errorStep")
    if error_step is not None:
        try:
            error_step = int(error_step)
        except (TypeError, ValueError):
            error_step = None

    evidence = data.get("evidence")
    if not isinstance(evidence, list):
        evidence = []
    evidence = [str(item) for item in evidence][:5]

    error_type = data.get("errorType")
    if error_type not in ("arithmetic", "procedural", "conceptual", "misread_question", "incomplete_reasoning"):
        error_type = None

    return {
        "errorType": error_type,
        "misconceptionId": misconception_id,
        "errorStep": error_step,
        "explanation": str(data.get("explanation") or ""),
        "evidence": evidence,
        "confidence": confidence,
    }


def analyze_with_llm(
    question: str,
    expected_answer: str,
    student_solution: str,
    concept: Optional[str],
    previous_attempts: List[dict],
) -> Optional[dict]:
    """Returns a validated dict of the LLM's diagnosis, or None on any failure.

    Only called for solutions already known to be incorrect — the objective
    correct/incorrect fact is decided deterministically, never by the model.
    """
    if not is_configured():
        return None

    try:
        from openai import OpenAI

        client = OpenAI(timeout=REQUEST_TIMEOUT_SECONDS)
        user_payload = {
            "question": question,
            "expectedAnswer": expected_answer,
            "studentSolution": student_solution,
            "concept": concept,
            "previousAttempts": previous_attempts,
            "misconceptionTaxonomy": _taxonomy_for_concept(concept),
        }
        response = client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", DEFAULT_MODEL),
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(user_payload)},
            ],
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content
        data = json.loads(raw)
        return _validate(data)
    except Exception:
        return None
