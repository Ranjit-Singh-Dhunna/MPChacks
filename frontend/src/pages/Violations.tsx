import { useState } from "react";
import { getClusters, getTransactions } from "../api/client";
import { PolicyBadge, SeverityBadge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { useAsync } from "../hooks/useAsync";
import { cadPrecise, dateTime } from "../lib/format";

const PATTERN_LABEL: Record<string, string> = {
  SMURFING: "Smurfing / Structuring",
  SPLIT_BILLING: "Split Billing (Collusion)",
  STRUCTURING: "Round-Number Structuring",
  OUTLIER: "Statistical Outlier",
  SHELL_VENDOR: "Shell Vendor",
};

export function Violations() {
  const [tab, setTab] = useState<"clusters" | "all">("clusters");
  const clusters = useAsync(getClusters, []);
  const txns = useAsync(
    () => getTransactions({ policy_flag: "VIOLATION", size: 50 }),
    []
  );

  return (
    <div>
      <PageHeader
        title="Violations & Fraud"
        subtitle="Multi-transaction fraud clusters that single-rule checks miss."
        action={
          <div className="flex gap-1 rounded-xl border border-ink-700 bg-ink-900/40 p-1">
            {(["clusters", "all"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                  tab === t ? "bg-brim-500/15 text-brim-400" : "text-slate-400"
                }`}
              >
                {t === "clusters" ? "Fraud Clusters" : "All Violations"}
              </button>
            ))}
          </div>
        }
      />

      {tab === "clusters" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {clusters.loading && <div className="text-slate-500">Loading…</div>}
          {clusters.data?.map((c) => (
            <div key={c.cluster_id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={c.severity} />
                    <span className="text-sm font-bold text-slate-100">
                      {PATTERN_LABEL[c.pattern_type] || c.pattern_type}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {c.employee_names.join(", ")} · {c.transaction_ids.length} transactions
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold tabular-nums text-slate-100">
                    {cadPrecise(c.total_amount_cad)}
                  </div>
                  <div className="text-[11px] text-slate-500">risk {c.risk_score}</div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                {c.ai_narrative || c.description}
              </p>
              {c.recommended_action && (
                <div className="mt-3 inline-flex rounded-lg bg-ink-800 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brim-400">
                  → {c.recommended_action}
                </div>
              )}
            </div>
          ))}
          {clusters.data?.length === 0 && (
            <div className="text-slate-500">No clusters — run Analyze on the dashboard.</div>
          )}
        </div>
      )}

      {tab === "all" && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-800 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Merchant</th>
                <th className="px-4 py-3 font-semibold">Employee</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Severity</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {txns.data?.transactions.map((t) => (
                <tr key={t.transaction_id} className="border-t border-ink-700/50">
                  <td className="px-4 py-3 font-medium text-slate-200">{t.merchant_name}</td>
                  <td className="px-4 py-3 text-slate-400">{t.employee_name}</td>
                  <td className="px-4 py-3 text-slate-500">{dateTime(t.transaction_date)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-100">
                    {cadPrecise(t.amount_cad)}
                  </td>
                  <td className="px-4 py-3"><SeverityBadge severity={t.severity} /></td>
                  <td className="max-w-md px-4 py-3 text-xs text-slate-400">
                    {t.flag_reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
