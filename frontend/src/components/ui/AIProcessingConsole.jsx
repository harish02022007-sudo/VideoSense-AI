import React, { useState, useEffect } from "react";
import { Cpu, Database, Eye, Brain, MessageSquare, Terminal, RefreshCw, Zap, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function AIProcessingConsole() {
  const [activeStep, setActiveStep] = useState(3);
  const [logs, setLogs] = useState([
    "System: Initializing multi-agent parser model context...",
    "System: OpenCV reading boundary frames cuts...",
    "YOLO: Loading weights yolo11n.pt, setting confidence threshold to 0.25",
    "YOLO: Extracted 42 vision instances in frame index 360",
    "PaddleOCR: Initializing text reads on POS frames..."
  ]);

  const pipeline = [
    { name: "Upload", status: "Completed", progress: 100, time: "1.2s", gpu: "0%", cpu: "5%", ram: "4.2 GB", vram: "0 MB", fps: "N/A", queue: 0, worker: "W-1", conf: "100%" },
    { name: "Frame Slicing", status: "Completed", progress: 100, time: "3.5s", gpu: "10%", cpu: "45%", ram: "4.8 GB", vram: "80 MB", fps: "30", queue: 0, worker: "W-2", conf: "99%" },
    { name: "YOLOv11", status: "Completed", progress: 100, time: "4.8s", gpu: "42%", cpu: "12%", ram: "5.1 GB", vram: "450 MB", fps: "45", queue: 0, worker: "W-3", conf: "96%" },
    { name: "PaddleOCR", status: "Processing", progress: 68, time: "2.4s", gpu: "68%", cpu: "15%", ram: "5.4 GB", vram: "820 MB", fps: "25", queue: 1, worker: "W-4", conf: "94%" },
    { name: "Whisper", status: "Pending", progress: 0, time: "N/A", gpu: "0%", cpu: "0%", ram: "0 GB", vram: "0 MB", fps: "N/A", queue: 2, worker: "W-1", conf: "N/A" },
    { name: "CLIP Embed", status: "Pending", progress: 0, time: "N/A", gpu: "0%", cpu: "0%", ram: "0 GB", vram: "0 MB", fps: "N/A", queue: 3, worker: "W-2", conf: "N/A" },
    { name: "FAISS Index", status: "Pending", progress: 0, time: "N/A", gpu: "0%", cpu: "0%", ram: "0 GB", vram: "0 MB", fps: "N/A", queue: 4, worker: "W-3", conf: "N/A" },
    { name: "Qwen 2.5 3B", status: "Pending", progress: 0, time: "N/A", gpu: "0%", cpu: "0%", ram: "0 GB", vram: "0 MB", fps: "N/A", queue: 5, worker: "W-4", conf: "N/A" }
  ];

  // Rotate active steps simulator
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        const next = prev >= pipeline.length - 1 ? 0 : prev + 1;
        const logCues = [
          "System: Scanning next upload bytes...",
          "OpenCV: Extracted 24 boundaries segments...",
          "YOLOv11: Tracked person target coords...",
          "PaddleOCR: Scanned receipt details: '$120.00' matched.",
          "Whisper: Transcribed segment length: 12 seconds",
          "CLIP: Vectorized frame index matrices...",
          "FAISS: Seeded index keys successfully",
          "Qwen: reasoning complete: generating response."
        ];
        setLogs((l) => [...l.slice(-8), logCues[next]]);
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 select-none">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          AI Processing Console
        </h2>
        <p className="text-gray-400 mt-2 text-sm">
          Detailed diagnostic nodes tracing vision tracking, text extraction, speech processing, and LLM compilation.
        </p>
      </div>

      {/* Nodes list */}
      <div className="space-y-6">
        {pipeline.map((step, idx) => {
          const isCompleted = idx < activeStep;
          const isActive = idx === activeStep;

          return (
            <div 
              key={step.name}
              className={`glass-panel p-5 border transition-all duration-300 ${
                isActive 
                  ? "bg-primary/5 border-secondary/40 shadow-glow-cyan" 
                  : isCompleted
                  ? "bg-white/[0.01] border-emerald-500/20"
                  : "bg-transparent border-white/5 opacity-40"
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                    isCompleted 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : isActive
                      ? "bg-secondary/10 border-secondary/30 text-secondary animate-pulse"
                      : "bg-black/20 border-white/5 text-gray-600"
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono">{step.name}</h4>
                    <span className="text-[9px] text-gray-500 font-mono">STEP 0{idx + 1}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-4 w-full sm:w-60">
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${isCompleted ? "bg-emerald-500" : "bg-secondary animate-pulse"}`} 
                      style={{ width: `${isActive ? step.progress : isCompleted ? 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-bold text-white font-mono shrink-0">
                    {isCompleted ? "100%" : isActive ? `${step.progress}%` : "0%"}
                  </span>
                </div>
              </div>

              {/* 11 metrics details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-4 text-[10px] font-mono">
                <div>
                  <span className="text-gray-500 block uppercase text-[8px] font-semibold">Status</span>
                  <span className={`font-bold ${isCompleted ? "text-emerald-400" : isActive ? "text-secondary" : "text-gray-600"}`}>
                    {isCompleted ? "Done" : isActive ? "Active" : "Pending"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase text-[8px] font-semibold">Time</span>
                  <span className="text-white font-bold">{step.time}</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase text-[8px] font-semibold">GPU Util</span>
                  <span className="text-white font-bold">{step.gpu}</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase text-[8px] font-semibold">CPU load</span>
                  <span className="text-white font-bold">{step.cpu}</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase text-[8px] font-semibold">RAM</span>
                  <span className="text-white font-bold">{step.ram}</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase text-[8px] font-semibold">VRAM</span>
                  <span className="text-white font-bold">{step.vram}</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase text-[8px] font-semibold">FPS</span>
                  <span className="text-white font-bold">{step.fps}</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase text-[8px] font-semibold">Queue</span>
                  <span className="text-white font-bold">{step.queue}</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase text-[8px] font-semibold">Worker</span>
                  <span className="text-white font-bold">{step.worker}</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase text-[8px] font-semibold">Confidence</span>
                  <span className="text-secondary font-bold">{step.conf}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal log panel */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-white/[0.04] pb-3">
          <span className="flex items-center gap-1.5"><Terminal className="w-4 h-4 text-cyan-400" /> System Activity stdout Stream</span>
          <span className="text-secondary font-mono text-[9px] flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> active</span>
        </div>
        <div className="font-mono text-[11px] space-y-2 max-h-36 overflow-y-auto text-gray-400 p-3 rounded-lg bg-black/40 border border-white/5">
          {logs.map((log, idx) => (
            <p key={idx}><span className="text-gray-600">[{new Date().toLocaleTimeString()}]</span> {log}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
