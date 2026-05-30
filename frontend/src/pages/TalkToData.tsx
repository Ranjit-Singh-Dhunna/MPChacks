import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const CHART_DATA = [
  { name: "Jun", spend: 40000, budget: 45000 },
  { name: "Jul", spend: 43000, budget: 45000 },
  { name: "Aug", spend: 42000, budget: 45000 },
  { name: "Sep", spend: 46000, budget: 45000 },
  { name: "Oct", spend: 68000, budget: 45000 },
  { name: "Nov", spend: 48000, budget: 45000 },
];

export function TalkToData() {
  const [playAudio, setPlayAudio] = useState(true);

  return (
    <div className="flex flex-col h-full bg-background text-on-background min-h-[95vh]">
      {/* Top Navigation Header */}
      <div className="px-8 py-5 border-b border-outline-variant bg-white sticky top-0 z-10 flex justify-between items-center">
        <Link 
          to="/" 
          className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors font-semibold"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Return to Dashboard
        </Link>
        <div className="flex items-center gap-2 text-secondary font-bold text-xs bg-secondary/5 border border-secondary/15 px-3 py-1 rounded-full">
          <span className="material-symbols-outlined text-[15px] animate-pulse">radar</span>
          Brim AI Active
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="p-8 max-w-[1300px] mx-auto w-full grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Column (Voice Input Card) */}
        <div className="lg:col-span-2 border border-outline-variant/65 rounded-xl bg-white p-6 shadow-sm flex flex-col justify-between min-h-[500px] lg:min-h-[calc(95vh-110px)]">
          {/* Centered Microphone Indicator */}
          <div className="flex-grow flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-white border border-outline-variant flex items-center justify-center shadow-lg text-secondary">
              <span className="material-symbols-outlined text-[36px] animate-pulse">mic</span>
            </div>
          </div>

          {/* Prompt / Transcribed Speech Box */}
          <div className="border border-secondary/20 bg-secondary/5 rounded-xl p-4 space-y-3 relative overflow-hidden ai-glow">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-secondary uppercase tracking-widest">
              <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
              RK Processing Query
            </div>
            
            <div className="text-sm font-bold text-primary leading-relaxed">
              "Show me fuel spend trends for the logistics department over the last 6 months."
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex gap-1">
                <span className="bg-white border border-outline-variant rounded px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                  Logistics
                </span>
                <span className="bg-white border border-outline-variant rounded px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                  Fuel
                </span>
                <span className="bg-white border border-outline-variant rounded px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                  6m
                </span>
              </div>
              <button className="text-on-surface-variant hover:text-primary transition-colors flex items-center">
                <span className="material-symbols-outlined text-[18px]">more_horiz</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (AI Insight Output Card) */}
        <div className="lg:col-span-3 border border-outline-variant/65 rounded-xl bg-white p-6 shadow-sm flex flex-col justify-between min-h-[500px] lg:min-h-[calc(95vh-110px)] relative overflow-hidden ai-glow">
          <div>
            {/* Header / Play Audio Toggle */}
            <div className="flex justify-between items-center border-b border-outline-variant/50 pb-4 mb-4">
              <div className="flex items-center gap-2 text-secondary font-bold text-sm">
                <span className="material-symbols-outlined text-[20px]">psychology</span>
                AI Generated Insight
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">Play Audio</span>
                <button
                  onClick={() => setPlayAudio(!playAudio)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    playAudio ? "bg-secondary" : "bg-surface-container-high"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      playAudio ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Narrated Summary text */}
            <p className="text-xs leading-relaxed text-on-surface-variant font-medium mb-6">
              Fuel expenditures for the Logistics department have shown a <span className="text-error font-bold">14% upward variance</span> against the forecasted budget over the past six months, peaking in October. This anomaly correlates strongly with regional price surges and an increase in unscheduled fleet maintenance routes.
            </p>

            {/* Spark Spend vs Budget Chart Card */}
            <div className="border border-outline-variant/60 rounded-xl p-4 bg-[#f8f9fa] space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                  Spend vs Budget (Last 6 Months)
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

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={CHART_DATA} margin={{ left: -20, right: 0, top: 5, bottom: 0 }}>
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
                      domain={[0, 80000]}
                      ticks={[0, 40000, 80000]}
                    />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="spend" 
                      stroke="#316bf3" 
                      fillOpacity={0.06}
                      fill="url(#colorSpend)" 
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
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#316bf3" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#316bf3" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="flex justify-end gap-3 items-center border-t border-outline-variant/40 pt-4 mt-6">
            <button className="px-4 py-2 border border-outline-variant hover:bg-surface-container-low text-primary font-bold rounded-lg text-xs transition-colors shadow-sm">
              View Raw Data
            </button>
            <button className="px-4 py-2 bg-secondary hover:opacity-90 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm">
              <span className="material-symbols-outlined text-[16px]">flag</span>
              Flag for Audit
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
