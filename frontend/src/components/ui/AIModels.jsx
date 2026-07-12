import React from "react";
import { Cpu, ShieldCheck, Zap, HardDrive, LineChart } from "lucide-react";

export default function AIModels() {
  const models = [
    { name: "YOLOv11 Nano", type: "Object Tracking", status: "Loaded", memory: "120 MB", latency: "14 ms", device: "CPU", version: "v11.0.4" },
    { name: "Whisper Base", type: "Speech-to-Text", status: "Idle", memory: "480 MB", latency: "120 ms", device: "CPU", version: "v2.1.0" },
    { name: "PaddleOCR", type: "Screen Text OCR", status: "Loaded", memory: "95 MB", latency: "8 ms", device: "CPU", version: "v4.0.2" },
    { name: "CLIP ViT-B/32", type: "Multimodal Embeddings", status: "Loaded", memory: "350 MB", latency: "32 ms", device: "CPU", version: "v1.2" },
    { name: "Qwen 2.5 3B Instruct", type: "Reasoning LLM", status: "Loaded", memory: "1.8 GB", latency: "45 ms", device: "CPU", version: "v2.5.3" }
  ];

  return (
    <div className="space-y-8 select-none">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          Neural Model Registry
        </h2>
        <p className="text-gray-400 mt-2 text-sm">
          Active deep learning weights running in the local VideoSense AI environment.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map((mod) => (
          <div key={mod.name} className="glass-panel-glow border-white/[0.04] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
              <div>
                <h4 className="text-xs font-bold text-white leading-snug">{mod.name}</h4>
                <span className="text-[9px] text-gray-500 font-mono uppercase">{mod.type}</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-500"></span> {mod.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="space-y-1">
                <span className="text-gray-500 block uppercase text-[8px] font-semibold">Memory Size</span>
                <span className="text-white font-bold">{mod.memory}</span>
              </div>
              <div className="space-y-1">
                <span className="text-gray-500 block uppercase text-[8px] font-semibold">Latency</span>
                <span className="text-cyan-400 font-bold">{mod.latency}</span>
              </div>
              <div className="space-y-1 pt-2 border-t border-white/5">
                <span className="text-gray-500 block uppercase text-[8px] font-semibold">Computing Target</span>
                <span className="text-white font-bold">{mod.device}</span>
              </div>
              <div className="space-y-1 pt-2 border-t border-white/5">
                <span className="text-gray-500 block uppercase text-[8px] font-semibold">Version</span>
                <span className="text-gray-400 font-bold">{mod.version}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
