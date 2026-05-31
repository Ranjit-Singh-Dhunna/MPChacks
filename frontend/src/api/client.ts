import axios from "axios";
import type {
  AnalysisResult,
  ApprovalList,
  ComplianceCase,
  ComplianceCaseDetail,
  ComplianceOverview,
  DashboardStats,
  FraudCluster,
  NLQueryResponse,
  Policy,
  ReportDetail,
  ReportSummary,
  TransactionPage,
} from "../types";

const api = axios.create({ baseURL: "/api" });

export const ingest = () =>
  api.post("/ingest", { use_default: true }).then((r) => r.data);

export const analyze = () =>
  api.post<AnalysisResult>("/analyze").then((r) => r.data);

export const getDashboard = () =>
  api.get<DashboardStats>("/dashboard").then((r) => r.data);

export interface TxnFilters {
  page?: number;
  size?: number;
  department?: string;
  policy_flag?: string;
  severity?: string;
  employee_id?: string;
  search?: string;
}

export const getTransactions = (params: TxnFilters) =>
  api.get<TransactionPage>("/transactions", { params }).then((r) => r.data);

export const postQuery = (question: string, voice: boolean, session_id = "default") =>
  api
    .post<NLQueryResponse>("/query", { question, voice, session_id })
    .then((r) => r.data);

export const getRules = () =>
  api.get<Policy[]>("/policy/rules").then((r) => r.data);

export const createRule = (data: Omit<Policy, "policy_id">) =>
  api.post<Policy>("/policy/rules", data).then((r) => r.data);

export const updateRule = (id: number, data: Partial<Policy>) =>
  api.put<Policy>(`/policy/rules/${id}`, data).then((r) => r.data);

export const deleteRule = (id: number) =>
  api.delete(`/policy/rules/${id}`).then((r) => r.data);

export const uploadPolicy = (file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return api.post("/policy/upload", fd).then((r) => r.data);
};

export const getClusters = () =>
  api.get<FraudCluster[]>("/fraud/clusters").then((r) => r.data);

export const getComplianceOverview = () =>
  api.get<ComplianceOverview>("/compliance/overview").then((r) => r.data);

export const getComplianceCases = (params: {
  status?: string;
  severity?: string;
  case_type?: string;
  search?: string;
  limit?: number;
} = {}) =>
  api.get<ComplianceCase[]>("/compliance/cases", { params }).then((r) => r.data);

export const getComplianceCase = (caseId: string) =>
  api.get<ComplianceCaseDetail>(`/compliance/cases/${caseId}`).then((r) => r.data);

export const updateComplianceCase = (
  caseId: string,
  data: {
    action: "MARK_REVIEWED" | "ESCALATE" | "REQUEST_INFO" | "DISMISS_FALSE_POSITIVE" | "ADD_NOTE";
    note?: string;
    actor?: string;
  }
) =>
  api.patch<ComplianceCaseDetail>(`/compliance/cases/${caseId}`, data).then((r) => r.data);

export const getComplianceViolations = (params: { page?: number; size?: number; flag?: string } = {}) =>
  api.get<TransactionPage>("/compliance/violations", { params }).then((r) => r.data);

export const complianceExportUrl = "/api/compliance/export";

export const getApprovals = (limit = 15) =>
  api.get<ApprovalList>("/approvals", { params: { limit } }).then((r) => r.data);

export const decideApproval = (
  txnId: string,
  decision: "APPROVE" | "DENY" | "REQUEST_MORE_INFO",
  note = ""
) =>
  api
    .post(`/approvals/${txnId}/decide`, { decision, note })
    .then((r) => r.data);

export const getReports = () =>
  api.get<ReportSummary[]>("/reports").then((r) => r.data);

export const generateReports = () =>
  api.post<ReportSummary[]>("/reports/generate", {}).then((r) => r.data);

export const getReport = (id: string) =>
  api.get<ReportDetail>(`/reports/${id}`).then((r) => r.data);

export const approveReport = (id: string, approved_by = "CFO") =>
  api.post(`/reports/${id}/approve`, { approved_by }).then((r) => r.data);

export const getHealth = () => api.get("/health").then((r) => r.data);
