import { useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const CHART_DATA = [
  { name: "Jul", spend: 400000, budget: 500000 },
  { name: "Aug", spend: 520000, budget: 500000 },
  { name: "Sep", spend: 780000, budget: 680000 },
  { name: "Oct", spend: 600000, budget: 680000 },
];

export function ExpenseReports() {
  const [filterActive, setFilterActive] = useState(false);

  return (
    <div className="flex flex-col h-full bg-background text-on-background min-h-screen">
      
      {/* Top Breadcrumb bar */}
      <div className="px-8 py-4 border-b border-outline-variant/65 bg-white sticky top-0 z-10 flex justify-between items-center">
        <div className="text-xs font-black text-on-surface-variant uppercase tracking-widest">
          Q3 FY24 Overview
        </div>
        <div className="flex items-center gap-3">
          <button className="px-3.5 py-2 border border-outline-variant hover:bg-surface-container-low text-primary font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors">
            <span className="material-symbols-outlined text-[16px]">calendar_month</span>
            Oct 1 - Dec 31
            <span className="material-symbols-outlined text-[14px]">expand_more</span>
          </button>
          <button className="px-4 py-2 bg-primary hover:opacity-90 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm">
            <span className="material-symbols-outlined text-[16px]">add</span>
            New Report
          </button>
        </div>
      </div>

      {/* Main title bar */}
      <div className="px-8 py-5 flex justify-between items-center bg-background">
        <h1 className="text-2xl font-black text-primary tracking-tight">Reports Dashboard</h1>
        <div className="flex items-center gap-1.5 text-xs text-secondary font-bold bg-secondary/5 border border-secondary/15 px-3.5 py-1.5 rounded-full">
          <span className="material-symbols-outlined text-[15px]">check_circle</span>
          Data synced 2 mins ago
        </div>
      </div>

      {/* Content Space */}
      <div className="p-8 space-y-6 max-w-[1400px] mx-auto w-full">
        
        {/* KPI Metrics Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="card p-5 bg-white relative overflow-hidden shadow-sm">
            <div className="flex justify-between items-center text-[10px] font-black text-on-surface-variant uppercase tracking-wider">
              Total Spend (QTD)
              <span className="material-symbols-outlined text-on-surface-variant text-[16px]">payments</span>
            </div>
            <p className="text-3xl font-black text-primary tracking-tight mt-2 font-mono">$4.2M</p>
            <p className="text-[10px] text-secondary font-bold mt-1.5 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[12px]">trending_up</span>
              +2.4% vs last quarter
            </p>
          </div>

          {/* Card 2 */}
          <div className="card p-5 bg-white relative overflow-hidden shadow-sm">
            <div className="flex justify-between items-center text-[10px] font-black text-on-surface-variant uppercase tracking-wider">
              System Compliance Rate
              <span className="material-symbols-outlined text-on-surface-variant text-[16px]">shield</span>
            </div>
            <p className="text-3xl font-black text-primary tracking-tight mt-2 font-mono">98.2%</p>
            <p className="text-[10px] text-on-surface-variant font-medium mt-1.5">
              Target: 99.0%
            </p>
          </div>

          {/* Card 3 */}
          <div className="card p-5 bg-white relative overflow-hidden shadow-sm border-l-4 border-l-error">
            <div className="flex justify-between items-center text-[10px] font-black text-error uppercase tracking-wider">
              Flagged Anomalies
              <span className="material-symbols-outlined text-error text-[16px]">warning</span>
            </div>
            <p className="text-3xl font-black text-error tracking-tight mt-2 font-mono">142</p>
            <p className="text-[10px] text-on-surface-variant font-medium mt-1.5">
              Requires review
            </p>
          </div>

          {/* Card 4 */}
          <div className="card p-5 bg-white relative overflow-hidden shadow-sm">
            <div className="flex justify-between items-center text-[10px] font-black text-on-surface-variant uppercase tracking-wider">
              Top Violation Category
              <span className="material-symbols-outlined text-on-surface-variant text-[16px]">equalizer</span>
            </div>
            <p className="text-base font-extrabold text-primary truncate tracking-tight mt-3">
              Client Entertainment
            </p>
            <p className="text-[10px] text-on-surface-variant font-medium mt-1">
              Exceeded per diem policy
            </p>
          </div>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Left Column (Report Library Table) */}
          <div className="lg:col-span-3 border border-outline-variant/65 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col justify-between">
            <div>
              <div className="px-6 py-4 border-b border-outline-variant/50 flex justify-between items-center bg-white">
                <h2 className="text-sm font-black text-primary uppercase tracking-wider">Report Library</h2>
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <button className="p-1 hover:text-primary transition-colors flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">filter_list</span>
                  </button>
                  <button className="p-1 hover:text-primary transition-colors flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                  </button>
                </div>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-outline-variant/50 text-[10px] font-black text-on-surface-variant uppercase tracking-wider">
                    <th className="px-6 py-3.5">Report Name</th>
                    <th className="px-6 py-3.5">Generated</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40 font-medium">
                  {/* Row 1 */}
                  <tr className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="px-6 py-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-[17px]">article</span>
                      <span className="text-primary font-bold">Q3 Executive Expense Summary</span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant font-mono">Oct 24, 2023</td>
                    <td className="px-6 py-4 text-on-surface-variant">CFO Package</td>
                    <td className="px-6 py-4">
                      <span className="bg-[#e0e0ff]/65 text-[#000767] text-[9px] font-black px-2 py-0.5 rounded border border-[#bdc2ff]/30 uppercase tracking-wide">
                        Approved
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right pr-6">
                      <a href="#view" className="text-secondary font-bold hover:underline">View</a>
                    </td>
                  </tr>

                  {/* Row 2 */}
                  <tr className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="px-6 py-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-[17px]">article</span>
                      <span className="text-primary font-bold">Sales Dept T&E Audit - Sept</span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant font-mono">Oct 15, 2023</td>
                    <td className="px-6 py-4 text-on-surface-variant">Department Audit</td>
                    <td className="px-6 py-4">
                      <span className="bg-[#f1f3f4] text-[#45464d] text-[9px] font-black px-2 py-0.5 rounded border border-outline-variant/40 uppercase tracking-wide">
                        Pending Review
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right pr-6">
                      <a href="#view" className="text-secondary font-bold hover:underline">View</a>
                    </td>
                  </tr>

                  {/* Row 3 (Flagged Warning row) */}
                  <tr className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="px-6 py-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-error text-[17px]">warning</span>
                      <span className="text-primary font-bold">Engineering Offsite Anomalies</span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant font-mono">Oct 12, 2023</td>
                    <td className="px-6 py-4 text-on-surface-variant">AI Deep Dive</td>
                    <td className="px-6 py-4">
                      <span className="bg-rose-50 text-error text-[9px] font-black px-2 py-0.5 rounded border border-rose-100 uppercase tracking-wide">
                        Flagged
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right pr-6">
                      <a href="#resolve" className="text-secondary font-bold hover:underline">Resolve</a>
                    </td>
                  </tr>

                  {/* Row 4 */}
                  <tr className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="px-6 py-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-[17px]">article</span>
                      <span className="text-primary font-bold">Vendor Reconciliation - Q2</span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant font-mono">Sep 30, 2023</td>
                    <td className="px-6 py-4 text-on-surface-variant">Reconciliation</td>
                    <td className="px-6 py-4">
                      <span className="bg-[#e0e0ff]/65 text-[#000767] text-[9px] font-black px-2 py-0.5 rounded border border-[#bdc2ff]/30 uppercase tracking-wide">
                        Approved
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right pr-6">
                      <a href="#view" className="text-secondary font-bold hover:underline">View</a>
                    </td>
                  </tr>

                  {/* Row 5 */}
                  <tr className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="px-6 py-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-[17px]">article</span>
                      <span className="text-primary font-bold">Marketing EMEA Campaign T&E</span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant font-mono">Sep 28, 2023</td>
                    <td className="px-6 py-4 text-on-surface-variant">Project Audit</td>
                    <td className="px-6 py-4">
                      <span className="bg-[#e0e0ff]/65 text-[#000767] text-[9px] font-black px-2 py-0.5 rounded border border-[#bdc2ff]/30 uppercase tracking-wide">
                        Approved
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right pr-6">
                      <a href="#view" className="text-secondary font-bold hover:underline">View</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-outline-variant/40 bg-white flex justify-center">
              <button className="text-xs font-bold text-secondary flex items-center gap-1 hover:underline">
                View All Reports
                <span className="material-symbols-outlined text-[14px]">expand_more</span>
              </button>
            </div>
          </div>

          {/* Right Column (Spending Trends Chart) */}
          <div className="lg:col-span-2 border border-outline-variant/65 rounded-xl bg-white p-6 shadow-sm flex flex-col justify-between relative overflow-hidden ai-glow">
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-bold text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[20px] text-secondary">bar_chart</span>
                  Spending Trends
                </span>
                <div className="flex gap-3 text-[9px] font-bold text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    Actual Spend
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#c6c6cd]"></span>
                    Budgeted
                  </span>
                </div>
              </div>

              {/* Recharts Area Chart */}
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={CHART_DATA} margin={{ left: -10, right: 0, top: 5, bottom: 0 }}>
                    <XAxis 
                      dataKey="name" 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: "#45464d", fontSize: 10, fontWeight: 600 }}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: "#45464d", fontSize: 9 }}
                      domain={[0, 1000000]}
                      ticks={[0, 750000, 1500000]}
                      tickFormatter={(v) => v >= 1000000 ? `${v / 1000000}M` : `${v / 1000}K`}
                    />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="spend" 
                      stroke="#316bf3" 
                      fillOpacity={0.06}
                      fill="url(#colorSpend2)" 
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="budget" 
                      stroke="#c6c6cd" 
                      fillOpacity={0}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                    <defs>
                      <linearGradient id="colorSpend2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#316bf3" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#316bf3" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-on-surface-variant font-medium mt-6 border-t border-outline-variant/40 pt-4">
              September spend exceeded budget by <span className="text-error font-bold">15%</span>. Primarily driven by software licensing renewals.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
