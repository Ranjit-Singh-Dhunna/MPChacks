"""Pydantic request/response schemas for the API."""
from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    employee_id: str
    name: str
    department: str
    manager_id: Optional[str] = None
    job_level: int
    monthly_budget: float
    email: str


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    transaction_id: str
    merchant_name: str
    amount_usd: float
    amount_cad: float
    currency: str
    transaction_date: datetime
    mcc_code: str
    mcc_description: str
    employee_id: str
    employee_name: str
    department: str
    approval_status: str
    is_pre_authorized: bool
    trip_id: Optional[str] = None
    receipt_url: Optional[str] = None
    ai_risk_score: Optional[int] = None
    ai_category: Optional[str] = None
    policy_flag: Optional[str] = None
    flag_reason: Optional[str] = None
    severity: Optional[str] = None


class TransactionPage(BaseModel):
    transactions: list[TransactionResponse]
    total: int
    page: int
    size: int


class IngestRequest(BaseModel):
    use_default: bool = True


class IngestResult(BaseModel):
    rows_loaded: int
    rows_skipped: int
    errors: list[str] = []


class AnalysisResult(BaseModel):
    total_processed: int
    violations_found: int
    reviews_found: int
    compliant: int
    clusters_found: int
    ai_calls_made: int
    ai_call_ratio: float
    duration_ms: int


# ---- Policy ----
class PolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    policy_id: int
    rule_name: str
    rule_type: str
    rule_parameters: dict
    severity: str
    is_active: bool
    source_text: Optional[str] = None


class PolicyUpdate(BaseModel):
    rule_name: Optional[str] = None
    rule_parameters: Optional[dict] = None
    severity: Optional[str] = None
    is_active: Optional[bool] = None


class PolicyUploadResult(BaseModel):
    rules_extracted: int
    used_fallback: bool
    rules: list[PolicyResponse]


# ---- NL Query ----
class UIConfig(BaseModel):
    chart_type: Literal["bar", "line", "pie", "area", "table"] = "bar"
    x_axis: Optional[str] = None
    y_axis: Optional[str] = None
    title: str = ""
    color_key: Optional[str] = None


class QueryRequest(BaseModel):
    question: str
    voice: bool = False
    session_id: str = "default"


class NLQueryResponse(BaseModel):
    question: str
    query_string: str
    data: list[dict[str, Any]]
    ui_config: UIConfig
    summary: str
    audio_base64: Optional[str] = None
    used_fallback: bool = False


# ---- Approvals ----
class ApprovalDossier(BaseModel):
    transaction: TransactionResponse
    employee: EmployeeResponse
    history: list[TransactionResponse]
    budget_utilization: float
    month_spend_cad: float
    policy_violations_30d: int
    ai_recommendation: Literal["APPROVE", "DENY", "REVIEW"]
    ai_reasoning: str
    risk_factors: list[str] = []
    mitigating_factors: list[str] = []
    risk_score: int


class ApprovalList(BaseModel):
    approvals: list[ApprovalDossier]
    total: int


class DecisionRequest(BaseModel):
    decision: Literal["APPROVE", "DENY", "REQUEST_MORE_INFO"]
    note: str = ""


class DecisionResult(BaseModel):
    transaction_id: str
    new_status: str


# ---- Fraud clusters ----
class FraudClusterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    cluster_id: str
    pattern_type: str
    transaction_ids: list[str]
    employee_names: list[str]
    severity: str
    total_amount_cad: float
    description: str
    ai_narrative: Optional[str] = None
    risk_score: int
    recommended_action: Optional[str] = None


# ---- Reports ----
class ReportLineItem(BaseModel):
    transaction_id: str
    merchant_name: str
    amount_cad: float
    transaction_date: datetime
    mcc_description: str
    policy_flag: Optional[str] = None
    severity: Optional[str] = None
    flag_reason: Optional[str] = None


class ExpenseReportSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    report_id: str
    trip_id: Optional[str] = None
    employee_name: str
    start_date: datetime
    end_date: datetime
    total_amount_cad: float
    line_item_count: int
    violation_count: int
    status: str


class ExpenseReportDetail(ExpenseReportSummary):
    ai_summary: Optional[str] = None
    approved_by: Optional[str] = None
    line_items: list[ReportLineItem] = []


class ReportGenerateRequest(BaseModel):
    employee_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class ReportApproveRequest(BaseModel):
    approved_by: str = "CFO"
    note: str = ""


# ---- Dashboard ----
class DashboardStats(BaseModel):
    total_spend_cad: float
    transaction_count: int
    violations: int
    reviews: int
    pending_approvals: int
    fraud_clusters: int
    ai_call_ratio: float
    top_categories: list[dict[str, Any]]
    recent_flagged: list[TransactionResponse]
