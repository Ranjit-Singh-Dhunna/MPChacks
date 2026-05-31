import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Transaction } from "../../types";

function isRound(amount: number) {
  return [100, 200, 300, 400, 500].some((b) => Math.abs(amount % b) < 1.5 && amount >= b);
}

export function StructuringViz({
  transactions,
  merchant,
  firstSeen,
}: {
  transactions: Transaction[];
  merchant: string;
  firstSeen?: string;
}) {
  const data = transactions.map((t) => ({
    date: new Date(t.transaction_date).toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
    amount: t.amount_usd,
    round: isRound(t.amount_usd),
  }));

  const roundCount = data.filter((d) => d.round).length;
  const roundPct = transactions.length > 0 ? Math.round((roundCount / transactions.length) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-orange-50 border border-orange-200 px-3 py-2 text-center">
          <div className="font-mono font-black text-2xl text-orange-700">{roundPct}%</div>
          <div className="text-[10px] text-orange-600 font-bold">round numbers</div>
        </div>
        <div className="flex-1 text-xs text-on-surface-variant leading-relaxed">
          {roundCount} of {transactions.length} charges are exact multiples of $200, $400, or $500 USD
          — a structuring signature.
        </div>
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={90}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#45464d" }} stroke="none" />
          <YAxis hide domain={[0, 600]} />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid #c6c6cd", borderRadius: 8 }}
            formatter={(v: number) => [`$${v} USD`, "Amount"]}
            labelStyle={{ fontSize: 10 }}
          />
          {[200, 400, 500].map((v) => (
            <ReferenceLine key={v} y={v} strokeDasharray="3 3" stroke="#c6c6cd" strokeWidth={1} />
          ))}
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.round ? "#ea580c" : "#c6c6cd"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Shell vendor badge */}
      {firstSeen && (
        <div className="flex items-start gap-2 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2">
          <span className="material-symbols-outlined text-orange-600 text-[18px] mt-0.5">storefront</span>
          <div>
            <div className="text-xs font-bold text-orange-700">Shell Vendor Detected</div>
            <div className="text-[10px] text-orange-600 leading-relaxed">
              {merchant} — first appeared {new Date(firstSeen).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })} · no prior transaction history
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
