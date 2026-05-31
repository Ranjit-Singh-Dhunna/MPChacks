import { motion } from "framer-motion";
import { cardEnter } from "../../lib/motion";
import { IntelligenceChip } from "../ui/IntelligenceChip";
import { SmurfingViz } from "./SmurfingViz";
import { OutlierViz } from "./OutlierViz";
import { SplitBillingViz } from "./SplitBillingViz";
import { StructuringViz } from "./StructuringViz";
import type { FraudCluster, Transaction } from "../../types";
import type { Severity } from "../../types";

const PATTERN_LABELS: Record<string, string> = {
  SMURFING: "Smurfing / Threshold Bypass",
  SPLIT_BILLING: "Split Billing — Collusion",
  STRUCTURING: "Round-Number Structuring",
  OUTLIER: "Statistical Outlier",
  SHELL_VENDOR: "Shell Vendor",
};

const HEADER_STYLES: Record<string, string> = {
  CRITICAL: "bg-error-container/30 border-l-4 border-l-error",
  HIGH: "bg-orange-50 border-l-4 border-l-orange-400",
  MEDIUM: "bg-amber-50 border-l-4 border-l-amber-300",
  LOW: "bg-surface-container border-l-4 border-l-gray-300",
};

const SEV_TEXT: Record<string, string> = {
  CRITICAL: "text-error",
  HIGH: "text-orange-700",
  MEDIUM: "text-amber-700",
  LOW: "text-on-surface-variant",
};

const SEV_BG: Record<string, string> = {
  CRITICAL: "bg-error-container",
  HIGH: "bg-orange-50 border border-orange-200",
  MEDIUM: "bg-amber-50 border border-amber-200",
  LOW: "bg-surface-container border border-outline-variant",
};

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${SEV_BG[severity]} ${SEV_TEXT[severity]}`}
    >
      {severity === "CRITICAL" && (
        <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
      )}
      {severity}
    </span>
  );
}

interface Props {
  cluster: FraudCluster;
  index: number;
  transactions: Transaction[];
  onViewTransactions: () => void;
}

export function ClusterCard({ cluster, index, transactions, onViewTransactions }: Props) {
  const headerStyle = HEADER_STYLES[cluster.severity] ?? HEADER_STYLES.LOW;
  const isAI = !!cluster.ai_narrative;

  // Extract extra context from the description for visualizations
  const extractZScore = () => {
    const match = cluster.description?.match(/([\d.]+)σ/);
    return match ? parseFloat(match[1]) : 5;
  };

  const firstSeen =
    cluster.pattern_type === "SHELL_VENDOR" || cluster.pattern_type === "STRUCTURING"
      ? transactions[0]?.transaction_date
      : undefined;

  return (
    <motion.div
      className="bg-white rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden"
      {...cardEnter(index)}
      whileHover={{ boxShadow: "0 12px 40px -10px rgba(0,81,213,0.12)" }}
    >
      {/* HEADER BAND */}
      <div className={`px-5 py-4 border-b border-outline-variant/40 flex justify-between items-start ${headerStyle}`}>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge severity={cluster.severity as Severity} />
            <span className="text-sm font-bold text-primary">
              {PATTERN_LABELS[cluster.pattern_type] ?? cluster.pattern_type}
            </span>
          </div>
          <div className="text-[11px] text-on-surface-variant mt-1">
            {cluster.cluster_id} · {cluster.transaction_ids.length} transactions ·{" "}
            {cluster.employee_names.join(", ")}
          </div>
        </div>
        <div className="text-right shrink-0 ml-3">
          <div className="text-2xl font-black font-mono text-primary">
            {cluster.total_amount_cad.toLocaleString("en-CA", {
              style: "currency",
              currency: "CAD",
              maximumFractionDigits: 0,
            })}
          </div>
          <div className="text-[10px] text-on-surface-variant">Risk {cluster.risk_score}/100</div>
        </div>
      </div>

      {/* VISUALIZATION — pattern-specific */}
      <div className="px-5 py-4 bg-surface-container-low/30">
        {cluster.pattern_type === "SMURFING" && (
          <SmurfingViz transactions={transactions} thresholdCad={500} />
        )}
        {cluster.pattern_type === "OUTLIER" && (
          <OutlierViz
            zScore={extractZScore()}
            amount={cluster.total_amount_cad}
          />
        )}
        {cluster.pattern_type === "SPLIT_BILLING" && (
          <SplitBillingViz transactions={transactions} />
        )}
        {(cluster.pattern_type === "STRUCTURING" ||
          cluster.pattern_type === "SHELL_VENDOR") && (
          <StructuringViz
            transactions={transactions}
            merchant={cluster.employee_names[0] ?? ""}
            firstSeen={firstSeen}
          />
        )}
        {!["SMURFING", "OUTLIER", "SPLIT_BILLING", "STRUCTURING", "SHELL_VENDOR"].includes(
          cluster.pattern_type
        ) && (
          <p className="text-xs text-on-surface-variant">{cluster.description}</p>
        )}
      </div>

      {/* NARRATIVE */}
      <div className="px-5 py-4">
        <p className="text-sm text-on-surface-variant leading-relaxed">
          {cluster.ai_narrative || cluster.description}
        </p>
        <div className="mt-2.5 flex gap-2 flex-wrap">
          <IntelligenceChip type={isAI ? "ai" : "rule"} />
          {cluster.recommended_action && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-container border border-outline-variant px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              → {cluster.recommended_action}
            </span>
          )}
        </div>
      </div>

      {/* ACTION FOOTER */}
      <div className="px-5 py-3 border-t border-outline-variant/40 bg-surface-container-low/20 flex gap-2 items-center">
        <button
          onClick={onViewTransactions}
          className="btn-primary text-xs py-1.5"
        >
          <span className="material-symbols-outlined text-[14px]">table_rows</span>
          View Transactions
        </button>
        <button className="btn-ghost text-xs py-1.5">
          <span className="material-symbols-outlined text-[14px]">flag</span>
          Flag for Audit
        </button>
        <button className="ml-auto text-xs text-on-surface-variant hover:text-primary transition-colors">
          Dismiss
        </button>
      </div>
    </motion.div>
  );
}
