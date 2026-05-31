import { useState } from "react";
import { motion } from "framer-motion";
import { getClusters, getTransactions } from "../api/client";
import { ClusterCard } from "../components/fraud/ClusterCard";
import { SideDrawer } from "../components/ui/SideDrawer";
import { useAsync } from "../hooks/useAsync";
import { cadPrecise, dateTime } from "../lib/format";
import type { FraudCluster, Transaction } from "../types";

type Tab = "clusters" | "violations" | "offenders";

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
const SEV_DOT: Record<string, string> = {
  CRITICAL: "severity-dot-critical",
  HIGH: "severity-dot-high",
  MEDIUM: "severity-dot-medium",
  LOW: "severity-dot-low",
};
const SEV_TEXT: Record<string, string> = {
  CRITICAL: "text-error font-black",
  HIGH: "text-orange-700 font-bold",
  MEDIUM: "text-amber-700 font-semibold",
  LOW: "text-on-surface-variant",
};

export function Violations() {
  const [tab, setTab] = useState<Tab>("clusters");
  const [drawerCluster, setDrawerCluster] = useState<FraudCluster | null>(null);
  const [drawerTxns, setDrawerTxns] = useState<Transaction[]>([]);

  const clusters = useAsync(getClusters, []);
  const violations = useAsync(() => getTransactions({ policy_flag: "VIOLATION", size: 100 }), []);
  const allTxns = useAsync(() => getTransactions({ size: 200 }), []);

  const txnMap: Record<string, Transaction> = {};
  (allTxns.data?.transactions ?? []).forEach((t) => { txnMap[t.transaction_id] = t; });

  const openDrawer = (cluster: FraudCluster) => {
    setDrawerCluster(cluster);
    setDrawerTxns(cluster.transaction_ids.map((id) => txnMap[id]).filter(Boolean));
  };

  const offenderMap: Record<string, { name: string; dept: string; count: number; worst: string }> = {};
  (violations.data?.transactions ?? []).forEach((t) => {
    if (!offenderMap[t.employee_id]) {
      offenderMap[t.employee_id] = { name: t.employee_name, dept: t.department, count: 0, worst: "LOW" };
    }
    offenderMap[t.employee_id].count++;
    if (SEVERITY_ORDER[t.severity ?? "LOW"] > SEVERITY_ORDER[offenderMap[t.employee_id].worst]) {
      offenderMap[t.employee_id].worst = t.severity ?? "LOW";
    }
  });
  const offenders = Object.values(offenderMap).sort((a, b) => b.count - a.count).slice(0, 10);
  const sortedClusters = [...(clusters.data ?? [])].sort(
    (a, b) => (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0)
  );
  const clusterCount = clusters.data?.length ?? 0;
  const violationCount = violations.data?.total ?? 0;

  return (
    <>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="px-8 py-5 border-b border-outline-variant/65 bg-white sticky top-0 z-20">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Compliance Queue</div>
              <h1 className="text-2xl font-black text-primary mt-1 tracking-tight">Fraud Detection &amp; Violations</h1>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {clusterCount} active fraud clusters · {violationCount} policy violations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-ghost text-xs">
                <span className="material-symbols-outlined text-[15px]">download</span>Export CSV
              </button>
              <div className="flex items-center gap-1.5 rounded-full bg-secondary/5 border border-secondary/15 px-3 py-1.5 text-[10px] font-bold text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                Live Analysis Active
              </div>
            </div>
          </div>
          <div className="flex gap-1 mt-4 bg-surface-container-low p-1 rounded-xl w-fit">
            {([
              { key: "clusters" as Tab, label: "Fraud Clusters", count: clusterCount, red: true },
              { key: "violations" as Tab, label: "All Violations", count: violationCount, red: true },
              { key: "offenders" as Tab, label: "Repeat Offenders", count: offenders.length, red: false },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                  tab === t.key ? "bg-secondary text-white shadow-sm" : "text-on-surface-variant hover:text-primary"
                }`}
              >
                {t.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                  tab === t.key ? "bg-white/20 text-white" : t.red ? "bg-error/10 text-error" : "bg-amber-100 text-amber-700"
                }`}>{t.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-8 max-w-[1400px] mx-auto w-full">
          {tab === "clusters" && (
            <>
              {clusters.loading && <div className="text-sm text-on-surface-variant">Loading clusters&hellip;</div>}
              {!clusters.loading && sortedClusters.length === 0 && (
                <div className="card p-10 text-center text-sm text-on-surface-variant">
                  No fraud clusters yet. Run <span className="font-semibold text-secondary">Ingest + Analyze</span> on the Dashboard.
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {sortedClusters.map((cluster, i) => (
                  <ClusterCard
                    key={cluster.cluster_id}
                    cluster={cluster}
                    index={i}
                    transactions={cluster.transaction_ids.map((id) => txnMap[id]).filter(Boolean)}
                    onViewTransactions={() => openDrawer(cluster)}
                  />
                ))}
              </div>
            </>
          )}

          {tab === "violations" && (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-low border-b border-outline-variant/50">
                  <tr className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
                    <th className="px-5 py-3 text-left">Severity</th>
                    <th className="px-5 py-3 text-left">Merchant</th>
                    <th className="px-5 py-3 text-left">Employee</th>
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-right">Amount CAD</th>
                    <th className="px-5 py-3 text-left">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {violations.data?.transactions.map((t) => (
                    <motion.tr
                      key={t.transaction_id}
                      className="hover:bg-surface-container-low transition-colors cursor-pointer"
                      whileHover={{ x: 2 }}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={SEV_DOT[t.severity ?? "LOW"]} />
                          <span className={`text-xs ${SEV_TEXT[t.severity ?? "LOW"]}`}>{t.severity}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-semibold text-primary">{t.merchant_name}</td>
                      <td className="px-5 py-3 text-on-surface-variant">{t.employee_name}</td>
                      <td className="px-5 py-3 text-on-surface-variant text-xs">{dateTime(t.transaction_date)}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-primary">{cadPrecise(t.amount_cad)}</td>
                      <td className="px-5 py-3 max-w-[240px]">
                        <span className="text-xs text-on-surface-variant truncate block" title={t.flag_reason ?? ""}>{t.flag_reason}</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "offenders" && (
            <div className="space-y-3 max-w-2xl">
              {offenders.length === 0 && (
                <div className="text-sm text-on-surface-variant">Run Analyze first to see offender data.</div>
              )}
              {offenders.map((o, i) => (
                <motion.div
                  key={o.name}
                  className="card p-4 flex items-center gap-4"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <div className="text-xs font-black text-on-surface-variant w-6 text-center">#{i + 1}</div>
                  <div className="w-10 h-10 rounded-full gradient-hero flex items-center justify-center text-white font-black text-sm shrink-0">
                    {o.name.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-primary">{o.name}</div>
                    <div className="text-xs text-on-surface-variant">{o.dept}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32">
                      <div className="text-[10px] text-on-surface-variant mb-1">{o.count} violations</div>
                      <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${o.worst === "CRITICAL" ? "bg-error" : o.worst === "HIGH" ? "bg-orange-500" : "bg-amber-400"}`}
                          style={{ width: `${Math.min((o.count / (offenders[0]?.count ?? 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase rounded-full px-2.5 py-1 ${
                      o.worst === "CRITICAL" ? "bg-error-container text-error" : o.worst === "HIGH" ? "bg-orange-50 text-orange-700 border border-orange-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>{o.worst}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SideDrawer
        isOpen={!!drawerCluster}
        onClose={() => setDrawerCluster(null)}
        cluster={drawerCluster}
        transactions={drawerTxns}
      />
    </>
  );
}
