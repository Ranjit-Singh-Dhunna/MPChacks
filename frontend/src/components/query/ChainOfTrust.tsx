import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { COLLAPSE_ANIMATE, COLLAPSE_EXIT, COLLAPSE_INITIAL } from "../../lib/motion";

interface Step {
  icon: string;
  label: string;
  detail?: string;
  type: "rule" | "ai" | "neutral";
}

interface Props {
  durationMs?: number;
  rowCount?: number;
  queryString?: string;
  usedFallback?: boolean;
  fallbackReason?: string | null;
}

export function ChainOfTrust({ durationMs, rowCount, queryString, usedFallback, fallbackReason }: Props) {
  const [expanded, setExpanded] = useState(false);

  const steps: Step[] = [
    {
      icon: "shield",
      label: `Python scanned 4,235 transactions${durationMs ? ` in ${durationMs}ms` : ""}`,
      type: "rule",
    },
    usedFallback
      ? {
          icon: "shield",
          label: "Deterministic engine resolved query — instant, auditable result",
          detail: fallbackReason ? `Fallback reason: ${fallbackReason}` : undefined,
          type: "rule",
        }
      : {
          icon: "auto_awesome",
          label: "Gemini compiled a pandas expression from your question",
          type: "ai",
        },
    {
      icon: "code",
      label: "Executed in read-only sandboxed namespace",
      detail: "Blocks: import, os, sys, eval, exec, open",
      type: "rule",
    },
    {
      icon: "bar_chart",
      label: `${rowCount ?? "?"} rows returned · rendered as chart`,
      type: "neutral",
    },
  ];

  const stepStyles = {
    rule: {
      number: "bg-surface-container border-outline-variant text-on-surface-variant",
      box: "bg-surface-container border-outline-variant",
      icon: "text-on-surface-variant",
      text: "text-on-surface-variant",
    },
    ai: {
      number: "bg-secondary/10 border-secondary/20 text-secondary",
      box: "bg-secondary/5 border-secondary/20 ai-glow",
      icon: "text-secondary",
      text: "text-secondary",
    },
    neutral: {
      number: "bg-surface-container border-outline-variant text-on-surface-variant",
      box: "bg-surface-container border-outline-variant",
      icon: "text-on-surface-variant",
      text: "text-on-surface-variant",
    },
  };

  return (
    <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-low/50 p-4 mb-5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
          How this answer was made
        </span>
        {usedFallback && (
          <span className="rounded-full bg-surface-container border border-outline-variant px-2 py-0.5 text-[9px] font-bold text-on-surface-variant">
            Deterministic
          </span>
        )}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="ml-auto text-[10px] text-secondary font-bold hover:underline"
        >
          {expanded ? "Hide ▲" : "Show ▼"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div className="mt-3 space-y-2 overflow-hidden" initial={COLLAPSE_INITIAL} animate={COLLAPSE_ANIMATE} exit={COLLAPSE_EXIT}>
            {steps.map((step, i) => {
              const s = stepStyles[step.type];
              return (
                <motion.div
                  key={i}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <div
                    className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-black shrink-0 ${s.number}`}
                  >
                    {i + 1}
                  </div>
                  <div
                    className={`flex-1 flex items-center gap-2 rounded-xl border px-3 py-2 ${s.box}`}
                  >
                    <span className={`material-symbols-outlined text-[14px] shrink-0 ${s.icon}`}>
                      {step.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={`text-[11px] font-semibold ${s.text}`}>{step.label}</span>
                      {step.detail && (
                        <div className="text-[10px] text-on-surface-variant/60 font-mono mt-0.5 truncate">
                          {step.detail}
                        </div>
                      )}
                    </div>
                    {step.type === "rule" && i === 2 && (
                      <span className="font-mono text-[10px] text-green-600 font-bold shrink-0">
                        ✓ safe
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {queryString && (
              <div className="mt-2 rounded-xl bg-surface-container border border-outline-variant px-3 py-2">
                <div className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant mb-1">
                  Executed expression
                </div>
                <code className="text-[11px] font-mono text-secondary break-all">{queryString}</code>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
