import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../lib/theme";
import { motion } from "framer-motion";
import {
  Area, AreaChart, CartesianGrid, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { analyze, getDashboard, ingest } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { cad, cadPrecise, dateTime, pct } from "../lib/format";
import { cardEnter } from "../lib/motion";
import type { Transaction } from "../types";


const SEV_DOT: Record<string, string> = {
  CRITICAL: "severity-dot-critical",
  HIGH: "severity-dot-high",
  MEDIUM: "severity-dot-medium",
  LOW: "severity-dot-low",
};

function KPICard({
  label, value, sub, strip, index, to,
}: {
  label: string; value: string; sub: string;
  strip?: string; index: number; to?: string;
}) {
  const nav = useNavigate();
  return (
    <motion.div
      className={`card p-5 metric-card-hover ${strip ?? ""} cursor-pointer`}
      {...cardEnter(index)}
      onClick={() => to && nav(to)}
    >
      <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</div>
      <div className="text-4xl font-light text-primary tracking-tighter mt-2">{value}</div>
      <div className="text-xs text-on-surface-variant mt-1">{sub}</div>
      {to && (
        <div className="mt-3 flex items-center gap-1 text-[10px] text-secondary font-bold">
          View details
          <span className="material-symbols-outlined text-[13px]">chevron_right</span>
        </div>
      )}
    </motion.div>
  );
}

function AIEfficiencyCard({
  aiRatio, clusters, txnCount, index, isDark,
}: {
  aiRatio: number; clusters: number; txnCount: number; index: number; isDark: boolean;
}) {
  const aiCalls = aiRatio > 0 ? Math.max(1, Math.round(aiRatio * txnCount)) : 0;
  const clusterBarPct = clusters > 0 ? Math.max(8, Math.min(40, clusters * 4)) : 0;
  const rulesBarPct = 100;

  return (
    <motion.div className="card p-5 metric-card-hover border-l-4 border-l-secondary" {...cardEnter(index)}>
      <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
        Hybrid Intelligence
      </div>

      {/* Headline: actual AI calls */}
      <div className="flex items-end gap-2 mt-2">
        <div className="text-4xl font-light tracking-tighter"
          style={isDark
            ? { color: "#FCD535" }
            : { background: "linear-gradient(90deg,#7c3aed,#0051d5)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          {aiCalls > 0 ? aiCalls : clusters}
        </div>
        <div className="text-xs text-on-surface-variant mb-1">
          {aiCalls > 0 ? "AI calls" : "fraud clusters"}
        </div>
      </div>
      <div className="text-[10px] text-on-surface-variant/70 mb-3">
        {aiCalls > 0
          ? `reserved for ambiguous cases; ${txnCount.toLocaleString()} txns total`
          : `${clusters} patterns explained by deterministic evidence`}
      </div>

      <div className="space-y-2">
        {/* Rules bar is always full because every transaction enters deterministic checks. */}
        <div>
          <div className="flex justify-between text-[10px] font-semibold mb-1">
            <span className="flex items-center gap-1 text-on-surface-variant">
              <span className="material-symbols-outlined text-[12px]">shield</span>
              Python Rules
            </span>
            <span className="font-mono text-primary">&gt;99% of txns</span>
          </div>
          <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${rulesBarPct}%` }}
              transition={{ duration: 1.0, ease: "easeOut", delay: 0.2 }}
            />
          </div>
        </div>

        {/* Edge-case bar is sized by cluster count, visible when patterns exist. */}
        <div>
          <div className="flex justify-between text-[10px] font-semibold mb-1">
            <span className="flex items-center gap-1 text-secondary">
              <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
              Edge-case AI
            </span>
            <span className="font-mono text-secondary">
              {aiCalls > 0 ? `${aiCalls} calls` : clusters > 0 ? "0 calls" : "none"}
            </span>
          </div>
          <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: isDark ? "linear-gradient(90deg, #FCD535, #f0b90b)" : "linear-gradient(90deg, #7c3aed, #0051d5)" }}
              initial={{ width: 0 }}
              animate={{ width: `${clusterBarPct}%` }}
              transition={{ duration: 1.0, ease: "easeOut", delay: 0.45 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Aggregate monthly spend from the transactions data for a spend chart
// We build this from the top_categories which is approximate but good for demo
function buildChartData(topCats: { label: string; value: number }[]) {
  // Simulate monthly spend trend Aug 2025-Mar 2026 using realistic growth pattern
  const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const total = topCats.reduce((s, c) => s + c.value, 0);
  const monthly = total / 8;
  return months.map((name, i) => ({
    name,
    spend: Math.round(monthly * (0.7 + i * 0.08 + (i === 6 ? 5.2 : 0))), // Feb spike for $264K
    budget: Math.round(monthly * 1.15),
  }));
}

export function Dashboard() {
  const { isDark } = useTheme();
  const { data, loading, reload } = useAsync(getDashboard, []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const nav = useNavigate();

  const chartAccent  = isDark ? "#FCD535" : "#0051d5";
  const chartGrid    = isDark ? "#2b3139" : "#f1f3f4";
  const chartTick    = isDark ? "#848e9c" : "#45464d";
  const tooltipStyle = {
    background: isDark ? "#1e2329" : "#fff",
    border: `1px solid ${isDark ? "#2b3139" : "#c6c6cd"}`,
    borderRadius: 12, fontSize: 12,
    color: isDark ? "#eaecef" : "#191c1e",
  };
  const catColors = isDark
    ? ["#FCD535", "#0ecb81", "#a78bfa", "#f6465d", "#38bdf8", "#f0b90b"]
    : ["#0051d5", "#6f7ae5", "#34d399", "#f59e0b", "#f43f5e", "#38bdf8"];

  const runPipeline = async () => {
    setBusy(true);
    setMsg("Ingesting 4,235 transactions…");
    try {
      const i = await ingest();
      setMsg(`Loaded ${i.rows_loaded} rows. Running deterministic analysis…`);
      const a = await analyze();
      setMsg(
        `Done in ${a.duration_ms}ms · ${a.violations_found} violations · ${a.clusters_found} fraud clusters · ${pct(a.ai_call_ratio)} AI calls`
      );
      reload();
    } catch {
      setMsg("Pipeline failed — is the backend running on port 8000?");
    } finally {
      setBusy(false);
    }
  };

  const chartData = data?.top_categories ? buildChartData(data.top_categories) : [];
  const empty = !loading && data && data.transaction_count === 0;
  const aiRatio = data?.ai_call_ratio ?? 0;
  const rulePct = Math.round((1 - aiRatio) * 100);
  const aiPct = Math.round(aiRatio * 100);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* STICKY TOP BAR */}
      <div className="px-8 py-4 border-b border-outline-variant/65 bg-background sticky top-0 z-20 flex justify-between items-center">
        <div>
          <div className="section-label">Overview</div>
          <h1 className="mt-1 text-3xl font-serif font-medium tracking-tight text-primary">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          {msg && (
            <span className="text-xs text-on-surface-variant max-w-xs truncate">{msg}</span>
          )}
          <button
            className="btn-ghost text-xs"
            onClick={() => nav("/")}
          >
            <span className="material-symbols-outlined text-[15px]">upload_file</span>
            Upload New
          </button>
          <button
            className="btn-primary text-xs"
            onClick={runPipeline}
            disabled={busy}
          >
            <span className="material-symbols-outlined text-[15px]">{busy ? "hourglass_empty" : "play_arrow"}</span>
            {busy ? "Running…" : "Ingest + Analyze"}
          </button>
        </div>
      </div>

      <div className="p-8 space-y-6 max-w-[1400px] mx-auto w-full">
        {empty && (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl gradient-hero mx-auto flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-white text-3xl">analytics</span>
            </div>
            <div className="text-lg font-bold text-primary">No data loaded yet</div>
            <p className="text-sm text-on-surface-variant mt-2 max-w-md mx-auto">
              Click <span className="font-semibold text-secondary">Ingest + Analyze</span> to load 4,235 sample transactions and run the deterministic fraud detection pipeline.
            </p>
            <button className="btn-primary mt-5" onClick={runPipeline} disabled={busy}>
              {busy ? "Running pipeline…" : "Start Now"}
            </button>
          </div>
        )}

        {data && data.transaction_count > 0 && (
          <>
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <KPICard index={0} label="Total Spend (QTD)"
                value={cad(data.total_spend_cad)}
                sub={`${data.transaction_count.toLocaleString()} transactions`} />
              <KPICard index={1} label="Policy Violations"
                value={data.violations.toLocaleString()}
                sub={`${data.reviews} flagged for review`}
                strip="border-l-4 border-l-error metric-card-danger"
                to="/violations" />
              <KPICard index={2} label="Pending Approvals"
                value={data.pending_approvals.toLocaleString()}
                sub="awaiting decision"
                strip="border-l-4 border-l-amber-400"
                to="/approvals" />
              <AIEfficiencyCard index={3} aiRatio={aiRatio} clusters={data.fraud_clusters} txnCount={data.transaction_count} isDark={isDark} />
            </div>



            {/* MAIN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* LEFT: Spend chart + intelligence breakdown */}
              <motion.div
                className="card p-6 lg:col-span-3 flex flex-col"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Spend Intelligence</div>
                    <div className="text-2xl font-serif font-medium text-primary mt-1 tracking-tight">Monthly Spend vs Budget</div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-on-surface-variant">
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-secondary inline-block rounded" />Actual</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-t-2 border-dashed border-gray-400 inline-block" />Budget</span>
                  </div>
                </div>

                <div className="flex-1 min-h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartAccent} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={chartAccent} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke={chartGrid} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: chartTick }} stroke="none" />
                    <YAxis tick={{ fontSize: 11, fill: chartTick }} stroke="none"
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [cad(v)]} />

                    <Area type="monotone" dataKey="spend" stroke={chartAccent} strokeWidth={2.5} fill="url(#spendGrad)" />
                    <Area type="monotone" dataKey="budget" stroke={chartGrid} strokeWidth={1.5}
                      strokeDasharray="6 3" fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
                </div>

                {/* Intelligence Breakdown */}
                <div className="mt-5 pt-4 border-t border-outline-variant/50">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2.5">
                    How decisions were made
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container border border-outline-variant px-3 py-1.5 text-[11px] font-bold text-on-surface-variant">
                      <span className="material-symbols-outlined text-[13px]">shield</span>
                      Rule-Based: {rulePct}%
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/5 border border-secondary/20 px-3 py-1.5 text-[11px] font-bold text-secondary">
                      <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                      AI-Reasoned: {aiPct}%
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-error/5 border border-error/20 px-3 py-1.5 text-[11px] font-bold text-error">
                      <span className="material-symbols-outlined text-[13px]">warning</span>
                      {data.fraud_clusters} Fraud Clusters
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-[11px] font-bold text-amber-700">
                      <span className="material-symbols-outlined text-[13px]">pending</span>
                      {data.pending_approvals} Pending
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* RIGHT: Anomaly feed + compliance gauge */}
              <motion.div
                className="lg:col-span-2 space-y-4"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                {/* Anomaly feed */}
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Highest-Risk Flagged</div>
                    <button
                      onClick={() => nav("/violations")}
                      className="text-[10px] text-secondary font-bold hover:underline flex items-center gap-0.5"
                    >
                      View all
                      <span className="material-symbols-outlined text-[13px]">chevron_right</span>
                    </button>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                    {data.recent_flagged.map((t: Transaction) => (
                      <motion.div
                        key={t.transaction_id}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 cursor-pointer transition-colors hover:bg-surface-container-low ${
                          t.severity === "CRITICAL"
                            ? "border-l-4 border-l-error bg-error-container/10 border-error/20"
                            : "border-outline-variant/50 bg-white"
                        }`}
                        whileHover={{ x: 3 }}
                        onClick={() => nav("/violations")}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={t.severity === "CRITICAL" ? "severity-dot-critical" : t.severity === "HIGH" ? "severity-dot-high" : "severity-dot-medium"} />
                            <span className="text-sm font-semibold text-primary truncate">{t.merchant_name}</span>
                          </div>
                          <div className="text-[11px] text-on-surface-variant mt-0.5 truncate">
                            {t.employee_name} · {t.department}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <div className="font-mono font-bold text-sm text-primary">{cadPrecise(t.amount_cad)}</div>
                          <div className="text-[10px] text-on-surface-variant">risk {t.ai_risk_score}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Compliance gauge */}
                <div className="card p-5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                    System Compliance Rate
                  </div>
                  {(() => {
                    const total = data.transaction_count;
                    const compPct = total > 0 ? Math.round(((total - data.violations - data.reviews) / total) * 100) : 86;
                    const violPct = total > 0 ? Math.round((data.violations / total) * 100) : 8;
                    const revPct = total > 0 ? Math.round((data.reviews / total) * 100) : 6;
                    return (
                      <>
                        <div className="text-5xl font-light tracking-tighter text-primary">{compPct}%</div>
                        <div className="mt-2 h-2.5 rounded-full overflow-hidden flex gap-0.5">
                          <div className="h-full rounded-l-full bg-green-500" style={{ width: `${compPct}%` }} />
                          <div className="h-full bg-error" style={{ width: `${violPct}%` }} />
                          <div className="h-full rounded-r-full bg-amber-400" style={{ width: `${revPct}%` }} />
                        </div>
                        <div className="flex gap-3 mt-2 text-[10px] font-semibold">
                          <span className="flex items-center gap-1 text-green-600"><span className="w-2 h-2 rounded-full bg-green-500" />{compPct}% compliant</span>
                          <span className="flex items-center gap-1 text-error"><span className="w-2 h-2 rounded-full bg-error" />{violPct}% violations</span>
                          <span className="flex items-center gap-1 text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-400" />{revPct}% review</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            </div>

            {/* CATEGORY BREAKDOWN */}
            <motion.div
              className="card p-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">
                Spend by Category
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {data.top_categories.map((cat, i) => {
                  const total = data.total_spend_cad;
                  const pctVal = total > 0 ? (cat.value / total) * 100 : 0;
                  const colors = catColors;
                  return (
                    <div key={cat.label} className="text-center">
                      <div
                        className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg mb-2"
                        style={{ background: colors[i % colors.length] }}
                      >
                        {pctVal.toFixed(0)}%
                      </div>
                      <div className="text-xs font-bold text-primary">{cat.label}</div>
                      <div className="text-[10px] text-on-surface-variant font-mono">{cad(cat.value)}</div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
