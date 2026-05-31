import { useEffect, useMemo, useRef, useState } from "react";
import {
  analyze,
  createRule,
  deleteRule,
  getRules,
  updateRule,
  uploadPolicy,
} from "../api/client";
import { useAsync } from "../hooks/useAsync";
import type { Policy, Severity } from "../types";

type EnforcedRuleType =
  | "AMOUNT_LIMIT"
  | "MCC_BANNED"
  | "RECEIPT_REQUIRED"
  | "BUDGET_CAP"
  | "FX_THRESHOLD";

type RuleDraft = {
  policy_id?: number;
  rule_name: string;
  rule_type: string;
  severity: Severity;
  is_active: boolean;
  source_text: string;
  max_amount_usd: string;
  applies_to_mcc: string;
  requires_pre_authorization: boolean;
  mcc_codes: string;
  description: string;
  min_amount_usd: string;
  department: string;
  limit_cad: string;
  max_amount_cad: string;
};

const ENFORCED_RULE_TYPES: { value: EnforcedRuleType; label: string }[] = [
  { value: "AMOUNT_LIMIT", label: "Amount limit" },
  { value: "RECEIPT_REQUIRED", label: "Receipt required" },
  { value: "MCC_BANNED", label: "Blocked MCC" },
  { value: "BUDGET_CAP", label: "Monthly budget cap" },
  { value: "FX_THRESHOLD", label: "FX threshold" },
];

const SEVERITIES: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const DEFAULT_DRAFT: RuleDraft = {
  rule_name: "",
  rule_type: "AMOUNT_LIMIT",
  severity: "MEDIUM",
  is_active: true,
  source_text: "Custom rule",
  max_amount_usd: "50",
  applies_to_mcc: "",
  requires_pre_authorization: true,
  mcc_codes: "",
  description: "",
  min_amount_usd: "50",
  department: "",
  limit_cad: "",
  max_amount_cad: "68.95",
};

function isEnforcedRuleType(ruleType: string): ruleType is EnforcedRuleType {
  return ENFORCED_RULE_TYPES.some((option) => option.value === ruleType);
}

function textValue(value: unknown, fallback = "") {
  return value === undefined || value === null ? fallback : String(value);
}

function numberValue(value: unknown, fallback: string) {
  return value === undefined || value === null || value === "" ? fallback : String(value);
}

function listValue(value: unknown) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function boolValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function money(value: unknown, fallback = 0) {
  const numeric = Number(value ?? fallback);
  return Number.isFinite(numeric) ? `$${numeric.toFixed(numeric % 1 === 0 ? 0 : 2)}` : "$0";
}

function policyToDraft(policy: Policy): RuleDraft {
  const params = policy.rule_parameters || {};
  return {
    ...DEFAULT_DRAFT,
    policy_id: policy.policy_id,
    rule_name: policy.rule_name,
    rule_type: policy.rule_type,
    severity: policy.severity,
    is_active: policy.is_active,
    source_text: policy.source_text || "",
    max_amount_usd: numberValue(params.max_amount_usd, "50"),
    applies_to_mcc: listValue(params.applies_to_mcc),
    requires_pre_authorization: boolValue(params.requires_pre_authorization, true),
    mcc_codes: listValue(params.mcc_codes),
    description: textValue(params.description),
    min_amount_usd: numberValue(params.min_amount_usd, "50"),
    department: textValue(params.department),
    limit_cad: numberValue(params.limit_cad, ""),
    max_amount_cad: numberValue(params.max_amount_cad, "68.95"),
  };
}

function draftToPolicy(draft: RuleDraft): Omit<Policy, "policy_id"> {
  let rule_parameters: Record<string, unknown> = {};

  if (draft.rule_type === "AMOUNT_LIMIT") {
    rule_parameters = {
      max_amount_usd: Number(draft.max_amount_usd || 0),
      applies_to_mcc: parseList(draft.applies_to_mcc).length
        ? parseList(draft.applies_to_mcc)
        : null,
      requires_pre_authorization: draft.requires_pre_authorization,
    };
  }

  if (draft.rule_type === "MCC_BANNED") {
    rule_parameters = {
      mcc_codes: parseList(draft.mcc_codes),
      description: draft.description || draft.rule_name,
    };
  }

  if (draft.rule_type === "RECEIPT_REQUIRED") {
    rule_parameters = {
      min_amount_usd: Number(draft.min_amount_usd || 0),
    };
  }

  if (draft.rule_type === "BUDGET_CAP") {
    rule_parameters = {
      period: "MONTHLY",
      department: draft.department.trim() || null,
      limit_cad: draft.limit_cad ? Number(draft.limit_cad) : null,
    };
  }

  if (draft.rule_type === "FX_THRESHOLD") {
    rule_parameters = {
      max_amount_cad: Number(draft.max_amount_cad || 0),
      requires_pre_authorization: draft.requires_pre_authorization,
      note: draft.description,
    };
  }

  return {
    rule_name: draft.rule_name.trim(),
    rule_type: draft.rule_type,
    rule_parameters,
    severity: draft.severity,
    is_active: draft.is_active,
    source_text: draft.source_text.trim() || null,
  };
}

function conditionLabel(policy: Policy) {
  const params = policy.rule_parameters || {};
  if (policy.rule_type === "AMOUNT_LIMIT") {
    const scope = Array.isArray(params.applies_to_mcc) ? ` for MCC ${params.applies_to_mcc.join(", ")}` : "";
    return `${params.requires_pre_authorization === false ? "Expense amount" : "Expense without pre-auth"}${scope}`;
  }
  if (policy.rule_type === "MCC_BANNED") {
    return `MCC in ${Array.isArray(params.mcc_codes) ? params.mcc_codes.join(", ") : "blocked list"}`;
  }
  if (policy.rule_type === "RECEIPT_REQUIRED") return "Missing receipt";
  if (policy.rule_type === "BUDGET_CAP") return params.department ? `Department: ${params.department}` : "Monthly spend";
  if (policy.rule_type === "FX_THRESHOLD") return params.requires_pre_authorization === false ? "CAD amount" : "CAD amount without pre-auth";
  if (policy.rule_type === "TIP_CAP") return "Tip percentage";
  if (policy.rule_type === "VEHICLE_RESTRICTION") return "Rental car booking";
  if (policy.rule_type === "EXCLUDED_REIMBURSEMENT") return "Excluded reimbursement";
  if (policy.rule_type === "CARD_USAGE_RESTRICTION") return "Corporate card user";
  return policy.rule_type;
}

function constraintLabel(policy: Policy) {
  const params = policy.rule_parameters || {};
  if (policy.rule_type === "AMOUNT_LIMIT") return `Over ${money(params.max_amount_usd, 50)} USD`;
  if (policy.rule_type === "MCC_BANNED") return "Declined";
  if (policy.rule_type === "RECEIPT_REQUIRED") return `Over ${money(params.min_amount_usd, 50)} USD`;
  if (policy.rule_type === "BUDGET_CAP") {
    return params.limit_cad ? `Over ${money(params.limit_cad)} CAD` : "Employee monthly budget";
  }
  if (policy.rule_type === "FX_THRESHOLD") return `Over ${money(params.max_amount_cad, 68.95)} CAD`;
  if (policy.rule_type === "TIP_CAP") return `${params.max_tip_pct || 15}% cap`;
  if (policy.rule_type === "VEHICLE_RESTRICTION") return "4+ travelers required";
  if (policy.rule_type === "EXCLUDED_REIMBURSEMENT") return "Non-reimbursable";
  if (policy.rule_type === "CARD_USAGE_RESTRICTION") return "Authorized user only";
  return "Stored";
}

export function PolicyManager() {
  const { data, loading, error, reload } = useAsync(getRules, []);
  const rules = data || [];
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [goingLive, setGoingLive] = useState(false);
  const [ruleDraft, setRuleDraft] = useState<RuleDraft | null>(null);
  const [uploadedPolicies, setUploadedPolicies] = useState<any[]>(() => {
    const saved = localStorage.getItem("uploaded_policies");
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const activePolicyCard = useMemo(
    () => ({
      id: "p_loaded_db",
      name: "CanHealth Expense Policy",
      fileName: "CanHealth_Expense_Policy.pdf",
      rulesCount: rules.length,
      uploadedAt: "Active Database Ruleset",
      uploadedBy: "Finance Manager",
      fileSize: "1.2 MB",
    }),
    [rules.length],
  );

  useEffect(() => {
    if (rules.length > 0 && uploadedPolicies.length === 0) {
      setUploadedPolicies([activePolicyCard]);
      localStorage.setItem("uploaded_policies", JSON.stringify([activePolicyCard]));
    }
  }, [activePolicyCard, rules.length, uploadedPolicies.length]);

  useEffect(() => {
    if (uploadedPolicies.length > 0 && rules.length > 0) {
      const updated = uploadedPolicies.map((policy) => ({ ...policy, rulesCount: rules.length }));
      const changed = updated.some((policy, index) => policy.rulesCount !== uploadedPolicies[index].rulesCount);
      if (changed) {
        setUploadedPolicies(updated);
        localStorage.setItem("uploaded_policies", JSON.stringify(updated));
      }
    }
  }, [rules.length, uploadedPolicies]);

  const onUpload = async (file: File) => {
    setUploading(true);
    setStatus("Processing policy and extracting rules with Gemini.");
    try {
      const res = await uploadPolicy(file);
      setStatus(`Extracted ${res.rules_extracted} rules successfully.`);
      const newPolicy = {
        id: `p_uploaded_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
        fileName: file.name,
        rulesCount: res.rules_extracted || 0,
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

  const toggle = async (policy: Policy) => {
    await updateRule(policy.policy_id, { is_active: !policy.is_active });
    reload();
  };

  const openNewRule = () => {
    setRuleDraft({ ...DEFAULT_DRAFT });
  };

  const openEditRule = (policy: Policy) => {
    setRuleDraft(policyToDraft(policy));
  };

  const saveRule = async () => {
    if (!ruleDraft || !ruleDraft.rule_name.trim()) {
      setStatus("Rule name is required.");
      return;
    }
    if (!isEnforcedRuleType(ruleDraft.rule_type) && !ruleDraft.policy_id) {
      setStatus("Choose a supported rule type.");
      return;
    }

    setSavingRule(true);
    try {
      const payload = draftToPolicy(ruleDraft);
      if (ruleDraft.policy_id) {
        await updateRule(ruleDraft.policy_id, payload);
        setStatus("Rule updated.");
      } else {
        await createRule(payload);
        setStatus("Custom rule added.");
      }
      setRuleDraft(null);
      reload();
    } catch {
      setStatus("Rule save failed.");
    } finally {
      setSavingRule(false);
    }
  };

  const removeRule = async (policy: Policy) => {
    const confirmed = window.confirm(`Delete "${policy.rule_name}"?`);
    if (!confirmed) return;

    try {
      await deleteRule(policy.policy_id);
      setStatus("Rule deleted.");
      reload();
    } catch {
      setStatus("Rule delete failed.");
    }
  };

  const saveAndGoLive = async () => {
    setGoingLive(true);
    setStatus("Running policy analysis with the current rules.");
    try {
      const result = await analyze();
      setStatus(
        `Rules are live. ${result.violations_found} violations, ${result.reviews_found} reviews, ${result.compliant} compliant.`,
      );
      reload();
    } catch {
      setStatus("Rules saved, but analysis failed.");
    } finally {
      setGoingLive(false);
    }
  };

  const updateDraft = (patch: Partial<RuleDraft>) => {
    setRuleDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const renderRuleFields = () => {
    if (!ruleDraft) return null;

    if (!isEnforcedRuleType(ruleDraft.rule_type)) {
      return (
        <div className="rounded-lg border border-outline-variant/60 bg-[#f8f9fa] px-3 py-2 text-xs text-on-surface-variant">
          This extracted rule is stored for review, but the current transaction data does not expose the fields required for deterministic execution.
        </div>
      );
    }

    if (ruleDraft.rule_type === "MCC_BANNED") {
      return (
        <>
          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">MCC codes</span>
            <input
              value={ruleDraft.mcc_codes}
              onChange={(event) => updateDraft({ mcc_codes: event.target.value })}
              placeholder="5813, 7995"
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold outline-none focus:border-secondary"
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Reason</span>
            <input
              value={ruleDraft.description}
              onChange={(event) => updateDraft({ description: event.target.value })}
              placeholder="Restricted category"
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold outline-none focus:border-secondary"
            />
          </label>
        </>
      );
    }

    if (ruleDraft.rule_type === "RECEIPT_REQUIRED") {
      return (
        <label className="space-y-1.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Receipt threshold USD</span>
          <input
            type="number"
            min="0"
            value={ruleDraft.min_amount_usd}
            onChange={(event) => updateDraft({ min_amount_usd: event.target.value })}
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold outline-none focus:border-secondary"
          />
        </label>
      );
    }

    if (ruleDraft.rule_type === "BUDGET_CAP") {
      return (
        <>
          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Department</span>
            <input
              value={ruleDraft.department}
              onChange={(event) => updateDraft({ department: event.target.value })}
              placeholder="Optional"
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold outline-none focus:border-secondary"
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Monthly cap CAD</span>
            <input
              type="number"
              min="0"
              value={ruleDraft.limit_cad}
              onChange={(event) => updateDraft({ limit_cad: event.target.value })}
              placeholder="Employee budget if blank"
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold outline-none focus:border-secondary"
            />
          </label>
        </>
      );
    }

    const amountKey = ruleDraft.rule_type === "FX_THRESHOLD" ? "max_amount_cad" : "max_amount_usd";
    const amountValue = ruleDraft[amountKey];
    const amountLabel = ruleDraft.rule_type === "FX_THRESHOLD" ? "CAD threshold" : "USD limit";

    return (
      <>
        <label className="space-y-1.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{amountLabel}</span>
          <input
            type="number"
            min="0"
            value={amountValue}
            onChange={(event) => updateDraft({ [amountKey]: event.target.value } as Partial<RuleDraft>)}
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold outline-none focus:border-secondary"
          />
        </label>
        {ruleDraft.rule_type === "AMOUNT_LIMIT" && (
          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">MCC filter</span>
            <input
              value={ruleDraft.applies_to_mcc}
              onChange={(event) => updateDraft({ applies_to_mcc: event.target.value })}
              placeholder="Optional comma-separated MCCs"
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold outline-none focus:border-secondary"
            />
          </label>
        )}
        <label className="flex items-center gap-2 text-xs font-bold text-primary">
          <input
            type="checkbox"
            checked={ruleDraft.requires_pre_authorization}
            onChange={(event) => updateDraft({ requires_pre_authorization: event.target.checked })}
            className="h-4 w-4 rounded border-outline-variant"
          />
          Require missing pre-authorization
        </label>
      </>
    );
  };

  const ruleModal = ruleDraft && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0e12]/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-outline-variant bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant/60 px-5 py-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-secondary">Policy rule</div>
            <h2 className="text-xl font-serif font-medium text-primary">{ruleDraft.policy_id ? "Edit rule" : "Add custom rule"}</h2>
          </div>
          <button
            onClick={() => setRuleDraft(null)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <label className="space-y-1.5 md:col-span-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Rule name</span>
            <input
              value={ruleDraft.rule_name}
              onChange={(event) => updateDraft({ rule_name: event.target.value })}
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold outline-none focus:border-secondary"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Rule type</span>
            {isEnforcedRuleType(ruleDraft.rule_type) ? (
              <select
                value={ruleDraft.rule_type}
                onChange={(event) => updateDraft({ rule_type: event.target.value })}
                className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-secondary"
              >
                {ENFORCED_RULE_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                readOnly
                value={ruleDraft.rule_type}
                className="w-full rounded-lg border border-outline-variant bg-[#f8f9fa] px-3 py-2 text-xs font-semibold outline-none"
              />
            )}
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Severity</span>
            <select
              value={ruleDraft.severity}
              onChange={(event) => updateDraft({ severity: event.target.value as Severity })}
              className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-secondary"
            >
              {SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </label>

          {renderRuleFields()}

          <label className="space-y-1.5 md:col-span-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Source text</span>
            <textarea
              value={ruleDraft.source_text}
              onChange={(event) => updateDraft({ source_text: event.target.value })}
              rows={3}
              className="w-full resize-none rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold outline-none focus:border-secondary"
            />
          </label>

          <label className="flex items-center gap-2 text-xs font-bold text-primary md:col-span-2">
            <input
              type="checkbox"
              checked={ruleDraft.is_active}
              onChange={(event) => updateDraft({ is_active: event.target.checked })}
              className="h-4 w-4 rounded border-outline-variant"
            />
            Active
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-outline-variant/60 bg-[#f8f9fa] px-5 py-4">
          <button
            onClick={() => setRuleDraft(null)}
            className="rounded-lg border border-outline-variant bg-white px-4 py-2 text-xs font-bold text-primary hover:bg-surface-container-low"
          >
            Cancel
          </button>
          <button
            onClick={saveRule}
            disabled={savingRule}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            {savingRule ? "Saving..." : "Save rule"}
          </button>
        </div>
      </div>
    </div>
  );

  if (selectedPolicy) {
    return (
      <div className="flex min-h-[95vh] flex-col bg-background text-on-background">
        <div className="sticky top-0 z-20 border-b border-outline-variant/60 bg-background px-8 py-5 shadow-sm">
          <button
            onClick={() => setSelectedPolicy(null)}
            className="mb-4 flex items-center gap-1.5 text-xs font-bold text-on-surface-variant transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Policy Documents
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-secondary">
                Policy Extractor / {selectedPolicy.name}
                <span className="material-symbols-outlined text-[13px] text-secondary">auto_awesome</span>
              </div>
              <h1 className="mt-1 text-3xl font-serif font-medium tracking-tight text-primary">Review Extracted Rules</h1>
              <p className="mt-1 max-w-2xl text-xs text-on-surface-variant">
                AI has processed `{selectedPolicy.fileName}` into structured rules. Review, edit, and publish the active rules below.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedPolicy(null)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-surface-container-low"
              >
                Close
              </button>
              <button
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
                onClick={saveAndGoLive}
                disabled={goingLive}
              >
                <span className="material-symbols-outlined text-[16px]">publish</span>
                {goingLive ? "Analyzing..." : "Save & Go Live"}
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1200px] space-y-6 p-8">
          {(status || error) && (
            <div className="rounded-xl border border-secondary/20 bg-secondary/5 px-4 py-3 text-xs font-semibold text-secondary">
              {status || error}
            </div>
          )}

          {loading && <div className="text-xs text-on-surface-variant">Loading rules...</div>}

          <div className="space-y-4">
            {rules.map((policy, index) => (
              <div
                key={policy.policy_id}
                className={`rounded-xl border border-outline-variant/60 bg-white p-6 shadow-sm transition-opacity duration-200 ${
                  policy.is_active ? "opacity-100" : "opacity-60"
                }`}
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/50 bg-surface-container text-secondary">
                      <span className="material-symbols-outlined text-[20px]">assignment</span>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-primary">
                          Rule {index + 1}: {policy.rule_name}
                        </span>
                        <span className="rounded-md border border-outline-variant bg-[#f8f9fa] px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                          {policy.severity}
                        </span>
                        {!isEnforcedRuleType(policy.rule_type) && (
                          <span className="rounded-md border border-outline-variant bg-white px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                            REVIEW
                          </span>
                        )}
                        <button
                          onClick={() => toggle(policy)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            policy.is_active ? "bg-secondary" : "bg-surface-container-high"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              policy.is_active ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditRule(policy)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={() => removeRule(policy)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      Condition
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={conditionLabel(policy)}
                      className="w-full rounded-lg border border-outline-variant/60 bg-[#f8f9fa] px-3 py-2 text-xs font-semibold text-on-background outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      Constraint
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={constraintLabel(policy)}
                      className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-xs font-semibold text-on-background outline-none"
                    />
                  </div>
                </div>

                {policy.source_text && (
                  <div className="mt-4 flex items-start gap-1.5 text-[11px] font-medium leading-relaxed text-on-surface-variant">
                    <span className="material-symbols-outlined mt-0.5 text-[13px] text-secondary">format_quote</span>
                    <span className="italic">Extracted from Document Source: "{policy.source_text}"</span>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={openNewRule}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant/60 bg-transparent p-6 transition-all hover:border-secondary/60 hover:bg-surface-container-low/20"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">add</span>
              </div>
              <span className="text-xs font-bold text-on-surface-variant">Add Custom Rule</span>
            </button>
          </div>
        </div>
        {ruleModal}
      </div>
    );
  }

  if (uploadedPolicies.length === 0) {
    return (
      <div className="flex min-h-[95vh] flex-col bg-background text-on-background">
        <div className="sticky top-0 z-10 border-b border-outline-variant bg-background px-8 py-6">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-secondary">
              Compliance Engine / Policy Rulesets
              <span className="material-symbols-outlined text-[13px] text-secondary">auto_awesome</span>
            </div>
            <h1 className="mt-1 text-3xl font-serif font-medium tracking-tight text-primary">Policy Documents</h1>
            <p className="mt-1 block text-xs text-on-surface-variant">
              Manage corporate guidelines and track AI rule extraction from policy documents.
            </p>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[1200px] flex-grow items-center justify-center p-8">
          <div className="flex w-full max-w-xl flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed border-outline-variant/70 bg-white p-10 text-center shadow-sm">
            <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl border border-outline-variant bg-surface-container text-secondary shadow-sm">
              <span className="material-symbols-outlined text-[32px]">upload_file</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-primary">No policy rulesets configured</h2>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-on-surface-variant">
                Please upload your organization's Travel & Expense policy document to automatically parse compliance rules and begin auditing transactions.
              </p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt"
              hidden
              onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0])}
            />
            <button
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:opacity-90"
              onClick={() => fileRef.current?.click()}
            >
              <span className="material-symbols-outlined text-[16px]">publish</span>
              {uploading ? "Analyzing Document..." : "Upload Policy Document"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[95vh] flex-col bg-background text-on-background">
      <div className="sticky top-0 z-10 border-b border-outline-variant bg-background px-8 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-secondary">
              Compliance Engine / Policy Rulesets
              <span className="material-symbols-outlined text-[13px] text-secondary">auto_awesome</span>
            </div>
            <h1 className="mt-1 text-3xl font-serif font-medium tracking-tight text-primary">Policy Documents</h1>
            <p className="mt-1 block text-xs text-on-surface-variant">
              Manage corporate guidelines and track AI rule extraction from policy documents. Select a document below to edit or verify its active rules.
            </p>
          </div>

          <div className="mt-2 lg:mt-6">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt"
              hidden
              onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0])}
            />
            <button
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:opacity-90"
              onClick={() => fileRef.current?.click()}
            >
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              {uploading ? "Processing..." : "Upload Policy (PDF)"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1200px] space-y-6 p-8">
        {(status || error) && (
          <div className="rounded-xl border border-secondary/20 bg-secondary/5 px-4 py-3 text-xs font-semibold text-secondary">
            {status || error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {uploadedPolicies.map((policy) => (
            <div
              key={policy.id}
              onClick={() => setSelectedPolicy(policy)}
              className="flex cursor-pointer flex-col justify-between rounded-xl border border-outline-variant/65 bg-white p-6 shadow-sm transition-all duration-200 hover:border-secondary hover:shadow-md"
            >
              <div>
                <h3 className="mb-1 mt-2 text-sm font-bold text-primary">{policy.name}</h3>
                <p className="mb-4 flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]">description</span>
                  {policy.fileName}
                </p>

                <div className="my-4 grid grid-cols-2 gap-4 border-y border-outline-variant/40 py-3 text-[11px]">
                  <div>
                    <span className="block font-medium text-on-surface-variant">Extracted Rules</span>
                    <span className="text-sm font-bold text-primary">{policy.rulesCount} Rules</span>
                  </div>
                  <div>
                    <span className="block font-medium text-on-surface-variant">Uploaded By</span>
                    <span className="block max-w-full truncate text-sm font-bold text-primary">{policy.uploadedBy}</span>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-on-surface-variant">
                <span>Size: {policy.fileSize} | {policy.uploadedAt}</span>
                <span className="group flex items-center gap-0.5 font-bold text-secondary">
                  Review Rules
                  <span className="material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
