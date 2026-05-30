import { useRef, useState } from "react";
import { postQuery } from "../api/client";
import { SmartChart } from "../components/charts/SmartChart";
import { Pill } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import type { NLQueryResponse } from "../types";

const SUGGESTIONS = [
  "Which department spent the most?",
  "Show total spend by category",
  "Top 5 merchants by spend",
  "Count violations by severity",
  "Spend by employee",
];

const CHART_TOGGLES: NLQueryResponse["ui_config"]["chart_type"][] = [
  "bar",
  "line",
  "area",
  "pie",
  "table",
];

export function TalkToData() {
  const [question, setQuestion] = useState("");
  const [voice, setVoice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NLQueryResponse | null>(null);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    try {
      const r = await postQuery(q, voice);
      setResult(r);
      if (r.audio_base64) {
        const audio = new Audio(`data:audio/mpeg;base64,${r.audio_base64}`);
        audioRef.current = audio;
        audio.play().catch(() => {});
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Query failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const restyle = (chart: NLQueryResponse["ui_config"]["chart_type"]) => {
    // Visual-only follow-up: backend reuses cached data, no re-query.
    ask(`${chart} chart`);
  };

  return (
    <div>
      <PageHeader
        title="Talk to Your Data"
        subtitle="Ask in plain English. AI compiles the query — Python executes it in a read-only sandbox."
      />

      <div className="card p-5">
        <div className="flex gap-3">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(question)}
            placeholder="e.g. Which department spent the most on fuel?"
            className="flex-1 rounded-xl border border-ink-600 bg-ink-900/60 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-brim-500"
          />
          <button
            onClick={() => setVoice((v) => !v)}
            className={`btn-ghost ${voice ? "border-brim-500/50 text-brim-400" : ""}`}
            title="Read summary aloud (ElevenLabs)"
          >
            {voice ? "🔊 Voice on" : "🔈 Voice off"}
          </button>
          <button className="btn-primary" onClick={() => ask(question)} disabled={loading}>
            {loading ? "Thinking…" : "Ask"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setQuestion(s);
                ask(s);
              }}
              className="rounded-lg border border-ink-700 bg-ink-900/40 px-3 py-1.5 text-xs text-slate-400 hover:border-brim-500/40 hover:text-brim-400"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="card mt-5 border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {result && (
        <div className="card mt-5 p-6">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-100">
              {result.ui_config.title || result.question}
            </h2>
            {result.used_fallback && <Pill tone="default">deterministic fallback</Pill>}
          </div>
          <p className="mb-4 text-sm text-slate-400">{result.summary}</p>

          <SmartChart data={result.data} ui={result.ui_config} />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink-700/60 pt-4">
            <div className="flex gap-1.5">
              {CHART_TOGGLES.map((c) => (
                <button
                  key={c}
                  onClick={() => restyle(c)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize ${
                    result.ui_config.chart_type === c
                      ? "bg-brim-500/15 text-brim-400"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <code className="rounded-lg bg-ink-900/60 px-3 py-1.5 font-mono text-[11px] text-slate-500">
              {result.query_string}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
