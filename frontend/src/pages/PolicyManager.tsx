import { useRef, useState } from "react";
import { getRules, updateRule, uploadPolicy } from "../api/client";
import { SeverityBadge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { useAsync } from "../hooks/useAsync";
import type { Policy } from "../types";

const TYPE_LABEL: Record<string, string> = {
  AMOUNT_LIMIT: "Amount Limit",
  FX_THRESHOLD: "FX Threshold",
  MCC_BANNED: "Banned Category",
  TIP_CAP: "Tip Cap",
  RECEIPT_REQUIRED: "Receipt Required",
  BUDGET_CAP: "Budget Cap",
};

export function PolicyManager() {
  const { data, loading, reload } = useAsync(getRules, []);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onUpload = async (file: File) => {
    setUploading(true);
    setStatus("Processing Policy… extracting rules with Gemini");
    try {
      const res = await uploadPolicy(file);
      setStatus(
        `Extracted ${res.rules_extracted} rules` +
          (res.used_fallback ? " (deterministic fallback — no/invalid AI output)" : "")
      );
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

  return (
    <div>
      <PageHeader
        title="Policy Manager"
        subtitle="Upload a policy PDF → editable rules. One-time parse, reused on every transaction."
        action={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt"
              hidden
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            />
            <button
              className="btn-primary"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Processing…" : "Upload Policy PDF"}
            </button>
          </>
        }
      />

      {status && (
        <div className="card mb-5 border-brim-500/30 bg-brim-500/5 px-4 py-3 text-sm text-brim-300">
          {status}
        </div>
      )}

      {loading && <div className="text-slate-500">Loading rules…</div>}

      <div className="space-y-3">
        {data?.map((p) => (
          <div
            key={p.policy_id}
            className={`card p-4 ${p.is_active ? "" : "opacity-50"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SeverityBadge severity={p.severity} />
                <span className="text-sm font-semibold text-slate-100">{p.rule_name}</span>
                <span className="rounded-md bg-ink-800 px-2 py-0.5 text-[11px] text-slate-400">
                  {TYPE_LABEL[p.rule_type] || p.rule_type}
                </span>
              </div>
              <button
                onClick={() => toggle(p)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                  p.is_active
                    ? "bg-brim-500/15 text-brim-400"
                    : "bg-ink-800 text-slate-500"
                }`}
              >
                {p.is_active ? "Active" : "Inactive"}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(p.rule_parameters).map(([k, v]) => (
                <code
                  key={k}
                  className="rounded-md bg-ink-900/60 px-2 py-0.5 font-mono text-[11px] text-slate-400"
                >
                  {k}: {JSON.stringify(v)}
                </code>
              ))}
            </div>
            {p.source_text && (
              <p className="mt-2 border-l-2 border-ink-600 pl-3 text-xs italic text-slate-500">
                “{p.source_text}”
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
