import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { postQuery } from "../api/client";
import { Conversation } from "@elevenlabs/client";

// Speech Recognition API setup
const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function TalkToData() {
  // Tabs: "query" (Ad-hoc query) vs "conversational" (Real-time voice agent)
  const [activeTab, setActiveTab] = useState<"query" | "conversational">("query");

  // Shared state for the chart/insights output card
  const [playAudio, setPlayAudio] = useState(true);
  const [query, setQuery] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Conversational AI (Real-time Voice Assistant) State
  const [agentId, setAgentId] = useState(() => localStorage.getItem("elevenlabs_agent_id") || "");
  const [convStatus, setConvStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [conversationMessages, setConversationMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const conversationRef = useRef<any>(null);

  // Initialize Speech Recognition for Ad-hoc
  const recognitionRef = useRef<any>(null);
  useEffect(() => {
    if (SpeechRecognitionAPI) {
      const rec = new SpeechRecognitionAPI();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        handleSendQuery(transcript);
      };

      rec.onerror = () => {
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (conversationRef.current) {
        conversationRef.current.endSession();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please type your query below.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleSendQuery = async (queryText = query) => {
    if (!queryText.trim()) return;
    setLoading(true);
    setResponse(null);

    try {
      const res = await postQuery(queryText, playAudio);
      setResponse(res);

      // Play base64 audio response if present
      if (playAudio && res.audio_base64) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(`data:audio/mp3;base64,${res.audio_base64}`);
        audioRef.current = audio;
        audio.play().catch((err) => console.log("Audio playback interaction blocked:", err));
      }
    } catch (err) {
      console.error("Query failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendQuery();
    }
  };

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
            console.log("ElevenLabs triggered update_expense_chart:", params);
            setLoading(true);
            try {
              // Retrieve backend data & update the dynamic charts on-screen
              const res = await postQuery(params.query, false); // Voice output handled by WebRTC, so disable base64 audio fallback
              setResponse(res);
              setLoading(false);
              return `Successfully loaded data and updated the screen chart titled "${res.ui_config.title || "Expense Visualizer"}" with ${res.data.length} items.`;
            } catch (err: any) {
              console.error("Client tool execution failed:", err);
              setLoading(false);
              return `Failed to update screen chart: ${err.message || err}`;
            }
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

  // Default initial UI display values (Brim Logistics spend query)
  const displaySummary = response
    ? response.summary
    : "Ask any question about your corporate expenditures. Brim AI will extract database stats, compile a visualization, and vocalize the insight.";

  const displayData = response?.data || [];
  const chartType = response?.ui_config?.chart_type || "area";
  const xAxisKey = response?.ui_config?.x_axis || "name";
  const yAxisKey = response?.ui_config?.y_axis || "spend";
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

      {/* Navigation Tabs */}
      <div className="px-8 pt-4 bg-white border-b border-outline-variant/65 flex gap-6">
        <button
          onClick={() => setActiveTab("query")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "query"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-primary"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">analytics</span>
          Ad-hoc Query & Charts
        </button>
        <button
          onClick={() => setActiveTab("conversational")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "conversational"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-primary"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">forum</span>
          Real-time Voice Agent
        </button>
      </div>

      {/* Main Grid Content */}
      <div className="p-8 max-w-[1300px] mx-auto w-full grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-2 border border-outline-variant/65 rounded-xl bg-white p-6 shadow-sm flex flex-col justify-between min-h-[500px] lg:min-h-[calc(95vh-160px)]">
          {activeTab === "query" ? (
            <>
              {/* Centered Microphone Indicator */}
              <div className="flex-grow flex flex-col items-center justify-center gap-4">
                <button
                  onClick={toggleRecording}
                  className={`w-24 h-24 rounded-2xl border flex items-center justify-center shadow-lg transition-all duration-300 ${
                    isRecording 
                      ? "bg-error text-white animate-pulse border-error shadow-error/20" 
                      : "bg-white border-outline-variant text-secondary hover:border-secondary hover:scale-[1.02]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[38px]">
                    {isRecording ? "graphic_eq" : "mic"}
                  </span>
                </button>
                <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                  {isRecording ? "Listening to your voice..." : "Click to Speak"}
                </span>
              </div>

              {/* Prompt / Transcribed Speech Box */}
              <div className="space-y-4">
                <div className="flex gap-2 border border-outline-variant/80 rounded-xl p-2 bg-[#f8f9fa] shadow-inner focus-within:border-secondary transition-colors">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder='Ask about spend (e.g. "What did Finance spend last month?")'
                    className="w-full bg-transparent border-none outline-none text-xs text-on-background font-semibold px-2"
                  />
                  <button 
                    onClick={() => handleSendQuery()}
                    className="bg-secondary text-white p-2 rounded-lg hover:opacity-95 transition-all flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  </button>
                </div>

                <div className="border border-secondary/20 bg-secondary/5 rounded-xl p-4 space-y-3 relative overflow-hidden ai-glow">
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-secondary uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                    Brim Speech Processor
                  </div>
                  
                  <div className="text-xs font-bold text-primary leading-relaxed italic">
                    {query ? `"${query}"` : '"Speak or type a query above to analyze trends..."'}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Conversational Voice Agent Interface */}
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
            </>
          )}
        </div>

        {/* Right Column */}
        <div className="lg:col-span-3 border border-outline-variant/65 rounded-xl bg-white p-6 shadow-sm flex flex-col justify-between min-h-[500px] lg:min-h-[calc(95vh-160px)] relative overflow-hidden ai-glow">
          <div>
            {/* Header / Play Audio Toggle */}
            <div className="flex justify-between items-center border-b border-outline-variant/50 pb-4 mb-4">
              <div className="flex items-center gap-2 text-secondary font-bold text-sm">
                <span className="material-symbols-outlined text-[20px]">
                  {activeTab === "query" ? "psychology" : "hearing"}
                </span>
                {activeTab === "query" ? "AI Generated Insight" : "Live Visualizations & Call Transcripts"}
              </div>
              {activeTab === "query" && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">Play Voice Response</span>
                  <button
                    onClick={() => setPlayAudio(!playAudio)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      playAudio ? "bg-secondary" : "bg-surface-container-high"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        playAudio ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* Narrated Summary text */}
            {activeTab === "query" ? (
              <p className="text-xs leading-relaxed text-on-surface-variant font-medium mb-6">
                {loading ? "Analyzing database metrics & generating audio transcription..." : displaySummary}
              </p>
            ) : (
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
            )}

            {/* Spark Spend vs Budget Chart Card */}
            <div className="border border-outline-variant/60 rounded-xl p-4 bg-[#f8f9fa] space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                  {chartTitle}
                </span>
              </div>

              <div className="h-44 w-full flex items-center justify-center">
                {loading ? (
                  <span className="text-[10px] text-on-surface-variant font-bold">Querying ledger records...</span>
                ) : displayData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "bar" ? (
                      <BarChart data={displayData} margin={{ left: -20, right: 0, top: 5, bottom: 0 }}>
                        <XAxis 
                          dataKey={xAxisKey} 
                          tickLine={false} 
                          axisLine={false}
                          tick={{ fill: "#45464d", fontSize: 10, fontWeight: 600 }}
                        />
                        <YAxis 
                          tickLine={false} 
                          axisLine={false}
                          tick={{ fill: "#45464d", fontSize: 9 }}
                        />
                        <Tooltip />
                        <Bar dataKey={yAxisKey} fill="#316bf3" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : chartType === "line" ? (
                      <LineChart data={displayData} margin={{ left: -20, right: 0, top: 5, bottom: 0 }}>
                        <XAxis 
                          dataKey={xAxisKey} 
                          tickLine={false} 
                          axisLine={false}
                          tick={{ fill: "#45464d", fontSize: 10, fontWeight: 600 }}
                        />
                        <YAxis 
                          tickLine={false} 
                          axisLine={false}
                          tick={{ fill: "#45464d", fontSize: 9 }}
                        />
                        <Tooltip />
                        <Line type="monotone" dataKey={yAxisKey} stroke="#316bf3" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    ) : (
                      <AreaChart data={displayData} margin={{ left: -20, right: 0, top: 5, bottom: 0 }}>
                        <XAxis 
                          dataKey={xAxisKey} 
                          tickLine={false} 
                          axisLine={false}
                          tick={{ fill: "#45464d", fontSize: 10, fontWeight: 600 }}
                        />
                        <YAxis 
                          tickLine={false} 
                          axisLine={false}
                          tick={{ fill: "#45464d", fontSize: 9 }}
                        />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey={yAxisKey} 
                          stroke="#316bf3" 
                          fillOpacity={0.06}
                          fill="url(#colorSpend)" 
                          strokeWidth={2}
                        />
                        <defs>
                          <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#316bf3" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#316bf3" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <span className="text-[10px] text-on-surface-variant font-bold">No visual data generated for this query yet.</span>
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
