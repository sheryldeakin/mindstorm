from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Dict


# --- Enumerations / helpers --- #

class Severity(str, Enum):
    """Generic DSM-5 severity levels (can be used as specifiers)."""
    MILD = "Mild"
    MODERATE = "Moderate"
    SEVERE = "Severe"
    PROFOUND = "Profound"
    UNSPECIFIED = "Unspecified"


# If you want to be stricter, you can also make a Family enum later.
# For now we keep it as str on Disorder.family for flexibility.


# --- Core data structures --- #

@dataclass
class Criterion:
    """
    One DSM-5 diagnostic criterion (e.g. MDD A1).
    """
    code: str                # e.g. "MDD_A1"
    description: str         # DSM-style text snippet
    question: str            # Socratic question you’ll ask users
    required: bool           # whether DSM explicitly requires it
    group: str               # e.g. "A", "B", "C"
    tags: List[str] = field(default_factory=list)
    answer: Optional[bool] = None  # to be filled in at runtime


@dataclass
class Threshold:
    """
    Logical rule for "enough criteria" to be considered consistent.
    """
    min_criteria_met: int
    must_include: List[str] = field(default_factory=list)  # list of Criterion.codes


@dataclass
class Disorder:
    """
    Structured representation of a DSM-5 disorder.
    """
    id: str                          # internal short id e.g. "MDD"
    name: str                        # full DSM-5 name
    family: str                      # "Depressive", "Anxiety", "Trauma", ...
    dsm_code: Optional[str]          # e.g. "296.21"
    icd10_code: Optional[str]        # e.g. "F32.0"
    specifiers: List[Severity] = field(default_factory=list)
    dsm_reference: str = ""          # e.g. "DSM-5 Depressive Disorders p.94–96"
    criteria: List[Criterion] = field(default_factory=list)
    threshold: Threshold = field(default_factory=lambda: Threshold(min_criteria_met=1))
    exclusion_ids: List[str] = field(default_factory=list)  # ids linking to exclusion rules

    # --- helper logic --- #

    def criteria_met_count(self) -> int:
        """
        Count how many criteria have answer == True.
        """
        return sum(1 for c in self.criteria if c.answer is True)

    def required_criteria_met(self) -> bool:
        """
        Check that all `required=True` criteria are met.
        """
        return all(
            (not c.required) or (c.answer is True)
            for c in self.criteria
        )

    def must_include_ok(self) -> bool:
        """
        Check that all codes listed in threshold.must_include are present
        and answered True.
        """
        if not self.threshold.must_include:
            return True

        by_code: Dict[str, Criterion] = {c.code: c for c in self.criteria}

        for code in self.threshold.must_include:
            crit = by_code.get(code)
            if crit is None or crit.answer is not True:
                return False
        return True

    def is_consistent_with_answers(self) -> bool:
        """
        High-level helper: "Does the current answer set look DSM-consistent
        for this disorder?" (ignores exclusion rules; those are handled outside).
        """
        return (
            self.criteria_met_count() >= self.threshold.min_criteria_met
            and self.required_criteria_met()
            and self.must_include_ok()
        )