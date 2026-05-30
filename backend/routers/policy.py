"""Policy rule management + PDF extraction."""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models import FraudCluster, Policy
from policy.extractor import extract_policy_rules
from schemas import (
    FraudClusterResponse,
    PolicyResponse,
    PolicyUpdate,
    PolicyUploadResult,
)

router = APIRouter(prefix="/api", tags=["policy"])


@router.get("/policy/rules", response_model=list[PolicyResponse])
def list_rules(db: Session = Depends(get_db)):
    rows = db.query(Policy).order_by(Policy.policy_id).all()
    return [PolicyResponse.model_validate(r) for r in rows]


@router.post("/policy/upload", response_model=PolicyUploadResult)
async def upload_policy(db: Session = Depends(get_db), file: UploadFile = File(...)):
    pdf_bytes = await file.read()
    rules, used_fallback = extract_policy_rules(pdf_bytes)

    # Replace the active rule set with the freshly extracted one.
    db.query(Policy).delete()
    saved = []
    for r in rules:
        p = Policy(
            rule_name=r["rule_name"], rule_type=r["rule_type"],
            rule_parameters=r.get("rule_parameters", {}),
            severity=r.get("severity", "MEDIUM"), is_active=True,
            source_text=r.get("source_text"),
        )
        db.add(p)
        saved.append(p)
    db.commit()
    return PolicyUploadResult(
        rules_extracted=len(saved), used_fallback=used_fallback,
        rules=[PolicyResponse.model_validate(p) for p in saved],
    )


@router.put("/policy/rules/{policy_id}", response_model=PolicyResponse)
def update_rule(policy_id: int, update: PolicyUpdate, db: Session = Depends(get_db)):
    rule = db.query(Policy).filter_by(policy_id=policy_id).first()
    if not rule:
        raise HTTPException(404, "Rule not found")
    data = update.model_dump(exclude_none=True)
    for k, v in data.items():
        setattr(rule, k, v)
    db.commit()
    db.refresh(rule)
    return PolicyResponse.model_validate(rule)


@router.get("/fraud/clusters", response_model=list[FraudClusterResponse])
def fraud_clusters(db: Session = Depends(get_db)):
    rows = db.query(FraudCluster).order_by(FraudCluster.risk_score.desc()).all()
    return [FraudClusterResponse.model_validate(r) for r in rows]
