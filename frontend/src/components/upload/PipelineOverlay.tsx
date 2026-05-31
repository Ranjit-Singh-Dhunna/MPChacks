import { AnimatePresence, motion } from "framer-motion";

interface Step {
  label: string;
  detail?: string;
  status: "pending" | "running" | "done" | "skipped";
}

interface Props {
  steps: Step[];
  progress: number; // 0-100
}

function StepIcon({ status }: { status: Step["status"] }) {
  if (status === "done") {
    return <span className="material-symbols-outlined pipeline-step-done text-[22px]">check_circle</span>;
  }
  if (status === "skipped") {
    return <span className="material-symbols-outlined text-gray-500 text-[22px]">remove_circle</span>;
  }
  if (status === "running") {
    return (
      <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
    );
  }
  return <span className="material-symbols-outlined text-gray-600 text-[22px]">radio_button_unchecked</span>;
}

export function PipelineOverlay({ steps, progress }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center dark-section">
      <motion.div
        className="w-[480px] rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center text-white font-black text-lg">
            B
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">
              Brim Intelligence Engine
            </div>
            <div className="text-lg font-black text-white">Analyzing transactions…</div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-7">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                <StepIcon status={step.status} />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-semibold ${
                    step.status === "done"
                      ? "pipeline-step-done"
                      : step.status === "running"
                      ? "pipeline-step-active"
                      : step.status === "skipped"
                      ? "text-gray-500"
                      : "pipeline-step-pending"
                  }`}
                >
                  {i + 1}. {step.label}
                </div>
                {step.detail && (
                  <div className="text-xs text-slate-500 mt-0.5 font-mono">{step.detail}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-secondary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <div className="text-xs text-slate-400 font-mono mt-2 text-right">{progress}%</div>
      </motion.div>
    </div>
  );
}
