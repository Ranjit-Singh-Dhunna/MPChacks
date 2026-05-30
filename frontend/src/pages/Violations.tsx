import { useState } from "react";

export function Violations() {
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [decisionRecorded, setDecisionRecorded] = useState<string | null>(null);

  const handleDecide = (decision: string) => {
    setDecisionRecorded(decision);
  };

  // Render "Compliance Case Detail" if a case is clicked
  if (selectedCase) {
    return (
      <div className="flex flex-col h-full bg-background text-on-background min-h-[95vh]">
        {/* Top Header */}
        <div className="px-8 py-5 border-b border-outline-variant bg-white sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <button 
                onClick={() => { setSelectedCase(null); setDecisionRecorded(null); }}
                className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors font-semibold"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Back to Queue
              </button>
              <h1 className="text-xl font-bold text-primary mt-1 tracking-tight">Decision Dossier</h1>
            </div>
            
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant bg-surface-container px-2 py-0.5 rounded mr-2">Reviewer</span>
              <span className="text-xs font-bold text-primary">David, Department Approver</span>
            </div>
          </div>
        </div>

        {/* Content Details */}
        <div className="p-8 max-w-[1200px] mx-auto w-full space-y-6">
          
          {/* Main Card */}
          <div className="border border-outline-variant/60 rounded-xl bg-white shadow-sm overflow-hidden">
            {/* Header info row */}
            <div className="p-6 border-b border-outline-variant/60 flex justify-between items-center bg-[#f8f9fa]">
              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-primary">Cluster CL-8924: Potential Smurfing</h2>
                    <span className="bg-rose-50 text-error text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-rose-100">
                      Critical
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant font-medium">
                    Identified Oct 24, 2023 • 4 Transactions
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">Total Amount</div>
                <div className="text-3xl font-black text-primary tracking-tight mt-0.5">$1,996.00</div>
              </div>
            </div>

            {/* Split Details Section */}
            <div className="grid grid-cols-1 lg:grid-cols-5 border-b border-outline-variant/60">
              
              {/* Left Column (Spans 2) */}
              <div className="lg:col-span-2 p-6 border-r border-outline-variant/60 bg-[#f8f9fa]/20 space-y-6">
                
                {/* Case Details */}
                <div>
                  <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-3">Case Details</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-[10px] text-on-surface-variant font-semibold uppercase">Detection Type</div>
                      <div className="text-xs font-bold text-primary mt-0.5">Smurfing (Threshold Bypassing)</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-on-surface-variant font-semibold uppercase">Detection Window</div>
                      <div className="text-xs font-bold text-primary mt-0.5">2 Hours</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-on-surface-variant font-semibold uppercase">Employee</div>
                      <div className="text-xs font-bold text-primary mt-0.5">J. Smith (Marketing)</div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-outline-variant/50"></div>

                {/* Contextual Data */}
                <div>
                  <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-3">Contextual Data</h3>
                  <div className="space-y-3">
                    {/* Adherence card */}
                    <div className="bg-white border border-outline-variant/60 rounded-xl p-3 flex justify-between items-center shadow-sm">
                      <div>
                        <div className="text-[9px] text-on-surface-variant font-bold uppercase">Employee History</div>
                        <div className="text-xs font-bold text-primary mt-0.5">3 Prior Warnings</div>
                        <div className="text-[9px] text-on-surface-variant font-medium">over 12 months</div>
                      </div>
                      <span className="material-symbols-outlined text-error text-[20px]">trending_down</span>
                    </div>

                    {/* Marketing Budget card */}
                    <div className="bg-white border border-outline-variant/60 rounded-xl p-3 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-on-surface-variant font-bold uppercase">Marketing Budget</span>
                        <span className="text-[9px] text-error font-black uppercase">At Risk</span>
                      </div>
                      <div className="text-xs font-bold text-primary mt-0.5">Remaining: $2,400</div>
                      <div className="w-full bg-surface-container h-2 rounded-full mt-2 overflow-hidden border border-outline-variant/40">
                        <div className="h-full bg-error rounded-full" style={{ width: "90%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column (Spans 3) */}
              <div className="lg:col-span-3 p-6 space-y-6">
                
                {/* AI Recommendation Alert */}
                <div className="border border-secondary/20 bg-secondary/5 rounded-xl p-5 relative overflow-hidden ai-glow">
                  <div className="flex gap-3">
                    <span className="w-8 h-8 rounded-full bg-secondary/15 flex items-center justify-center text-secondary border border-secondary/20">
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-black text-secondary uppercase tracking-wider">
                        AI Recommendation: FLAG FOR AUDIT
                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      </div>
                      <p className="text-xs leading-relaxed text-on-surface-variant mt-1.5 font-medium">
                        Detected highly anomalous purchasing pattern indicative of intentional threshold structuring (smurfing). Employee executed 4 sequential transactions at the same vendor within a 2-hour window, effectively bypassing the $500 single-transaction approval policy. Pattern historically correlates with 92% policy violation confirmation rate.
                      </p>
                      
                      <div className="flex gap-2 mt-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-on-surface-variant bg-white border border-outline-variant/70 rounded px-2.5 py-1">
                          <span className="material-symbols-outlined text-[12px]">link</span>
                          Policy: EXP-004
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-on-surface-variant bg-white border border-outline-variant/70 rounded px-2.5 py-1">
                          <span className="material-symbols-outlined text-[12px]">store</span>
                          Vendor: Acme Supplies Ltd
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cluster Transactions */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">Cluster Transactions</h3>
                  <div className="border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant/50 text-[10px] font-black text-on-surface-variant uppercase tracking-wider">
                          <th className="px-4 py-3">Trx ID</th>
                          <th className="px-4 py-3">Timestamp</th>
                          <th className="px-4 py-3">Merchant</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/40 font-medium">
                        <tr>
                          <td className="px-4 py-3 text-on-surface-variant font-mono">TX-8821</td>
                          <td className="px-4 py-3 text-on-surface-variant font-mono">Oct 24, 10:15 AM</td>
                          <td className="px-4 py-3 text-primary">Acme Supplies Ltd</td>
                          <td className="px-4 py-3 text-primary text-right font-mono">$499.00</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-on-surface-variant font-mono">TX-8824</td>
                          <td className="px-4 py-3 text-on-surface-variant font-mono">Oct 24, 10:42 AM</td>
                          <td className="px-4 py-3 text-primary">Acme Supplies Ltd</td>
                          <td className="px-4 py-3 text-primary text-right font-mono">$499.00</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-on-surface-variant font-mono">TX-8830</td>
                          <td className="px-4 py-3 text-on-surface-variant font-mono">Oct 24, 11:20 AM</td>
                          <td className="px-4 py-3 text-primary">Acme Supplies Ltd</td>
                          <td className="px-4 py-3 text-primary text-right font-mono">$499.00</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-on-surface-variant font-mono flex items-center gap-1">
                            TX-8835
                            <span className="material-symbols-outlined text-[13px] text-error">info</span>
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant font-mono">Oct 24, 11:55 AM</td>
                          <td className="px-4 py-3 text-primary">Acme Supplies Ltd</td>
                          <td className="px-4 py-3 text-primary text-right font-mono">$499.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer Decision Bar */}
            <div className="px-6 py-4 bg-surface-container-low flex justify-end gap-3 items-center">
              {decisionRecorded ? (
                <div className="w-full rounded-lg bg-surface-container-high py-2 text-center text-xs font-semibold text-secondary border border-outline-variant">
                  Decision recorded: {decisionRecorded}
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => handleDecide("INFO REQUESTED")}
                    className="px-4 py-2 border border-outline-variant bg-white hover:bg-surface-container-low text-primary font-bold rounded-lg text-xs transition-colors shadow-sm"
                  >
                    Request More Info
                  </button>
                  <button 
                    onClick={() => handleDecide("MARKED LEGITIMATE")}
                    className="px-4 py-2 bg-rose-50 text-error hover:bg-rose-100 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 border border-rose-200"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                    Mark Legitimate
                  </button>
                  <button 
                    onClick={() => handleDecide("FLAGGED FOR AUDIT")}
                    className="px-5 py-2 bg-primary hover:opacity-90 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">flag</span>
                    Flag for Audit
                  </button>
                </>
              )}
            </div>

          </div>

          <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-mono px-2">
            <div>Dossier ID: #CL-8924-SMRF • Audit Log Active</div>
            <div className="flex items-center gap-1 font-bold">
              AI Confidence Score
              <span className="text-xl font-black text-error">88</span>
              <span className="text-on-surface-variant">/100</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, show list audit table
  return (
    <div className="flex flex-col h-full bg-background text-on-background min-h-[95vh]">
      
      {/* Top Header Actions */}
      <div className="px-8 py-5 border-b border-outline-variant bg-white sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-primary tracking-tight">Transaction Audit</h1>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-on-surface-variant font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Policy Engine Active (v2.4.1)
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant bg-surface-container border border-outline-variant px-3 py-1.5 rounded-lg">
              <span className="material-symbols-outlined text-[15px]">article</span>
              Active Policy: Corp_Travel_Q3.pdf
            </span>
            <button className="px-4 py-2 bg-primary hover:opacity-90 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[16px]">publish</span>
              Upload Policy PDF
            </button>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="px-8 py-4 border-b border-outline-variant/60 bg-white flex gap-4 items-center">
        {/* Search Box */}
        <div className="flex-1 relative flex items-center bg-[#f8f9fa] border border-outline-variant/60 rounded-xl px-4 py-2.5">
          <span className="material-symbols-outlined text-on-surface-variant mr-3 text-[18px]">search</span>
          <input
            type="text"
            readOnly
            placeholder="Search transactions, merchants, or query AI..."
            className="w-full bg-transparent border-none outline-none text-xs placeholder:text-outline text-on-background"
          />
          <span className="rounded bg-white border border-outline-variant/60 px-1.5 py-0.5 font-mono text-[9px] text-on-surface-variant font-bold">
            ⌘ F
          </span>
        </div>

        {/* Action Buttons */}
        <button className="px-3 py-2 border border-outline-variant/60 hover:bg-surface-container-low text-primary font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors">
          <span className="material-symbols-outlined text-[16px]">filter_list</span>
          Filter
        </button>
        <button className="px-3 py-2 border border-outline-variant/60 hover:bg-surface-container-low text-primary font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors">
          <span className="material-symbols-outlined text-[16px]">calendar_month</span>
          Date Range
        </button>
        <button className="px-3 py-2 border border-outline-variant/60 hover:bg-surface-container-low text-primary font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors">
          <span className="material-symbols-outlined text-[16px]">download</span>
          Export
        </button>
      </div>

      {/* Main content - Table */}
      <div className="p-8 max-w-[1400px] mx-auto w-full space-y-6">
        <div className="border border-outline-variant/65 rounded-xl bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8f9fa] border-b border-outline-variant/50 text-[10px] font-black text-on-surface-variant uppercase tracking-wider">
                <th className="px-6 py-3.5 w-12"><input type="checkbox" className="rounded" /></th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-6 py-3.5">Merchant / AI Mapping</th>
                <th className="px-6 py-3.5 text-right">Amount</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Severity</th>
                <th className="px-6 py-3.5 pr-8">AI Reasoning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 font-medium">
              
              {/* Row 1 */}
              <tr 
                onClick={() => setSelectedCase("JD-001")}
                className="hover:bg-[#f8f9fa] cursor-pointer transition-colors"
              >
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded" /></td>
                <td className="px-6 py-4 text-on-surface-variant font-mono">Oct 24</td>
                <td className="px-6 py-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-bold text-[9px] border border-secondary-fixed-dim/20">
                    JD
                  </span>
                  <span className="text-primary font-bold">J. Doe</span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-primary font-bold">Petro-Canada #4092</div>
                  <div className="flex items-center gap-1 text-[10px] text-on-surface-variant mt-1 font-mono">
                    <span className="material-symbols-outlined text-[12px] text-secondary">auto_awesome</span>
                    Raw: GAS/SVC {"->"} Mapped: Fuel/Transport
                  </div>
                </td>
                <td className="px-6 py-4 text-primary text-right font-mono font-black">$1,179.00</td>
                <td className="px-6 py-4">
                  <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-wide">
                    Compliant
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-surface-container text-on-surface-variant text-[9px] font-bold px-2 py-0.5 rounded border border-outline-variant uppercase tracking-wide">
                    Low
                  </span>
                </td>
                <td className="px-6 py-4 pr-8">
                  <span className="text-secondary font-bold hover:underline flex items-center gap-0.5">
                    OSOW Context
                    <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                  </span>
                </td>
              </tr>

              {/* Row 2 (Violation - Red BG) */}
              <tr 
                onClick={() => setSelectedCase("SM-001")}
                className="bg-rose-50/15 hover:bg-rose-50/25 cursor-pointer transition-colors border-y border-rose-100"
              >
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded" /></td>
                <td className="px-6 py-4 text-error font-mono font-semibold">Oct 24</td>
                <td className="px-6 py-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#e0e0ff] text-[#000767] flex items-center justify-center font-bold text-[9px] border border-secondary-fixed-dim/20">
                    SM
                  </span>
                  <span className="text-primary font-bold">S. Miller</span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-primary font-bold">The Ritz-Carlton NYC</div>
                  <div className="flex items-center gap-1 text-[10px] text-on-surface-variant mt-1 font-mono">
                    <span className="material-symbols-outlined text-[12px] text-secondary">auto_awesome</span>
                    Mapped: Lodging/T&E
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-error font-mono font-black">$689.42 CAD</div>
                  <div className="text-[10px] text-on-surface-variant font-mono">$499.00 USD</div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-rose-50 text-error text-[9px] font-bold px-2 py-0.5 rounded border border-rose-100 uppercase tracking-wide">
                    Violation
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-rose-50 text-error text-[9px] font-bold px-2 py-0.5 rounded border border-rose-100 uppercase tracking-wide">
                    High
                  </span>
                </td>
                <td className="px-6 py-4 pr-8">
                  <span className="text-error font-bold hover:underline flex items-center gap-0.5">
                    FX Threshold
                    <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                  </span>
                </td>
              </tr>

              {/* Group Banner Row */}
              <tr className="bg-secondary/5 border-y border-secondary/15">
                <td colSpan={8} className="px-6 py-3 font-black text-secondary uppercase tracking-widest text-[9px]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px]">hub</span>
                    AI Detected Pattern: Potential Smurfing Cluster (ID: CL-892)
                  </div>
                </td>
              </tr>

              {/* Group Sub-Row 1 (Yellow BG) */}
              <tr 
                onClick={() => setSelectedCase("AK-001")}
                className="bg-amber-50/10 hover:bg-amber-50/20 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded" /></td>
                <td className="px-6 py-4 text-on-surface-variant font-mono">Oct 23</td>
                <td className="px-6 py-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-bold text-[9px]">
                    AK
                  </span>
                  <span className="text-primary font-bold">A. Kumar</span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-primary font-bold">Best Buy #092</div>
                  <div className="flex items-center gap-1 text-[10px] text-on-surface-variant mt-1 font-mono">
                    <span className="material-symbols-outlined text-[12px] text-secondary">auto_awesome</span>
                    Mapped: Electronics/IT
                  </div>
                </td>
                <td className="px-6 py-4 text-primary text-right font-mono font-black">$495.00</td>
                <td className="px-6 py-4">
                  <span className="bg-amber-50 text-amber-600 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-100 uppercase tracking-wide">
                    Review
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded border border-primary uppercase tracking-wide">
                    Critical
                  </span>
                </td>
                
                {/* Spanned right box cell */}
                <td rowSpan={3} className="px-6 py-4 pr-8 border-l border-outline-variant/40 align-middle" onClick={(e) => e.stopPropagation()}>
                  <div className="border border-outline-variant/60 rounded-xl p-3 bg-white max-w-xs shadow-sm space-y-2">
                    <p className="text-[10px] leading-relaxed text-on-surface-variant font-semibold">
                      3 txns &lt; $500 limit at same merchant within 4hrs.
                    </p>
                    <button 
                      onClick={() => setSelectedCase("AK-001")}
                      className="text-[10px] font-bold text-secondary flex items-center gap-0.5 hover:underline"
                    >
                      View Logic Chain
                      <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                    </button>
                  </div>
                </td>
              </tr>

              {/* Group Sub-Row 2 (Yellow BG) */}
              <tr 
                onClick={() => setSelectedCase("AK-001")}
                className="bg-amber-50/10 hover:bg-amber-50/20 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded" /></td>
                <td className="px-6 py-4 text-on-surface-variant font-mono">Oct 23</td>
                <td className="px-6 py-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-bold text-[9px]">
                    AK
                  </span>
                  <span className="text-primary font-bold">A. Kumar</span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-primary font-bold">Best Buy #092</div>
                </td>
                <td className="px-6 py-4 text-primary text-right font-mono font-black">$480.25</td>
                <td className="px-6 py-4">
                  <span className="bg-amber-50 text-amber-600 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-100 uppercase tracking-wide">
                    Review
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded border border-primary uppercase tracking-wide">
                    Critical
                  </span>
                </td>
              </tr>

              {/* Group Sub-Row 3 (Yellow BG) */}
              <tr 
                onClick={() => setSelectedCase("AK-001")}
                className="bg-amber-50/10 hover:bg-amber-50/20 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded" /></td>
                <td className="px-6 py-4 text-on-surface-variant font-mono">Oct 23</td>
                <td className="px-6 py-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-bold text-[9px]">
                    AK
                  </span>
                  <span className="text-primary font-bold">A. Kumar</span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-primary font-bold">Best Buy #092</div>
                </td>
                <td className="px-6 py-4 text-primary text-right font-mono font-black">$210.00</td>
                <td className="px-6 py-4">
                  <span className="bg-amber-50 text-amber-600 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-100 uppercase tracking-wide">
                    Review
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded border border-primary uppercase tracking-wide">
                    Critical
                  </span>
                </td>
              </tr>

            </tbody>
          </table>

          {/* Table Footer Pagination */}
          <div className="px-6 py-4 border-t border-outline-variant/40 bg-white flex justify-between items-center text-xs text-on-surface-variant font-semibold">
            <div>Showing 1-5 of 1,248 transactions</div>
            
            <div className="flex gap-1">
              <button className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <button className="w-8 h-8 rounded bg-secondary text-white font-bold flex items-center justify-center shadow-sm">
                1
              </button>
              <button className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center hover:bg-surface-container-low transition-colors">
                2
              </button>
              <button className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center hover:bg-surface-container-low transition-colors">
                3
              </button>
              <span className="w-8 h-8 flex items-center justify-center">...</span>
              <button className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
