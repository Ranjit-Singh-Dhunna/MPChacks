import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Conversation } from "@elevenlabs/client";
import { postQuery } from "../api/client";
import { SmartChart } from "../components/charts/SmartChart";
import { ChainOfTrust } from "../components/query/ChainOfTrust";
import { FADE_SCALE } from "../lib/motion";
import type { NLQueryResponse } from "../types";

const SUGGESTIONS = [
  "Which department spent the most?",
  "Show Grace Lee's transactions",
  "Top 5 merchants by spend",
  "Count violations by severity",
  "Fuel spend over time",
  "Pending approvals by risk score",
];

const CHART_TYPES = ["bar", "line", "area", "pie", "table", "map"] as const;

interface HistoryEntry { question: string; summary: string; }

type Mode = "text" | "voice";

export function TalkToData() {
  // ── Text Query State ──
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NLQueryResponse | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // ── Mode toggle ──
  const [mode, setMode] = useState<Mode>("text");

  // ── ElevenLabs Voice State ──
  const [agentId, setAgentId] = useState(() => localStorage.getItem("elevenlabs_agent_id") || "");
  const [convStatus, setConvStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [lastToolCall, setLastToolCall] = useState("");
  const conversationRef = useRef<any>(null);

  useEffect(() => {
    return () => { conversationRef.current?.endSession(); };
  }, []);

  // ── Text query ──
  const ask = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    try {
      const r = await postQuery(q, false);
      setResult(r);
      setHistory((h) => [{ question: q, summary: r.summary }, ...h].slice(0, 8));
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Query failed — is the backend running?");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const submit = () => { ask(question); setQuestion(""); };
  const restyle = (chart: string) => { ask(`${chart} chart`); };
  const useChip = (s: string) => { ask(s); setQuestion(""); };

  // ── ElevenLabs Voice ──
  const saveAgentId = (val: string) => {
    setAgentId(val);
    localStorage.setItem("elevenlabs_agent_id", val);
  };

  const startConversation = async () => {
    if (!agentId.trim()) {
      alert("Please enter a valid ElevenLabs Agent ID.");
      return;
    }
    try {
      setConvStatus("connecting");
      setMessages([]);
      setLastToolCall("");
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const conv = await Conversation.startSession({
        agentId: agentId.trim(),
        onConnect: () => setConvStatus("connected"),
        onDisconnect: () => setConvStatus("disconnected"),
        onMessage: (msg: any) => {
          if (msg.message && (msg.source === "user" || msg.source === "ai")) {
            setMessages((prev) => [
              ...prev,
              { role: msg.source === "user" ? "user" : "assistant", text: msg.message },
            ]);
          }
        },
        clientTools: {
          update_expense_chart: async (params: { query: string }) => {
            const q = params?.query || "most expensive transactions";
            setLastToolCall(`Processing: "${q}"`);
            setLoading(true);
            postQuery(q, false)
              .then((res) => {
                setResult(res);
                setLastToolCall(`Chart updated: "${res.ui_config.title}" (${res.data.length} items)`);
                setLoading(false);
              })
              .catch((err) => {
                setLastToolCall(`Failed: ${err.message}`);
                setLoading(false);
              });
            return "Updating the visual chart with the requested data now.";
          },
        },
        onError: (err: any) => {
          console.error("ElevenLabs error:", err);
          setConvStatus("disconnected");
        },
      });
      conversationRef.current = conv;
    } catch (err: any) {
      alert(`Could not connect: ${err.message || err}`);
      setConvStatus("disconnected");
    }
  };

  const stopConversation = async () => {
    await conversationRef.current?.endSession();
    conversationRef.current = null;
    setConvStatus("disconnected");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* STICKY HEADER */}
      <div className="px-8 py-4 border-b border-outline-variant/65 bg-white sticky top-0 z-20 flex justify-between items-center">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Talk to Your Data</div>
          <h1 className="text-xl font-black text-primary mt-0.5 tracking-tight">Ask anything about your expenses</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex gap-1 bg-surface-container-low p-1 rounded-xl">
            {(["text", "voice"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                  mode === m ? "bg-secondary text-white shadow-sm" : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {m === "text" ? "text_fields" : "mic"}
                </span>
                {m === "text" ? "Text" : "Voice Agent"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-secondary/5 border border-secondary/15 px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="text-xs font-bold text-secondary">Brim AI Active</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ══════════ TEXT MODE ══════════ */}
        {mode === "text" && (
          <>
            {/* LEFT PANEL */}
            <div className="w-[340px] shrink-0 border-r border-outline-variant/50 bg-white flex flex-col p-5 gap-5 overflow-y-auto">
              {/* Input box */}
              <div className={`rounded-2xl border bg-white shadow-sm transition-all ${loading ? "ai-glow border-secondary/30" : "border-outline-variant/60"}`}>
                <div className="flex items-center gap-2 px-4 pt-4">
                  <span className="text-secondary text-sm font-bold">✦</span>
                  <input
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

              {/* Suggestions */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Suggested Questions</div>
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

              {/* History */}
              {history.length > 0 && (
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">History</div>
                  <div className="space-y-3">
                    {history.map((h, i) => (
                      <div key={i} className="cursor-pointer group" onClick={() => useChip(h.question)}>
                        <div className="text-xs font-bold text-primary group-hover:text-secondary transition-colors">{h.question}</div>
                        <div className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-2">{h.summary}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT PANEL */}
            <div className="flex-1 overflow-y-auto p-8">
              {error && (
                <div className="rounded-2xl border border-error/20 bg-error-container/20 px-5 py-4 text-sm text-error font-semibold mb-5">{error}</div>
              )}

              {!result && !loading && !error && (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                  <div className="w-20 h-20 rounded-3xl gradient-hero mx-auto flex items-center justify-center mb-5">
                    <span className="material-symbols-outlined text-white text-4xl">psychology</span>
                  </div>
                  <div className="text-xl font-bold text-primary">Ready to answer your questions</div>
                  <p className="text-sm text-on-surface-variant mt-2 max-w-sm">Ask about spend, violations, employees, or fraud patterns. AI compiles the query — Python executes it safely.</p>
                </div>
              )}

              {loading && (
                <div className="rounded-2xl border border-secondary/20 bg-secondary/5 ai-glow px-6 py-8 text-center">
                  <div className="text-secondary font-bold text-sm animate-pulse">Brim AI is thinking…</div>
                  <div className="flex justify-center gap-1.5 mt-4">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} className="w-2 h-2 rounded-full bg-secondary"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }} />
                    ))}
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait">
                {result && !loading && (
                  <motion.div key={result.question} {...FADE_SCALE}>
                    <ChainOfTrust
                      durationMs={1600}
                      rowCount={result.data.length}
                      queryString={result.query_string}
                      usedFallback={result.used_fallback}
                    />
                    <div className="card p-6">
                      <div className="flex items-start justify-between mb-1 gap-3 flex-wrap">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{result.question}</div>
                          <div className="text-xl font-bold text-primary mt-1">{result.ui_config.title || "Query Result"}</div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {CHART_TYPES.map((c) => (
                            <button key={c} onClick={() => restyle(c)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                                result.ui_config.chart_type === c ? "bg-secondary/10 text-secondary font-bold" : "text-on-surface-variant hover:text-primary"
                              }`}>{c}</button>
                          ))}
                        </div>
                      </div>
                      {result.used_fallback && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-center gap-2 mb-4">
                          <span className="material-symbols-outlined text-amber-600 text-[18px]">info</span>
                          <span className="text-xs font-semibold text-amber-700">Showing deterministic fallback — AI unavailable</span>
                        </div>
                      )}
                      <SmartChart data={result.data} ui={result.ui_config} />
                      <p className="text-sm text-on-surface-variant leading-relaxed mt-4">{result.summary}</p>
                      <div className="mt-4 pt-4 border-t border-outline-variant/50">
                        <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Follow up</div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {["Break down by employee", "Show as pie chart", "Compare to last quarter"].map((s) => (
                            <button key={s} onClick={() => useChip(s)}
                              className="rounded-full border border-outline-variant bg-surface-container-low px-3 py-1.5 text-[11px] font-medium text-on-surface-variant hover:border-secondary hover:text-secondary transition-all">
                              → {s}
                            </button>
                          ))}
                        </div>
                        <code className="rounded-xl bg-surface-container-low border border-outline-variant px-3 py-1.5 font-mono text-[10px] text-on-surface-variant truncate block max-w-full">
                          {result.query_string}
                        </code>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* ══════════ VOICE AGENT MODE ══════════ */}
        {mode === "voice" && (
          <div className="flex-1 p-8 max-w-[1300px] mx-auto w-full grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Left — Agent Setup & Controls */}
            <div className="lg:col-span-2 card p-6 flex flex-col gap-5 min-h-[500px]">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-black text-on-surface-variant">ElevenLabs Agent ID</label>
                  <input
                    type="text"
                    value={agentId}
                    onChange={(e) => saveAgentId(e.target.value)}
                    placeholder="Enter your ElevenLabs Agent ID"
                    className="w-full text-xs font-semibold px-3 py-2.5 border border-outline-variant rounded-xl outline-none focus:border-secondary transition-colors bg-surface-container-low"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/40">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    convStatus === "connected" ? "bg-green-500 animate-pulse" :
                    convStatus === "connecting" ? "bg-amber-500 animate-pulse" : "bg-gray-300"
                  }`} />
                  <span className="text-xs font-bold text-primary capitalize">Status: {convStatus}</span>
                </div>
              </div>

              {/* Mic button */}
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-6">
                {convStatus === "disconnected" ? (
                  <button onClick={startConversation}
                    className="w-24 h-24 rounded-2xl border-2 border-secondary/30 bg-white text-secondary hover:border-secondary hover:scale-105 flex items-center justify-center shadow-lg transition-all duration-300">
                    <span className="material-symbols-outlined text-[42px]">call</span>
                  </button>
                ) : (
                  <button onClick={stopConversation}
                    className="w-24 h-24 rounded-2xl bg-error text-white animate-pulse flex items-center justify-center shadow-lg transition-all duration-300">
                    <span className="material-symbols-outlined text-[42px]">call_end</span>
                  </button>
                )}
                <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold text-center">
                  {convStatus === "connected" ? "Listening & Speaking…" :
                   convStatus === "connecting" ? "Establishing WebRTC…" : "Click to Start Session"}
                </span>
              </div>

              {/* Setup instructions */}
              <div className="border border-outline-variant/60 rounded-xl p-4 bg-surface-container-low space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-secondary uppercase tracking-widest">
                  <span className="material-symbols-outlined text-[13px]">settings</span>
                  Client Tool Setup
                </div>
                <p className="text-[10px] leading-relaxed text-on-surface-variant font-medium">Add this client tool in your ElevenLabs Dashboard to enable dynamic chart updates:</p>
                <ul className="list-disc pl-4 text-[10px] leading-relaxed text-on-surface-variant font-semibold space-y-1">
                  <li>Name: <code className="bg-white px-1 py-0.5 rounded border border-outline-variant text-primary">update_expense_chart</code></li>
                  <li>Parameter: <code className="bg-white px-1 py-0.5 rounded border border-outline-variant text-primary">query</code> (string)</li>
                  <li>Description: natural language query for expense data</li>
                </ul>
              </div>
            </div>

            {/* Right — Live transcripts + Chart */}
            <div className="lg:col-span-3 card p-6 flex flex-col gap-5 min-h-[500px] ai-glow">
              <div className="flex items-center justify-between border-b border-outline-variant/50 pb-4">
                <div className="flex items-center gap-2 text-secondary font-bold text-sm">
                  <span className="material-symbols-outlined text-[20px]">hearing</span>
                  Live Visualizations &amp; Transcripts
                </div>
              </div>

              {lastToolCall && (
                <div className="px-3 py-2.5 rounded-xl text-xs bg-secondary/10 border border-secondary/20 text-secondary font-bold flex items-center gap-1.5 animate-pulse">
                  <span className="material-symbols-outlined text-[15px]">sync_alt</span>
                  {lastToolCall}
                </div>
              )}

              {/* Transcript */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto bg-surface-container-low/50 p-3 border border-outline-variant/50 rounded-xl">
                {messages.length === 0 ? (
                  <div className="text-center py-6 text-xs text-on-surface-variant italic">
                    Your live conversation transcript will appear here. Ask the agent to show chart data…
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col gap-0.5 p-2.5 rounded-xl text-xs max-w-[85%] ${
                      msg.role === "user" ? "bg-secondary/10 text-primary self-end ml-auto" : "bg-surface-container text-on-background mr-auto"
                    }`}>
                      <span className="font-black text-[8px] uppercase tracking-wider text-on-surface-variant">
                        {msg.role === "user" ? "You" : "Brim AI Voice"}
                      </span>
                      <span className="font-semibold">{msg.text}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Chart */}
              <div className="border border-outline-variant/60 rounded-2xl p-5 bg-surface-container-low flex-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3">
                  {result?.ui_config?.title || "Expense Visualizer"}
                </div>
                {loading ? (
                  <div className="h-44 flex items-center justify-center">
                    <span className="text-xs text-on-surface-variant animate-pulse">Querying ledger records…</span>
                  </div>
                ) : result?.data?.length ? (
                  <SmartChart data={result.data} ui={result.ui_config} />
                ) : (
                  <div className="h-44 flex items-center justify-center">
                    <span className="text-xs text-on-surface-variant">No visual data yet — start talking to your agent.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
