"""Manager-facing compliance case queue."""
import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from compliance.cases import OPEN_STATUSES, STATUS_FOR_ACTION
from database import get_db
from models import ComplianceCase, ComplianceCaseEvent, Transaction
from schemas import (
    ComplianceCaseDetail,
    ComplianceCaseEventResponse,
    ComplianceCaseResponse,
    ComplianceCaseUpdate,
    ComplianceOverview,
    TransactionPage,
    TransactionResponse,
)

router = APIRouter(prefix="/api/compliance", tags=["compliance"])


def _case_query(db: Session):
    return db.query(ComplianceCase)


def _policy_case_transaction_ids(db: Session) -> list[str]:
    ids: set[str] = set()
    cases = (
        db.query(ComplianceCase)
        .filter(ComplianceCase.case_type.in_(["POLICY", "MIXED"]))
        .all()
    )
    for case in cases:
        evidence = case.evidence or {}
        if evidence.get("policy_reasons") or evidence.get("policy_bucket"):
            ids.update(case.related_transaction_ids or [])
    return sorted(ids)


@router.get("/overview", response_model=ComplianceOverview)
def overview(db: Session = Depends(get_db)):
    open_cases = _case_query(db).filter(ComplianceCase.status.in_(list(OPEN_STATUSES))).all()
    policy_violations = db.query(func.count(Transaction.id)).filter(
        Transaction.policy_flag == "VIOLATION"
    ).scalar() or 0
    policy_reviews = db.query(func.count(Transaction.id)).filter(
        Transaction.policy_flag == "REVIEW"
    ).scalar() or 0
    last_scan = db.query(func.max(ComplianceCase.last_seen_at)).scalar()
    return ComplianceOverview(
        open_cases=len(open_cases),
        critical_high_cases=sum(1 for c in open_cases if c.severity in ("CRITICAL", "HIGH")),
        total_exposure_cad=round(sum(c.exposure_cad for c in open_cases), 2),
        policy_violations=policy_violations,
        policy_reviews=policy_reviews,
        total_cases=_case_query(db).count(),
        last_scan_at=last_scan,
    )


@router.get("/cases", response_model=list[ComplianceCaseResponse])
def list_cases(
    db: Session = Depends(get_db),
    status: str | None = None,
    severity: str | None = None,
    case_type: str | None = None,
    search: str | None = None,
    limit: int = Query(100, ge=1, le=300),
):
    q = _case_query(db)
    if status:
        if status == "ACTIVE":
            q = q.filter(ComplianceCase.status.in_(list(OPEN_STATUSES)))
        else:
            q = q.filter(ComplianceCase.status == status)
    if severity:
        q = q.filter(ComplianceCase.severity == severity)
    if case_type:
        q = q.filter(ComplianceCase.case_type == case_type)
    if search:
        pattern = f"%{search}%"
        q = q.filter(or_(ComplianceCase.title.ilike(pattern), ComplianceCase.summary.ilike(pattern)))

    rows = (
        q.order_by(
            ComplianceCase.risk_score.desc(),
            ComplianceCase.exposure_cad.desc(),
            ComplianceCase.updated_at.desc(),
        )
        .limit(limit)
        .all()
    )
    return [ComplianceCaseResponse.model_validate(r) for r in rows]


@router.get("/cases/{case_id}", response_model=ComplianceCaseDetail)
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = _case_query(db).filter_by(case_id=case_id).first()
    if not case:
        raise HTTPException(404, "Compliance case not found")
    txns = (
        db.query(Transaction)
        .filter(Transaction.transaction_id.in_(case.related_transaction_ids or []))
        .order_by(Transaction.transaction_date.desc())
        .all()
    )
    events = (
        db.query(ComplianceCaseEvent)
        .filter_by(case_id=case.case_id)
        .order_by(ComplianceCaseEvent.created_at.desc())
        .all()
    )
    data = ComplianceCaseResponse.model_validate(case).model_dump()
    data["events"] = [ComplianceCaseEventResponse.model_validate(e) for e in events]
    data["transactions"] = [TransactionResponse.model_validate(t) for t in txns]
    return ComplianceCaseDetail(**data)


@router.patch("/cases/{case_id}", response_model=ComplianceCaseDetail)
def update_case(case_id: str, req: ComplianceCaseUpdate, db: Session = Depends(get_db)):
    case = _case_query(db).filter_by(case_id=case_id).first()
    if not case:
        raise HTTPException(404, "Compliance case not found")
    new_status = STATUS_FOR_ACTION[req.action]
    previous_status = case.status
    if new_status:
        case.status = new_status
        if new_status in ("REVIEWED", "DISMISSED"):
            case.resolved_at = datetime.utcnow()
    case.updated_at = datetime.utcnow()
    db.add(ComplianceCaseEvent(
        case_id=case.case_id,
        action=req.action,
        actor=req.actor or "Finance Manager",
        note=req.note or None,
        snapshot={"previous_status": previous_status, "new_status": case.status},
    ))
    db.commit()
    return get_case(case_id, db)


@router.get("/violations", response_model=TransactionPage)
def violations(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=1000),
    flag: str | None = Query(None, pattern="^(VIOLATION|REVIEW)$"),
):
    q = db.query(Transaction).filter(Transaction.policy_flag.in_(["VIOLATION", "REVIEW"]))
    if flag:
        q = q.filter(Transaction.policy_flag == flag)
    total = q.count()
    if total == 0 and not flag:
        case_txn_ids = _policy_case_transaction_ids(db)
        if case_txn_ids:
            q = db.query(Transaction).filter(Transaction.transaction_id.in_(case_txn_ids))
            total = q.count()
    rows = (
        q.order_by(Transaction.ai_risk_score.desc(), Transaction.transaction_date.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return TransactionPage(
        transactions=[TransactionResponse.model_validate(r) for r in rows],
        total=total,
        page=page,
        size=size,
    )


@router.get("/export")
def export_cases(db: Session = Depends(get_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "case_id",
        "status",
        "case_type",
        "severity",
        "risk_score",
        "exposure_cad",
        "title",
        "employees",
        "transactions",
        "recommended_action",
        "last_seen_at",
    ])
    for case in list_cases(db=db, limit=300):
        writer.writerow([
            case.case_id,
            case.status,
            case.case_type,
            case.severity,
            case.risk_score,
            f"{case.exposure_cad:.2f}",
            case.title,
            "; ".join(case.related_employee_names),
            "; ".join(case.related_transaction_ids),
            case.recommended_action,
            case.last_seen_at.isoformat() if case.last_seen_at else "",
        ])
    output.seek(0)
    headers = {"Content-Disposition": 'attachment; filename="compliance-cases.csv"'}
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)
