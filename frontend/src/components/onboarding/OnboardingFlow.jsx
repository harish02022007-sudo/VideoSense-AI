import React, { useState } from "react";
import { Sparkles, ArrowRight, ShieldCheck, Database, LayoutGrid, CheckCircle2 } from "lucide-react";

export default function OnboardingFlow({ onOnboardingComplete }) {
  const [step, setStep] = useState(0);
  const [workspaceName, setWorkspaceName] = useState("Main Sandbox");
  const [modelType, setModelType] = useState("yolo11n");
  const [dbPath, setDbPath] = useState("./videosense.db");

  const stepsList = [
    { title: "Initialize Welcome", desc: "Setting up VideoSense OS environment" },
    { title: "Configure Workspace", desc: "Workspace name and credentials registry" },
    { title: "AI Model Select", desc: "Selecting default YOLO & LLM model parameters" },
    { title: "Storage setup", desc: "SQLite database directory definitions" }
  ];

  const handleNext = () => {
    if (step >= stepsList.length - 1) {
      onOnboardingComplete();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="min-h-screen text-gray-100 flex items-center justify-center p-6 relative overflow-hidden bg-background-dark">
      {/* Background blobs */}
      <div className="absolute top-[20%] right-[20%] w-[350px] h-[350px] bg-accent-purple/10 rounded-full blur-[60px] pointer-events-none"></div>
      
      {/* Container Card */}
      <div className="w-full max-w-xl glass-panel p-8 space-y-8 border-white/[0.04] shadow-glass">
        {/* Stepper Progress Bar */}
        <div className="flex justify-between items-center gap-3">
          {stepsList.map((s, idx) => (
            <div key={idx} className="flex-1 space-y-2">
              <div className={`h-1.5 rounded-full transition-all ${
                idx <= step ? "bg-gradient-to-r from-primary to-secondary" : "bg-white/5"
              }`}></div>
            </div>
          ))}
        </div>

        {/* Step Contents */}
        {step === 0 && (
          <div className="space-y-4 text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto shadow-glow">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Welcome to VideoSense AI</h2>
            <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
              We will guide you through a quick 3-step configuration to initialize your video understanding database.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-secondary" /> Name Your Workspace
            </h3>
            <p className="text-xs text-gray-500">Provide an identifier for your analytics environment.</p>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full glass-input-premium"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-secondary" /> Active AI Model Class
            </h3>
            <p className="text-xs text-gray-500">Select model sizing based on your local GPU/CPU hardware capacity.</p>
            <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={() => setModelType("yolo11n")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  modelType === "yolo11n" ? "bg-primary/5 border-primary/40" : "bg-black/20 border-white/5"
                }`}
              >
                <h4 className="text-xs font-bold text-white font-mono">YOLOv11 Nano (tiny)</h4>
                <p className="text-[10px] text-gray-500 mt-1">Recommended for standard CPUs</p>
              </div>
              <div 
                onClick={() => setModelType("yolo11s")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  modelType === "yolo11s" ? "bg-primary/5 border-primary/40" : "bg-black/20 border-white/5"
                }`}
              >
                <h4 className="text-xs font-bold text-white font-mono">YOLOv11 Small (base)</h4>
                <p className="text-[10px] text-gray-500 mt-1">Requires dedicated CUDA GPU</p>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-secondary" /> Local Database Registry
            </h3>
            <p className="text-xs text-gray-500">Set path directory of SQLite database write target.</p>
            <input
              type="text"
              value={dbPath}
              onChange={(e) => setDbPath(e.target.value)}
              className="w-full glass-input-premium font-mono"
            />
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Valid directory path. Ready to write index files.</span>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex justify-between items-center pt-4 border-t border-white/5">
          <span className="text-[10px] text-gray-500 font-mono">Step {step + 1} of {stepsList.length}</span>
          <button 
            onClick={handleNext}
            className="btn-gradient px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
          >
            {step === stepsList.length - 1 ? "Initialize OS" : "Next Step"} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
