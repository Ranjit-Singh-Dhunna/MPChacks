"""Pre-approval dossiers + one-click decisions."""
import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ai.dossier import build_dossier
from database import get_db
from models import Transaction
from schemas import ApprovalDossier, ApprovalList, DecisionRequest, DecisionResult

router = APIRouter(prefix="/api", tags=["approvals"])

_DECISION_STATUS = {
    "APPROVE": "APPROVED",
    "DENY": "REJECTED",
    "REQUEST_MORE_INFO": "INFO_REQUESTED",
}


def _pending_query(db: Session):
    # Trigger: pending status OR a clear policy violation needing sign-off.
    return (db.query(Transaction)
            .filter(Transaction.approval_status == "PENDING")
            .order_by(Transaction.ai_risk_score.desc().nullslast(),
                      Transaction.amount_cad.desc()))


@router.get("/approvals", response_model=ApprovalList)
async def list_approvals(db: Session = Depends(get_db), limit: int = 15):
    txns = _pending_query(db).limit(limit).all()
    dossiers = await asyncio.gather(
        *[asyncio.to_thread(build_dossier, db, t) for t in txns]
    ) if txns else []
    total = _pending_query(db).count()
    return ApprovalList(approvals=list(dossiers), total=total)


@router.get("/approvals/{transaction_id}", response_model=ApprovalDossier)
async def get_approval(transaction_id: str, db: Session = Depends(get_db)):
    txn = db.query(Transaction).filter_by(transaction_id=transaction_id).first()
    if not txn:
        raise HTTPException(404, "Transaction not found")
    return await asyncio.to_thread(build_dossier, db, txn)


@router.post("/approvals/{transaction_id}/decide", response_model=DecisionResult)
def decide(transaction_id: str, req: DecisionRequest, db: Session = Depends(get_db)):
    txn = db.query(Transaction).filter_by(transaction_id=transaction_id).first()
    if not txn:
        raise HTTPException(404, "Transaction not found")
    new_status = _DECISION_STATUS[req.decision]
    txn.approval_status = new_status
    if req.decision == "APPROVE":
        txn.is_pre_authorized = True
    db.commit()
    return DecisionResult(transaction_id=transaction_id, new_status=new_status)
