import type { PolicyFlag, Severity } from "../../types";

const SEV_STYLES: Record<Severity, string> = {
  CRITICAL: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  HIGH: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  MEDIUM: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  LOW: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

const FLAG_STYLES: Record<PolicyFlag, string> = {
  COMPLIANT: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  VIOLATION: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  REVIEW: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

const base =
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide";

export function SeverityBadge({ severity }: { severity: Severity | null }) {
  if (!severity) return null;
  return <span className={`${base} ${SEV_STYLES[severity]}`}>{severity}</span>;
}

export function PolicyBadge({ flag }: { flag: PolicyFlag | null }) {
  if (!flag) return <span className="text-xs text-slate-500">—</span>;
  return <span className={`${base} ${FLAG_STYLES[flag]}`}>{flag}</span>;
}

export function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "brim" | "rose" | "emerald";
}) {
  const tones = {
    default: "bg-ink-800 text-slate-300 border-ink-600",
    brim: "bg-brim-500/15 text-brim-400 border-brim-500/30",
    rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  };
  return (
    <span className={`${base} ${tones[tone]}`}>{children}</span>
  );
}
