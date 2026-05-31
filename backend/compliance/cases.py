"""Build manager-facing compliance cases from policy and anomaly findings."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from hashlib import sha1

from sqlalchemy.orm import Session

from models import ComplianceCase, ComplianceCaseEvent, FraudCluster, Transaction


OPEN_STATUSES = {"OPEN", "ESCALATED", "INFO_REQUESTED"}
STATUS_FOR_ACTION = {
    "MARK_REVIEWED": "REVIEWED",
    "ESCALATE": "ESCALATED",
    "REQUEST_INFO": "INFO_REQUESTED",
    "DISMISS_FALSE_POSITIVE": "DISMISSED",
    "ADD_NOTE": None,
}
SEVERITY_SCORE = {"CRITICAL": 90, "HIGH": 70, "MEDIUM": 45, "LOW": 20}
SEVERITY_RANK = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}


@dataclass
class CaseDraft:
    fingerprint: str
    case_type: str
    severity: str
    risk_score: int
    title: str
    summary: str
    recommended_action: str
    transaction_ids: list[str]
    employee_names: list[str]
    exposure_cad: float
    evidence: dict = field(default_factory=dict)


def _highest_severity(values: list[str | None]) -> str:
    present = [v for v in values if v]
    if not present:
        return "LOW"
    return max(present, key=lambda s: SEVERITY_RANK.get(s, 0))


def _policy_bucket(reason: str | None) -> str:
    r = (reason or "").lower()
    if "missing receipt" in r:
        return "Missing receipts"
    if "pre-auth" in r or "threshold" in r or "fx-adjusted" in r:
        return "Authorization threshold"
    if "budget" in r:
        return "Budget overrun"
    if "prohibited" in r or "banned" in r:
        return "Prohibited category"
    return "Policy exception"


def _split_reasons(txn: Transaction) -> list[str]:
    return [r.strip() for r in (txn.flag_reason or "").split(";") if r.strip()]


def _plain_cluster_title(cluster: FraudCluster) -> str:
    labels = {
        "SMURFING": "Possible threshold bypass",
        "SPLIT_BILLING": "Possible split billing",
        "STRUCTURING": "Repeated round-number charges",
        "OUTLIER": "Unusual transaction amount",
        "SHELL_VENDOR": "Possible new shell vendor",
    }
    return labels.get(cluster.pattern_type, cluster.pattern_type.replace("_", " ").title())


def _cluster_action(cluster: FraudCluster) -> str:
    if cluster.recommended_action == "ESCALATE" or cluster.severity == "CRITICAL":
        return "Escalate for finance review"
    if cluster.recommended_action == "INVESTIGATE":
        return "Investigate supporting transactions"
    return "Monitor and review"


def _make_cluster_draft(cluster: FraudCluster, txns: dict[str, Transaction]) -> CaseDraft:
    related = [txns[tid] for tid in cluster.transaction_ids if tid in txns]
    policy_reasons = []
    for txn in related:
        policy_reasons.extend(_split_reasons(txn))
    severity = _highest_severity([cluster.severity, *[t.severity for t in related]])
    case_type = "MIXED" if policy_reasons else "ANOMALY"
    employees = sorted(set(cluster.employee_names or [t.employee_name for t in related]))
    exposure = round(sum(t.amount_cad for t in related) or cluster.total_amount_cad, 2)
    title = _plain_cluster_title(cluster)
    people = ", ".join(employees) if employees else "related employees"
    summary = (
        f"{title} involving {len(cluster.transaction_ids)} transaction(s) and "
        f"{people}, with {exposure:,.2f} CAD in exposure."
    )
    if policy_reasons:
        summary += " Related policy exceptions are included in this case."

    return CaseDraft(
        fingerprint=f"cluster:{cluster.pattern_type}:{','.join(sorted(cluster.transaction_ids))}",
        case_type=case_type,
        severity=severity,
        risk_score=max(SEVERITY_SCORE.get(severity, 20), cluster.risk_score or 0),
        title=title,
        summary=summary,
        recommended_action=_cluster_action(cluster),
        transaction_ids=cluster.transaction_ids,
        employee_names=employees,
        exposure_cad=exposure,
        evidence={
            "anomaly": {
                "pattern_type": cluster.pattern_type,
                "description": cluster.description,
                "technical_details": cluster.ai_narrative,
            },
            "policy_reasons": sorted(set(policy_reasons)),
        },
    )


def _make_policy_drafts(flagged: list[Transaction], cluster_txn_ids: set[str]) -> list[CaseDraft]:
    groups: dict[tuple[str, str, str, str], list[Transaction]] = {}
    for txn in flagged:
        if txn.transaction_id in cluster_txn_ids:
            continue
        month = txn.transaction_date.strftime("%Y-%m")
        bucket = _policy_bucket(txn.flag_reason)
        key = (txn.employee_id, month, bucket, txn.severity or "LOW")
        groups.setdefault(key, []).append(txn)

    drafts: list[CaseDraft] = []
    for (employee_id, month, bucket, severity), txns in groups.items():
        txns = sorted(txns, key=lambda t: t.transaction_date)
        employee = txns[0].employee_name
        exposure = round(sum(t.amount_cad for t in txns), 2)
        reasons = sorted({reason for t in txns for reason in _split_reasons(t)})
        title = f"{bucket} for {employee}"
        plural = "transaction" if len(txns) == 1 else "transactions"
        summary = (
            f"{len(txns)} {plural} in {month} need review for {bucket.lower()}, "
            f"totalling {exposure:,.2f} CAD."
        )
        if len(txns) >= 5:
            summary += " This is a repeat pattern for the period."
        recommended = "Request supporting information" if bucket == "Missing receipts" else "Review before approval"
        drafts.append(CaseDraft(
            fingerprint=f"policy:{employee_id}:{month}:{bucket}:{severity}",
            case_type="POLICY",
            severity=severity,
            risk_score=SEVERITY_SCORE.get(severity, 20),
            title=title,
            summary=summary,
            recommended_action=recommended,
            transaction_ids=[t.transaction_id for t in txns],
            employee_names=[employee],
            exposure_cad=exposure,
            evidence={
                "policy_bucket": bucket,
                "policy_reasons": reasons,
                "period": month,
                "repeat_pattern": len(txns) >= 5,
            },
        ))
    return drafts


def _resolve_missing_cases(db: Session, seen_fingerprints: set[str], now: datetime) -> None:
    active = db.query(ComplianceCase).filter(ComplianceCase.status.in_(list(OPEN_STATUSES))).all()
    for case in active:
        if case.fingerprint in seen_fingerprints:
            continue
        previous_status = case.status
        case.status = "RESOLVED"
        case.resolved_at = now
        case.updated_at = now
        db.add(ComplianceCaseEvent(
            case_id=case.case_id,
            action="AUTO_RESOLVED",
            actor="System",
            note="Case was not detected in the latest analysis run.",
            snapshot={"previous_status": previous_status, "new_status": "RESOLVED"},
        ))


def sync_compliance_cases(db: Session) -> int:
    """Create/update compliance cases from current fraud clusters and flagged transactions."""
    now = datetime.utcnow()
    txns = {t.transaction_id: t for t in db.query(Transaction).all()}
    clusters = db.query(FraudCluster).all()
    flagged = (
        db.query(Transaction)
        .filter(Transaction.policy_flag.in_(["VIOLATION", "REVIEW"]))
        .all()
    )
    cluster_txn_ids = {tid for c in clusters for tid in c.transaction_ids}

    drafts = [_make_cluster_draft(cluster, txns) for cluster in clusters]
    drafts.extend(_make_policy_drafts(flagged, cluster_txn_ids))

    seen: set[str] = set()
    upserts = 0
    for draft in drafts:
        seen.add(draft.fingerprint)
        case = db.query(ComplianceCase).filter_by(fingerprint=draft.fingerprint).first()
        if not case:
            digest = sha1(draft.fingerprint.encode("utf-8")).hexdigest()[:8].upper()
            case = ComplianceCase(
                case_id=f"CASE-{digest}",
                fingerprint=draft.fingerprint,
                status="OPEN",
                created_at=now,
            )
            db.add(case)
            db.add(ComplianceCaseEvent(
                case_id=case.case_id,
                action="CREATED",
                actor="System",
                note="Detected during analysis.",
            ))
        case.case_type = draft.case_type
        case.severity = draft.severity
        case.risk_score = draft.risk_score
        case.exposure_cad = draft.exposure_cad
        case.title = draft.title
        case.summary = draft.summary
        case.recommended_action = draft.recommended_action
        case.evidence = draft.evidence
        case.related_transaction_ids = draft.transaction_ids
        case.related_employee_names = draft.employee_names
        case.last_seen_at = now
        case.updated_at = now
        if case.status == "RESOLVED":
            case.status = "OPEN"
            case.resolved_at = None
            db.add(ComplianceCaseEvent(
                case_id=case.case_id,
                action="REOPENED",
                actor="System",
                note="Case reappeared in the latest analysis run.",
            ))
        upserts += 1

    _resolve_missing_cases(db, seen, now)
    return upserts
