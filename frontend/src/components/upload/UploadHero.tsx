import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type UploadState = "idle" | "drag" | "uploading" | "done" | "error";

interface Props {
  onFile: (file: File) => Promise<void>;
  onDemo: () => Promise<void>;
}

export function UploadHero({ onFile, onDemo }: Props) {
  const [state, setState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = async (file: File) => {
    setState("uploading");
    setErrorMsg("");
    try {
      await onFile(file);
      setState("done");
    } catch (e: any) {
      setState("error");
      setErrorMsg(e?.message || "Upload failed");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setState("idle");
    const file = e.dataTransfer.files[0];
    if (file) handle(file);
  };

  const runDemo = async () => {
    setState("uploading");
    try {
      await onDemo();
      setState("done");
    } catch {
      setState("idle");
    }
  };

  const isDrag = state === "drag";
  const isIdle = state === "idle" || isDrag;

  return (
    <div className="w-full">
      <motion.div
        className={`upload-zone rounded-3xl p-10 text-center cursor-pointer relative overflow-hidden ${isDrag ? "drag-active" : ""}`}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setState("drag"); }}
        onDragLeave={() => setState("idle")}
        onClick={() => isIdle && inputRef.current?.click()}
        animate={isDrag ? { scale: 1.02 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }}
        />

        <AnimatePresence mode="wait">
          {isIdle && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* Floating animated icon */}
              <motion.span
                className="material-symbols-outlined text-[52px] text-secondary mb-3 block"
                animate={isDrag
                  ? { scale: 1.2, rotate: -8 }
                  : { y: [0, -6, 0] }
                }
                transition={isDrag
                  ? { type: "spring", stiffness: 400, damping: 20 }
                  : { duration: 3, repeat: Infinity, ease: "easeInOut" }
                }
              >
                {isDrag ? "file_download" : "upload_file"}
              </motion.span>
              <div className="text-xl font-black text-white mb-1">
                {isDrag ? "Release to upload" : "Drop your transactions CSV"}
              </div>
              <div className="text-sm text-slate-400">
                or{" "}
                <button
                  onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                  className="text-secondary underline hover:text-secondary/80 transition-colors"
                >
                  browse files
                </button>
              </div>
              <div className="mt-3 text-xs text-slate-500">CSV or Excel · up to 50,000 rows</div>

              {/* Drag-active shimmer overlay */}
              {isDrag && (
                <motion.div
                  className="absolute inset-0 rounded-3xl pointer-events-none"
                  style={{ background: "radial-gradient(circle at center, rgba(0,81,213,0.12) 0%, transparent 70%)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              )}
            </motion.div>
          )}

          {state === "uploading" && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative w-14 h-14 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-secondary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-secondary border-t-transparent animate-spin" />
                <div className="absolute inset-2 rounded-full border-2 border-secondary/30 border-b-transparent animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.7s" }} />
              </div>
              <div className="text-lg font-bold text-white">Processing transactions…</div>
              <div className="text-sm text-slate-400 mt-1">Running fraud detection pipeline</div>
            </motion.div>
          )}

          {state === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <motion.span
                className="material-symbols-outlined text-[52px] text-emerald-400 mb-3 block"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.05 }}
              >
                check_circle
              </motion.span>
              <div className="text-lg font-bold text-white">Loaded! Navigating to dashboard…</div>
            </motion.div>
          )}

          {state === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="material-symbols-outlined text-[52px] text-red-400 mb-3 block">error</span>
              <div className="text-lg font-bold text-white">Upload failed</div>
              <div className="text-sm text-red-300 mt-1">{errorMsg}</div>
              <button
                onClick={() => setState("idle")}
                className="mt-3 text-sm text-slate-400 hover:text-white underline"
              >
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {isIdle && (
        <motion.button
          onClick={runDemo}
          className="mt-4 w-full text-sm text-slate-400 hover:text-secondary transition-colors text-center"
          whileHover={{ x: 4 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
        >
          → Try with demo data (4,235 seeded transactions)
        </motion.button>
      )}
    </div>
  );
}
