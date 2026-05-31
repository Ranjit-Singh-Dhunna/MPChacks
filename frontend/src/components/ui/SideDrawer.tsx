import { AnimatePresence, motion } from "framer-motion";
import { BACKDROP_ANIMATE, BACKDROP_EXIT, BACKDROP_INITIAL, DRAWER_ANIMATE, DRAWER_EXIT, DRAWER_INITIAL } from "../../lib/motion";
import type { FraudCluster, Transaction } from "../../types";
import { cadPrecise, dateTime } from "../../lib/format";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cluster: FraudCluster | null;
  transactions: Transaction[];
}

export function SideDrawer({ isOpen, onClose, cluster, transactions }: Props) {
  return (
    <AnimatePresence>
      {isOpen && cluster && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-40"
            initial={BACKDROP_INITIAL} animate={BACKDROP_ANIMATE} exit={BACKDROP_EXIT}
            onClick={onClose}
          />
          <motion.div
            className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-2xl z-50 flex flex-col"
            initial={DRAWER_INITIAL} animate={DRAWER_ANIMATE} exit={DRAWER_EXIT}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-outline-variant/60 flex justify-between items-start">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {cluster.cluster_id}
                </div>
                <h2 className="text-base font-bold text-primary mt-0.5">
                  {cluster.pattern_type.replace(/_/g, " ")}
                </h2>
                <div className="text-xs text-on-surface-variant mt-0.5">
                  {cluster.transaction_ids.length} transactions · {cluster.employee_names.join(", ")}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span>
              </button>
            </div>

            {/* Total amount band */}
            <div className="px-6 py-3 bg-surface-container-low border-b border-outline-variant/40 flex items-center justify-between">
              <span className="text-xs font-semibold text-on-surface-variant">Total Exposure</span>
              <span className="font-mono font-black text-xl text-primary">
                {cadPrecise(cluster.total_amount_cad)}
              </span>
            </div>

            {/* Transaction table */}
            <div className="flex-1 overflow-y-auto">
              {transactions.length > 0 ? (
                <table className="w-full text-xs">
                  <thead className="bg-surface-container-low sticky top-0 border-b border-outline-variant/50">
                    <tr className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
                      <th className="px-5 py-3 text-left">Date & Time</th>
                      <th className="px-5 py-3 text-left">Merchant</th>
                      <th className="px-5 py-3 text-left">Employee</th>
                      <th className="px-5 py-3 text-right">Amount CAD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40">
                    {transactions.map((t) => (
                      <tr
                        key={t.transaction_id}
                        className="hover:bg-surface-container-low transition-colors"
                      >
                        <td className="px-5 py-3 font-mono text-on-surface-variant text-[11px]">
                          {dateTime(t.transaction_date)}
                        </td>
                        <td className="px-5 py-3 font-medium text-primary">{t.merchant_name}</td>
                        <td className="px-5 py-3 text-on-surface-variant">{t.employee_name}</td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-primary">
                          {cadPrecise(t.amount_cad)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-40 text-sm text-on-surface-variant">
                  Loading transactions…
                </div>
              )}
            </div>

            {/* AI narrative */}
            {cluster.ai_narrative && (
              <div className="px-6 py-4 border-t border-outline-variant/40 bg-secondary/[0.03] ai-glow">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-secondary mb-2">
                  <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                  AI Analysis
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">{cluster.ai_narrative}</p>
              </div>
            )}

            {/* Action footer */}
            <div className="border-t border-outline-variant/60 p-4 flex gap-2">
              <button className="btn-danger flex-1 text-xs">
                <span className="material-symbols-outlined text-[15px]">flag</span>
                Flag for Audit
              </button>
              <button className="btn-ghost text-xs">
                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                Mark Reviewed
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
