import { motion } from "framer-motion";
import type { Transaction } from "../../types";

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : name.slice(0, 2);
}

function Avatar({ name, tone }: { name: string; tone: "primary" | "secondary" }) {
  return (
    <div
      className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-sm mx-auto shadow-sm ${
        tone === "primary" ? "gradient-hero" : "bg-secondary"
      }`}
    >
      {Initials({ name })}
    </div>
  );
}

export function SplitBillingViz({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length < 2) {
    return (
      <div className="text-xs text-on-surface-variant text-center py-4">
        Loading transaction details…
      </div>
    );
  }

  const [a, b] = transactions;
  const dtA = new Date(a.transaction_date);
  const dtB = new Date(b.transaction_date);
  const minutesDiff = Math.abs((dtB.getTime() - dtA.getTime()) / 60000);
  const combined = a.amount_cad + b.amount_cad;

  return (
    <div className="space-y-3">
      {/* Collision view */}
      <div className="grid grid-cols-5 gap-2 items-center">
        {/* Employee A */}
        <div className="col-span-2 text-center">
          <Avatar name={a.employee_name} tone="primary" />
          <div className="text-xs font-bold text-primary mt-1.5">{a.employee_name}</div>
          <div className="font-mono text-sm font-black text-primary">
            {a.amount_cad.toLocaleString("en-CA", {
              style: "currency",
              currency: "CAD",
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="text-[10px] text-on-surface-variant">
            {dtA.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        {/* Connector */}
        <div className="col-span-1 flex flex-col items-center gap-1">
          <div className="text-[10px] font-black text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2 py-1 whitespace-nowrap">
            {Math.round(minutesDiff)} min
          </div>
          <div className="w-px h-5 bg-orange-300" />
          <div className="text-[9px] text-on-surface-variant text-center font-semibold leading-tight max-w-[56px]">
            {a.merchant_name}
          </div>
        </div>

        {/* Employee B */}
        <div className="col-span-2 text-center">
          <Avatar name={b.employee_name} tone="secondary" />
          <div className="text-xs font-bold text-primary mt-1.5">{b.employee_name}</div>
          <div className="font-mono text-sm font-black text-primary">
            {b.amount_cad.toLocaleString("en-CA", {
              style: "currency",
              currency: "CAD",
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="text-[10px] text-on-surface-variant">
            {dtB.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      {/* Animated connecting line */}
      <motion.div
        className="h-0.5 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400 rounded-full"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
        style={{ originX: 0.5 }}
      />

      {/* Combined total */}
      <div className="flex items-center justify-between rounded-xl bg-orange-50 border border-orange-200 px-3 py-2">
        <span className="text-xs font-semibold text-orange-700">Combined exposure</span>
        <span className="font-mono font-black text-base text-orange-700">
          {combined.toLocaleString("en-CA", {
            style: "currency",
            currency: "CAD",
            minimumFractionDigits: 2,
          })}
        </span>
      </div>
    </div>
  );
}
