"""Pre-approval dossier: deterministic context assembly + AI recommendation.

All four context elements (request, employee history, budget, policy fit) are assembled
deterministically. Gemini only writes the recommendation narrative — and even that has a
deterministic fallback so the dossier is never empty.
"""
from datetime import timedelta

from sqlalchemy.orm import Session

from ai.gemini_client import gemini
from compliance.cases import OPEN_STATUSES
from models import ComplianceCase, Employee, Transaction
from schemas import (
    ApprovalDossier,
    EmployeeResponse,
    TransactionResponse,
)

_PROMPT = """You are Brim's AI compliance officer reviewing a pre-approval request.

Employee: {name} (Level {level}, {dept})
Transaction: ${amount_cad:,.2f} CAD at {merchant}
Monthly budget utilization: {util:.0%}
Policy violations in last 30 days: {viol}
Current policy status: {flag}
Flag reason: {reason}

Return ONLY valid JSON:
{{"recommendation": "APPROVE|DENY|REVIEW", "reasoning": "<2-3 sentences, fact-based>",
  "risk_factors": ["<factor>", ...], "mitigating_factors": ["<factor>", ...]}}
"""


def _deterministic_reco(util: float, violations: int, flag: str | None) -> dict:
    risk, mitig = [], []
    if util > 1.0:
        risk.append("Employee is over monthly budget")
    elif util > 0.8:
        risk.append(f"Budget {util:.0%} utilized")
    else:
        mitig.append(f"Budget only {util:.0%} utilized")
    if violations > 0:
        risk.append(f"{violations} policy violation(s) in last 30 days")
    else:
        mitig.append("No prior violations in last 30 days")
    if flag == "VIOLATION":
        risk.append("Transaction currently flagged as a policy violation")

    if util > 1.0 or violations >= 2 or flag == "VIOLATION":
        reco = "DENY"
    elif flag == "REVIEW" or util > 0.8:
        reco = "REVIEW"
    else:
        reco = "APPROVE"
    reason = (f"Recommendation {reco}: budget {util:.0%} utilized, {violations} recent "
              f"violation(s), current status {flag or 'COMPLIANT'}.")
    return {"recommendation": reco, "reasoning": reason,
            "risk_factors": risk, "mitigating_factors": mitig}


def prepare_dossier_data(db: Session, txn: Transaction) -> dict:
    emp = db.query(Employee).filter_by(employee_id=txn.employee_id).first()
    window_start = txn.transaction_date - timedelta(days=30)
    history = (db.query(Transaction)
               .filter(Transaction.employee_id == txn.employee_id,
                       Transaction.transaction_date >= window_start,
                       Transaction.transaction_date <= txn.transaction_date)
               .order_by(Transaction.transaction_date.desc())
               .all())
    compliance_cases = (
        db.query(ComplianceCase)
        .filter(ComplianceCase.status.in_(list(OPEN_STATUSES)))
        .all()
    )
    warnings = [
        f"{case.severity}: {case.title}"
        for case in compliance_cases
        if txn.transaction_id in (case.related_transaction_ids or [])
    ]
    return {
        "txn": TransactionResponse.model_validate(txn),
        "emp": EmployeeResponse.model_validate(emp) if emp else None,
        "history": [TransactionResponse.model_validate(t) for t in history],
        "job_level": txn.job_level,
        "compliance_warnings": warnings,
    }


def build_dossier_from_data(data: dict) -> ApprovalDossier:
    txn = data["txn"]
    emp = data["emp"]
    history = data["history"]
    job_level = data["job_level"]
    compliance_warnings = data.get("compliance_warnings", [])

    month_spend = sum(t.amount_cad for t in history)
    budget = emp.monthly_budget if emp else 1.0
    util = month_spend / budget if budget else 0.0
    violations = sum(1 for t in history if t.policy_flag == "VIOLATION")

    reco = _deterministic_reco(util, violations, txn.policy_flag)
    if gemini.available:
        ai = gemini.call_json(_PROMPT.format(
            name=txn.employee_name, level=job_level, dept=txn.department,
            amount_cad=txn.amount_cad, merchant=txn.merchant_name,
            util=util, viol=violations, flag=txn.policy_flag or "COMPLIANT",
            reason=txn.flag_reason or "None",
        ))
        if isinstance(ai, dict) and not ai.get("_fallback"):
            reco = {
                "recommendation": ai.get("recommendation", reco["recommendation"]),
                "reasoning": ai.get("reasoning", reco["reasoning"]),
                "risk_factors": ai.get("risk_factors", reco["risk_factors"]),
                "mitigating_factors": ai.get("mitigating_factors", reco["mitigating_factors"]),
            }

    reco_val = reco["recommendation"]
    if reco_val not in ("APPROVE", "DENY", "REVIEW"):
        reco_val = "REVIEW"

    return ApprovalDossier(
        transaction=txn,
        employee=emp,
        history=history[:10],
        budget_utilization=round(util, 4),
        month_spend_cad=round(month_spend, 2),
        policy_violations_30d=violations,
        ai_recommendation=reco_val,
        ai_reasoning=reco["reasoning"],
        risk_factors=reco["risk_factors"],
        mitigating_factors=reco["mitigating_factors"],
        risk_score=txn.ai_risk_score or 0,
        compliance_warning_count=len(compliance_warnings),
        compliance_warnings=compliance_warnings[:5],
    )


def build_dossier(db: Session, txn: Transaction) -> ApprovalDossier:
    data = prepare_dossier_data(db, txn)
    return build_dossier_from_data(data)

