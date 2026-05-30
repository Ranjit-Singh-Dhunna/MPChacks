import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { analyze, getDashboard, ingest } from "../api/client";
import { SeverityBadge } from "../components/ui/Badge";
import { KPICard } from "../components/ui/KPICard";
import { PageHeader } from "../components/ui/PageHeader";
import { useAsync } from "../hooks/useAsync";
import { cad, cadPrecise, dateTime, pct } from "../lib/format";

const PALETTE = ["#2dd4bf", "#7c83ff", "#f59e0b", "#f43f5e", "#38bdf8", "#a78bfa"];

export function Dashboard() {
  const { data, loading, reload } = useAsync(getDashboard, []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const runPipeline = async () => {
    setBusy(true);
    setMsg("Ingesting transactions…");
    try {
      const i = await ingest();
      setMsg(`Loaded ${i.rows_loaded} rows. Running deterministic analysis…`);
      const a = await analyze();
      setMsg(
        `Analyzed ${a.total_processed} txns in ${a.duration_ms}ms · ` +
          `${a.violations_found} violations · ${a.clusters_found} fraud clusters · ` +
          `only ${pct(a.ai_call_ratio)} reached AI`
      );
      reload();
    } catch (e) {
      setMsg("Pipeline failed — is the backend running?");
    } finally {
      setBusy(false);
    }
  };

  const empty = !loading && data && data.transaction_count === 0;

  return (
    <div>
      <PageHeader
        title="Spend Command Center"
        subtitle="Deterministic-first intelligence across every card transaction."
        action={
          <button className="btn-primary" onClick={runPipeline} disabled={busy}>
            {busy ? "Running…" : "Ingest + Analyze"}
          </button>
        }
      />

      {msg && (
        <div className="card mb-5 border-brim-500/30 bg-brim-500/5 px-4 py-3 text-sm text-brim-300">
          {msg}
        </div>
      )}

      {empty && (
        <div className="card p-10 text-center">
          <div className="text-lg font-semibold text-slate-200">No data loaded yet</div>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Click <span className="font-semibold text-brim-400">Ingest + Analyze</span> to
            load 4,235 sample transactions and run the deterministic policy + fraud pipeline.
          </p>
        </div>
      )}

      {data && data.transaction_count > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KPICard
              label="Total Spend"
              value={cad(data.total_spend_cad)}
              sub={`${data.transaction_count.toLocaleString()} transactions`}
              tone="brim"
            />
            <KPICard
              label="Policy Violations"
              value={data.violations.toLocaleString()}
              sub={`${data.reviews} flagged for review`}
              tone="rose"
            />
            <KPICard
              label="Approval Queue"
              value={data.pending_approvals.toLocaleString()}
              sub="awaiting decision"
              tone="amber"
            />
            <KPICard
              label="AI Call Ratio"
              value={pct(data.ai_call_ratio)}
              sub={`${data.fraud_clusters} fraud clusters · rest deterministic`}
              tone="default"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-5">
            <div className="card p-5 lg:col-span-2">
              <div className="mb-4 text-sm font-semibold text-slate-300">
                Spend by Category (CAD)
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.top_categories} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={110}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    stroke="#5b6780"
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#141b2b",
                      border: "1px solid #243049",
                      borderRadius: 12,
                    }}
                    formatter={(v: number) => cad(v)}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {data.top_categories.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5 lg:col-span-3">
              <div className="mb-4 text-sm font-semibold text-slate-300">
                Highest-Risk Flagged Transactions
              </div>
              <div className="space-y-2">
                {data.recent_flagged.map((t) => (
                  <div
                    key={t.transaction_id}
                    className="flex items-center justify-between rounded-xl border border-ink-700/60 bg-ink-900/40 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-200">
                          {t.merchant_name}
                        </span>
                        <SeverityBadge severity={t.severity} />
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {t.employee_name} · {t.department} · {dateTime(t.transaction_date)}
                      </div>
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      <div className="text-sm font-bold tabular-nums text-slate-100">
                        {cadPrecise(t.amount_cad)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        risk {t.ai_risk_score ?? "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
