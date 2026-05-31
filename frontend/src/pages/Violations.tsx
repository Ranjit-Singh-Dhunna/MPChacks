import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  complianceExportUrl,
  getComplianceCase,
  getComplianceCases,
  getComplianceViolations,
  updateComplianceCase,
} from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { cadPrecise, dateTime } from "../lib/format";
import type {
  ComplianceCase,
  ComplianceCaseDetail,
  ComplianceCaseStatus,
  Severity,
  Transaction,
} from "../types";

type View = "cases" | "violations" | "timeline";
type CaseAction = "MARK_REVIEWED" | "ESCALATE" | "REQUEST_INFO" | "DISMISS_FALSE_POSITIVE" | "ADD_NOTE";

const SEVERITY_ORDER: Record<Severity, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
const STATUS_LABELS: Record<ComplianceCaseStatus, string> = {
  OPEN: "Open",
  ESCALATED: "Escalated",
  INFO_REQUESTED: "Info requested",
  REVIEWED: "Reviewed",
  DISMISSED: "Dismissed",
  RESOLVED: "Resolved",
};

const ACTION_COPY: Record<CaseAction, string> = {
  MARK_REVIEWED: "Mark reviewed",
  ESCALATE: "Escalate",
  REQUEST_INFO: "Request info",
  DISMISS_FALSE_POSITIVE: "Dismiss",
  ADD_NOTE: "Add note",
};

const SEVERITY_STYLES: Record<Severity, string> = {
  CRITICAL: "bg-error-container text-error border-error/20",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  LOW: "bg-surface-container text-on-surface-variant border-outline-variant",
};

function riskTone(severity: Severity) {
  if (severity === "CRITICAL") return "border-l-error bg-error-container/20";
  if (severity === "HIGH") return "border-l-orange-400 bg-orange-50/70";
  if (severity === "MEDIUM") return "border-l-amber-300 bg-amber-50/70";
  return "border-l-outline-variant bg-white";
}

function StatusBadge({ status }: { status: ComplianceCaseStatus }) {
  const styles: Record<ComplianceCaseStatus, string> = {
    OPEN: "bg-secondary/10 text-secondary border-secondary/20",
    ESCALATED: "bg-error-container text-error border-error/20",
    INFO_REQUESTED: "bg-amber-50 text-amber-700 border-amber-200",
    REVIEWED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    DISMISSED: "bg-surface-container text-on-surface-variant border-outline-variant",
    RESOLVED: "bg-surface-container text-on-surface-variant border-outline-variant",
  };
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${styles[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${SEVERITY_STYLES[severity]}`}>
      {severity}
    </span>
  );
}


function getPolicyReasons(caseDetail: ComplianceCase | ComplianceCaseDetail): string[] {
  const evidence = caseDetail.evidence as { policy_reasons?: unknown };
  return Array.isArray(evidence.policy_reasons)
    ? evidence.policy_reasons.map((r) => String(r)).filter(Boolean)
    : [];
}

function getAnomalyDescription(caseDetail: ComplianceCase | ComplianceCaseDetail): string | null {
  const evidence = caseDetail.evidence as { anomaly?: { description?: unknown } };
  return evidence.anomaly?.description ? String(evidence.anomaly.description) : null;
}

function CaseRow({
  item,
  selected,
  onSelect,
}: {
  item: ComplianceCase;
  selected: boolean;
  onSelect: () => void;
}) {
  const reasons = getPolicyReasons(item);
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className={`w-full border-l-4 border-y border-r p-3 text-left transition-all ${
        selected ? "border-r-secondary shadow-md" : "border-r-outline-variant/60 hover:shadow-sm"
      } ${riskTone(item.severity)}`}
      whileHover={{ x: 2 }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <SeverityBadge severity={item.severity} />
        <StatusBadge status={item.status} />
      </div>
      <h2 className="mt-3 line-clamp-2 text-sm font-black leading-5 text-primary">{item.title}</h2>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
        <span>{item.case_type}</span>
        <span className="font-mono text-primary">{item.risk_score}/100</span>
      </div>
      <div className="mt-3 space-y-1.5 text-xs text-on-surface-variant">
        <span className="inline-flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px]">person</span>
          <span className="truncate">{item.related_employee_names.join(", ") || "No employee"}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px]">receipt_long</span>
          {item.related_transaction_ids.length} transaction(s)
        </span>
        <span className="block font-mono font-bold text-primary">{cadPrecise(item.exposure_cad)}</span>
        {reasons[0] && <span className="block truncate text-on-surface-variant">Reason: {reasons[0]}</span>}
      </div>
    </motion.button>
  );
}

function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="overflow-x-auto border border-outline-variant/60 bg-white">
      <table className="min-w-[860px] w-full text-sm">
        <thead className="bg-surface-container-low border-b border-outline-variant/50">
          <tr className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
            <th className="px-4 py-3 text-left">Severity</th>
            <th className="px-4 py-3 text-left">Merchant</th>
            <th className="px-4 py-3 text-left">Employee</th>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-right">Amount CAD</th>
            <th className="px-4 py-3 text-left">Plain reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/40">
          {transactions.map((t) => (
            <tr key={t.transaction_id} className="hover:bg-surface-container-low transition-colors">
              <td className="px-4 py-3">
                {t.severity ? <SeverityBadge severity={t.severity} /> : <span className="text-xs text-on-surface-variant">None</span>}
              </td>
              <td className="px-4 py-3 font-bold text-primary">{t.merchant_name}</td>
              <td className="px-4 py-3 text-on-surface-variant">{t.employee_name}</td>
              <td className="px-4 py-3 text-xs text-on-surface-variant">{dateTime(t.transaction_date)}</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-primary">{cadPrecise(t.amount_cad)}</td>
              <td className="px-4 py-3 min-w-[280px] text-xs leading-5 text-on-surface-variant">{t.flag_reason || "No reason recorded"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CaseDetailPanel({
  caseId,
  onUpdated,
}: {
  caseId: string | null;
  onUpdated: () => void;
}) {
  const [detail, setDetail] = useState<ComplianceCaseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [busyAction, setBusyAction] = useState<CaseAction | null>(null);

  useEffect(() => {
    if (!caseId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    getComplianceCase(caseId)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [caseId]);

  const runAction = async (action: CaseAction) => {
    if (!detail) return;
    setBusyAction(action);
    try {
      const updated = await updateComplianceCase(detail.case_id, {
        action,
        note: note.trim(),
        actor: "Finance Manager",
      });
      setDetail(updated);
      setNote("");
      onUpdated();
    } finally {
      setBusyAction(null);
    }
  };

  if (!caseId) {
    return (
      <aside className="border border-dashed border-outline-variant bg-white p-8 text-center text-sm text-on-surface-variant">
        Select a case to review evidence, transactions, and actions.
      </aside>
    );
  }
  if (loading || !detail) {
    return <aside className="border border-outline-variant/60 bg-white p-8 text-sm text-on-surface-variant">Loading case evidence...</aside>;
  }

  const reasons = getPolicyReasons(detail);
  const anomaly = getAnomalyDescription(detail);

  return (
    <aside className="border border-outline-variant/60 bg-white sticky top-6 h-[calc(100vh-48px)] overflow-y-auto custom-scrollbar-light">
      <div className="border-b border-outline-variant/50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="section-label">{detail.case_id}</div>
            <h2 className="mt-1 text-xl font-black text-primary">{detail.title}</h2>
          </div>
          <StatusBadge status={detail.status} />
        </div>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">{detail.summary}</p>
      </div>

      <div className="grid grid-cols-3 border-b border-outline-variant/50">
        <div className="p-4">
          <div className="section-label">Exposure</div>
          <div className="mt-1 font-mono text-lg font-black text-primary">{cadPrecise(detail.exposure_cad)}</div>
        </div>
        <div className="p-4 border-x border-outline-variant/50">
          <div className="section-label">Risk</div>
          <div className="mt-1 text-lg font-black text-primary">{detail.risk_score}/100</div>
        </div>
        <div className="p-4">
          <div className="section-label">Action</div>
          <div className="mt-1 text-sm font-bold text-primary">{detail.recommended_action}</div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <section>
          <h3 className="section-label">Why this was flagged</h3>
          <div className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant max-h-48 overflow-y-auto no-scrollbar">
            {anomaly && <p>{anomaly}</p>}
            {reasons.length > 0 && (
              <ul className="space-y-2">
                {reasons.slice(0, 5).map((reason) => (
                  <li key={reason} className="flex gap-2">
                    <span className="material-symbols-outlined mt-0.5 text-[16px] text-error">warning</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            )}
            {!anomaly && reasons.length === 0 && <p>No detailed evidence was recorded for this case.</p>}
          </div>
        </section>

        <section>
          <h3 className="section-label">Related transactions</h3>
          <div className="mt-3 max-h-[240px] overflow-auto custom-scrollbar-light">
            <TransactionTable transactions={detail.transactions} />
          </div>
        </section>

        <section>
          <h3 className="section-label">Record action</h3>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a short note for the audit trail"
            className="mt-3 h-20 w-full resize-none border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-secondary"
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["MARK_REVIEWED", "ESCALATE", "REQUEST_INFO", "DISMISS_FALSE_POSITIVE"] as CaseAction[]).map((action) => (
              <button
                key={action}
                onClick={() => runAction(action)}
                disabled={busyAction !== null}
                className={action === "ESCALATE" ? "btn-danger text-xs" : "btn-ghost text-xs"}
              >
                {busyAction === action ? "Saving..." : ACTION_COPY[action]}
              </button>
            ))}
          </div>
          <button
            onClick={() => runAction("ADD_NOTE")}
            disabled={!note.trim() || busyAction !== null}
            className="btn-primary mt-2 w-full text-xs disabled:opacity-40"
          >
            {busyAction === "ADD_NOTE" ? "Saving..." : "Add note only"}
          </button>
        </section>

        <section>
          <h3 className="section-label">Audit trail</h3>
          <div className="mt-3 space-y-2">
            {detail.events.map((event) => (
              <div key={event.event_id} className="border border-outline-variant/50 px-3 py-2 text-xs">
                <div className="flex justify-between gap-3 font-bold text-primary">
                  <span>{event.action.replace(/_/g, " ")}</span>
                  <span className="font-mono text-on-surface-variant">{dateTime(event.created_at)}</span>
                </div>
                <div className="mt-1 text-on-surface-variant">{event.actor}{event.note ? `: ${event.note}` : ""}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

export function Violations() {
  const [view, setView] = useState<View>("cases");
  const [status, setStatus] = useState("ACTIVE");
  const [search, setSearch] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const cases = useAsync(
    () => getComplianceCases({ status, search: search.trim() || undefined, limit: 150 }),
    [status, search]
  );
  const violations = useAsync(() => getComplianceViolations({ size: 1000 }), []);

  const sortedCases = useMemo(() => {
    return [...(cases.data ?? [])].sort((a, b) => {
      const sev = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
      if (sev !== 0) return sev;
      return b.risk_score - a.risk_score;
    });
  }, [cases.data]);

  const timelineData = useMemo(() => {
    if (!violations.data?.transactions) return [];
    const map = new Map<string, { date: string; count: number; amount: number }>();
    violations.data.transactions.forEach((txn) => {
      const dateKey = new Date(txn.transaction_date).toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
      });
      const entry = map.get(dateKey) ?? { date: dateKey, count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += txn.amount_cad;
      map.set(dateKey, entry);
    });
    return [...map.values()].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [violations.data]);

  useEffect(() => {
    if (!selectedCaseId && sortedCases[0]) setSelectedCaseId(sortedCases[0].case_id);
    if (selectedCaseId && sortedCases.length > 0 && !sortedCases.some((c) => c.case_id === selectedCaseId)) {
      setSelectedCaseId(sortedCases[0].case_id);
    }
  }, [selectedCaseId, sortedCases]);

  const reloadAll = () => {
    cases.reload();
    violations.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b border-outline-variant/65 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-[1500px] items-start justify-between gap-6">
          <div>
            <div className="section-label">Compliance Queue</div>
            <h1 className="mt-1 text-3xl font-serif font-medium tracking-tight text-primary">Actionable Risk Review</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Passive anomaly detection and direct policy exceptions in one finance-manager queue.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href={complianceExportUrl} className="btn-ghost text-xs">
              <span className="material-symbols-outlined text-[15px]">download</span>
              Export CSV
            </a>

          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1500px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex bg-surface-container-low p-1 rounded-full overflow-hidden">
            <button
              onClick={() => setView("cases")}
              className={`px-4 py-2 text-xs font-black ${view === "cases" ? "bg-secondary text-white" : "text-on-surface-variant"}`}
            >
              Cases ({cases.data?.length ?? 0})
            </button>
            <button
              onClick={() => setView("violations")}
              className={`px-4 py-2 text-xs font-black ${view === "violations" ? "bg-secondary text-white" : "text-on-surface-variant"}`}
            >
              Policy violations ({violations.data?.total ?? 0})
            </button>
            <button
              onClick={() => setView("timeline")}
              className={`px-4 py-2 text-xs font-black ${view === "timeline" ? "bg-secondary text-white" : "text-on-surface-variant"}`}
            >
              Timeline
            </button>
          </div>

          {view === "cases" && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex items-center">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="appearance-none border border-outline-variant bg-white pl-4 pr-10 py-2 text-xs font-bold text-primary outline-none"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="OPEN">Open</option>
                  <option value="ESCALATED">Escalated</option>
                  <option value="INFO_REQUESTED">Info requested</option>
                  <option value="REVIEWED">Reviewed</option>
                  <option value="DISMISSED">Dismissed</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 pointer-events-none text-[18px] text-primary">expand_more</span>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-2.5 text-[16px] text-on-surface-variant">search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search cases"
                  className="w-64 border border-outline-variant bg-white py-2 pl-9 pr-3 text-xs font-semibold outline-none focus:border-secondary"
                />
              </div>
            </div>
          )}
        </div>

        {view === "cases" && (
          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(240px,20%)_minmax(0,80%)]">
            <section className="space-y-2">
              {cases.loading && <div className="border border-outline-variant/60 bg-white p-6 text-sm text-on-surface-variant">Loading compliance cases...</div>}
              {cases.error && <div className="border border-error/20 bg-error-container p-6 text-sm text-error">{cases.error}</div>}
              {!cases.loading && sortedCases.length === 0 && (
                <div className="border border-outline-variant/60 bg-white p-10 text-center">
                  <h2 className="text-base font-black text-primary">No compliance cases found</h2>
                  <p className="mt-2 text-sm text-on-surface-variant">Run Ingest + Analyze from the Dashboard to generate the action queue.</p>
                </div>
              )}
              {sortedCases.map((item) => (
                <CaseRow
                  key={item.case_id}
                  item={item}
                  selected={item.case_id === selectedCaseId}
                  onSelect={() => setSelectedCaseId(item.case_id)}
                />
              ))}
            </section>
            <CaseDetailPanel caseId={selectedCaseId} onUpdated={reloadAll} />
          </div>
        )}

        {view === "violations" && (
          <section className="mt-5">
            {violations.loading && <div className="border border-outline-variant/60 bg-white p-6 text-sm text-on-surface-variant">Loading violations...</div>}
            {violations.data && <TransactionTable transactions={violations.data.transactions} />}
          </section>
        )}

        {view === "timeline" && (
          <section className="mt-5 space-y-5">
            {violations.loading && (
              <div className="border border-outline-variant/60 bg-white p-6 text-sm text-on-surface-variant">
                Loading timeline data…
              </div>
            )}
            {timelineData.length > 0 && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="section-label">Violation Timeline</div>
                    <div className="text-base font-bold text-primary mt-0.5">
                      Daily violation count &amp; exposure
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-0.5 bg-error inline-block rounded" />Count
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-0.5 bg-secondary inline-block rounded" />Amount
                    </span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="amtGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0051d5" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#0051d5" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="#f1f3f4" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#45464d" }} stroke="none" />
                    <YAxis tick={{ fontSize: 11, fill: "#45464d" }} stroke="none" />
                    <Tooltip
                      contentStyle={{ background: "#fff", border: "1px solid #c6c6cd", borderRadius: 12, fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#0051d5" strokeWidth={2} fill="url(#amtGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {timelineData.length > 0 && (
              <div className="card p-6">
                <div className="section-label mb-4">Daily Violation Count</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={timelineData}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#f1f3f4" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#45464d" }} stroke="none" />
                    <YAxis tick={{ fontSize: 11, fill: "#45464d" }} stroke="none" />
                    <Tooltip
                      contentStyle={{ background: "#fff", border: "1px solid #c6c6cd", borderRadius: 12, fontSize: 12 }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {timelineData.map((_, i) => (
                        <Cell key={i} fill={timelineData[i].count > 3 ? "#ba1a1a" : "#0051d5"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
