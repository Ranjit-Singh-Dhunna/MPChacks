import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Step {
  label: string;
  detail?: string;
  status: "pending" | "running" | "done" | "skipped";
}

interface Props {
  steps: Step[];
  progress: number; // 0–100
}

const STEP_ICONS: Record<string, string> = {
  0: "upload_file",
  1: "shield",
  2: "auto_awesome",
  3: "dashboard",
};

function StepIcon({ status, index }: { status: Step["status"]; index: number }) {
  if (status === "done") {
    return (
      <motion.span
        className="material-symbols-outlined text-emerald-400 text-[22px]"
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        check_circle
      </motion.span>
    );
  }
  if (status === "skipped") {
    return <span className="material-symbols-outlined text-gray-500 text-[20px]">remove_circle</span>;
  }
  if (status === "running") {
    return (
      <div className="relative w-5 h-5">
        <div className="absolute inset-0 rounded-full border-2 border-secondary/20" />
        <div className="absolute inset-0 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
      </div>
    );
  }
  return (
    <span className="material-symbols-outlined text-white/20 text-[20px]">
      {STEP_ICONS[index] ?? "radio_button_unchecked"}
    </span>
  );
}

function AiCounter({ active }: { active: boolean }) {
  const [count, setCount] = useState(0);
  const TARGET = 635;

  useEffect(() => {
    if (!active) { setCount(0); return; }
    let current = 0;
    const step = () => {
      current = Math.min(current + Math.ceil(Math.random() * 14 + 4), TARGET);
      setCount(current);
      if (current < TARGET) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  if (!active) return null;
  return (
    <motion.span
      className="ml-2 font-mono text-secondary text-xs font-bold"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {count.toLocaleString()} cases…
    </motion.span>
  );
}

export function PipelineOverlay({ steps, progress }: Props) {
  const doneCount = steps.filter((s) => s.status === "done" || s.status === "skipped").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center dark-section">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-secondary/10 blur-[120px]" />
      </div>

      <motion.div
        className="relative w-[520px] rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl"
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <motion.div
            className="w-11 h-11 rounded-xl gradient-hero flex items-center justify-center text-white font-black text-lg shrink-0"
            animate={{ boxShadow: ["0 0 0 0 rgba(0,81,213,0)", "0 0 0 8px rgba(0,81,213,0.15)", "0 0 0 0 rgba(0,81,213,0)"] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            B
          </motion.div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Brim Intelligence Engine
            </div>
            <div className="text-lg font-black text-white">Analyzing transactions…</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-2xl font-black font-mono text-secondary">{progress}%</div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-0 mb-7">
          {steps.map((step, i) => (
            <div key={i}>
              <motion.div
                className="flex items-start gap-3 py-3"
                initial={{ opacity: 0.4 }}
                animate={{ opacity: step.status === "pending" ? 0.4 : 1 }}
              >
                <div className="mt-0.5 w-5 shrink-0 flex items-center justify-center">
                  <StepIcon status={step.status} index={i} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold ${
                    step.status === "done" ? "text-emerald-400"
                    : step.status === "running" ? "text-white"
                    : step.status === "skipped" ? "text-gray-500"
                    : "text-white/30"
                  }`}>
                    {i + 1}. {step.label}
                    {step.status === "running" && i === 2 && (
                      <AiCounter active={true} />
                    )}
                  </div>
                  <AnimatePresence>
                    {step.detail && (
                      <motion.div
                        className="text-xs text-slate-400 mt-0.5 font-mono"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {step.detail}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Animated connector between steps */}
              {i < steps.length - 1 && (
                <div className="ml-[8px] h-5 flex items-center">
                  <div className="relative w-0.5 h-full bg-white/8 ml-[1px]">
                    {(step.status === "done" || step.status === "skipped") && (
                      <motion.div
                        className="absolute top-0 left-0 w-full rounded-full"
                        style={{ background: "linear-gradient(180deg, #34d399, #0051d5)" }}
                        initial={{ height: 0 }}
                        animate={{ height: "100%" }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #0051d5, #7c3aed, #34d399)" }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>

        {/* Status message */}
        <div className="mt-3 text-xs text-slate-400 text-center">
          {doneCount === steps.length
            ? "✓ Pipeline complete — navigating to dashboard…"
            : `Step ${doneCount + 1} of ${steps.length}`}
        </div>
      </motion.div>
    </div>
  );
}
