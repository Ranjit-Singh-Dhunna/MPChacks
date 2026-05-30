import { useState } from "react";
import { decideApproval, getApprovals } from "../api/client";
import { useAsync } from "../hooks/useAsync";

export function PreApprovals() {
  const { data } = useAsync(() => getApprovals(12), []);
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [decisionRecorded, setDecisionRecorded] = useState<string | null>(null);

  const handleDecide = (id: string, decision: "APPROVE" | "DENY" | "REQUEST_MORE_INFO") => {
    decideApproval(id, decision).catch(() => {});
    setDecisionRecorded(decision === "APPROVE" ? "APPROVED" : decision === "DENY" ? "REJECTED" : "INFO REQUESTED");
  };

  // If a specific approval is selected, show "AI Pre-Approval Workflow" Decision Dossier view
  if (selectedApproval) {
    return (
      <div className="flex flex-col h-full bg-background text-on-background min-h-screen">
        {/* Top Header */}
        <div className="px-8 py-5 border-b border-outline-variant bg-white sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <button 
                onClick={() => { setSelectedApproval(null); setDecisionRecorded(null); }}
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
            {/* Sarah Jenkins Profile Row */}
            <div className="p-6 border-b border-outline-variant/60 flex justify-between items-center bg-[#f8f9fa]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-outline-variant/80">
                  <img 
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150" 
                    alt="Sarah Jenkins" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div>
                  <h2 className="text-base font-bold text-primary">Sarah Jenkins</h2>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    Senior Account Executive · Sales
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">Requested Amount</div>
                <div className="text-3xl font-black text-primary tracking-tight mt-0.5">$2,450.00</div>
              </div>
            </div>

            {/* Split Details Section */}
            <div className="grid grid-cols-1 lg:grid-cols-5 border-b border-outline-variant/60">
              
              {/* Left Column (Spans 2) */}
              <div className="lg:col-span-2 p-6 border-r border-outline-variant/60 bg-[#f8f9fa]/20 space-y-6">
                
                {/* Request Details */}
                <div>
                  <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-3">Request Details</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-[10px] text-on-surface-variant font-semibold uppercase">Purpose</div>
                      <div className="text-xs font-bold text-primary mt-0.5">Client Onboarding</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-on-surface-variant font-semibold uppercase">Location</div>
                      <div className="text-xs font-bold text-primary mt-0.5">Toronto, Canada</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-on-surface-variant font-semibold uppercase">Category</div>
                      <div className="inline-flex items-center gap-1 bg-surface-container text-primary px-2.5 py-1 rounded text-xs font-bold border border-outline-variant/60 mt-1">
                        <span className="material-symbols-outlined text-[14px]">flight</span>
                        Travel & Ent
                      </div>
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
                        <div className="text-xs font-bold text-primary mt-0.5">98% policy adherence</div>
                        <div className="text-[9px] text-on-surface-variant font-medium">over 24 months</div>
                      </div>
                      <span className="material-symbols-outlined text-secondary text-[20px]">trending_up</span>
                    </div>

                    {/* Marketing Budget card */}
                    <div className="bg-white border border-outline-variant/60 rounded-xl p-3 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-on-surface-variant font-bold uppercase">Marketing Budget</span>
                        <span className="text-[9px] text-secondary font-black uppercase">On Track</span>
                      </div>
                      <div className="text-xs font-bold text-primary mt-0.5">Remaining: $12,400</div>
                      <div className="w-full bg-surface-container h-2 rounded-full mt-2 overflow-hidden border border-outline-variant/40">
                        <div className="h-full bg-secondary rounded-full" style={{ width: "70%" }}></div>
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
                        AI Recommendation: APPROVE
                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      </div>
                      <p className="text-xs leading-relaxed text-on-surface-variant mt-1.5 font-medium">
                        Expense aligns perfectly with the projected project budget and Sarah's historical spending patterns for client onboarding trips. Cross-reference checks complete: <span className="font-bold text-primary">No anomalous merchant strings detected.</span>
                      </p>
                      
                      <div className="flex gap-2 mt-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-on-surface-variant bg-white border border-outline-variant/70 rounded px-2 py-1">
                          <span className="material-symbols-outlined text-[12px]">link</span>
                          Policy T&E-04
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-on-surface-variant bg-white border border-outline-variant/70 rounded px-2 py-1">
                          <span className="material-symbols-outlined text-[12px]">history</span>
                          Past Trips
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Extracted Line Items */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">Extracted Line Items</h3>
                  <div className="border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant/50 text-[10px] font-black text-on-surface-variant uppercase tracking-wider">
                          <th className="px-4 py-3">Merchant</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/40 font-medium">
                        <tr>
                          <td className="px-4 py-3 text-primary">Air Canada</td>
                          <td className="px-4 py-3 text-on-surface-variant">Airfare</td>
                          <td className="px-4 py-3 text-primary text-right font-mono">$850.00</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-primary">Fairmont Royal York</td>
                          <td className="px-4 py-3 text-on-surface-variant">Lodging</td>
                          <td className="px-4 py-3 text-primary text-right font-mono">$1,200.00</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-primary">Canoe Restaurant</td>
                          <td className="px-4 py-3 text-on-surface-variant">Client Meals</td>
                          <td className="px-4 py-3 text-primary text-right font-mono">$400.00</td>
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
                    onClick={() => handleDecide(selectedApproval, "REQUEST_MORE_INFO")}
                    className="px-4 py-2 border border-outline-variant bg-white hover:bg-surface-container-low text-primary font-bold rounded-lg text-xs transition-colors shadow-sm"
                  >
                    Request More Info
                  </button>
                  <button 
                    onClick={() => handleDecide(selectedApproval, "DENY")}
                    className="px-4 py-2 bg-rose-50 text-error hover:bg-rose-100 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 border border-rose-200"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                    Deny
                  </button>
                  <button 
                    onClick={() => handleDecide(selectedApproval, "APPROVE")}
                    className="px-5 py-2 bg-primary hover:opacity-90 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">done</span>
                    Approve
                  </button>
                </>
              )}
            </div>

          </div>

          <div className="text-center text-[10px] text-on-surface-variant font-mono">
            Dossier ID: #REQ-8829-TRV · Audit Log Active
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, show "Expense Reports" Grouped View queue
  return (
    <div className="flex flex-col h-full bg-background text-on-background min-h-screen">
      {/* Top Header */}
      <div className="px-8 py-5 border-b border-outline-variant bg-white sticky top-0 z-10">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
              Approvals
              <span className="material-symbols-outlined text-[12px] text-on-surface-variant">chevron_right</span>
              CFO Review
            </div>
            <h1 className="text-xl font-bold text-primary mt-1 tracking-tight">West Coast Logistics Trip - March 2026</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-outline-variant hover:bg-surface-container-low text-primary font-bold rounded-lg text-xs transition-colors">
              Request Changes
            </button>
            <button className="px-4 py-2 bg-secondary hover:opacity-90 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Approve Report
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6 max-w-[1200px] mx-auto w-full">
        
        {/* CFO Summary Card */}
        <div className="border border-outline-variant/60 rounded-xl bg-white p-5 shadow-sm flex items-start gap-4 relative overflow-hidden ai-glow">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary shrink-0">
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary">CFO Summary</span>
              <span className="bg-surface-container text-on-surface-variant text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-outline-variant/50">
                AI Generated
              </span>
            </div>
            <p className="text-xs leading-relaxed text-on-surface-variant font-medium">
              This report covers the 3-day logistics trip. 95% of spend is within policy. One outlier ($150 hotel surcharge) was flagged as <span className="bg-rose-50 text-error px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border border-rose-100 inline-flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">warning</span>Medium</span> risk but contextually justified by last-minute rebooking due to weather.
            </p>
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant bg-surface-container-low border border-outline-variant/60 rounded-lg px-3 py-2 hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-[13px]">link</span>
                View Travel Policy v4.2
              </button>
              <button className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant bg-surface-container-low border border-outline-variant/60 rounded-lg px-3 py-2 hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-[13px]">cloud</span>
                Weather Context Data
              </button>
            </div>
          </div>
        </div>

        {/* Grouped View Table Card */}
        <div className="border border-outline-variant/65 rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/50 flex justify-between items-center bg-white">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-primary uppercase tracking-wider">Grouped View</h2>
              <span className="bg-[#f0f2f5] text-on-surface-variant text-[10px] font-bold px-2.5 py-0.5 rounded border border-outline-variant/40">
                TRP-2026-WC-092
              </span>
              <span className="text-[11px] text-on-surface-variant font-semibold">• 12 Transactions</span>
            </div>
            
            <div className="flex items-center gap-2 text-on-surface-variant">
              <button className="p-1 hover:text-primary transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">filter_list</span>
              </button>
              <button className="p-1 hover:text-primary transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">download</span>
              </button>
            </div>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/50 text-[10px] font-black text-on-surface-variant uppercase tracking-wider">
                <th className="px-6 py-3.5 w-12"><input type="checkbox" className="rounded border-outline-variant" /></th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Merchant / Vendor</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5 text-right">Amount</th>
                <th className="px-6 py-3.5 text-right pr-8">Policy Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 font-medium">
              
              {/* Row 1 */}
              <tr 
                onClick={() => setSelectedApproval("TXN-001")}
                className="hover:bg-[#f8f9fa] cursor-pointer transition-colors"
              >
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded" /></td>
                <td className="px-6 py-4 text-on-surface-variant font-mono">Mar 12, 2026</td>
                <td className="px-6 py-4 text-primary font-bold">Delta Airlines</td>
                <td className="px-6 py-4 text-on-surface-variant">Airfare</td>
                <td className="px-6 py-4 text-primary text-right font-mono">$450.00</td>
                <td className="px-6 py-4 text-right pr-8">
                  <div className="flex justify-end">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                      <span className="material-symbols-outlined text-[15px]">done</span>
                    </span>
                  </div>
                </td>
              </tr>

              {/* Row 2 */}
              <tr 
                onClick={() => setSelectedApproval("TXN-002")}
                className="hover:bg-[#f8f9fa] cursor-pointer transition-colors"
              >
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded" /></td>
                <td className="px-6 py-4 text-on-surface-variant font-mono">Mar 12, 2026</td>
                <td className="px-6 py-4 text-primary font-bold">Uber Ride</td>
                <td className="px-6 py-4 text-on-surface-variant">Ground Transport</td>
                <td className="px-6 py-4 text-primary text-right font-mono">$42.50</td>
                <td className="px-6 py-4 text-right pr-8">
                  <div className="flex justify-end">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                      <span className="material-symbols-outlined text-[15px]">done</span>
                    </span>
                  </div>
                </td>
              </tr>

              {/* Row 3 */}
              <tr 
                onClick={() => setSelectedApproval("TXN-003")}
                className="hover:bg-[#f8f9fa] cursor-pointer transition-colors"
              >
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded" /></td>
                <td className="px-6 py-4 text-on-surface-variant font-mono">Mar 13, 2026</td>
                <td className="px-6 py-4 text-primary font-bold">
                  <div>Marriott Downtown</div>
                  <div className="text-[10px] text-error font-semibold mt-0.5">Surcharge Flagged</div>
                </td>
                <td className="px-6 py-4 text-on-surface-variant">Lodging</td>
                <td className="px-6 py-4 text-primary text-right font-mono">$650.00</td>
                <td className="px-6 py-4 text-right pr-8">
                  <div className="flex justify-end">
                    <span className="w-6 h-6 rounded-full bg-rose-50 text-error flex items-center justify-center border border-rose-100">
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                    </span>
                  </div>
                </td>
              </tr>

              {/* Row 4 */}
              <tr 
                onClick={() => setSelectedApproval("TXN-004")}
                className="hover:bg-[#f8f9fa] cursor-pointer transition-colors"
              >
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded" /></td>
                <td className="px-6 py-4 text-on-surface-variant font-mono">Mar 14, 2026</td>
                <td className="px-6 py-4 text-primary font-bold">Blue Bottle Coffee</td>
                <td className="px-6 py-4 text-on-surface-variant">Meals</td>
                <td className="px-6 py-4 text-primary text-right font-mono">$12.00</td>
                <td className="px-6 py-4 text-right pr-8">
                  <div className="flex justify-end">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                      <span className="material-symbols-outlined text-[15px]">done</span>
                    </span>
                  </div>
                </td>
              </tr>

            </tbody>
          </table>

          {/* Table Footer Action */}
          <div className="px-6 py-4 border-t border-outline-variant/40 bg-white flex justify-center">
            <button className="text-xs font-bold text-secondary flex items-center gap-1 hover:underline">
              View Remaining 8 Transactions
              <span className="material-symbols-outlined text-[14px]">expand_more</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
