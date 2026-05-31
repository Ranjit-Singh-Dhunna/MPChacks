import { useState } from "react";
import { generateAIReport } from "../api/client";
import { ReportPreview } from "../components/reports/ReportPreview";

const SUGGESTIONS = [
  "Generate a report for Sarah's San Diego conference",
  "Finance department software spend last quarter",
  "All policy violations this month",
  "Grace Lee's recent transactions",
];

export function ExpenseReports() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<{ role: "user" | "ai"; text: string }[]>([]);

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setQuery("");
    setLoading(true);
    setError("");
    setHistory((prev) => [...prev, { role: "user", text: q }]);
    
    try {
      const res = await generateAIReport(q);
      setReport(res);
      setHistory((prev) => [
        ...prev, 
        { role: "ai", text: `I've generated the report: "${res.report_title}" with ${res.groups.reduce((acc: number, g: any) => acc + g.transactions.length, 0)} transactions.` }
      ]);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Failed to generate report.");
      setHistory((prev) => [...prev, { role: "ai", text: "Sorry, I encountered an error generating that report." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full h-full min-h-[calc(100vh-2rem)] bg-[#f8fafc] overflow-hidden">
      
      {/* LEFT PANEL: AI Chat (Light Theme) */}
      <div className="w-[450px] shrink-0 border-r border-slate-200 bg-white flex flex-col p-6 gap-6 relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        


        {/* Suggestions */}
        <div className="animate-fade-in">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">lightbulb</span> Quick Prompts
          </div>
          <div className="flex flex-col gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="text-left group relative overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50/50 transition-all shadow-sm hover:shadow"
              >
                <span className="relative z-10">"{s}"</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar-light">
          {history.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-slide-up`}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 ml-1 mr-1">
                {msg.role === "user" ? "You" : "Brim AI"}
              </div>
              <div className={`px-4 py-3 rounded-2xl text-[13px] font-medium max-w-[85%] leading-relaxed shadow-sm ${
                msg.role === "user" 
                  ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm" 
                  : "bg-slate-50 text-slate-800 rounded-tl-sm border border-slate-200"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex flex-col items-start animate-fade-in">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Brim AI</div>
              <div className="px-5 py-3 rounded-2xl text-[13px] font-medium bg-slate-50 text-slate-600 rounded-tl-sm border border-slate-200 flex items-center gap-3 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{animationDelay: "0ms"}}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{animationDelay: "150ms"}}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{animationDelay: "300ms"}}></div>
                </div>
                <span>Compiling secure document...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600 font-semibold shadow-sm">
              {error}
            </div>
          )}
        </div>

        {/* Input Box */}
        <div className="mt-auto pt-4 relative">
          <div className="absolute top-4 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
          <div className={`flex items-center gap-3 bg-white border rounded-full px-4 py-2 mt-4 transition-all shadow-sm ${
            loading ? "border-blue-300 ring-4 ring-blue-50" : "border-slate-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50"
          }`}>
            <span className="material-symbols-outlined text-blue-600 text-[20px]">mic</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(query)}
              disabled={loading}
              placeholder="Generate a report for..."
              className="flex-1 bg-transparent text-sm font-medium outline-none py-1.5 text-slate-800 placeholder:text-slate-400"
            />
            <button
              onClick={() => ask(query)}
              disabled={loading || !query.trim()}
              className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center disabled:opacity-50 hover:shadow-md hover:shadow-blue-500/20 transition-all hover:scale-105"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: PDF Preview (Light Desk) */}
      <div className="flex-1 relative overflow-hidden bg-slate-200/60">
        {/* Subtle grid pattern background for the light "desk" */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMCwwLDAsMC4wNSkiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"></div>
        
        {!report && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10">
            <div className="w-24 h-24 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-6 shadow-xl shadow-slate-200/50">
              <span className="material-symbols-outlined text-5xl text-blue-600/60">description</span>
            </div>
            <div className="text-3xl font-serif font-medium text-slate-800 tracking-tight mb-2">Ready to Generate</div>
            <p className="text-sm font-medium text-slate-500 max-w-sm">
              Use the AI assistant on the left to compile transactions, flag violations, and build a downloadable PDF report.
            </p>
          </div>
        )}

        {report && (
          <div className="absolute inset-0 z-10 animate-fade-in flex flex-col">
             <ReportPreview report={report} />
          </div>
        )}
      </div>
    </div>
  );
}
