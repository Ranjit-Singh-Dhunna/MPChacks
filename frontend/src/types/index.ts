export type PolicyFlag = "COMPLIANT" | "VIOLATION" | "REVIEW";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface Transaction {
  transaction_id: string;
  merchant_name: string;
  amount_usd: number;
  amount_cad: number;
  currency: string;
  transaction_date: string;
  mcc_code: string;
  mcc_description: string;
  employee_id: string;
  employee_name: string;
  department: string;
  approval_status: string;
  is_pre_authorized: boolean;
  trip_id: string | null;
  receipt_url: string | null;
  ai_risk_score: number | null;
  ai_category: string | null;
  policy_flag: PolicyFlag | null;
  flag_reason: string | null;
  severity: Severity | null;
}

export interface TransactionPage {
  transactions: Transaction[];
  total: number;
  page: number;
  size: number;
}

export type ComplianceCaseStatus = "OPEN" | "ESCALATED" | "INFO_REQUESTED" | "REVIEWED" | "DISMISSED" | "RESOLVED";
export type ComplianceCaseType = "ANOMALY" | "POLICY" | "MIXED";

export interface ComplianceOverview {
  open_cases: number;
  critical_high_cases: number;
  total_exposure_cad: number;
  policy_violations: number;
  policy_reviews: number;
  total_cases: number;
  last_scan_at: string | null;
}

export interface ComplianceCase {
  case_id: string;
  case_type: ComplianceCaseType;
  status: ComplianceCaseStatus;
  severity: Severity;
  risk_score: number;
  exposure_cad: number;
  title: string;
  summary: string;
  recommended_action: string;
  evidence: Record<string, unknown>;
  related_transaction_ids: string[];
  related_employee_names: string[];
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
  resolved_at: string | null;
}

export interface ComplianceCaseEvent {
  event_id: number;
  case_id: string;
  action: string;
  actor: string;
  note: string | null;
  snapshot: Record<string, unknown> | null;
  created_at: string;
}

export interface ComplianceCaseDetail extends ComplianceCase {
  events: ComplianceCaseEvent[];
  transactions: Transaction[];
}

export interface DashboardStats {
  total_spend_cad: number;
  transaction_count: number;
  violations: number;
  reviews: number;
  pending_approvals: number;
  fraud_clusters: number;
  ai_call_ratio: number;
  top_categories: { label: string; value: number }[];
  recent_flagged: Transaction[];
}

export interface AnalysisResult {
  total_processed: number;
  violations_found: number;
  reviews_found: number;
  compliant: number;
  clusters_found: number;
  ai_calls_made: number;
  ai_call_ratio: number;
  duration_ms: number;
}

export interface Policy {
  policy_id: number;
  rule_name: string;
  rule_type: string;
  rule_parameters: Record<string, unknown>;
  severity: Severity;
  is_active: boolean;
  source_text: string | null;
}

export interface UIConfig {
  chart_type: "bar" | "line" | "pie" | "area" | "table";
  x_axis: string | null;
  y_axis: string | null;
  title: string;
  color_key: string | null;
}

export interface NLQueryResponse {
  question: string;
  query_string: string;
  data: Record<string, unknown>[];
  ui_config: UIConfig;
  summary: string;
  audio_base64: string | null;
  used_fallback: boolean;
}

export interface FraudCluster {
  cluster_id: string;
  pattern_type: string;
  transaction_ids: string[];
  employee_names: string[];
  severity: Severity;
  total_amount_cad: number;
  description: string;
  ai_narrative: string | null;
  risk_score: number;
  recommended_action: string | null;
}

export interface ApprovalDossier {
  transaction: Transaction;
  employee: {
    employee_id: string;
    name: string;
    department: string;
    job_level: number;
    monthly_budget: number;
    email: string;
  };
  history: Transaction[];
  budget_utilization: number;
  month_spend_cad: number;
  policy_violations_30d: number;
  ai_recommendation: "APPROVE" | "DENY" | "REVIEW";
  ai_reasoning: string;
  risk_factors: string[];
  mitigating_factors: string[];
  risk_score: number;
  compliance_warning_count: number;
  compliance_warnings: string[];
}

export interface ApprovalList {
  approvals: ApprovalDossier[];
  total: number;
}

export interface ReportSummary {
  report_id: string;
  trip_id: string | null;
  employee_name: string;
  start_date: string;
  end_date: string;
  total_amount_cad: number;
  line_item_count: number;
  violation_count: number;
  status: string;
}

export interface ReportLineItem {
  transaction_id: string;
  merchant_name: string;
  amount_cad: number;
  transaction_date: string;
  mcc_description: string;
  policy_flag: PolicyFlag | null;
  severity: Severity | null;
  flag_reason: string | null;
}

export interface ReportDetail extends ReportSummary {
  ai_summary: string | null;
  approved_by: string | null;
  line_items: ReportLineItem[];
}
