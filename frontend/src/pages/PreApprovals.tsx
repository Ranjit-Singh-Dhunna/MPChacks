import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { decideApproval, getApprovals } from "../api/client";
import { useAsync } from "../hooks/useAsync";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

const fmtCurrency = (n: number) =>
  isNaN(n)
    ? "$0.00"
    : "$" +
      n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

type SortMode = "risk" | "recent";

/* ── Confidence Ring ─────────────────────────────────────────────────────── */

function ConfidenceRing({ score }: { score: number }) {
  const r = 50;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color =
    score >= 80 ? "var(--success)" : score >= 50 ? "var(--warn)" : "var(--error)";
  const label =
    score >= 80 ? "Low Risk" : score >= 50 ? "Medium" : "High Risk";

  return (
    <div className="relative w-[120px] h-[120px] shrink-0 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--border-faint)"
          strokeWidth="8"
          opacity="0.4"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-mono" style={{ color }}>
          {score}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant mt-0.5">
          {label}
        </span>
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────── */

export function PreApprovals() {
  const { data, loading, reload } = useAsync(() => getApprovals(50), []);
  const [searchParams, setSearchParams] = useSearchParams();

  const [sortMode, setSortMode] = useState<SortMode>("risk");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewedIds, setViewedIds] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem("brim-viewed-approvals");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [decisionState, setDecisionState] = useState<string | null>(null);
  const [deciding, setDeciding] = useState(false);

  /* Sort approvals */
  const sorted = useMemo(() => {
    if (!data?.approvals) return [];
    const list = [...data.approvals];
    if (sortMode === "risk") {
      list.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
    } else {
      list.sort(
        (a, b) =>
          new Date(b.transaction.transaction_date).getTime() -
          new Date(a.transaction.transaction_date).getTime()
      );
    }
    return list;
  }, [data, sortMode]);

  /* Current dossier */
  const dossier = sorted[currentIndex] ?? null;
  const confidence = dossier
    ? Math.max(0, Math.min(100, 100 - (dossier.risk_score || 0)))
    : 0;

  /* Clamp index on list changes */
  useEffect(() => {
    if (sorted.length > 0 && currentIndex >= sorted.length) {
      setCurrentIndex(sorted.length - 1);
    }
  }, [sorted.length, currentIndex]);

  /* URL param for jumping to specific transaction */
  useEffect(() => {
    const txnId = searchParams.get("txn");
    if (txnId && sorted.length > 0) {
      const idx = sorted.findIndex(
        (d) => d.transaction.transaction_id === txnId
      );
      if (idx >= 0) {
        setCurrentIndex(idx);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, sorted, setSearchParams]);

  /* Track viewed */
  useEffect(() => {
    if (dossier) {
      setViewedIds((prev) => {
        const next = new Set(prev).add(dossier.transaction.transaction_id);
        sessionStorage.setItem(
          "brim-viewed-approvals",
          JSON.stringify([...next])
        );
        return next;
      });
    }
  }, [dossier?.transaction.transaction_id]);

  /* Navigation */
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < sorted.length - 1;
  const goNext = useCallback(() => {
    if (canNext) setCurrentIndex((i) => i + 1);
  }, [canNext]);
  const goPrev = useCallback(() => {
    if (canPrev) setCurrentIndex((i) => i - 1);
  }, [canPrev]);

  /* Keyboard navigation */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goPrev, goNext]);

  /* Decision handler */
  const handleDecide = async (
    decision: "APPROVE" | "DENY" | "REQUEST_MORE_INFO"
  ) => {
    if (!dossier || deciding) return;
    setDeciding(true);
    try {
      await decideApproval(dossier.transaction.transaction_id, decision);
      const label =
        decision === "APPROVE"
          ? "APPROVED"
          : decision === "DENY"
          ? "REJECTED"
          : "INFO REQUESTED";
      setDecisionState(label);
      setTimeout(() => {
        setDecisionState(null);
        setDeciding(false);
        reload();
      }, 1500);
    } catch {
      setDeciding(false);
    }
  };

  /* Color helpers */
  const recoColors = (reco: string) => {
    switch (reco) {
      case "APPROVE":
        return {
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
          icon: "verified",
        };
      case "DENY":
        return {
          bg: "bg-rose-50",
          text: "text-error",
          border: "border-rose-200",
          icon: "block",
        };
      default:
        return {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          icon: "help",
        };
    }
  };

  const policyColors = (flag: string | null) => {
    switch (flag) {
      case "COMPLIANT":
        return {
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-100",
          icon: "check_circle",
          label: "Compliant",
        };
      case "VIOLATION":
        return {
          bg: "bg-rose-50",
          text: "text-error",
          border: "border-rose-100",
          icon: "error",
          label: "Violation",
        };
      default:
        return {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          icon: "help",
          label: "Under Review",
        };
    }
  };

  /* ── Loading ───────────────────────────────────────────────────────────── */
  if (loading && !data) {
    return (
      <div className="flex flex-col h-full bg-background min-h-[95vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-surface-container border-t-secondary rounded-full animate-spin" />
          <p className="text-sm font-semibold text-on-surface-variant">
            Loading approval dossiers…
          </p>
        </div>
      </div>
    );
  }

  /* ── Empty queue ───────────────────────────────────────────────────────── */
  if (!sorted.length) {
    return (
      <div className="flex flex-col h-full bg-background min-h-[95vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 max-w-sm text-center">
          <span className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-emerald-600 text-[32px]">
              task_alt
            </span>
          </span>
          <h2 className="text-xl font-bold text-primary">All Caught Up</h2>
          <p className="text-sm text-on-surface-variant">
            No pending approvals in the queue. New requests will appear here
            automatically.
          </p>
          <Link
            to="/approvals/history"
            className="mt-2 text-xs font-bold text-secondary hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">
              history
            </span>
            View Recent History
          </Link>
        </div>
      </div>
    );
  }

  /* ── Guard ─────────────────────────────────────────────────────────────── */
  if (!dossier) return null;

  const txn = dossier.transaction;
  const emp = dossier.employee;
  const reco = recoColors(dossier.ai_recommendation);
  const policy = policyColors(txn.policy_flag);
  const budgetPct = Math.min(
    Math.round((dossier.budget_utilization || 0) * 100),
    150
  );
  const budgetColor =
    budgetPct > 100
      ? "var(--error)"
      : budgetPct > 80
      ? "var(--warn)"
      : "var(--accent)";

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full bg-background text-on-background min-h-[95vh]">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-8 py-4 border-b border-outline-variant bg-white sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Approvals
              <span className="material-symbols-outlined text-[12px]">
                chevron_right
              </span>
              Decision Dossier
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-xl font-bold text-primary tracking-tight">
                Approval Dossier
              </h1>
              <span className="bg-surface-container text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded border border-outline-variant/40">
                {currentIndex + 1} of {sorted.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort toggle */}
            <div className="flex items-center bg-surface-container rounded-lg p-0.5 border border-outline-variant/50">
              <button
                onClick={() => {
                  setSortMode("risk");
                  setCurrentIndex(0);
                }}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                  sortMode === "risk"
                    ? "bg-primary text-white shadow-sm"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                Highest Risk
              </button>
              <button
                onClick={() => {
                  setSortMode("recent");
                  setCurrentIndex(0);
                }}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                  sortMode === "recent"
                    ? "bg-primary text-white shadow-sm"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                Most Recent
              </button>
            </div>

            {/* Navigation arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={goPrev}
                disabled={!canPrev}
                className="dossier-nav-btn"
                title="Previous (←)"
              >
                <span className="material-symbols-outlined text-[18px]">
                  chevron_left
                </span>
              </button>
              <button
                onClick={goNext}
                disabled={!canNext}
                className="dossier-nav-btn"
                title="Next (→)"
              >
                <span className="material-symbols-outlined text-[18px]">
                  chevron_right
                </span>
              </button>
            </div>

            {/* History page link */}
            <Link
              to="/approvals/history"
              className="px-3 py-2 border border-outline-variant hover:bg-surface-container-low text-on-surface-variant font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">
                history
              </span>
              Recent History
            </Link>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div
        key={txn.transaction_id}
        className="p-8 space-y-5 max-w-[1200px] mx-auto w-full overflow-y-auto flex-1 animate-fade-in"
      >
        {/* ── Employee + Transaction Strip ─────────────────────────────── */}
        <div className="border border-outline-variant/60 rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="p-5 flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{
                  background: "linear-gradient(135deg, var(--accent), #6f7ae5)",
                }}
              >
                {emp ? initials(emp.name) : "?"}
              </div>
              <div>
                <h2 className="text-base font-bold text-primary">
                  {emp?.name || txn.employee_name}
                </h2>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  {emp?.department || txn.department}
                  {emp?.job_level ? ` · Level ${emp.job_level}` : ""}
                  {emp?.email ? ` · ${emp.email}` : ""}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                Transaction Amount
              </div>
              <div className="text-3xl font-serif font-normal text-primary tracking-tight mt-0.5">
                {fmtCurrency(txn.amount_cad)}
              </div>
              <div className="text-[10px] text-on-surface-variant font-mono mt-0.5">
                {txn.currency !== "CAD"
                  ? `${fmtCurrency(txn.amount_usd)} ${txn.currency} · `
                  : ""}
                {fmtDate(txn.transaction_date)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Two-column grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* ── Left Column (3/5) ──────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">
            {/* AI Recommendation Card */}
            <div
              className={`border rounded-xl p-5 relative overflow-hidden ai-glow ${reco.border}`}
            >
              <div className="flex gap-5 items-start flex-wrap sm:flex-nowrap">
                <ConfidenceRing score={confidence} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${reco.bg} ${reco.text} ${reco.border} border`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {reco.icon}
                      </span>
                      AI Recommends: {dossier.ai_recommendation}
                    </span>
                    <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container px-2 py-0.5 rounded border border-outline-variant/40">
                      <span className="material-symbols-outlined text-[10px] align-middle mr-0.5">
                        auto_awesome
                      </span>
                      AI Generated
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-on-surface-variant mt-3 font-medium">
                    {dossier.ai_reasoning}
                  </p>

                  {txn.flag_reason && (
                    <div className="mt-3 px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/40">
                      <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
                        Flag Reason
                      </span>
                      <p className="text-xs text-primary font-medium mt-0.5">
                        {txn.flag_reason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Risk & Mitigating Factors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Risk Factors */}
              <div className="border border-outline-variant/60 rounded-xl bg-white p-4 shadow-sm">
                <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-error" />
                  Risk Factors
                </h3>
                {dossier.risk_factors.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic">
                    No risk factors identified
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {dossier.risk_factors.map((f, i) => (
                      <li
                        key={i}
                        className="text-xs font-medium text-primary flex items-start gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-error shrink-0 mt-1.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Mitigating Factors */}
              <div className="border border-outline-variant/60 rounded-xl bg-white p-4 shadow-sm">
                <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Mitigating Factors
                </h3>
                {dossier.mitigating_factors.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic">
                    No mitigating factors
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {dossier.mitigating_factors.map((f, i) => (
                      <li
                        key={i}
                        className="text-xs font-medium text-primary flex items-start gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Employee Recent History */}
            {dossier.history.length > 0 && (
              <div className="border border-outline-variant/60 rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-outline-variant/40 flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">
                      history
                    </span>
                    Employee Recent Activity
                  </h3>
                  <span className="text-[10px] text-on-surface-variant font-mono">
                    {dossier.history.length} transactions (30d)
                  </span>
                </div>
                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-surface-container-low text-[9px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/40">
                        <th className="px-4 py-2">Merchant</th>
                        <th className="px-4 py-2">Category</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {dossier.history.slice(0, 8).map((h) => (
                        <tr key={h.transaction_id} className="font-medium">
                          <td className="px-4 py-2 text-primary">
                            {h.merchant_name}
                          </td>
                          <td className="px-4 py-2 text-on-surface-variant">
                            {h.mcc_description || h.ai_category || "—"}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-primary">
                            {fmtCurrency(h.amount_cad)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {h.policy_flag === "VIOLATION" ? (
                              <span className="text-error text-[9px] font-bold">
                                VIOLATION
                              </span>
                            ) : h.policy_flag === "REVIEW" ? (
                              <span className="text-amber-600 text-[9px] font-bold">
                                REVIEW
                              </span>
                            ) : (
                              <span className="text-emerald-600 text-[9px] font-bold">
                                OK
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column (2/5) ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Transaction Details */}
            <div className="border border-outline-variant/60 rounded-xl bg-white p-4 shadow-sm">
              <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3">
                Transaction Details
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-[9px] text-on-surface-variant font-semibold uppercase">
                    Merchant
                  </div>
                  <div className="text-xs font-bold text-primary mt-0.5">
                    {txn.merchant_name}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-on-surface-variant font-semibold uppercase">
                    Category
                  </div>
                  <div className="inline-flex items-center gap-1 bg-surface-container text-primary px-2.5 py-1 rounded text-xs font-bold border border-outline-variant/60 mt-0.5">
                    {txn.mcc_description || txn.ai_category || "Uncategorized"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[9px] text-on-surface-variant font-semibold uppercase">
                      MCC Code
                    </div>
                    <div className="text-xs font-mono text-primary mt-0.5">
                      {txn.mcc_code}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-on-surface-variant font-semibold uppercase">
                      Status
                    </div>
                    <div className="text-xs font-bold text-primary mt-0.5">
                      {txn.approval_status}
                    </div>
                  </div>
                </div>
                {txn.trip_id && (
                  <div>
                    <div className="text-[9px] text-on-surface-variant font-semibold uppercase">
                      Trip ID
                    </div>
                    <div className="text-xs font-mono text-primary mt-0.5">
                      {txn.trip_id}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Policy Compliance */}
            <div
              className={`border rounded-xl p-4 shadow-sm ${policy.border} ${policy.bg}`}
            >
              <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">
                  policy
                </span>
                Policy Compliance
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`material-symbols-outlined text-[20px] ${policy.text}`}
                >
                  {policy.icon}
                </span>
                <span className={`text-sm font-bold ${policy.text}`}>
                  {policy.label}
                </span>
              </div>
              {txn.severity && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] text-on-surface-variant font-bold uppercase">
                    Severity
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      txn.severity === "CRITICAL"
                        ? "bg-rose-50 text-error border border-rose-200"
                        : txn.severity === "HIGH"
                        ? "bg-orange-50 text-orange-700 border border-orange-200"
                        : txn.severity === "MEDIUM"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-surface-container text-on-surface-variant border border-outline-variant/40"
                    }`}
                  >
                    {txn.severity}
                  </span>
                </div>
              )}
              {dossier.compliance_warnings.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase">
                    Compliance Warnings ({dossier.compliance_warning_count})
                  </span>
                  {dossier.compliance_warnings.map((w, i) => (
                    <div
                      key={i}
                      className="text-xs text-error font-medium flex items-start gap-1.5 bg-surface-container-low rounded px-2 py-1.5 border border-rose-100"
                    >
                      <span className="material-symbols-outlined text-[12px] shrink-0 mt-0.5">
                        warning
                      </span>
                      {w}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant font-medium">
                  No active compliance warnings
                </p>
              )}
            </div>

            {/* Budget Utilization */}
            <div className="border border-outline-variant/60 rounded-xl bg-white p-4 shadow-sm">
              <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">
                  account_balance_wallet
                </span>
                Budget Utilization
              </h3>
              <div className="flex justify-between items-baseline mb-2">
                <span
                  className="text-lg font-bold font-mono"
                  style={{ color: budgetColor }}
                >
                  {budgetPct}%
                </span>
                <span className="text-[10px] text-on-surface-variant font-mono">
                  {fmtCurrency(dossier.month_spend_cad)} /{" "}
                  {fmtCurrency(emp?.monthly_budget || 0)}
                </span>
              </div>
              <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden border border-outline-variant/40">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(budgetPct, 100)}%`,
                    backgroundColor: budgetColor,
                  }}
                />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-on-surface-variant font-bold uppercase">
                    Violations (30d)
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      dossier.policy_violations_30d > 0
                        ? "bg-rose-50 text-error border border-rose-100"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    }`}
                  >
                    {dossier.policy_violations_30d}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Decision Bar ───────────────────────────────────────────────── */}
      <div className="px-8 py-4 border-t border-outline-variant bg-white sticky bottom-0">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center">
          <div className="text-[10px] text-on-surface-variant font-mono">
            Dossier ID: #{txn.transaction_id} · Audit Log Active
          </div>

          {decisionState ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-surface-container rounded-lg border border-outline-variant animate-fade-in">
              <span className="material-symbols-outlined text-secondary text-[18px]">
                check_circle
              </span>
              <span className="text-xs font-bold text-primary">
                Decision recorded: {decisionState}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDecide("REQUEST_MORE_INFO")}
                disabled={deciding}
                className="px-4 py-2 border border-outline-variant bg-white hover:bg-surface-container-low text-primary font-bold rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                Request More Info
              </button>
              <button
                onClick={() => handleDecide("DENY")}
                disabled={deciding}
                className="px-4 py-2 bg-rose-50 text-error hover:bg-rose-100 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 border border-rose-200 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">
                  close
                </span>
                Deny
              </button>
              <button
                onClick={() => handleDecide("APPROVE")}
                disabled={deciding}
                className="px-5 py-2 bg-primary hover:opacity-90 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">
                  done
                </span>
                Approve
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
