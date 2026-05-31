"""SQLAlchemy ORM models: Transaction, Employee, Policy, ExpenseReport, FraudCluster."""
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Employee(Base):
    __tablename__ = "employees"

    employee_id: Mapped[str] = mapped_column(String(16), primary_key=True)
    transaction_code: Mapped[str] = mapped_column(String(16), index=True)
    name: Mapped[str] = mapped_column(String(128))
    department: Mapped[str] = mapped_column(String(64), index=True)
    manager_id: Mapped[str | None] = mapped_column(
        String(16), ForeignKey("employees.employee_id"), nullable=True
    )
    job_level: Mapped[int] = mapped_column(Integer)
    monthly_budget: Mapped[float] = mapped_column(Float)
    email: Mapped[str] = mapped_column(String(128))

    manager = relationship("Employee", remote_side=[employee_id], backref="reports")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    transaction_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    card_number: Mapped[str] = mapped_column(String(32))  # tokenized only
    merchant_name: Mapped[str] = mapped_column(String(128), index=True)
    amount_usd: Mapped[float] = mapped_column(Float)
    amount_cad: Mapped[float] = mapped_column(Float, index=True)
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    conversion_rate: Mapped[float] = mapped_column(Float)
    transaction_date: Mapped[datetime] = mapped_column(DateTime, index=True)
    mcc_code: Mapped[str] = mapped_column(String(8), index=True)
    mcc_description: Mapped[str] = mapped_column(String(128))
    transaction_code: Mapped[str] = mapped_column(String(16))

    employee_id: Mapped[str] = mapped_column(
        String(16), ForeignKey("employees.employee_id"), index=True
    )
    employee_name: Mapped[str] = mapped_column(String(128))
    department: Mapped[str] = mapped_column(String(64), index=True)
    manager_id: Mapped[str | None] = mapped_column(String(16), nullable=True)
    job_level: Mapped[int] = mapped_column(Integer)

    approval_status: Mapped[str] = mapped_column(String(24), default="APPROVED", index=True)
    expense_report_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    is_pre_authorized: Mapped[bool] = mapped_column(Boolean, default=True)
    trip_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    receipt_url: Mapped[str | None] = mapped_column(String(256), nullable=True)

    # populated by /api/analyze
    ai_risk_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    policy_flag: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    flag_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)

    employee = relationship("Employee")


# Composite index speeds up the common dashboard/violations filters
Index("ix_txn_flag_sev", Transaction.policy_flag, Transaction.severity)


class Policy(Base):
    __tablename__ = "policies"

    policy_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    rule_name: Mapped[str] = mapped_column(String(128))
    rule_type: Mapped[str] = mapped_column(String(32))  # AMOUNT_LIMIT, MCC_BANNED, ...
    rule_parameters: Mapped[dict] = mapped_column(JSON, default=dict)
    severity: Mapped[str] = mapped_column(String(16), default="MEDIUM")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    source_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ExpenseReport(Base):
    __tablename__ = "expense_reports"

    report_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    trip_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    employee_id: Mapped[str] = mapped_column(String(16), ForeignKey("employees.employee_id"))
    employee_name: Mapped[str] = mapped_column(String(128))
    start_date: Mapped[datetime] = mapped_column(DateTime)
    end_date: Mapped[datetime] = mapped_column(DateTime)
    total_amount_cad: Mapped[float] = mapped_column(Float)
    line_item_count: Mapped[int] = mapped_column(Integer, default=0)
    violation_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(24), default="SUBMITTED")
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FraudCluster(Base):
    __tablename__ = "fraud_clusters"

    cluster_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    pattern_type: Mapped[str] = mapped_column(String(32))  # SMURFING, SPLIT_BILLING, ...
    transaction_ids: Mapped[list] = mapped_column(JSON, default=list)
    employee_names: Mapped[list] = mapped_column(JSON, default=list)
    severity: Mapped[str] = mapped_column(String(16))
    total_amount_cad: Mapped[float] = mapped_column(Float)
    description: Mapped[str] = mapped_column(Text)
    ai_narrative: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    recommended_action: Mapped[str | None] = mapped_column(String(24), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ComplianceCase(Base):
    __tablename__ = "compliance_cases"

    case_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    fingerprint: Mapped[str] = mapped_column(String(256), unique=True, index=True)
    case_type: Mapped[str] = mapped_column(String(16), index=True)
    status: Mapped[str] = mapped_column(String(24), default="OPEN", index=True)
    severity: Mapped[str] = mapped_column(String(16), index=True)
    risk_score: Mapped[int] = mapped_column(Integer, default=0, index=True)
    exposure_cad: Mapped[float] = mapped_column(Float, default=0.0)
    title: Mapped[str] = mapped_column(String(160))
    summary: Mapped[str] = mapped_column(Text)
    recommended_action: Mapped[str] = mapped_column(String(128))
    evidence: Mapped[dict] = mapped_column(JSON, default=dict)
    related_transaction_ids: Mapped[list] = mapped_column(JSON, default=list)
    related_employee_names: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    events = relationship("ComplianceCaseEvent", back_populates="case")


class ComplianceCaseEvent(Base):
    __tablename__ = "compliance_case_events"

    event_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("compliance_cases.case_id"), index=True
    )
    action: Mapped[str] = mapped_column(String(32), index=True)
    actor: Mapped[str] = mapped_column(String(128), default="Finance Manager")
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    case = relationship("ComplianceCase", back_populates="events")


class EmployeeRiskProfileModel(Base):
    __tablename__ = "employee_risk_profiles"

    employee_id: Mapped[str] = mapped_column(String(16), primary_key=True)
    employee_name: Mapped[str] = mapped_column(String(128))
    department: Mapped[str] = mapped_column(String(64), index=True)
    composite_score: Mapped[int] = mapped_column(Integer, default=0, index=True)
    risk_tier: Mapped[str] = mapped_column(String(16), index=True)
    signal_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    top_signals: Mapped[list] = mapped_column(JSON, default=list)
    transaction_count: Mapped[int] = mapped_column(Integer, default=0)
    total_spend_cad: Mapped[float] = mapped_column(Float, default=0.0)
    flags_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


Index("ix_compliance_case_status_risk", ComplianceCase.status, ComplianceCase.risk_score)
