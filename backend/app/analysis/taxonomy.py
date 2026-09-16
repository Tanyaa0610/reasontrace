"""Predefined misconception taxonomy.

The reasoning engine maps detected error patterns onto these fixed ids.
Nothing is allowed to invent a new misconception label — see spec section 7.
"""

from typing import Optional

TAXONOMY = {
    "inverse_operation_confusion": {
        "id": "inverse_operation_confusion",
        "name": "Inverse Operation Confusion",
        "description": "Applies the same operation shown in the equation instead of its inverse when moving a term across the equals sign.",
        "subject": "Mathematics",
        "concept": "Linear Equations",
        "commonSignals": ["adds a constant that should be subtracted", "subtracts a constant that should be added"],
        "remediationStrategy": "Show that undoing +b requires -b (and vice versa), then practice isolating a term on several equations.",
        "practiceTemplates": ["{a}x + {b} = {c}", "{a}x - {b} = {c}"],
    },
    "variable_isolation": {
        "id": "variable_isolation",
        "name": "Variable Isolation",
        "description": "Correctly isolates the term with the variable but stops before dividing out the coefficient.",
        "subject": "Mathematics",
        "concept": "Linear Equations",
        "commonSignals": ["final answer equals the coefficient-times-x value, not x itself"],
        "remediationStrategy": "Emphasize that 'ax = value' is not the final answer — both sides must be divided by a.",
        "practiceTemplates": ["{a}x + {b} = {c}"],
    },
    "sign_error": {
        "id": "sign_error",
        "name": "Sign Error",
        "description": "Drops or flips a negative sign while rearranging terms.",
        "subject": "Mathematics",
        "concept": "Linear Equations",
        "commonSignals": ["result has the opposite sign of the correct answer"],
        "remediationStrategy": "Slow down sign tracking by rewriting subtraction as addition of a negative.",
        "practiceTemplates": ["{a}x - {b} = {c}"],
    },
    "distribution_error": {
        "id": "distribution_error",
        "name": "Distribution Error",
        "description": "Fails to multiply every term inside parentheses by the outside factor.",
        "subject": "Mathematics",
        "concept": "Linear Equations",
        "commonSignals": ["only the first term inside parentheses is multiplied"],
        "remediationStrategy": "Practice distributing across two- and three-term expressions before solving.",
        "practiceTemplates": ["{a}(x + {b}) = {c}"],
    },
    "combining_like_terms": {
        "id": "combining_like_terms",
        "name": "Combining Like Terms",
        "description": "Merges terms that are not actually alike, or drops a term while simplifying.",
        "subject": "Mathematics",
        "concept": "Linear Equations",
        "commonSignals": ["a term disappears between steps"],
        "remediationStrategy": "Have the student underline like terms in different colors before combining.",
        "practiceTemplates": ["{a}x + {b}x + {c} = {d}"],
    },
    "simplification_error": {
        "id": "simplification_error",
        "name": "Simplification Error",
        "description": "Does not reduce a fraction to lowest terms, or divides numerator and denominator by different values.",
        "subject": "Mathematics",
        "concept": "Fractions",
        "commonSignals": ["final fraction shares a common factor with the original"],
        "remediationStrategy": "Practice finding the greatest common factor before dividing numerator and denominator.",
        "practiceTemplates": ["Simplify {a}/{b}"],
    },
    "unlike_denominators": {
        "id": "unlike_denominators",
        "name": "Unlike Denominators",
        "description": "Adds or subtracts fractions without first converting to a common denominator.",
        "subject": "Mathematics",
        "concept": "Fractions",
        "commonSignals": ["numerators and denominators are added directly"],
        "remediationStrategy": "Practice finding a common denominator before combining fractions.",
        "practiceTemplates": ["{a}/{b} + {c}/{d}"],
    },
    "multiplication_fact_error": {
        "id": "multiplication_fact_error",
        "name": "Multiplication Fact Error",
        "description": "Recalls an incorrect product for a basic multiplication fact.",
        "subject": "Mathematics",
        "concept": "Arithmetic",
        "commonSignals": ["result is close to but not equal to the correct product"],
        "remediationStrategy": "Short timed drills on the specific fact family that was missed.",
        "practiceTemplates": ["{a} x {b}"],
    },
}


def get_misconception(misconception_id: str) -> Optional[dict]:
    return TAXONOMY.get(misconception_id)
