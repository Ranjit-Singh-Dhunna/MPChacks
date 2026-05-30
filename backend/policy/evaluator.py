"""Value objects for policy evaluation results."""
from dataclasses import dataclass, field

SEVERITY_ORDER = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}


@dataclass
class RuleResult:
    violated: bool
    severity: str = "LOW"
    reason: str = ""
    rule_name: str = ""


@dataclass
class PolicyResult:
    flag: str  # COMPLIANT | VIOLATION | REVIEW
    severity: str | None = None
    reasons: list[str] = field(default_factory=list)

    @property
    def reason_text(self) -> str:
        return "; ".join(self.reasons)
