import React from "react";
import { Cpu, ShieldCheck, Zap, HardDrive, Sparkles, Database } from "lucide-react";

export default function AIModels() {
  const models = [
    { name: "YOLOv8 Nano", type: "Visual Object Tracking", status: "Active", memory: "12 MB", latency: "18 ms", device: "CPU", version: "v8.2.0" },
    { name: "Faster-Whisper", type: "Speech Transcription", status: "Active", memory: "140 MB", latency: "85 ms", device: "CPU / CTranslate2", version: "v1.0.3" },
    { name: "EasyOCR", type: "Multilingual OCR Detection", status: "Active", memory: "85 MB", latency: "40 ms", device: "PyTorch CPU", version: "v1.7.1" },
    { name: "PySceneDetect", type: "Content Boundary Detection", status: "Active", memory: "25 MB", latency: "12 ms", device: "OpenCV Engine", version: "v0.6.4" },
    { name: "CLIP ViT-B/32", type: "Vision Vector Embeddings", status: "Active", memory: "350 MB", latency: "35 ms", device: "Sentence-Transformers", version: "v2.2.2" },
    { name: "all-MiniLM-L6-v2", type: "Text & Audio Embeddings", status: "Active", memory: "90 MB", latency: "10 ms", device: "Sentence-Transformers", version: "v2.2.2" },
    { name: "FAISS Vector Index", type: "Dense Cosine/L2 Storage", status: "Active", memory: "15 MB", latency: "0.8 ms", device: "Flat L2 / IP", version: "v1.7.4" }
  ];

  return (
    <div className="space-y-8 select-none">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          Neural Model Registry
        </h2>
        <p className="text-gray-400 mt-2 text-sm">
          Active deep learning weights and vector storage engines running in the VideoSense AI backend.
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
