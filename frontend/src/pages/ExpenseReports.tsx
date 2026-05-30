import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateReports, getReports } from "../api/client";
import { Pill } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { useAsync } from "../hooks/useAsync";
import { cadPrecise, shortDate } from "../lib/format";

const STATUS_TONE: Record<string, "default" | "brim" | "emerald"> = {
  SUBMITTED: "default",
  APPROVED: "emerald",
  DRAFT: "default",
};

export function ExpenseReports() {
  const { data, loading, reload } = useAsync(getReports, []);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const gen = async () => {
    setBusy(true);
    try {
      await generateReports();
      reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Expense Reports"
        subtitle="Trips and monthly activity auto-grouped into CFO-ready reports."
        action={
          <button className="btn-primary" onClick={gen} disabled={busy}>
            {busy ? "Grouping…" : "Generate Reports"}
          </button>
        }
      />

      {loading && <div className="text-slate-500">Loading…</div>}
      {data?.length === 0 && (
        <div className="card p-8 text-center text-sm text-slate-400">
          No reports yet — click <span className="text-brim-400">Generate Reports</span>.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((r) => (
          <button
            key={r.report_id}
            onClick={() => nav(`/reports/${r.report_id}`)}
            className="card p-5 text-left transition-colors hover:border-brim-500/40"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-slate-500">{r.report_id}</span>
              <Pill tone={STATUS_TONE[r.status] || "default"}>{r.status}</Pill>
            </div>
            <div className="mt-2 text-sm font-bold text-slate-100">{r.employee_name}</div>
            <div className="text-xs text-slate-500">
              {r.trip_id ? `Trip ${r.trip_id}` : "Monthly"} ·{" "}
              {shortDate(r.start_date)} – {shortDate(r.end_date)}
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <div className="text-lg font-bold tabular-nums text-slate-100">
                  {cadPrecise(r.total_amount_cad)}
                </div>
                <div className="text-[11px] text-slate-500">
                  {r.line_item_count} line items
                </div>
              </div>
              {r.violation_count > 0 ? (
                <Pill tone="rose">{r.violation_count} exceptions</Pill>
              ) : (
                <Pill tone="emerald">clean</Pill>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
