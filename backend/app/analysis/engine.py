"""Deterministic reasoning-analysis engine.

Real LLM-backed analysis is Phase 6. Until then, this module does rule-based
parsing of linear-equation solutions so the diagnostic loop (detect error ->
map to taxonomy -> track recurrence) is genuinely functional rather than
faked. Question types the parser doesn't recognize fall back to a plain
correct/incorrect check with no invented misconception.
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional

from app.analysis.taxonomy import get_misconception

LINEAR_EQUATION_RE = re.compile(
    r"(-?\d*)x\s*([+-])\s*(\d+)\s*=\s*(-?\d+)", re.IGNORECASE
)


@dataclass
class AnalysisOutcome:
    correct: bool
    errorType: Optional[str]
    concept: Optional[str]
    misconception: Optional[str]
    misconceptionId: Optional[str]
    confidence: float
    errorStep: Optional[int]
    explanation: str
    evidence: List[str] = field(default_factory=list)
    recurrence: Optional[str] = None
    occurrenceCount: int = 0


def _extract_final_value(lines: List[str]) -> Optional[float]:
    for line in reversed(lines):
        m = re.search(r"x\s*=\s*(-?\d+(?:\.\d+)?)", line, re.IGNORECASE)
        if m:
            return float(m.group(1))
        stripped = line.strip()
        if re.fullmatch(r"-?\d+(?:\.\d+)?", stripped):
            return float(stripped)
    return None


def _rhs_value(line: str) -> Optional[float]:
    if "=" not in line:
        return None
    rhs = line.rsplit("=", 1)[1].strip()
    if re.fullmatch(r"-?\d+(?:\.\d+)?", rhs):
        return float(rhs)
    m = re.fullmatch(r"(-?\d+(?:\.\d+)?)\s*([+-])\s*(\d+(?:\.\d+)?)", rhs)
    if m:
        left, op2, right = m.groups()
        left_v, right_v = float(left), float(right)
        return left_v + right_v if op2 == "+" else left_v - right_v
    return None


def _is_original_equation_line(line: str, coef_str: str, op: str, b: int, c: int) -> bool:
    normalized = line.replace(" ", "")
    expected = f"{coef_str}x{op}{b}={c}".replace(" ", "")
    return normalized == expected


def determine_correctness(question: str, expected_answer: str, student_solution: str) -> bool:
    """Cheap, deterministic correct/incorrect check, independent of any LLM call.

    Used to decide the objective correct/incorrect fact even when the richer
    error/misconception diagnosis for an incorrect answer comes from the LLM —
    that fact should never depend on a model call succeeding or hallucinating.
    """
    lines = [line.strip() for line in student_solution.strip().splitlines() if line.strip()]
    match = LINEAR_EQUATION_RE.search(question)
    if match:
        final_value = _extract_final_value(lines)
        try:
            expected_value = float(expected_answer)
        except ValueError:
            expected_value = None
        return (
            final_value is not None
            and expected_value is not None
            and abs(final_value - expected_value) < 1e-6
        )
    final_line = lines[-1] if lines else ""
    return expected_answer.strip() in final_line


def _classify_recurrence(occurrence_count: int) -> str:
    if occurrence_count <= 1:
        return "possible_mistake"
    if occurrence_count == 2:
        return "pattern_emerging"
    return "recurring_misconception"


def apply_recurrence(
    misconception_id: Optional[str],
    concept: Optional[str],
    base_confidence: float,
    evidence: List[str],
    previous_attempts: List[dict],
) -> tuple[float, Optional[str], int]:
    if not misconception_id:
        return base_confidence, None, 0

    matching = [
        a
        for a in previous_attempts
        if a.get("concept") == concept and a.get("misconceptionId") == misconception_id
    ]
    occurrence_count = len(matching) + 1
    confidence = min(0.95, base_confidence + 0.18 * len(matching))
    if matching:
        evidence.append(f"Same error pattern found in {len(matching)} previous attempt(s).")
    return confidence, _classify_recurrence(occurrence_count), occurrence_count


def _analyze_linear_equation(
    match: re.Match,
    expected_answer: str,
    student_solution: str,
    concept: str,
    previous_attempts: List[dict],
) -> AnalysisOutcome:
    coef_str, op, b_str, c_str = match.groups()
    a = int(coef_str) if coef_str not in ("", "-") else (-1 if coef_str == "-" else 1)
    b = int(b_str)
    c = int(c_str)

    lines = [line.strip() for line in student_solution.strip().splitlines() if line.strip()]
    final_value = _extract_final_value(lines)

    try:
        expected_value = float(expected_answer)
    except ValueError:
        expected_value = None

    is_correct = (
        final_value is not None
        and expected_value is not None
        and abs(final_value - expected_value) < 1e-6
    )

    if is_correct:
        return AnalysisOutcome(
            correct=True,
            errorType="correct",
            concept=concept,
            misconception=None,
            misconceptionId=None,
            confidence=1.0,
            errorStep=None,
            explanation="Your final answer matches the expected result.",
            evidence=["Final answer matches the expected result."],
        )

    correct_second = c - b if op == "+" else c + b
    wrong_second = c + b if op == "+" else c - b

    step_index = None
    step_kind = None  # "wrong" | "correct"
    for i, line in enumerate(lines):
        if _is_original_equation_line(line, coef_str, op, b, c):
            continue
        val = _rhs_value(line)
        if val is None:
            continue
        if abs(val - wrong_second) < 1e-6:
            step_index = i
            step_kind = "wrong"
            break
        if abs(val - correct_second) < 1e-6:
            step_index = i
            step_kind = "correct"
            break

    evidence: List[str] = []
    misconception_id: Optional[str] = None
    error_type: Optional[str] = None
    error_step: Optional[int] = None
    base_confidence = 0.0
    explanation = (
        "Your final answer doesn't match the expected result, "
        "and the submitted steps don't follow a pattern we can confidently classify."
    )

    if step_kind == "wrong":
        error_step = step_index + 1
        misconception_id = "inverse_operation_confusion"
        error_type = "conceptual"
        base_confidence = 0.55
        verb = "added" if op == "+" else "subtracted"
        opposite = "subtracting" if op == "+" else "adding"
        evidence.append(
            f"Step {error_step} ('{lines[step_index]}') {verb} {b} instead of {opposite} it when isolating the variable term."
        )
        explanation = (
            f"You correctly set up the equation, but when isolating the variable term "
            f"you used the wrong inverse operation on step {error_step}."
        )
    elif step_kind == "correct":
        if final_value is not None and abs(final_value - correct_second) < 1e-6 and a not in (0, 1):
            misconception_id = "variable_isolation"
            error_type = "procedural"
            error_step = len(lines)
            base_confidence = 0.5
            evidence.append(
                f"Final step ('{lines[-1]}') keeps the value of {a}x instead of dividing both sides by {a}."
            )
            explanation = (
                f"You isolated the term correctly, but never divided both sides by {a} to solve for x."
            )
        else:
            error_type = "arithmetic"
            error_step = len(lines)
            base_confidence = 0.4
            evidence.append(
                f"The isolation step ('{lines[step_index]}') is correct, but the final answer doesn't follow from it."
            )
            explanation = "The setup and isolation look correct, but the final answer has an arithmetic slip."

    misconception_name = None
    if misconception_id:
        taxonomy_entry = get_misconception(misconception_id)
        misconception_name = taxonomy_entry["name"] if taxonomy_entry else None

    confidence, recurrence, occurrence_count = apply_recurrence(
        misconception_id, concept, base_confidence, evidence, previous_attempts
    )

    return AnalysisOutcome(
        correct=False,
        errorType=error_type,
        concept=concept,
        misconception=misconception_name,
        misconceptionId=misconception_id,
        confidence=confidence,
        errorStep=error_step,
        explanation=explanation,
        evidence=evidence,
        recurrence=recurrence,
        occurrenceCount=occurrence_count,
    )


def analyze(
    question: str,
    expected_answer: str,
    student_solution: str,
    concept: Optional[str],
    previous_attempts: List[dict],
) -> AnalysisOutcome:
    match = LINEAR_EQUATION_RE.search(question)
    if match:
        return _analyze_linear_equation(
            match, expected_answer, student_solution, concept or "Linear Equations", previous_attempts
        )

    lines = [line.strip() for line in student_solution.strip().splitlines() if line.strip()]
    final_line = lines[-1] if lines else ""
    is_correct = expected_answer.strip() in final_line

    if is_correct:
        return AnalysisOutcome(
            correct=True,
            errorType="correct",
            concept=concept,
            misconception=None,
            misconceptionId=None,
            confidence=1.0,
            errorStep=None,
            explanation="Your final answer matches the expected result.",
            evidence=["Final answer matches the expected result."],
        )

    return AnalysisOutcome(
        correct=False,
        errorType=None,
        concept=concept,
        misconception=None,
        misconceptionId=None,
        confidence=0.0,
        errorStep=None,
        explanation=(
            "Your final answer doesn't match the expected result. "
            "This question type isn't covered by the reasoning engine yet, "
            "so no specific error pattern can be identified."
        ),
        evidence=[],
    )
