"""Fraud intelligence API — risk profiles, cluster deep-dives, and Benford data."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import EmployeeRiskProfileModel, FraudCluster, Transaction
from schemas import (
    EmployeeRiskProfileResponse,
    FraudClusterResponse,
    FraudIntelligenceResponse,
    TransactionResponse,
)

router = APIRouter(prefix="/api/fraud", tags=["fraud-intelligence"])


@router.get("/intelligence", response_model=FraudIntelligenceResponse)
def fraud_intelligence(db: Session = Depends(get_db)):
    """Full fraud intelligence dashboard data: clusters + risk profiles + stats."""
    clusters = (
        db.query(FraudCluster)
        .order_by(FraudCluster.risk_score.desc())
        .all()
    )
    profiles = (
        db.query(EmployeeRiskProfileModel)
        .order_by(EmployeeRiskProfileModel.composite_score.desc())
        .all()
    )
    risk_dist = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for p in profiles:
        risk_dist[p.risk_tier] = risk_dist.get(p.risk_tier, 0) + 1

    pattern_types = sorted({c.pattern_type for c in clusters})

    return FraudIntelligenceResponse(
        clusters=[FraudClusterResponse.model_validate(c) for c in clusters],
        risk_profiles=[EmployeeRiskProfileResponse.model_validate(p) for p in profiles],
        risk_distribution=risk_dist,
        total_detectors_run=10,
        detection_patterns=pattern_types,
    )


@router.get("/risk-profiles", response_model=list[EmployeeRiskProfileResponse])
def list_risk_profiles(
    db: Session = Depends(get_db),
    tier: str | None = Query(None, pattern="^(CRITICAL|HIGH|MEDIUM|LOW)$"),
    department: str | None = None,
    limit: int = Query(50, ge=1, le=100),
):
    """All employee risk profiles, ranked by composite score."""
    q = db.query(EmployeeRiskProfileModel)
    if tier:
        q = q.filter(EmployeeRiskProfileModel.risk_tier == tier)
    if department:
        q = q.filter(EmployeeRiskProfileModel.department == department)
    rows = q.order_by(EmployeeRiskProfileModel.composite_score.desc()).limit(limit).all()
    return [EmployeeRiskProfileResponse.model_validate(r) for r in rows]


@router.get("/risk-profiles/{employee_id}", response_model=EmployeeRiskProfileResponse)
def get_risk_profile(employee_id: str, db: Session = Depends(get_db)):
    """Individual employee risk profile deep-dive."""
    profile = (
        db.query(EmployeeRiskProfileModel)
        .filter_by(employee_id=employee_id)
        .first()
    )
    if not profile:
        raise HTTPException(404, "Risk profile not found — run /api/analyze first")
    return EmployeeRiskProfileResponse.model_validate(profile)


@router.get("/clusters", response_model=list[FraudClusterResponse])
def list_clusters(
    db: Session = Depends(get_db),
    pattern: str | None = None,
    severity: str | None = None,
    limit: int = Query(50, ge=1, le=200),
):
    """All fraud clusters with optional filtering."""
    q = db.query(FraudCluster)
    if pattern:
        q = q.filter(FraudCluster.pattern_type == pattern)
    if severity:
        q = q.filter(FraudCluster.severity == severity)
    rows = (
        q.order_by(FraudCluster.risk_score.desc())
        .limit(limit)
        .all()
    )
    return [FraudClusterResponse.model_validate(r) for r in rows]


@router.get("/clusters/{cluster_id}")
def get_cluster_detail(cluster_id: str, db: Session = Depends(get_db)):
    """Cluster deep-dive with related transactions."""
    cluster = db.query(FraudCluster).filter_by(cluster_id=cluster_id).first()
    if not cluster:
        raise HTTPException(404, "Fraud cluster not found")
    txns = (
        db.query(Transaction)
        .filter(Transaction.transaction_id.in_(cluster.transaction_ids or []))
        .order_by(Transaction.transaction_date.desc())
        .all()
    )
    data = FraudClusterResponse.model_validate(cluster).model_dump()
    data["transactions"] = [TransactionResponse.model_validate(t) for t in txns]
    return data
