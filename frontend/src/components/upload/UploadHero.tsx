import { useRef, useState } from "react";

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

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

  return (
    <div className="w-full">
      <div
        className={`upload-zone rounded-3xl p-10 text-center cursor-pointer ${state === "drag" ? "drag-active" : ""}`}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setState("drag"); }}
        onDragLeave={() => setState("idle")}
        onClick={() => state === "idle" && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          hidden
          onChange={onInputChange}
        />

        {state === "idle" || state === "drag" ? (
          <>
            <span className="material-symbols-outlined text-[52px] text-secondary mb-3 block">
              {state === "drag" ? "file_download" : "upload_file"}
            </span>
            <div className="text-xl font-black text-white mb-1">
              {state === "drag" ? "Release to upload" : "Drop your transactions CSV"}
            </div>
            <div className="text-sm text-slate-400">
              or{" "}
              <button
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="text-secondary underline"
              >
                browse files
              </button>
            </div>
            <div className="mt-3 text-xs text-slate-500">CSV or Excel · up to 50,000 rows</div>
          </>
        ) : state === "uploading" ? (
          <>
            <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-lg font-bold text-white">Processing transactions…</div>
            <div className="text-sm text-slate-400 mt-1">Running fraud detection pipeline</div>
          </>
        ) : state === "done" ? (
          <>
            <span className="material-symbols-outlined text-[52px] text-green-400 mb-3 block">check_circle</span>
            <div className="text-lg font-bold text-white">Loaded! Navigating to dashboard…</div>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[52px] text-red-400 mb-3 block">error</span>
            <div className="text-lg font-bold text-white">Upload failed</div>
            <div className="text-sm text-red-300 mt-1">{errorMsg}</div>
            <button
              onClick={() => setState("idle")}
              className="mt-3 text-sm text-slate-400 hover:text-white underline"
            >
              Try again
            </button>
          </>
        )}
      </div>

      {(state === "idle" || state === "drag") && (
        <button
          onClick={runDemo}
          className="mt-4 w-full text-sm text-slate-400 hover:text-secondary transition-colors text-center"
        >
          → Try with demo data (4,235 seeded transactions)
        </button>
      )}
    </div>
  );
}
