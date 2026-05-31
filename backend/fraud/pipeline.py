"""Tier 1-3 analysis pipeline: deterministic policy + fraud clustering.

Compliance analysis is deterministic by default. Gemini is reserved for future
case types where the numeric evidence is insufficient on its own.
"""
import time

import pandas as pd
from sqlalchemy.orm import Session

from ai.gemini_client import gemini
from config import settings
from compliance.cases import sync_compliance_cases
from fraud.engine import FraudFlag, run_all_detectors, build_risk_profiles
from ingestion.enricher import lookup_mcc_category
from models import Employee, EmployeeRiskProfileModel, FraudCluster, Policy, Transaction
from policy.rule_engine import RuleEngine

SEVERITY_SCORE = {"CRITICAL": 90, "HIGH": 70, "MEDIUM": 45, "LOW": 20}
RECOMMENDED_ACTION = {"CRITICAL": "ESCALATE", "HIGH": "INVESTIGATE", "MEDIUM": "MONITOR", "LOW": "MONITOR"}
AMBIGUOUS_PATTERN_TYPES = {"UNKNOWN", "MANUAL_REVIEW", "COMPLEX_MULTI_SIGNAL"}

_NARRATIVE_PROMPT = """You are Brim's fraud-detection AI. Analyze this flagged cluster.

Pattern: {pattern}
Transactions: {count}
Total CAD: ${total:,.2f}
Employees: {employees}
Deterministic finding: {description}

Return ONLY valid JSON:
{{"risk_score": <int 0-100>, "narrative": "<2-3 sentences, fact-based>",
  "confidence": "HIGH|MEDIUM|LOW", "recommended_action": "ESCALATE|INVESTIGATE|MONITOR"}}
"""


def _deterministic_cluster_score(flag: FraudFlag) -> int:
    score = SEVERITY_SCORE.get(flag.severity, 40)
    extra = flag.extra or {}
    if "z_score" in extra:
        score = max(score, min(100, int(55 + float(extra["z_score"]) * 8)))
    if "velocity_z" in extra:
        score = max(score, min(100, int(50 + float(extra["velocity_z"]) * 8)))
    if "peer_z" in extra:
        score = max(score, min(100, int(50 + float(extra["peer_z"]) * 12)))
    if "p_value" in extra:
        p_value = float(extra["p_value"])
        if p_value < 0.001:
            score = max(score, 95)
        elif p_value < 0.01:
            score = max(score, 85)
    if "hhi_score" in extra:
        score = max(score, min(100, int(45 + float(extra["hhi_score"]) * 70)))
    if len(flag.transaction_ids) >= 10:
        score = min(100, score + 5)
    return score


def _deterministic_cluster_narrative(flag: FraudFlag, risk_score: int) -> str:
    employees = ", ".join(flag.employee_names) or "unknown employees"
    count = len(flag.transaction_ids)
    return (
        f"{flag.description} Deterministic score {risk_score}/100 is based on "
        f"{count} transaction(s), {flag.total_amount_cad:,.2f} CAD exposure, "
        f"severity {flag.severity}, and matched detector {flag.pattern_type} for {employees}."
    )


def _needs_gemini_context(flag: FraudFlag) -> bool:
    return (
        settings.gemini_cluster_narratives
        and gemini.available
        and flag.pattern_type in AMBIGUOUS_PATTERN_TYPES
        and flag.severity in ("CRITICAL", "HIGH")
    )


def _load_df(db: Session) -> pd.DataFrame:
    rows = db.query(Transaction).all()
    if not rows:
        return pd.DataFrame()
    return pd.DataFrame([{
        "transaction_id": t.transaction_id,
        "employee_id": t.employee_id,
        "employee_name": t.employee_name,
        "merchant_name": t.merchant_name,
        "amount_usd": t.amount_usd,
        "amount_cad": t.amount_cad,
        "transaction_date": t.transaction_date,
        "mcc_code": t.mcc_code,
        "mcc_description": t.mcc_description,
        "department": t.department,
    } for t in rows])


def _month_spend_map(df: pd.DataFrame) -> dict[str, float]:
    """transaction_id -> employee month-to-date spend *before* this txn (CAD)."""
    if df.empty:
        return {}
    d = df.sort_values("transaction_date").copy()
    d["ym"] = d["transaction_date"].dt.to_period("M")
    d["cum"] = d.groupby(["employee_id", "ym"])["amount_cad"].cumsum()
    d["before"] = d["cum"] - d["amount_cad"]
    return dict(zip(d["transaction_id"], d["before"]))


def run_fraud_pipeline(db: Session) -> dict:
    start = time.perf_counter()
    df = _load_df(db)
    if df.empty:
        return {"total_processed": 0, "violations_found": 0, "reviews_found": 0,
                "compliant": 0, "clusters_found": 0, "ai_calls_made": 0,
                "ai_call_ratio": 0.0, "duration_ms": 0}

    # ---- Tier 2: fraud clusters (deterministic) ----
    flags: list[FraudFlag] = run_all_detectors(df)
    fraud_txn_ids: dict[str, FraudFlag] = {}
    for f in flags:
        for tid in f.transaction_ids:
            # keep the highest-severity flag per transaction
            cur = fraud_txn_ids.get(tid)
            if cur is None or SEVERITY_SCORE[f.severity] > SEVERITY_SCORE[cur.severity]:
                fraud_txn_ids[tid] = f

    # ---- Tier 1: deterministic policy per transaction ----
    rules = db.query(Policy).filter(Policy.is_active.is_(True)).all()
    engine = RuleEngine(rules)
    employees = {e.employee_id: e for e in db.query(Employee).all()}
    month_spend = _month_spend_map(df)

    txns = db.query(Transaction).all()
    violations = reviews = compliant = 0

    for t in txns:
        emp = employees.get(t.employee_id)
        result = engine.check_transaction(t, emp, month_spend.get(t.transaction_id, 0.0))
        t.ai_category = lookup_mcc_category(t.mcc_code)

        fraud = fraud_txn_ids.get(t.transaction_id)
        reasons = list(result.reasons)
        severity = result.severity
        flag = result.flag

        if fraud:
            reasons.insert(0, fraud.description)
            # escalate to the worse of policy vs fraud severity
            if severity is None or SEVERITY_SCORE[fraud.severity] > SEVERITY_SCORE[severity]:
                severity = fraud.severity
            flag = "VIOLATION" if SEVERITY_SCORE[severity] >= 70 else "REVIEW"

        if flag == "COMPLIANT":
            t.policy_flag = "COMPLIANT"
            t.severity = None
            t.flag_reason = None
            t.ai_risk_score = 5
            compliant += 1
        else:
            t.policy_flag = flag
            t.severity = severity
            t.flag_reason = "; ".join(reasons)[:1000]
            t.ai_risk_score = SEVERITY_SCORE.get(severity, 40)
            if flag == "VIOLATION":
                violations += 1
            else:
                reviews += 1

    # ---- Tier 3: structured cluster records, deterministic by default ----
    db.query(FraudCluster).delete()
    ai_calls = 0
    for i, f in enumerate(flags, start=1):
        risk_score = _deterministic_cluster_score(f)
        recommended_action = RECOMMENDED_ACTION.get(f.severity, "MONITOR")
        cluster = FraudCluster(
            cluster_id=f"CLU-{i:03d}",
            pattern_type=f.pattern_type,
            transaction_ids=f.transaction_ids,
            employee_names=f.employee_names,
            severity=f.severity,
            total_amount_cad=f.total_amount_cad,
            description=f.description,
            ai_narrative=_deterministic_cluster_narrative(f, risk_score),
            risk_score=risk_score,
            recommended_action=recommended_action,
        )
        if _needs_gemini_context(f):
            res = gemini.call_json(_NARRATIVE_PROMPT.format(
                pattern=f.pattern_type, count=len(f.transaction_ids),
                total=f.total_amount_cad, employees=", ".join(f.employee_names),
                description=f.description,
            ))
            ai_calls += 1
            if isinstance(res, dict) and not res.get("_fallback"):
                cluster.ai_narrative = str(res.get("narrative", ""))[:1000]
                cluster.risk_score = int(res.get("risk_score", cluster.risk_score))
                cluster.recommended_action = res.get("recommended_action",
                                                     cluster.recommended_action)
        db.add(cluster)

    db.flush()

    # ---- Tier 2b: employee risk profiles ----
    policy_viol_counts: dict[str, int] = {}
    for t in txns:
        if t.policy_flag == "VIOLATION":
            policy_viol_counts[t.employee_id] = policy_viol_counts.get(t.employee_id, 0) + 1

    profiles = build_risk_profiles(df, flags, policy_viol_counts)
    db.query(EmployeeRiskProfileModel).delete()
    from datetime import datetime as _dt
    for p in profiles:
        db.add(EmployeeRiskProfileModel(
            employee_id=p.employee_id,
            employee_name=p.employee_name,
            department=p.department,
            composite_score=p.composite_score,
            risk_tier=p.risk_tier,
            signal_breakdown=p.signal_breakdown,
            top_signals=p.top_signals,
            transaction_count=p.transaction_count,
            total_spend_cad=p.total_spend_cad,
            flags_count=p.flags_count,
            updated_at=_dt.utcnow(),
        ))

    sync_compliance_cases(db)
    db.commit()

    total = len(txns)
    duration = int((time.perf_counter() - start) * 1000)
    return {
        "total_processed": total,
        "violations_found": violations,
        "reviews_found": reviews,
        "compliant": compliant,
        "clusters_found": len(flags),
        "ai_calls_made": ai_calls,
        "ai_call_ratio": round(ai_calls / total, 4) if total else 0.0,
        "duration_ms": duration,
        "risk_profiles_built": len(profiles),
        "detectors_run": len(run_all_detectors.__wrapped__) if hasattr(run_all_detectors, '__wrapped__') else 10,
    }
