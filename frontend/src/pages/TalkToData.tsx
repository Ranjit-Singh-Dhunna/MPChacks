import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { postQuery } from "../api/client";
import { Conversation } from "@elevenlabs/client";
import { SmartChart } from "../components/charts/SmartChart";

export function TalkToData() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  // Conversational AI (Real-time Voice Assistant) State
  const [agentId, setAgentId] = useState(() => localStorage.getItem("elevenlabs_agent_id") || "");
  const [convStatus, setConvStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [conversationMessages, setConversationMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [lastToolCall, setLastToolCall] = useState<string>("");
  const conversationRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (conversationRef.current) {
        conversationRef.current.endSession();
      }
    };
  }, []);

  // Conversational AI controls
  const handleSaveAgentId = (val: string) => {
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
      setConversationMessages([]);
      setLastToolCall("");

      // Request mic permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const conv = await Conversation.startSession({
        agentId: agentId.trim(),
        onConnect: () => {
          setConvStatus("connected");
        },
        onDisconnect: () => {
          setConvStatus("disconnected");
        },
        onMessage: (msg: any) => {
          if (msg.message && (msg.source === "user" || msg.source === "ai")) {
            setConversationMessages((prev) => [
              ...prev,
              {
                role: msg.source === "user" ? "user" : "assistant",
                text: msg.message,
              },
            ]);
          }
        },
        clientTools: {
          update_expense_chart: async (params: { query: string }) => {
            console.log("ElevenLabs triggered update_expense_chart (asynchronous):", params);
            const queryVal = params?.query || "most expensive transactions";
            setLastToolCall(`Processing: "${queryVal}"`);
            setLoading(true);

            // Execute the query in the background without awaiting to prevent WebRTC timeouts
            postQuery(queryVal, false)
              .then((res) => {
                setResponse(res);
                setLastToolCall(`Successfully loaded chart: "${res.ui_config.title || "Expense Visualizer"}" (${res.data.length} items)`);
                setLoading(false);
              })
              .catch((err) => {
                console.error("Async client tool query failed:", err);
                setLastToolCall(`Failed: ${err.message || "Query failed"}`);
                setLoading(false);
              });

            // Return immediately to satisfy the ElevenLabs client tool request instantly
            return "Updating the visual screen chart with the requested transaction details now.";
          }
        },
        onError: (err: any) => {
          console.error("ElevenLabs error:", err);
          alert(`ElevenLabs error: ${err.message || err}`);
          setConvStatus("disconnected");
        },
      });
      conversationRef.current = conv;
    } catch (err: any) {
      console.error("Failed to start conversation:", err);
      alert(`Could not connect: ${err.message || err}`);
      setConvStatus("disconnected");
    }
  };

  const stopConversation = async () => {
    if (conversationRef.current) {
      await conversationRef.current.endSession();
      conversationRef.current = null;
    }
    setConvStatus("disconnected");
  };

  const displayData = response?.data || [];
  const chartTitle = response?.ui_config?.title || "Expense Visualizer";

  return (
    <div className="flex flex-col h-full bg-background text-on-background min-h-[95vh]">
      {/* Top Navigation Header */}
      <div className="px-8 py-5 border-b border-outline-variant bg-white sticky top-0 z-10 flex justify-between items-center">
        <Link 
          to="/" 
          className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors font-semibold"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Return to Dashboard
        </Link>
        <div className="flex items-center gap-2 text-secondary font-bold text-xs bg-secondary/5 border border-secondary/15 px-3 py-1 rounded-full">
          <span className="material-symbols-outlined text-[15px] animate-pulse">radar</span>
          Brim AI Active
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="p-8 max-w-[1300px] mx-auto w-full grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Column (Real-time Voice Agent Settings & Session controls) */}
        <div className="lg:col-span-2 border border-outline-variant/65 rounded-xl bg-white p-6 shadow-sm flex flex-col justify-between min-h-[500px] lg:min-h-[calc(95vh-110px)]">
          <div className="flex-grow flex flex-col gap-5 justify-between">
            {/* Configuration fields */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                  ElevenLabs Agent ID
                </label>
                <input
                  type="text"
                  value={agentId}
                  onChange={(e) => handleSaveAgentId(e.target.value)}
                  placeholder="Enter your ElevenLabs Agent ID"
                  className="w-full text-xs font-semibold px-3 py-2 border border-outline-variant rounded-lg outline-none focus:border-secondary transition-colors bg-[#f8f9fa]"
                />
              </div>

              <div className="flex items-center justify-between border-t border-outline-variant/40 pt-4 mt-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    convStatus === "connected" ? "bg-green-500 animate-pulse" :
                    convStatus === "connecting" ? "bg-amber-500 animate-pulse" : "bg-neutral-300"
                  }`} />
                  <span className="text-xs font-bold text-primary capitalize">
                    Status: {convStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Microphone / Session Button */}
            <div className="flex-grow flex flex-col items-center justify-center gap-4 py-6">
              {convStatus === "disconnected" ? (
                <button
                  onClick={startConversation}
                  className="w-24 h-24 rounded-2xl border bg-white border-outline-variant text-secondary hover:border-secondary hover:scale-[1.02] flex items-center justify-center shadow-lg transition-all duration-300"
                >
                  <span className="material-symbols-outlined text-[38px]">call</span>
                </button>
              ) : (
                <button
                  onClick={stopConversation}
                  className="w-24 h-24 rounded-2xl border bg-error text-white animate-pulse border-error shadow-error/20 flex items-center justify-center shadow-lg transition-all duration-300"
                >
                  <span className="material-symbols-outlined text-[38px]">call_end</span>
                </button>
              )}
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                {convStatus === "connected" ? "Listening & Speaking..." :
                 convStatus === "connecting" ? "Establishing WebRTC..." : "Click to Start Session"}
              </span>
            </div>

            {/* Agent Tool Setup Instruction Panel */}
            <div className="border border-outline-variant/60 rounded-xl p-3 bg-slate-50 space-y-2">
              <div className="flex items-center gap-1 text-[9px] font-black text-secondary uppercase tracking-widest">
                <span className="material-symbols-outlined text-[12px]">settings</span>
                ElevenLabs Client Tool Setup
              </div>
              <p className="text-[10px] leading-relaxed text-on-surface-variant font-medium">
                To let the voice agent update your charts dynamically, add a **Client Tool** in your ElevenLabs Dashboard:
              </p>
              <ul className="list-disc pl-4 text-[10px] leading-relaxed text-on-surface-variant font-semibold space-y-1">
                <li>Name: <code className="bg-slate-200 px-1 py-0.5 rounded text-primary">update_expense_chart</code></li>
                <li>Parameter: <code className="bg-slate-200 px-1 py-0.5 rounded text-primary">query</code> (string)</li>
                <li>Description: <code className="italic text-neutral-600">The natural language query describing the data to pull.</code></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column (Visualizations & Call Transcripts) */}
        <div className="lg:col-span-3 border border-outline-variant/65 rounded-xl bg-white p-6 shadow-sm flex flex-col justify-between min-h-[500px] lg:min-h-[calc(95vh-110px)] relative overflow-hidden ai-glow">
          <div>
            {/* Header */}
            <div className="flex justify-between items-center border-b border-outline-variant/50 pb-4 mb-4">
              <div className="flex items-center gap-2 text-secondary font-bold text-sm">
                <span className="material-symbols-outlined text-[20px]">hearing</span>
                Live Visualizations & Call Transcripts
              </div>
            </div>

            {/* Tool Execution Alert Status */}
            {lastToolCall && (
              <div className="mb-4 p-2.5 rounded-lg text-xs bg-secondary/10 border border-secondary/20 text-secondary font-bold flex items-center gap-1.5 animate-pulse">
                <span className="material-symbols-outlined text-[15px]">sync_alt</span>
                {lastToolCall}
              </div>
            )}

            {/* Transcript Area */}
            <div className="space-y-3 max-h-[160px] overflow-y-auto mb-6 bg-slate-50/50 p-3 border border-outline-variant/50 rounded-xl pr-1">
              {conversationMessages.length === 0 ? (
                <div className="text-center py-6 text-xs text-on-surface-variant font-medium italic">
                  Your live conversation transcript will appear here. Try asking the agent to show you chart data...
                </div>
              ) : (
                conversationMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col gap-1 p-2.5 rounded-lg text-xs leading-relaxed max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-[#e8f0fe] text-primary self-end ml-auto"
                        : "bg-[#f1f3f4] text-on-background mr-auto"
                    }`}
                  >
                    <span className="font-bold text-[8px] uppercase tracking-wider text-on-surface-variant">
                      {msg.role === "user" ? "You" : "ElevenLabs Voice"}
                    </span>
                    <span className="font-semibold">{msg.text}</span>
                  </div>
                ))
              )}
            </div>

            {/* Dynamic SmartChart Card */}
            <div className="border border-outline-variant/60 rounded-xl p-4 bg-[#f8f9fa] space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                  {chartTitle}
                </span>
              </div>

              <div className="w-full flex flex-col justify-center">
                {loading ? (
                  <div className="h-44 flex items-center justify-center">
                    <span className="text-[10px] text-on-surface-variant font-bold animate-pulse">Querying ledger records...</span>
                  </div>
                ) : displayData.length > 0 ? (
                  <SmartChart data={displayData} ui={response?.ui_config || { chart_type: "area", title: chartTitle }} />
                ) : (
                  <div className="h-44 flex items-center justify-center">
                    <span className="text-[10px] text-on-surface-variant font-bold">No visual data generated for this query yet.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="flex justify-end gap-3 items-center border-t border-outline-variant/40 pt-4 mt-6">
            <button className="px-4 py-2 border border-outline-variant hover:bg-surface-container-low text-primary font-bold rounded-lg text-xs transition-colors shadow-sm">
              View Raw Data
            </button>
            <button className="px-4 py-2 bg-secondary hover:opacity-90 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm">
              <span className="material-symbols-outlined text-[16px]">flag</span>
              Flag for Audit
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
