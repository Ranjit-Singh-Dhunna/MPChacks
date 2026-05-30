import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { approveReport, getReport } from "../api/client";
import { PolicyBadge, SeverityBadge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { useAsync } from "../hooks/useAsync";
import { cadPrecise, shortDate } from "../lib/format";

export function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, reload } = useAsync(() => getReport(id!), [id]);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const approve = async () => {
    setBusy(true);
    try {
      await approveReport(id!);
      reload();
    } finally {
      setBusy(false);
    }
  };

  if (loading || !data) return <div className="text-slate-500">Loading…</div>;

  return (
    <div>
      <button
        onClick={() => nav("/reports")}
        className="mb-4 text-sm text-slate-400 hover:text-brim-400"
      >
        ← Back to reports
      </button>

      <PageHeader
        title={`${data.employee_name} · ${data.report_id}`}
        subtitle={`${shortDate(data.start_date)} – ${shortDate(data.end_date)} · ${
          data.line_item_count
        } line items`}
        action={
          data.status === "APPROVED" ? (
            <span className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300">
              ✓ Approved by {data.approved_by}
            </span>
          ) : (
            <button className="btn-primary" onClick={approve} disabled={busy}>
              {busy ? "Approving…" : "Approve as CFO"}
            </button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-1">
          <div className="text-xs uppercase tracking-wider text-slate-400">Total</div>
          <div className="mt-1 text-3xl font-bold tabular-nums text-slate-100">
            {cadPrecise(data.total_amount_cad)}
          </div>
          <div className="mt-4 text-xs uppercase tracking-wider text-slate-400">
            Compliance
          </div>
          <div className="mt-1 text-sm text-slate-300">
            {data.violation_count > 0
              ? `${data.violation_count} policy exception(s)`
              : "No exceptions"}
          </div>
          {data.ai_summary && (
            <>
              <div className="mt-4 text-xs uppercase tracking-wider text-slate-400">
                AI Exception Summary
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">
                {data.ai_summary}
              </p>
            </>
          )}
        </div>

        <div className="card overflow-hidden lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="bg-ink-800 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Merchant</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.line_items.map((li) => (
                <tr key={li.transaction_id} className="border-t border-ink-700/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200">{li.merchant_name}</div>
                    <div className="text-[11px] text-slate-500">{li.mcc_description}</div>
                    {li.flag_reason && (
                      <div className="text-[11px] text-rose-300/80">{li.flag_reason}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{shortDate(li.transaction_date)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-100">
                    {cadPrecise(li.amount_cad)}
                  </td>
                  <td className="px-4 py-3">
                    {li.policy_flag === "VIOLATION" || li.policy_flag === "REVIEW" ? (
                      <SeverityBadge severity={li.severity} />
                    ) : (
                      <PolicyBadge flag={li.policy_flag} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
