import { useState } from "react";
import { decideApproval, getApprovals } from "../api/client";
import { PolicyBadge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { useAsync } from "../hooks/useAsync";
import { cadPrecise, dateTime, pct } from "../lib/format";
import type { ApprovalDossier } from "../types";

const RECO_STYLE: Record<string, string> = {
  APPROVE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  DENY: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  REVIEW: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

function DossierCard({
  d,
  onDecide,
}: {
  d: ApprovalDossier;
  onDecide: (id: string, decision: "APPROVE" | "DENY" | "REQUEST_MORE_INFO") => void;
}) {
  const [done, setDone] = useState<string | null>(null);
  const util = Math.min(d.budget_utilization, 1.5);
  const overBudget = d.budget_utilization > 1;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-bold text-slate-100">{d.employee.name}</div>
          <div className="text-xs text-slate-500">
            L{d.employee.job_level} · {d.employee.department}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold tabular-nums text-slate-100">
            {cadPrecise(d.transaction.amount_cad)}
          </div>
          <div className="text-[11px] text-slate-500">
            {d.transaction.merchant_name} · {dateTime(d.transaction.transaction_date)}
          </div>
        </div>
      </div>

      {/* budget bar */}
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[11px] text-slate-500">
          <span>Monthly budget</span>
          <span className={overBudget ? "text-rose-300" : ""}>
            {pct(d.budget_utilization)} · {cadPrecise(d.month_spend_cad)} /{" "}
            {cadPrecise(d.employee.monthly_budget)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-800">
          <div
            className={`h-full rounded-full ${overBudget ? "bg-rose-500" : "bg-brim-500"}`}
            style={{ width: `${(util / 1.5) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
        <PolicyBadge flag={d.transaction.policy_flag} />
        <span>{d.policy_violations_30d} violations / 30d</span>
        <span>risk {d.risk_score}</span>
      </div>

      {/* AI recommendation */}
      <div
        className={`mt-4 rounded-xl border p-3 ${RECO_STYLE[d.ai_recommendation]}`}
      >
        <div className="text-[11px] font-bold uppercase tracking-wider">
          AI Recommendation · {d.ai_recommendation}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-300">{d.ai_reasoning}</p>
        {d.risk_factors.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[11px] text-slate-400">
            {d.risk_factors.map((f, i) => (
              <li key={i}>· {f}</li>
            ))}
          </ul>
        )}
      </div>

      {done ? (
        <div className="mt-4 rounded-xl bg-ink-800 py-2 text-center text-sm font-semibold text-brim-400">
          Decision recorded: {done}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            className="btn bg-emerald-500/90 text-ink-950 hover:bg-emerald-400"
            onClick={() => {
              onDecide(d.transaction.transaction_id, "APPROVE");
              setDone("APPROVED");
            }}
          >
            Approve
          </button>
          <button
            className="btn bg-rose-500/90 text-ink-950 hover:bg-rose-400"
            onClick={() => {
              onDecide(d.transaction.transaction_id, "DENY");
              setDone("DENIED");
            }}
          >
            Deny
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              onDecide(d.transaction.transaction_id, "REQUEST_MORE_INFO");
              setDone("INFO REQUESTED");
            }}
          >
            More info
          </button>
        </div>
      )}
    </div>
  );
}

export function PreApprovals() {
  const { data, loading } = useAsync(() => getApprovals(12), []);

  const decide = (id: string, decision: "APPROVE" | "DENY" | "REQUEST_MORE_INFO") => {
    decideApproval(id, decision).catch(() => {});
  };

  return (
    <div>
      <PageHeader
        title="AI Pre-Approvals"
        subtitle="One-click decisions with a full, fact-based AI dossier."
        action={
          data && (
            <span className="text-sm text-slate-400">
              {data.total} pending · showing {data.approvals.length}
            </span>
          )
        }
      />
      {loading && <div className="text-slate-500">Assembling dossiers…</div>}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {data?.approvals.map((d) => (
          <DossierCard key={d.transaction.transaction_id} d={d} onDecide={decide} />
        ))}
      </div>
    </div>
  );
}
