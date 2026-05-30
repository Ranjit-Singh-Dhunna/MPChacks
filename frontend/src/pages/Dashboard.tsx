import { useState } from "react";
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
  const { data } = useAsync(getDashboard, []);
  const [query, setQuery] = useState("");

  return (
    <div className="flex flex-col h-full text-on-background bg-background min-h-screen">
      {/* Top Header Bar */}
      <div className="flex justify-end items-center px-8 py-4 border-b border-outline-variant bg-white sticky top-0 z-10 gap-6">
        <button className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center">
          <span className="material-symbols-outlined text-[22px]">notifications</span>
        </button>
        <button className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center">
          <span className="material-symbols-outlined text-[22px]">settings</span>
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-outline-variant">
          <div className="text-right">
            <p className="text-sm font-bold text-primary">Maya</p>
            <p className="font-mono text-[10px] text-on-surface-variant">Finance Manager</p>
          </div>
          <div className="w-9 h-9 rounded-full overflow-hidden border border-outline-variant bg-surface-container flex items-center justify-center font-bold text-secondary">
            <img 
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" 
              alt="Maya Profile" 
              className="w-full h-full object-cover" 
            />
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6 max-w-[1400px] mx-auto w-full">
        {/* Ask Bar (Search / Command) */}
        <section className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 to-accent/10 rounded-2xl blur-lg opacity-40 group-focus-within:opacity-80 transition-opacity duration-500"></div>
          <div className="relative flex items-center bg-white border border-outline-variant rounded-2xl px-5 py-4 shadow-sm ai-glow focus-within:border-secondary transition-all">
            <div className="flex items-center gap-2 pr-4 border-r border-outline-variant mr-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-secondary">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="font-black text-secondary tracking-tighter text-xl">RK</span>
            </div>
            
            <input
              className="w-full bg-transparent border-none outline-none text-sm placeholder:text-outline text-on-background focus:ring-0 focus:outline-none"
              placeholder='Ask about spend (e.g., "What did Ops spend on fuel last month?")'
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            
            <div className="flex items-center gap-3">
              <span className="rounded bg-surface-container px-2 py-1 font-mono text-[10px] text-on-surface-variant border border-outline-variant font-semibold">
                ⌘ K
              </span>
              <button className="bg-secondary text-white p-2.5 rounded-xl hover:opacity-95 transition-all flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>
          </div>
        </section>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (Spans 2) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Current Insight */}
            <div className="card p-6 bg-white flex flex-col justify-between relative overflow-hidden ai-glow">
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
                Ops fuel spend <span className="text-error font-extrabold">spiked 14%</span> in March, primarily driven by OSOW permit transport. All charges are <span className="text-secondary font-semibold">contextually compliant</span>.
              </div>

              <div className="flex gap-2">
                <a href="/policy" className="flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant bg-surface-container-low border border-outline-variant/65 rounded-lg px-2.5 py-1.5 hover:bg-surface-container-high transition-colors">
                  <span className="material-symbols-outlined text-[13px]">link</span>
                  Policy #FL-09
                </a>
                <a href="/reports" className="flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant bg-surface-container-low border border-outline-variant/65 rounded-lg px-2.5 py-1.5 hover:bg-surface-container-high transition-colors">
                  <span className="material-symbols-outlined text-[13px]">link</span>
                  March Fleet Ledger
                </a>
              </div>
            </div>

            {/* Ops Fuel Spend Chart */}
            <div className="card p-6 bg-white">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-primary">Ops Fuel Spend (YTD)</h3>
                <button className="text-on-surface-variant hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={CHART_DATA} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#45464d", fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#45464d", fontSize: 11 }}
                      tickFormatter={(v) => `$${v / 1000}k`}
                      domain={[0, 150000]}
                      ticks={[0, 50000, 100000, 150000]}
                    />
                    <Bar dataKey="spend" radius={[6, 6, 0, 0]} maxBarSize={55}>
                      {CHART_DATA.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isSpike ? "#ba1a1a" : "#316bf3"} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Recent Anomalies */}
            <div className="card p-6 bg-white space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                Recent Anomalies
              </div>

              <div className="space-y-3">
                {/* Anomaly 1 */}
                <div className="border border-outline-variant/60 rounded-xl p-4 bg-white shadow-sm flex flex-col justify-between gap-3">
                  <div className="flex justify-between items-start">
                    <span className="bg-error-container text-on-error-container text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                      Outlier
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-medium">2h ago</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-xs font-semibold text-primary">Capital Exp - Vendor X</div>
                    <div className="text-sm font-black font-mono text-primary line-through">$264,000</div>
                  </div>
                  <a href="/approvals" className="text-[11px] font-bold text-secondary flex items-center gap-0.5 hover:underline w-fit">
                    View Dossier 
                    <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                  </a>
                </div>

                {/* Anomaly 2 */}
                <div className="border border-outline-variant/60 rounded-xl p-4 bg-white shadow-sm flex flex-col justify-between gap-3">
                  <div className="flex justify-between items-start">
                    <span className="bg-secondary-fixed text-on-secondary-fixed text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-secondary-fixed-dim/20">
                      Pattern: Smurfing
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-medium">5h ago</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-xs font-semibold text-primary">Marketing Subscriptions</div>
                    <div className="text-xs font-bold font-mono text-primary">12x ~$9.99</div>
                  </div>
                  <a href="/approvals" className="text-[11px] font-bold text-secondary flex items-center gap-0.5 hover:underline w-fit">
                    View Dossier 
                    <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Compliance Health */}
            <div className="card p-6 bg-white flex flex-col items-center">
              <div className="w-full text-left text-sm font-bold text-primary mb-2">
                Compliance Health
              </div>

              {/* Score Gauge */}
              <div className="relative flex flex-col items-center justify-center py-4 w-full">
                <div className="relative w-44 h-28 bg-[#f8f9fa] border border-outline-variant/65 rounded-2xl flex flex-col items-center justify-center p-4 overflow-hidden">
                  <div className="text-4xl font-black text-primary tracking-tight">92%</div>
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
                  <div className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Reviewed</div>
                  <div className="text-base font-extrabold text-primary mt-1">1,204</div>
                </div>
                <div className="bg-white border border-outline-variant/80 rounded-xl p-3 text-center">
                  <div className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Flagged</div>
                  <div className="text-base font-extrabold text-error mt-1">18</div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
