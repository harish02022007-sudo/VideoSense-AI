import React from "react";
import { motion } from "framer-motion";
import { 
  Video, Sparkles, Cpu, Clock, CheckCircle2, AlertCircle, 
  ArrowUpRight, Play, Database, MessageSquare, Terminal, Eye, Brain
} from "lucide-react";

export default function Overview({ onSelectVideo, onNavigateUpload }) {
  // Stats Data with Progress Ring and Sparkline vectors
  const stats = [
    { 
      label: "Ingested Streams", 
      value: "14", 
      change: "+3 this week", 
      icon: Video, 
      color: "from-blue-500 to-cyan-400",
      pct: 70,
      sparkline: "M 0 10 Q 15 5, 30 15 T 60 5 T 90 12 T 120 4"
    },
    { 
      label: "Entities Indexed", 
      value: "32,489", 
      change: "+12.4% today", 
      icon: Sparkles, 
      color: "from-purple-500 to-pink-500",
      pct: 85,
      sparkline: "M 0 15 Q 15 15, 30 5 T 60 12 T 90 2 T 120 8"
    },
    { 
      label: "Inference Speed", 
      value: "45 ms", 
      change: "GPU CUDA Active", 
      icon: Cpu, 
      color: "from-amber-500 to-red-500",
      pct: 95,
      sparkline: "M 0 8 Q 15 12, 30 4 T 60 15 T 90 8 T 120 3"
    },
    { 
      label: "RAG Memory Hits", 
      value: "99.2%", 
      change: "FAISS Index Online", 
      icon: Clock, 
      color: "from-teal-500 to-emerald-400",
      pct: 99,
      sparkline: "M 0 5 Q 15 3, 30 4 T 60 2 T 90 3 T 120 2"
    },
  ];

  // Ingestion Pipeline Steps
  const pipelineSteps = [
    { id: "upload", label: "Upload", icon: UploadCloudPlaceholder },
    { id: "extract", label: "OpenCV", icon: Eye },
    { id: "yolo", label: "YOLOv11", icon: Sparkles },
    { id: "ocr", label: "PaddleOCR", icon: Database },
    { id: "whisper", label: "Whisper", icon: Clock },
    { id: "embeddings", label: "CLIP", icon: Cpu },
    { id: "faiss", label: "FAISS", icon: Database },
    { id: "llm", label: "Qwen LLM", icon: Brain },
    { id: "rag", label: "RAG Context", icon: MessageSquare }
  ];

  // Mock Video Cards
  const videoCatalog = [
    {
      id: "mock-uuid-1",
      title: "Store Surveillance Floor Cam 4",
      duration: "00:45",
      resolution: "1080p",
      size: "12.4 MB",
      status: "completed",
      progress: 100,
      timestamp: "12 mins ago",
      objects: 42,
      faces: 3,
      confidence: 96,
      tags: ["Shopper", "Shelf Interaction", "Checkout"]
    },
    {
      id: "mock-uuid-2",
      title: "Warehouse Logistics & Loading Dock",
      duration: "02:00",
      resolution: "4K",
      size: "38.2 MB",
      status: "processing",
      progress: 45,
      timestamp: "1 hour ago",
      objects: 18,
      faces: 0,
      confidence: 89,
      tags: ["Forklift", "Delivery Truck", "Palette"]
    },
    {
      id: "mock-uuid-3",
      title: "Main Register POS Counter",
      duration: "01:15",
      resolution: "1080p",
      size: "24.8 MB",
      status: "completed",
      progress: 100,
      timestamp: "3 hours ago",
      objects: 94,
      faces: 5,
      confidence: 98,
      tags: ["POS terminal", "Customer Queue", "Cashier"]
    }
  ];

  return (
    <div className="space-y-8 select-none">
      {/* Immersive Hero Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-border-gradient p-8 relative overflow-hidden"
      >
        {/* Animated Background Vector Shape */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-[0.05] pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 80 Q 25 50, 50 80 T 100 20 L 100 100 L 0 100 Z" fill="url(#grad)" />
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0052FF" />
                <stop offset="100%" stopColor="#00F0FF" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase text-secondary bg-secondary/10 border border-secondary/20">
            <Sparkles className="w-3.5 h-3.5" /> Agentic AI Engine Online
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
            Video Intelligence <br />
            Command Center
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xl">
            Analyze, query, and trace video contents using YOLOv11 object tracking, PaddleOCR screen reads, Whisper transcripts, and multi-agent RAG context builders.
          </p>
          <div className="flex gap-4 pt-2">
            <button onClick={onNavigateUpload} className="btn-gradient">
              + Ingest Video Stream
            </button>
            <button onClick={() => onSelectVideo("mock-uuid-1")} className="btn-glass">
              Launch Live Feed <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="glass-panel-glow p-5 flex items-center justify-between"
            >
              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stat.label}</span>
                  <Icon className="w-4 h-4 text-cyan-400 opacity-60" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">{stat.value}</h3>
                  <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                    <span className="text-secondary">↑</span> {stat.change}
                  </p>
                </div>
                {/* Micro Sparkline */}
                <div className="h-6 w-full opacity-30 mt-2">
                  <svg className="w-full h-full" viewBox="0 0 120 20">
                    <path d={stat.sparkline} fill="none" stroke="url(#strokeGrad)" strokeWidth="1.5" />
                    <defs>
                      <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0052FF" />
                        <stop offset="100%" stopColor="#00F0FF" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Progress Ring */}
              <div className="relative w-14 h-14 flex items-center justify-center ml-4 shrink-0">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.03)" strokeWidth="3" fill="transparent" />
                  <circle 
                    cx="28" 
                    cy="28" 
                    r="22" 
                    stroke="url(#strokeGrad)" 
                    strokeWidth="3" 
                    fill="transparent" 
                    strokeDasharray={2 * Math.PI * 22}
                    strokeDashoffset={2 * Math.PI * 22 * (1 - stat.pct / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[10px] font-mono font-bold text-white">{stat.pct}%</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* AI Pipeline Flow Visualizer Widget */}
      <div className="glass-panel p-6 space-y-6">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Orchestration Flow</h3>
        
        {/* Horizontal flowchart */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-black/40 border border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.01]" style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "12px 12px"
          }}></div>
          
          {pipelineSteps.map((step, idx) => {
            const StepIcon = step.icon;
            return (
              <React.Fragment key={step.id}>
                {/* Node Box */}
                <div className="flex flex-col items-center gap-2 group z-10">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-white/[0.01] to-white/[0.03] hover:from-primary/10 hover:to-secondary/15 border border-white/5 group-hover:border-secondary/40 flex items-center justify-center transition-all duration-300 shadow-sm cursor-pointer hover:scale-105">
                    <StepIcon className="w-4 h-4 text-gray-400 group-hover:text-secondary transition-colors" />
                  </div>
                  <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-300 transition-colors font-mono">{step.label}</span>
                </div>

                {/* Arrow vector link except last */}
                {idx < pipelineSteps.length - 1 && (
                  <div className="hidden xl:block h-[1px] flex-1 bg-gradient-to-r from-primary/10 to-secondary/10 relative">
                    <div className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-secondary/30 animate-ping"></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Video Cards Grid Section */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Ingested Video Repositories</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videoCatalog.map((video) => (
            <div 
              key={video.id}
              className="glass-panel-glow border-white/[0.04] flex flex-col justify-between"
            >
              {/* Media Preview mock area */}
              <div className="aspect-video bg-black/40 border-b border-white/[0.04] relative flex items-center justify-center group overflow-hidden">
                <Video className="w-8 h-8 text-blue-500/40 group-hover:scale-110 transition-transform duration-300" />
                <span className="absolute bottom-2 right-2 text-[10px] font-mono font-bold bg-black/60 px-2 py-0.5 rounded text-gray-300 border border-white/5">
                  {video.duration}
                </span>
                <span className="absolute top-2 left-2 text-[10px] font-mono font-bold bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded">
                  {video.resolution}
                </span>
              </div>

              {/* Card Meta Content */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-white leading-snug line-clamp-1">{video.title}</h4>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {video.tags.map((tag) => (
                      <span key={tag} className="text-[9px] font-medium bg-white/5 text-gray-400 px-2 py-0.5 rounded-full border border-white/5">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/[0.04] text-[10px] font-mono text-center">
                  <div>
                    <span className="text-gray-500 block uppercase text-[8px]">Objects</span>
                    <span className="text-white font-bold">{video.objects}</span>
                  </div>
                  <div className="border-x border-white/5">
                    <span className="text-gray-500 block uppercase text-[8px]">Faces</span>
                    <span className="text-white font-bold">{video.faces}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block uppercase text-[8px]">Confidence</span>
                    <span className="text-secondary font-bold">{video.confidence}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  {video.status === "completed" ? (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500"></span> Ready
                    </span>
                  ) : (
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-yellow-400">Processing...</span>
                        <span className="text-white">{video.progress}%</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500" style={{ width: `${video.progress}%` }}></div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => onSelectVideo(video.id)}
                    className="px-4 py-2 text-[10px] font-bold uppercase rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-secondary/30 transition-all shrink-0"
                  >
                    Open Console
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Terminal Activity Logs Widget */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-white/[0.04] pb-3">
          <span className="flex items-center gap-1.5"><Terminal className="w-4 h-4 text-cyan-400" /> Pipeline Console Stream</span>
          <span className="text-cyan-400 font-mono text-[10px]">active</span>
        </div>
        <div className="font-mono text-[11px] space-y-1.5 max-h-24 overflow-y-auto text-gray-400 p-3 rounded-lg bg-black/40 border border-white/5">
          <p><span className="text-cyan-400">[20:25:01]</span> Ingestion worker registered stream "Surveillance Cam 4"</p>
          <p><span className="text-purple-400">[20:25:03]</span> YOLOv11 initialized: loading yolo11n.pt model on device CPU</p>
          <p><span className="text-teal-400">[20:25:12]</span> Whisper completed 45s transcription file: 5 segments identified</p>
          <p><span className="text-emerald-400">[20:25:18]</span> Ingestion pipeline successfully completed in 17.5s</p>
        </div>
      </div>
    </div>
  );
}

// Small placeholder upload icon component to substitute inside visualizer
function UploadCloudPlaceholder(props) {
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
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  );
}
