export function KPICard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "brim" | "rose" | "amber";
}) {
  const accent = {
    default: "text-slate-100",
    brim: "text-brim-400",
    rose: "text-rose-300",
    amber: "text-amber-300",
  }[tone];
  const glow = {
    default: "",
    brim: "shadow-[0_0_40px_-12px_rgba(45,212,191,0.4)]",
    rose: "shadow-[0_0_40px_-12px_rgba(244,63,94,0.4)]",
    amber: "shadow-[0_0_40px_-12px_rgba(245,158,11,0.4)]",
  }[tone];
  return (
    <div className={`card p-5 ${glow}`}>
      <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className={`mt-2 text-3xl font-bold tabular-nums ${accent}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
