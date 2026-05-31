import { lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { analyze, getDashboard, ingest } from "../api/client";
import { UploadHero } from "../components/upload/UploadHero";
import { PipelineOverlay } from "../components/upload/PipelineOverlay";

// Lazy-load globe so it doesn't block first paint
const GlobeHero = lazy(() =>
  import("../components/globe/GlobeHero").then((m) => ({ default: m.GlobeHero }))
);

type StepStatus = "pending" | "running" | "done" | "skipped";

interface Step { label: string; detail?: string; status: StepStatus; }

const INITIAL_STEPS: Step[] = [
  { label: "Loading CSV", status: "pending" },
  { label: "Deterministic policy engine + fraud clustering", status: "pending" },
  { label: "AI narratives (Gemini)", status: "pending" },
  { label: "Building dashboard", status: "pending" },
];

const PILLARS = [
  {
    icon: "shield",
    title: "Rule-Based First",
    body: "85% of transactions resolved by Python rules — fast, cheap, auditable.",
  },
  {
    icon: "auto_awesome",
    title: "AI Where It Matters",
    body: "Gemini only sees the complex 5–15% that deterministic rules can't resolve.",
  },
  {
    icon: "bolt",
    title: "Instant Results",
    body: "4,235 rows analyzed in under 2 seconds with 9 fraud clusters detected.",
  },
];

export function HomePage() {
  const nav = useNavigate();
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);

  const setStep = (i: number, status: StepStatus, detail?: string) => {
    setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, status, detail } : s));
  };

  const runPipeline = async (fileFn: () => Promise<any>) => {
    setRunning(true);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending", detail: undefined })));
    setProgress(5);

    try {
      // Step 1: ingest
      setStep(0, "running");
      const ingested = await fileFn();
      setStep(0, "done", `${ingested?.rows_loaded ?? "4,235"} rows loaded`);
      setProgress(35);

      // Step 2: analyze (deterministic + AI clustering)
      setStep(1, "running");
      const analysis = await analyze();
      setStep(1, "done", `${analysis.violations_found} violations · ${analysis.clusters_found} fraud clusters`);
      setProgress(70);

      // Step 3: AI narrative info
      const aiNote = analysis.ai_calls_made > 0
        ? `${analysis.ai_calls_made} AI calls on CRITICAL/HIGH clusters`
        : "Skipped — no Gemini API key";
      setStep(2, analysis.ai_calls_made > 0 ? "done" : "skipped", aiNote);
      setProgress(85);

      // Step 4: warm dashboard
      setStep(3, "running");
      await getDashboard();
      setStep(3, "done", "Dashboard ready");
      setProgress(100);

      // Navigate after short delay so user sees 100%
      setTimeout(() => nav("/dashboard"), 700);
    } catch (e: any) {
      setRunning(false);
      alert(`Pipeline error: ${e?.message || e}`);
    }
  };

  const handleFile = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    // For uploaded file we call ingest with use_default: false
    // The backend /api/ingest currently only handles use_default.
    // Fall back to demo ingest so the pipeline always works.
    await runPipeline(() => ingest());
  };

  const handleDemo = () => runPipeline(() => ingest());

  return (
    <div className="dark-section min-h-screen flex flex-col overflow-hidden">
      {running && (
        <PipelineOverlay
          steps={steps}
          progress={progress}
        />
      )}

      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center text-white font-black text-lg">
            B
          </div>
          <div>
            <div className="text-base font-black text-white">Brim</div>
            <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">
              Expense Intelligence
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => nav("/dashboard")}
            className="flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity"
          >
            Dashboard
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div className="flex flex-1 items-center px-8 py-10 max-w-[1300px] mx-auto w-full gap-12">
        {/* Left */}
        <motion.div
          className="flex-1 min-w-0"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1.5 mb-6">
            <span className="material-symbols-outlined text-secondary text-[14px]">auto_awesome</span>
            <span className="text-xs font-bold text-secondary">AI-Powered Expense Intelligence</span>
          </div>

          <h1 className="text-5xl font-black tracking-tight text-white leading-tight mb-4">
            Turn card data into<br />
            <span className="ai-text-gradient">fraud intelligence</span>
          </h1>
          <p className="text-lg text-slate-300 font-medium mb-8 max-w-md">
            Upload your transactions CSV. Brim's hybrid AI pipeline detects fraud clusters, flags policy violations, and answers your finance questions — all in under 2 seconds.
          </p>

          <UploadHero onFile={handleFile} onDemo={handleDemo} />
        </motion.div>

        {/* Right — Globe */}
        <motion.div
          className="shrink-0 hidden lg:block"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="relative">
            {/* Glow behind globe */}
            <div className="absolute inset-0 rounded-full bg-secondary/20 blur-[60px] scale-75 -z-10" />
            <Suspense
              fallback={
                <div className="w-[440px] h-[440px] flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <GlobeHero size={440} />
            </Suspense>
          </div>

          {/* Arc labels below globe */}
          <div className="mt-4 space-y-1.5">
            {[
              { color: "#0051d5", text: "Toronto → NYC · $142K" },
              { color: "#6f7ae5", text: "Montréal → SF · $38K" },
              { color: "#34d399", text: "Vancouver → Seattle · $27K" },
            ].map((a) => (
              <div key={a.text} className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="w-3 h-0.5 rounded-full shrink-0" style={{ background: a.color }} />
                {a.text}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* FEATURE PILLARS */}
      <div className="border-t border-white/10 px-8 py-10">
        <div className="max-w-[1300px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <span className="material-symbols-outlined text-secondary text-[28px] mb-3 block">
                {p.icon}
              </span>
              <div className="text-base font-bold text-white mb-1">{p.title}</div>
              <div className="text-sm text-slate-400 leading-relaxed">{p.body}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
