"""Transaction listing + dashboard stats."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import FraudCluster, Transaction
from schemas import DashboardStats, TransactionPage, TransactionResponse

router = APIRouter(prefix="/api", tags=["transactions"])


@router.get("/transactions", response_model=TransactionPage)
def list_transactions(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    department: str | None = None,
    policy_flag: str | None = None,
    severity: str | None = None,
    employee_id: str | None = None,
    search: str | None = None,
):
    q = db.query(Transaction)
    if department:
        q = q.filter(Transaction.department == department)
    if policy_flag:
        q = q.filter(Transaction.policy_flag == policy_flag)
    if severity:
        q = q.filter(Transaction.severity == severity)
    if employee_id:
        q = q.filter(Transaction.employee_id == employee_id)
    if search:
        q = q.filter(Transaction.merchant_name.ilike(f"%{search}%"))

    total = q.count()
    rows = (q.order_by(Transaction.transaction_date.desc())
            .offset((page - 1) * size).limit(size).all())
    return TransactionPage(
        transactions=[TransactionResponse.model_validate(r) for r in rows],
        total=total, page=page, size=size,
    )


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(db: Session = Depends(get_db)):
    total_spend = db.query(func.sum(Transaction.amount_cad)).scalar() or 0.0
    txn_count = db.query(func.count(Transaction.id)).scalar() or 0
    violations = db.query(func.count(Transaction.id)).filter(
        Transaction.policy_flag == "VIOLATION").scalar() or 0
    reviews = db.query(func.count(Transaction.id)).filter(
        Transaction.policy_flag == "REVIEW").scalar() or 0
    pending = db.query(func.count(Transaction.id)).filter(
        Transaction.approval_status == "PENDING").scalar() or 0
    clusters = db.query(func.count(FraudCluster.cluster_id)).scalar() or 0

    flagged_total = violations + reviews
    ai_ratio = round(clusters / txn_count, 4) if txn_count else 0.0

    cat_rows = (db.query(Transaction.ai_category,
                         func.sum(Transaction.amount_cad).label("total"))
                .group_by(Transaction.ai_category)
                .order_by(func.sum(Transaction.amount_cad).desc())
                .limit(6).all())
    top_categories = [{"label": c or "Uncategorized", "value": round(t, 2)}
                      for c, t in cat_rows]

    recent = (db.query(Transaction)
              .filter(Transaction.policy_flag.in_(["VIOLATION", "REVIEW"]))
              .order_by(Transaction.ai_risk_score.desc(),
                        Transaction.transaction_date.desc())
              .limit(8).all())

    return DashboardStats(
        total_spend_cad=round(total_spend, 2),
        transaction_count=txn_count,
        violations=violations,
        reviews=reviews,
        pending_approvals=pending,
        fraud_clusters=clusters,
        ai_call_ratio=ai_ratio,
        top_categories=top_categories,
        recent_flagged=[TransactionResponse.model_validate(r) for r in recent],
    )
