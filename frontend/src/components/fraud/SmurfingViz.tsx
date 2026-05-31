import { motion } from "framer-motion";
import type { Transaction } from "../../types";

export function SmurfingViz({
  transactions,
  thresholdCad = 500,
}: {
  transactions: Transaction[];
  thresholdCad?: number;
}) {
  const total = transactions.reduce((s, t) => s + t.amount_cad, 0);
  const exceeded = total > thresholdCad;

  return (
    <div className="space-y-3">
      {/* Dot timeline */}
      <div className="relative h-14">
        {/* Threshold line */}
        <div className="absolute bottom-5 inset-x-0 border-t-2 border-dashed border-error/60" />
        <span className="absolute bottom-5.5 right-0 translate-y-[-2px] text-[9px] font-black text-error">
          ${thresholdCad.toLocaleString()} limit
        </span>

        {/* Timeline dots */}
        {transactions.map((t, i) => (
          <motion.div
            key={t.transaction_id}
            className="absolute bottom-3 w-3 h-3 rounded-full bg-secondary border-2 border-white shadow-sm cursor-pointer group"
            style={{ left: `${(i / Math.max(transactions.length - 1, 1)) * 88}%` }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            title={`$${t.amount_usd} USD at ${t.merchant_name}`}
          />
        ))}

        {/* Axis label */}
        <div className="absolute bottom-0 left-0 text-[9px] text-on-surface-variant font-semibold">
          {transactions.length} charges across {transactions.length > 0
            ? Math.round(
                (new Date(transactions[transactions.length - 1]?.transaction_date).getTime() -
                  new Date(transactions[0]?.transaction_date).getTime()) /
                  (1000 * 60 * 60)
              )
            : 0}h window
        </div>
      </div>

      {/* Running total callout */}
      <div className={`flex items-baseline gap-2 rounded-xl px-3 py-2.5 ${exceeded ? "bg-error-container/40" : "bg-surface-container-low"}`}>
        <span className={`font-mono font-black text-2xl ${exceeded ? "text-error" : "text-primary"}`}>
          Σ {transactions.reduce((s, t) => s + t.amount_cad, 0).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 })}
        </span>
        <span className="text-xs text-on-surface-variant">
          {exceeded ? `exceeds $${thresholdCad.toLocaleString()} CAD budget` : "running total"}
        </span>
        {exceeded && (
          <span className="material-symbols-outlined text-error text-[16px] ml-auto">warning</span>
        )}
      </div>
    </div>
  );
}
