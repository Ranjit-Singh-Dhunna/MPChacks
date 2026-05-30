import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboard } from "../api/client";
import { useAsync } from "../hooks/useAsync";

const CHART_DATA = [
  { name: "Jan", spend: 60000, isSpike: false },
  { name: "Feb", spend: 75000, isSpike: false },
  { name: "Mar", spend: 95000, isSpike: true },
  { name: "Apr", spend: 70000, isSpike: false },
];

export function Dashboard() {
  const { data, loading } = useAsync(getDashboard, []);

  // Compute compliance score dynamically based on real data
  const totalTxns = data?.transaction_count || 0;
  const flaggedTxns = (data?.violations || 0) + (data?.reviews || 0);
  const complianceScore = totalTxns > 0 ? Math.round(((totalTxns - flaggedTxns) / totalTxns) * 100) : 100;

  return (
    <div className="flex flex-col h-full text-on-background bg-background min-h-[95vh]">
      {/* Top Header Actions */}
      <div className="px-8 py-5 border-b border-outline-variant bg-white sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-primary tracking-tight">Executive Dashboard</h1>
          <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Expense Intelligence</p>
        </div>
        
        <Link 
          to="/query" 
          className="px-4 py-2 bg-secondary hover:opacity-90 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">mic</span>
          Talk to Data
        </Link>
      </div>

      <div className="p-8 space-y-6 max-w-[1400px] mx-auto w-full">
        {loading && <div className="text-xs text-on-surface-variant">Loading dashboard metrics...</div>}

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6 bg-white shadow-sm flex flex-col justify-between border border-outline-variant/60 rounded-xl">
            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Total CAD Spend</span>
            <h2 className="text-2xl font-black text-primary mt-2">
              ${data?.total_spend_cad?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
            </h2>
          </div>
          <div className="card p-6 bg-white shadow-sm flex flex-col justify-between border border-outline-variant/60 rounded-xl">
            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Pending Approvals</span>
            <h2 className="text-2xl font-black text-secondary mt-2">
              {data?.pending_approvals || 0}
            </h2>
          </div>
          <div className="card p-6 bg-white shadow-sm flex flex-col justify-between border border-outline-variant/60 rounded-xl">
            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Fraud Clusters</span>
            <h2 className="text-2xl font-black text-error mt-2">
              {data?.fraud_clusters || 0}
            </h2>
          </div>
          <div className="card p-6 bg-white shadow-sm flex flex-col justify-between border border-outline-variant/60 rounded-xl">
            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">AI Call Ratio</span>
            <h2 className="text-2xl font-black text-primary mt-2">
              {data ? `${Math.round(data.ai_call_ratio * 100)}%` : "0%"}
            </h2>
          </div>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (Spans 2) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Current Insight */}
            <div className="card p-6 bg-white flex flex-col justify-between relative overflow-hidden ai-glow border border-outline-variant/60 rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-secondary font-bold text-sm">
                  <span className="material-symbols-outlined text-[20px]">psychology</span>
                  Current Insight
                </div>
                <button className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant text-xs font-semibold hover:bg-surface-container-high">
                  <span className="material-symbols-outlined text-[16px]">volume_up</span>
                  Play Audio
                </button>
              </div>
              
              <div className="text-sm leading-relaxed text-on-surface mb-6">
                Active ledger review indicates <span className="text-error font-extrabold">{data?.violations || 0} policy violations</span> and <span className="text-amber-600 font-extrabold">{data?.reviews || 0} pending review states</span> out of {totalTxns} total items. All flags have been isolated for compliance team analysis.
              </div>

              <div className="flex gap-2">
                <a href="/policy" className="flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant bg-surface-container-low border border-outline-variant/65 rounded-lg px-2.5 py-1.5 hover:bg-surface-container-high transition-colors">
                  <span className="material-symbols-outlined text-[13px]">link</span>
                  Policy Manager
                </a>
                <a href="/violations" className="flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant bg-surface-container-low border border-outline-variant/65 rounded-lg px-2.5 py-1.5 hover:bg-surface-container-high transition-colors">
                  <span className="material-symbols-outlined text-[13px]">link</span>
                  Compliance Queue
                </a>
              </div>
            </div>

            {/* Spend by Category Chart */}
            <div className="card p-6 bg-white border border-outline-variant/60 rounded-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-primary">Top Category Spend Distribution (CAD)</h3>
                <button className="text-on-surface-variant hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.top_categories || []} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                    <XAxis 
                      dataKey="label" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#45464d", fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#45464d", fontSize: 11 }}
                      tickFormatter={(v) => `$${v / 1000}k`}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={55} fill="#316bf3" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Recent Anomalies */}
            <div className="card p-6 bg-white space-y-4 border border-outline-variant/60 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                Recent Anomalies
              </div>

              <div className="space-y-3">
                {data?.recent_flagged?.slice(0, 3).map((txn) => (
                  <div key={txn.transaction_id} className="border border-outline-variant/60 rounded-xl p-4 bg-white shadow-sm flex flex-col justify-between gap-3">
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                        txn.severity === "CRITICAL"
                          ? "bg-rose-50 text-error border border-rose-100"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {txn.severity || "Risk"}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-medium">
                        {new Date(txn.transaction_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-xs font-semibold text-primary truncate max-w-[150px]">
                        {txn.merchant_name}
                      </div>
                      <div className="text-sm font-black font-mono text-primary">
                        ${txn.amount_cad.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <a href="/violations" className="text-[11px] font-bold text-secondary flex items-center gap-0.5 hover:underline w-fit">
                      View Audit 
                      <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                    </a>
                  </div>
                ))}
                {(!data?.recent_flagged || data.recent_flagged.length === 0) && (
                  <div className="text-xs text-on-surface-variant text-center py-4">No recent anomalies detected.</div>
                )}
              </div>
            </div>

            {/* Compliance Health */}
            <div className="card p-6 bg-white flex flex-col items-center border border-outline-variant/60 rounded-xl shadow-sm">
              <div className="w-full text-left text-sm font-bold text-primary mb-2">
                Compliance Health
              </div>

              {/* Score Gauge */}
              <div className="relative flex flex-col items-center justify-center py-4 w-full">
                <div className="relative w-44 h-28 bg-[#f8f9fa] border border-outline-variant/65 rounded-2xl flex flex-col items-center justify-center p-4 overflow-hidden">
                  <div className="text-4xl font-black text-primary tracking-tight">{complianceScore}%</div>
                  <div className="text-[9px] uppercase tracking-widest text-on-surface-variant font-black mt-1">Score</div>
                  
                  {/* Thick blue V line at the bottom overlay */}
                  <div className="absolute inset-x-0 bottom-0 flex justify-center">
                    <svg width="160" height="35" viewBox="0 0 160 35" className="translate-y-1">
                      <path
                        d="M15,2 L80,28 L145,2"
                        fill="none"
                        stroke="#316bf3"
                        strokeWidth="9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Statistics Details */}
              <div className="grid grid-cols-2 gap-3 w-full mt-4">
                <div className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-3 text-center">
                  <div className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Total Ledger</div>
                  <div className="text-base font-extrabold text-primary mt-1">
                    {totalTxns.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white border border-outline-variant/80 rounded-xl p-3 text-center">
                  <div className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Flagged</div>
                  <div className="text-base font-extrabold text-error mt-1">
                    {flaggedTxns.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
