export function IntelligenceChip({ type }: { type: "ai" | "rule" }) {
  if (type === "ai") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary/5 border border-secondary/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-secondary">
        <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
        AI Reasoned
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container border border-outline-variant px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
      <span className="material-symbols-outlined text-[12px]">shield</span>
      Rule-Based
    </span>
  );
}
