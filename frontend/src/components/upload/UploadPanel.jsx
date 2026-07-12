import React, { useState } from "react";
import { 
  UploadCloud, CheckCircle2, Loader2, Sparkles, Database, FileVideo, 
  ArrowRight, ShieldCheck, Zap, HardDrive, LineChart, Play, Pause, X, RefreshCw
} from "lucide-react";

export default function UploadPanel() {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("idle"); // idle, uploading, paused, completed
  const [progress, setProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState("42.8 MB/s");
  const [estimatedTime, setEstimatedTime] = useState("8 seconds");

  // Mock Upload History
  const history = [
    { title: "store_cam_4.mp4", date: "July 11, 2026", size: "12.4 MB" },
    { title: "pos_register.mp4", date: "July 10, 2026", size: "24.8 MB" }
  ];

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("video/")) {
      setFile(droppedFile);
    }
  };

  const handleSelectFile = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const triggerIngestion = () => {
    if (!file) return;
    setUploadStatus("uploading");
    setProgress(0);
    
    // Simulate chunk progress increments
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadStatus("completed");
          return 100;
        }
        return prev + 10;
      });
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 select-none">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Upload Center</h2>
        <p className="text-gray-400 mt-2 text-sm">
          Load video streams into the VideoSense AI environment. Our agentic pipeline handles scene boundaries, detects visual targets, converts speech to text, and creates dense vector indices.
        </p>
      </div>

      {uploadStatus === "idle" && (
        <div className="space-y-8">
          {/* Advanced Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border border-white/[0.04] rounded-2xl p-12 bg-background-card/20 hover:bg-background-card/30 backdrop-blur-glass flex flex-col items-center justify-center transition-all cursor-pointer relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-secondary/0 to-accent-purple/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <input
              type="file"
              accept="video/*"
              className="hidden"
              id="file-upload"
              onChange={handleSelectFile}
            />
            <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer z-10">
              <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center border border-white/5 shadow-inner mb-4 group-hover:border-secondary/20 group-hover:shadow-glow-cyan transition-all">
                <UploadCloud className="w-8 h-8 text-blue-400 group-hover:text-secondary transition-all" />
              </div>
              <p className="text-sm font-semibold text-white">
                {file ? file.name : "Drag & drop your video here, or click to browse"}
              </p>
              <p className="text-xs text-gray-500 mt-2">Supports MP4, AVI, MOV, MKV up to 500MB</p>
            </label>
          </div>

          {file && (
            <div className="glass-panel p-5 flex items-center justify-between border-white/5">
              <div className="flex items-center gap-3 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-gray-400">File integrity verified</span>
                <span className="text-gray-600">|</span>
                <span className="font-mono text-gray-300">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setFile(null)} className="btn-glass px-4 py-2 text-xs">Clear</button>
                <button onClick={triggerIngestion} className="btn-gradient px-4 py-2 text-xs font-bold">
                  Trigger Ingestion <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Upload History */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Upload History</h3>
            <div className="space-y-3">
              {history.map((hist, idx) => (
                <div key={idx} className="glass-panel p-4 flex items-center justify-between border-white/5">
                  <div className="flex items-center gap-3">
                    <FileVideo className="w-5 h-5 text-secondary" />
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono">{hist.title}</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">{hist.date} • {hist.size}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-2 py-0.5 rounded">Completed</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {uploadStatus !== "idle" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Progress and simulation */}
          <div className="lg:col-span-2 glass-panel p-6 space-y-6 border-white/5">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {uploadStatus === "uploading" && "Chunk Uploading..."}
                  {uploadStatus === "paused" && "Upload Paused"}
                  {uploadStatus === "completed" && "Stream Verified"}
                </h3>
                <span className="text-[10px] text-gray-500 font-mono">{file?.name}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {uploadStatus === "uploading" && (
                  <button onClick={() => setUploadStatus("paused")} className="p-2 bg-white/5 rounded-xl border border-white/5 text-gray-400 hover:text-white" title="Pause">
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                )}
                {uploadStatus === "paused" && (
                  <button onClick={() => setUploadStatus("uploading")} className="p-2 bg-white/5 rounded-xl border border-white/5 text-gray-400 hover:text-white" title="Resume">
                    <Play className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => setUploadStatus("idle")} className="p-2 bg-white/5 rounded-xl border border-white/5 text-gray-400 hover:text-white" title="Cancel">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Progress line */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-500">INGESTION PROGRESS</span>
                <span className="text-white font-bold">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>

          {/* Telemetry charts */}
          <div className="space-y-6">
            <div className="glass-panel p-5 space-y-4 border-white/5">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/[0.04] pb-3">Bandwidth Stats</h3>
              <div className="space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-yellow-400" /> SPEED</span>
                  <span className="text-white font-bold">{uploadSpeed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5"><ClockPlaceholder className="w-3.5 h-3.5 text-blue-400" /> EST. TIME</span>
                  <span className="text-white font-bold">{estimatedTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClockPlaceholder(props) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
