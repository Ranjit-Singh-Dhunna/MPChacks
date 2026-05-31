import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { postQuery } from "../api/client";
import { SmartChart } from "../components/charts/SmartChart";
import { ChainOfTrust } from "../components/query/ChainOfTrust";
import { FADE_SCALE } from "../lib/motion";
import type { } from "framer-motion";
import type { NLQueryResponse } from "../types";

const SUGGESTIONS = [
  "Which department spent the most?",
  "Show Grace Lee's transactions",
  "Top 5 merchants by spend",
  "Count violations by severity",
  "Fuel spend over time",
  "Pending approvals by risk score",
];

const CHART_TYPES = ["bar", "line", "area", "pie", "table"] as const;

interface HistoryEntry {
  question: string;
  summary: string;
}

export function TalkToData() {
  const [question, setQuestion] = useState("");
  const [voice, setVoice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NLQueryResponse | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    try {
      const r = await postQuery(q, voice);
      setResult(r);
      setHistory((h) => [{ question: q, summary: r.summary }, ...h].slice(0, 8));
      if (r.audio_base64) {
        const audio = new Audio(`data:audio/mpeg;base64,${r.audio_base64}`);
        audioRef.current = audio;
        audio.play().catch(() => {});
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Query failed — check that the backend is running.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const submit = () => { ask(question); setQuestion(""); };

  const restyle = (chart: string) => { ask(`${chart} chart`); };

  const useChip = (s: string) => {
    setQuestion(s);
    ask(s);
    setQuestion("");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* STICKY HEADER */}
      <div className="px-8 py-4 border-b border-outline-variant/65 bg-white sticky top-0 z-20 flex justify-between items-center">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Talk to Your Data</div>
          <h1 className="text-xl font-black text-primary mt-0.5 tracking-tight">Ask anything about your expenses</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-secondary/5 border border-secondary/15 px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="text-xs font-bold text-secondary">Brim AI Active</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-[340px] shrink-0 border-r border-outline-variant/50 bg-white flex flex-col p-5 gap-5 overflow-y-auto">
          {/* Voice/Text toggle */}
          <div className="flex gap-1 bg-surface-container-low p-1 rounded-xl">
            {(["Text", "Voice"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setVoice(m === "Voice")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                  (m === "Voice") === voice ? "bg-secondary text-white" : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {m === "Voice" ? "mic" : "text_fields"}
                </span>
                {m}
              </button>
            ))}
          </div>

          {/* Input box */}
          <div className={`rounded-2xl border bg-white shadow-sm transition-all ${
            loading ? "ai-glow border-secondary/30" : "border-outline-variant/60"
          }`}>
            <div className="flex items-center gap-2 px-4 pt-4">
              <span className="text-secondary text-sm font-bold">✦</span>
              <input
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Ask anything about your expenses…"
                className="flex-1 text-sm text-primary placeholder:text-on-surface-variant/60 outline-none bg-transparent"
                disabled={loading}
              />
            </div>
            <div className="flex justify-end px-4 pb-3 pt-2">
              <button
                className="btn-primary text-xs py-1.5 px-3"
                onClick={submit}
                disabled={loading || !question.trim()}
              >
                <span className="material-symbols-outlined text-[15px]">{loading ? "hourglass_empty" : "send"}</span>
                {loading ? "Thinking…" : "Ask"}
              </button>
            </div>
          </div>

          {/* Suggested chips */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
              Suggested Questions
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => useChip(s)}
                  className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface-variant hover:border-secondary hover:text-secondary hover:bg-secondary/5 transition-all text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation history */}
          {history.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
                History
              </div>
              <div className="space-y-3">
                {history.map((h, i) => (
                  <div
                    key={i}
                    className="cursor-pointer group"
                    onClick={() => useChip(h.question)}
                  >
                    <div className="text-xs font-bold text-primary group-hover:text-secondary transition-colors">
                      {h.question}
                    </div>
                    <div className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-2">
                      {h.summary}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="rounded-2xl border border-error/20 bg-error-container/20 px-5 py-4 text-sm text-error font-semibold mb-5">
              {error}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="w-20 h-20 rounded-3xl gradient-hero mx-auto flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-white text-4xl">psychology</span>
              </div>
              <div className="text-xl font-bold text-primary">Ready to answer your questions</div>
              <p className="text-sm text-on-surface-variant mt-2 max-w-sm">
                Ask about spend, violations, employees, or fraud patterns. AI compiles the query — Python executes it safely.
              </p>
            </div>
          )}

          {loading && (
            <div className="rounded-2xl border border-secondary/20 bg-secondary/5 ai-glow px-6 py-8 text-center">
              <div className="text-secondary font-bold text-sm animate-pulse">Brim AI is thinking…</div>
              <div className="flex justify-center gap-1.5 mt-4">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-secondary"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {result && !loading && (
              <motion.div key={result.question} {...FADE_SCALE}>
                {/* Chain of Trust */}
                <ChainOfTrust
                  durationMs={1600}
                  rowCount={result.data.length}
                  queryString={result.query_string}
                  usedFallback={result.used_fallback}
                />

                {/* Result card */}
                <div className="card p-6">
                  <div className="flex items-start justify-between mb-1 gap-3 flex-wrap">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        {result.question}
                      </div>
                      <div className="text-xl font-bold text-primary mt-1">
                        {result.ui_config.title || "Query Result"}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {CHART_TYPES.map((c) => (
                        <button
                          key={c}
                          onClick={() => restyle(c)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                            result.ui_config.chart_type === c
                              ? "bg-secondary/10 text-secondary font-bold"
                              : "text-on-surface-variant hover:text-primary"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {result.used_fallback && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-amber-600 text-[18px]">info</span>
                      <span className="text-xs font-semibold text-amber-700">
                        Showing deterministic fallback — AI unavailable
                      </span>
                    </div>
                  )}

                  <SmartChart data={result.data} ui={result.ui_config} />

                  <p className="text-sm text-on-surface-variant leading-relaxed mt-4">
                    {result.summary}
                  </p>

                  {/* Voice + query string row */}
                  <div className="mt-4 pt-4 border-t border-outline-variant/50 flex items-center justify-between gap-3 flex-wrap">
                    <button
                      onClick={() => setVoice((v) => !v)}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                        voice && result.audio_base64
                          ? "border-secondary/30 bg-secondary/5 text-secondary"
                          : "border-outline-variant text-on-surface-variant hover:border-secondary hover:text-secondary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">{voice ? "volume_up" : "volume_off"}</span>
                      {voice && result.audio_base64 ? "Voice on" : "Voice off"}
                    </button>
                    <code className="rounded-xl bg-surface-container-low border border-outline-variant px-3 py-1.5 font-mono text-[10px] text-on-surface-variant truncate max-w-[360px]">
                      {result.query_string}
                    </code>
                  </div>

                  {/* Follow-up */}
                  <div className="mt-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
                      Follow up
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {["Break down by employee", "Show as pie chart", "Compare to last quarter"].map((s) => (
                        <button
                          key={s}
                          onClick={() => useChip(s)}
                          className="rounded-full border border-outline-variant bg-surface-container-low px-3 py-1.5 text-[11px] font-medium text-on-surface-variant hover:border-secondary hover:text-secondary transition-all"
                        >
                          → {s}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        placeholder="Ask a follow-up…"
                        className="flex-1 rounded-xl border border-outline-variant/60 bg-surface-container-low px-4 py-2 text-sm text-primary placeholder:text-on-surface-variant/50 outline-none focus:border-secondary transition-colors"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.currentTarget.value.trim()) {
                            ask(e.currentTarget.value);
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                      <button className="btn-ghost text-xs py-2">Send</button>
                    </div>
                    <div className="text-[9px] text-on-surface-variant/50 mt-1">
                      Visual-only changes (chart type) skip the database — instant response.
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
