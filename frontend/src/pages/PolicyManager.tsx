import { useRef, useState, useEffect } from "react";
import { getRules, updateRule, uploadPolicy } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import type { Policy } from "../types";

export function PolicyManager() {
  const { data, loading, reload } = useAsync(getRules, []);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedPolicies, setUploadedPolicies] = useState<any[]>(() => {
    const saved = localStorage.getItem("uploaded_policies");
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // If database already contains rules, auto-populate the active policy card in UI
  useEffect(() => {
    if (data && data.length > 0 && uploadedPolicies.length === 0) {
      const activePolicy = {
        id: "p_loaded_db",
        name: "Brim Expense Policy",
        fileName: "Brim_Expense_Policy.pdf",
        rulesCount: data.length,
        uploadedAt: "Active Database Ruleset",
        uploadedBy: "Finance Manager",
        fileSize: "1.2 MB",
      };
      setUploadedPolicies([activePolicy]);
      localStorage.setItem("uploaded_policies", JSON.stringify([activePolicy]));
    }
  }, [data, uploadedPolicies.length]);

  const onUpload = async (file: File) => {
    setUploading(true);
    setStatus("Processing Policy… extracting rules with Gemini");
    try {
      const res = await uploadPolicy(file);
      setStatus(`Extracted ${res.rules_extracted} rules successfully.`);
      const newPolicy = {
        id: `p_uploaded_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
        fileName: file.name,
        rulesCount: res.rules_extracted || 12,
        uploadedAt: "Just now",
        uploadedBy: "Finance Manager",
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      };
      setUploadedPolicies([newPolicy]);
      localStorage.setItem("uploaded_policies", JSON.stringify([newPolicy]));
      reload();
    } catch {
      setStatus("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const toggle = (p: Policy) => {
    updateRule(p.policy_id, { is_active: !p.is_active }).then(reload);
  };

  // If a policy is selected, render its detailed rules UI
  if (selectedPolicy) {
    return (
      <div className="flex flex-col h-full bg-background text-on-background min-h-[95vh]">
        {/* Top Header Actions */}
        <div className="px-8 py-6 border-b border-outline-variant bg-white sticky top-0 z-10">
          <button 
            onClick={() => setSelectedPolicy(null)}
            className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors font-bold mb-4"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Policy Documents
          </button>
          
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-black text-secondary uppercase tracking-widest">
                Policy Extractor / {selectedPolicy.name}
                <span className="material-symbols-outlined text-[13px] text-secondary">auto_awesome</span>
              </div>
              <h1 className="text-2xl font-black text-primary mt-1 tracking-tight">Review Extracted Rules</h1>
              <p className="text-xs text-on-surface-variant mt-1 max-w-2xl">
                AI has processed the uploaded policy document `{selectedPolicy.fileName}`. Review, edit, and confirm the rules below.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedPolicy(null)}
                className="px-4 py-2 border border-outline-variant hover:bg-surface-container-low text-primary font-bold rounded-lg text-xs transition-colors"
              >
                Discard
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt"
                hidden
                onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
              />
              <button 
                className="px-4 py-2 bg-primary hover:opacity-90 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-2 shadow-sm"
                onClick={() => setSelectedPolicy(null)}
              >
                <span className="material-symbols-outlined text-[16px]">publish</span>
                Save & Go Live
              </button>
            </div>
          </div>
        </div>

        {/* Rules list */}
        <div className="p-8 space-y-6 max-w-[1200px] mx-auto w-full">
          {status && (
            <div className="rounded-xl border border-secondary/20 bg-secondary/5 px-4 py-3 text-xs text-secondary">
              {status}
            </div>
          )}

          {loading && <div className="text-on-surface-variant text-xs">Loading rules…</div>}

          <div className="space-y-4">
            {data?.map((p, idx) => (
              <div
                key={p.policy_id}
                className={`border border-outline-variant/60 rounded-xl bg-white p-6 shadow-sm relative transition-opacity duration-200 ${
                  p.is_active ? "opacity-100" : "opacity-60"
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  
                  {/* Title & Toggle switch */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-surface-container border border-outline-variant/50 flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[20px]">assignment</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">
                          Rule {idx + 1}: {p.rule_name}
                        </span>
                        
                        {/* Custom Toggle Switch */}
                        <button
                          onClick={() => toggle(p)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            p.is_active ? "bg-secondary" : "bg-surface-container-high"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              p.is_active ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Confidence & Delete Actions */}
                  <div className="flex items-center gap-3">
                    <button className="text-on-surface-variant hover:text-error transition-colors flex items-center justify-center p-1">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>

                {/* Form Input boxes (Condition / Constraint) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  
                  {/* Condition Box */}
                  <div>
                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-1.5">
                      Condition
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={
                        p.rule_type === "AMOUNT_LIMIT" ? "Expense Amount >= $50.00" :
                        p.rule_type === "TIP_CAP" ? "Services Tip / Meal Tip" :
                        p.rule_type === "RECEIPT_REQUIRED" ? "Missing Receipt" :
                        p.rule_type === "VEHICLE_RESTRICTION" ? "Rental Car Booking" :
                        p.rule_type === "EXCLUDED_REIMBURSEMENT" ? "Personal/Infraction Charges" :
                        p.rule_type === "CARD_USAGE_RESTRICTION" ? "Shared Card Usage" :
                        p.rule_type === "MCC_BANNED" ? `Category == '${p.rule_name}'` : 
                        `Category == '${p.rule_type}'`
                      }
                      className="w-full bg-[#f8f9fa] border border-outline-variant/60 rounded-lg px-3 py-2 text-xs text-on-background font-semibold outline-none"
                    />
                  </div>

                  {/* Constraint Box */}
                  <div>
                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-1.5">
                      Constraint
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={
                          p.rule_type === "AMOUNT_LIMIT" ? "Max Amount" :
                          p.rule_type === "TIP_CAP" ? "Max Tip Limit" :
                          p.rule_type === "RECEIPT_REQUIRED" ? "Receipt Threshold" :
                          p.rule_type === "VEHICLE_RESTRICTION" ? "Sharing Restriction" :
                          p.rule_type === "EXCLUDED_REIMBURSEMENT" ? "Non-reimbursable" :
                          p.rule_type === "CARD_USAGE_RESTRICTION" ? "Card Holder Restriction" :
                          "Banned Category"
                        }
                        className="w-1/2 bg-[#f8f9fa] border border-outline-variant/60 rounded-lg px-3 py-2 text-xs text-on-background font-semibold outline-none"
                      />
                      <input
                        type="text"
                        readOnly
                        value={
                          p.rule_type === "AMOUNT_LIMIT"
                            ? `$${p.rule_parameters?.max_amount_usd || p.rule_parameters?.limit || 50.0}`
                            : p.rule_type === "TIP_CAP"
                            ? `${p.rule_parameters?.max_tip_pct || 15}%`
                            : p.rule_type === "RECEIPT_REQUIRED"
                            ? `Over $${p.rule_parameters?.min_amount_usd || 50.0}`
                            : p.rule_type === "VEHICLE_RESTRICTION"
                            ? "4+ Travelers Required"
                            : p.rule_type === "EXCLUDED_REIMBURSEMENT"
                            ? "Traffic/Parking/Personal Fees"
                            : p.rule_type === "CARD_USAGE_RESTRICTION"
                            ? "Authorized User Only"
                            : "Declined"
                        }
                        className="w-1/2 bg-white border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background font-semibold outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Extracted quote block */}
                {p.source_text && (
                  <div className="mt-4 flex items-start gap-1.5 text-[11px] text-on-surface-variant leading-relaxed">
                    <span className="material-symbols-outlined text-[13px] text-secondary mt-0.5">format_quote</span>
                    <span className="italic font-medium">
                      Extracted from Document Source: "{p.source_text}"
                    </span>
                  </div>
                )}
              </div>
            ))}

            {/* Add Custom Rule Card (Dashed Border) */}
            <button className="w-full border-2 border-dashed border-outline-variant/60 hover:border-secondary/60 rounded-xl p-6 bg-transparent flex flex-col items-center justify-center gap-2 hover:bg-surface-container-low/20 transition-all">
              <div className="w-7 h-7 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">add</span>
              </div>
              <span className="text-xs font-bold text-on-surface-variant">Add Custom Rule</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If no policies have been uploaded yet, render empty state dropzone
  if (uploadedPolicies.length === 0) {
    return (
      <div className="flex flex-col h-full bg-background text-on-background min-h-[95vh]">
        {/* Top Header Actions */}
        <div className="px-8 py-6 border-b border-outline-variant bg-surface sticky top-0 z-10">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-black text-secondary uppercase tracking-widest">
                Compliance Engine / Policy Rulesets
                <span className="material-symbols-outlined text-[13px] text-secondary">auto_awesome</span>
              </div>
              <h1 className="text-2xl font-black text-primary mt-1 tracking-tight">Policy Documents</h1>
              <p className="text-xs text-on-surface-variant mt-1 whitespace-nowrap block">
                Manage corporate guidelines and track AI rule extraction from policy documents.
              </p>
            </div>
          </div>
        </div>

        {/* Main Upload Area */}
        <div className="flex-grow flex items-center justify-center p-8 max-w-[1200px] mx-auto w-full">
          <div className="w-full max-w-xl border-2 border-dashed border-outline-variant/70 rounded-2xl p-10 bg-white flex flex-col items-center justify-center text-center gap-5 shadow-sm">
            <div className="w-14 h-14 rounded-2xl border border-outline-variant flex items-center justify-center text-secondary bg-surface-container shadow-sm animate-pulse">
              <span className="material-symbols-outlined text-[32px]">upload_file</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-primary">No policy rulesets configured</h2>
              <p className="text-xs text-on-surface-variant mt-2 max-w-sm mx-auto leading-relaxed">
                Please upload your organization's Travel & Expense policy document (PDF or TXT) to automatically parse compliance rules and begin auditing transactions.
              </p>
            </div>
            
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt"
              hidden
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            />
            <button 
              className="px-5 py-2.5 bg-primary hover:opacity-90 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <span className="material-symbols-outlined text-[16px]">publish</span>
              {uploading ? "Analyzing Document..." : "Upload Policy Document"}
            </button>
          </div>
        </div>

        {/* Uploading progress modal */}
        {uploading && (
          <div className="fixed inset-0 bg-[#0c0e12]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-outline-variant rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-outline-variant/60 flex justify-between items-center bg-white">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <span className="material-symbols-outlined text-secondary text-[20px]">shield</span>
                  Upload & Analyze Policy
                </div>
                <button 
                  onClick={() => setUploading(false)}
                  className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                
                {/* Scan Card Container */}
                <div className="border border-dashed border-secondary/50 rounded-xl p-6 bg-secondary/5 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-outline-variant shadow flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[26px]">find_in_page</span>
                  </div>
                  <div>
                    <div className="text-xs font-black text-primary">Analyzing Policy Document...</div>
                    <div className="text-[10px] text-on-surface-variant font-mono mt-0.5">Global_TE_Policy_2026.pdf</div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full space-y-1.5 mt-2">
                    <div className="flex justify-between items-center text-[9px] font-black text-secondary">
                      <span>PROCESSING DATA</span>
                      <span>65%</span>
                    </div>
                    <div className="w-full bg-[#e8eaed] h-2 rounded-full overflow-hidden border border-outline-variant/30">
                      <div className="h-full bg-secondary rounded-full" style={{ width: "65%" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Otherwise, render list of all uploaded policies
  return (
    <div className="flex flex-col h-full bg-background text-on-background min-h-[95vh]">
      
      {/* Top Header Actions */}
      <div className="px-8 py-6 border-b border-outline-variant bg-surface sticky top-0 z-10">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-black text-secondary uppercase tracking-widest">
              Compliance Engine / Policy Rulesets
              <span className="material-symbols-outlined text-[13px] text-secondary">auto_awesome</span>
            </div>
            <h1 className="text-2xl font-black text-primary mt-1 tracking-tight">Policy Documents</h1>
            <p className="text-xs text-on-surface-variant mt-1 whitespace-nowrap block">
              Manage corporate guidelines and track AI rule extraction from policy documents. Select a document below to edit or verify its active rules.
            </p>
          </div>
          
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt"
              hidden
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            />
            <button 
              className="px-4 py-2 bg-primary hover:opacity-90 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-2 shadow-sm"
              onClick={() => fileRef.current?.click()}
            >
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              {uploading ? "Processing…" : "Upload Policy (PDF)"}
            </button>
          </div>
        </div>
      </div>

      {/* Policies grid */}
      <div className="p-8 space-y-6 max-w-[1200px] mx-auto w-full">
        {status && (
          <div className="rounded-xl border border-secondary/20 bg-secondary/5 px-4 py-3 text-xs text-secondary">
            {status}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {uploadedPolicies.map((policy) => (
            <div
              key={policy.id}
              onClick={() => setSelectedPolicy(policy)}
              className="border border-outline-variant/65 rounded-xl bg-white p-6 shadow-sm hover:border-secondary hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <h3 className="text-sm font-bold text-primary mb-1 mt-2">{policy.name}</h3>
                <p className="text-[11px] text-on-surface-variant font-semibold flex items-center gap-1 mb-4">
                  <span className="material-symbols-outlined text-[14px]">description</span>
                  {policy.fileName}
                </p>

                <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-outline-variant/40 my-4 text-[11px]">
                  <div>
                    <span className="text-on-surface-variant block font-medium">Extracted Rules</span>
                    <span className="font-bold text-primary text-sm">{policy.rulesCount} Rules</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block font-medium">Uploaded By</span>
                    <span className="font-bold text-primary text-sm truncate max-w-full block">{policy.uploadedBy}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-semibold mt-2">
                <span>Size: {policy.fileSize} • {policy.uploadedAt}</span>
                <span className="text-secondary font-bold flex items-center gap-0.5 group">
                  Review Rules 
                  <span className="material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Uploading progress modal */}
      {uploading && (
        <div className="fixed inset-0 bg-[#0c0e12]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-outline-variant/60 flex justify-between items-center bg-white">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <span className="material-symbols-outlined text-secondary text-[20px]">shield</span>
                Upload & Analyze Policy
              </div>
              <button 
                onClick={() => setUploading(false)}
                className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* Scan Card Container */}
              <div className="border border-dashed border-secondary/50 rounded-xl p-6 bg-secondary/5 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white border border-outline-variant shadow flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[26px]">find_in_page</span>
                </div>
                <div>
                  <div className="text-xs font-black text-primary">Analyzing Policy Document...</div>
                  <div className="text-[10px] text-on-surface-variant font-mono mt-0.5">Q3_Global_T_and_E_Policy_v4.pdf</div>
                </div>
                
                {/* Progress bar */}
                <div className="w-full space-y-1.5 mt-2">
                  <div className="flex justify-between items-center text-[9px] font-black text-secondary">
                    <span>PROCESSING DATA</span>
                    <span>65%</span>
                  </div>
                  <div className="w-full bg-[#e8eaed] h-2 rounded-full overflow-hidden border border-outline-variant/30">
                    <div className="h-full bg-secondary rounded-full" style={{ width: "65%" }}></div>
                  </div>
                </div>
              </div>

              {/* Extraction Insights Checklist */}
              <div className="space-y-3">
                <div className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">Extraction Insights</div>
                
                <div className="space-y-2.5">
                  {/* Item 1 */}
                  <div className="flex items-start gap-3 bg-[#f8f9fa] border border-outline-variant/50 rounded-xl p-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 mt-0.5 shrink-0">
                      <span className="material-symbols-outlined text-[13px]">done</span>
                    </span>
                    <div>
                      <div className="text-[11px] font-bold text-primary">Identifying spending thresholds...</div>
                      <div className="text-[10px] text-on-surface-variant font-medium mt-0.5">Found 14 distinct categorical limits.</div>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="flex items-start gap-3 bg-[#f8f9fa] border border-outline-variant/50 rounded-xl p-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 mt-0.5 shrink-0">
                      <span className="material-symbols-outlined text-[13px]">done</span>
                    </span>
                    <div>
                      <div className="text-[11px] font-bold text-primary">Extracting MCC restrictions...</div>
                      <div className="text-[10px] text-on-surface-variant font-medium mt-0.5">Mapped 42 blocked merchant categories.</div>
                    </div>
                  </div>

                  {/* Item 3 */}
                  <div className="flex items-start gap-3 bg-secondary/5 border border-secondary/20 rounded-xl p-3">
                    <span className="w-5 h-5 rounded-full bg-secondary/10 text-secondary flex items-center justify-center border border-secondary/20 mt-0.5 shrink-0 animate-spin">
                      <span className="material-symbols-outlined text-[13px]">progress_activity</span>
                    </span>
                    <div>
                      <div className="text-[11px] font-bold text-primary">Mapping approval hierarchies...</div>
                      <div className="text-[10px] text-on-surface-variant font-medium mt-0.5">Cross-referencing organizational chart data.</div>
                    </div>
                  </div>

                  {/* Item 4 */}
                  <div className="flex items-start gap-3 opacity-55 p-3">
                    <span className="w-5 h-5 rounded-full bg-[#f1f3f4] text-on-surface-variant flex items-center justify-center border border-outline-variant mt-0.5 shrink-0">
                      <span className="material-symbols-outlined text-[13px]">circle</span>
                    </span>
                    <div>
                      <div className="text-[11px] font-bold text-primary">Synthesizing anomaly detection rules...</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#f8f9fa] border-t border-outline-variant/60 flex justify-between items-center">
              <div className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px]">info</span>
                Analysis may take up to 60 seconds.
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setUploading(false)}
                  className="px-4 py-2 border border-outline-variant bg-white hover:bg-surface-container-low text-primary font-bold rounded-lg text-xs transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  disabled
                  className="px-4 py-2 bg-[#f1f3f4] border border-outline-variant/50 text-[#c6c6cd] font-bold rounded-lg text-xs cursor-not-allowed flex items-center gap-1"
                >
                  Next: Review Rules
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
