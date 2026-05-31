import { Link, useNavigate } from "react-router-dom";
import { getApprovals } from "../api/client";
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

/* ── Component ───────────────────────────────────────────────────────────── */

export function ApprovalHistory() {
  const { data, loading } = useAsync(() => getApprovals(50), []);
  const navigate = useNavigate();

  const viewedIds = (() => {
    try {
      const stored = sessionStorage.getItem("brim-viewed-approvals");
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  })();

  /* ── Loading ───────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background min-h-[95vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-surface-container border-t-secondary rounded-full animate-spin" />
          <p className="text-sm font-semibold text-on-surface-variant">
            Loading queue…
          </p>
        </div>
      </div>
    );
  }

  const approvals = data?.approvals || [];

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full bg-background text-on-background min-h-[95vh]">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-8 py-5 border-b border-outline-variant bg-white sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <Link
              to="/approvals"
              className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors font-semibold"
            >
              <span className="material-symbols-outlined text-[16px]">
                arrow_back
              </span>
              Back to Dossier
            </Link>
            <h1 className="text-xl font-bold text-primary mt-1 tracking-tight">
              Approval Queue
            </h1>
          </div>
          <span className="bg-surface-container text-on-surface-variant text-[10px] font-bold px-2.5 py-1 rounded border border-outline-variant/40">
            {approvals.length} Pending
          </span>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="p-8 max-w-[1200px] mx-auto w-full">
        {approvals.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-[40px] text-on-surface-variant">
              inbox
            </span>
            <p className="text-sm font-semibold text-on-surface-variant mt-2">
              No pending approvals
            </p>
          </div>
        ) : (
          <div className="border border-outline-variant/60 rounded-xl bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/50 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="px-5 py-3.5 w-8" />
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Merchant</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Amount (CAD)</th>
                  <th className="px-5 py-3.5 text-center">AI Verdict</th>
                  <th className="px-5 py-3.5 text-center">Risk</th>
                  <th className="px-5 py-3.5 text-center">Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-medium">
                {approvals.map((d) => {
                  const t = d.transaction;
                  const viewed = viewedIds.has(t.transaction_id);
                  const riskColor =
                    d.risk_score >= 70
                      ? "var(--error)"
                      : d.risk_score >= 40
                      ? "var(--warn)"
                      : "var(--success)";
                  return (
                    <tr
                      key={t.transaction_id}
                      onClick={() =>
                        navigate(`/approvals?txn=${t.transaction_id}`)
                      }
                      className="hover:bg-surface-container-low cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        {viewed && (
                          <span
                            className="w-2 h-2 rounded-full bg-secondary inline-block"
                            title="Viewed"
                          />
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-primary font-bold">
                          {d.employee?.name || t.employee_name}
                        </div>
                        <div className="text-[10px] text-on-surface-variant">
                          {t.department}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-primary">
                        {t.merchant_name}
                      </td>
                      <td className="px-5 py-3.5 text-on-surface-variant">
                        {t.mcc_description || t.ai_category || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-on-surface-variant font-mono">
                        {fmtDate(t.transaction_date)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-primary">
                        {fmtCurrency(t.amount_cad)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.ai_recommendation === "APPROVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : d.ai_recommendation === "DENY"
                              ? "bg-rose-50 text-error border border-rose-100"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {d.ai_recommendation}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-12 h-1.5 bg-surface-container rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${d.risk_score}%`,
                                backgroundColor: riskColor,
                              }}
                            />
                          </div>
                          <span
                            className="text-[10px] font-mono font-bold"
                            style={{ color: riskColor }}
                          >
                            {d.risk_score}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {t.policy_flag === "VIOLATION" ? (
                          <span className="w-6 h-6 rounded-full bg-rose-50 text-error flex items-center justify-center border border-rose-100 mx-auto">
                            <span className="material-symbols-outlined text-[14px]">
                              warning
                            </span>
                          </span>
                        ) : t.policy_flag === "REVIEW" ? (
                          <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 mx-auto">
                            <span className="material-symbols-outlined text-[14px]">
                              help
                            </span>
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 mx-auto">
                            <span className="material-symbols-outlined text-[15px]">
                              done
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
