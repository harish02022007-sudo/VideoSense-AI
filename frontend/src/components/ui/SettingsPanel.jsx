import React, { useState } from "react";
import { User, LayoutGrid, Key, ShieldCheck, Cpu, HardDrive, Bell, Languages } from "lucide-react";

export default function SettingsPanel() {
  const [activeTab, setActiveTab] = useState("general");
  const [workspace, setWorkspace] = useState("Personal Sandbox");
  const [llmProvider, setLlmProvider] = useState("local-qwen");
  const [apiKey, setApiKey] = useState("••••••••••••••••••••••••");

  const tabs = [
    { id: "general", label: "General Workspace", icon: LayoutGrid },
    { id: "models", label: "AI Models Settings", icon: Cpu },
    { id: "keys", label: "Developer Keys", icon: Key },
    { id: "storage", label: "Storage Volumes", icon: HardDrive }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 select-none">
      {/* Tabs list left */}
      <div className="md:col-span-1 space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
                activeTab === tab.id 
                  ? "bg-gradient-to-r from-primary/10 to-secondary/5 text-secondary border border-secondary/20" 
                  : "text-gray-400 hover:bg-white/[0.02] hover:text-white border border-transparent"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Pane Content right */}
      <div className="md:col-span-3 glass-panel p-6 border-white/[0.04]">
        {activeTab === "general" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white">General Settings</h3>
              <p className="text-[10px] text-gray-500 mt-1">Configure active VideoSense OS profile details.</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 font-mono">WORKSPACE NAME</label>
                <input
                  type="text"
                  value={workspace}
                  onChange={(e) => setWorkspace(e.target.value)}
                  className="w-full glass-input-premium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 font-mono">LANGUAGE SELECT</label>
                  <select className="w-full glass-input-premium bg-black/40 pr-8">
                    <option>English (US)</option>
                    <option>Spanish (ES)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 font-mono">INTERFACE THEME</label>
                  <select className="w-full glass-input-premium bg-black/40 pr-8">
                    <option>Dark (Enterprise OS)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "models" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white">AI Models Selection</h3>
              <p className="text-[10px] text-gray-500 mt-1">Select local weights channels and reasoning fallback providers.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 font-mono">REASONING LLM AGENT</label>
                <select 
                  value={llmProvider}
                  onChange={(e) => setLlmProvider(e.target.value)}
                  className="w-full glass-input-premium bg-black/40 pr-8"
                >
                  <option value="local-qwen">Qwen 2.5 3B (Offline Local)</option>
                  <option value="openai-gpt">OpenAI GPT-4o API (Cloud fallback)</option>
                  <option value="anthropic-claude">Claude 3.5 Sonnet (Cloud fallback)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 font-mono">YOLO CLASS LOADER</label>
                  <select className="w-full glass-input-premium bg-black/40 pr-8">
                    <option>yolo11n (CPU optimized)</option>
                    <option>yolo11s (CUDA base)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 font-mono">WHISPER MODEL ENGINE</label>
                  <select className="w-full glass-input-premium bg-black/40 pr-8">
                    <option>Whisper Base (English only)</option>
                    <option>Whisper Tiny (Multi-language)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "keys" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white">Developer API Keys</h3>
              <p className="text-[10px] text-gray-500 mt-1">Configure credentials tokens for external integrations.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 font-mono">EXTERNAL PROVIDER TOKEN</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full glass-input-premium font-mono"
                />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Keys are cached in local yaml settings files.</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "storage" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white">Storage Volumes</h3>
              <p className="text-[10px] text-gray-500 mt-1">Manage physical directories for indices and media previews.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 font-mono">DATABASE READ PATH</label>
                <input
                  type="text"
                  disabled
                  value="./database/videosense.db"
                  className="w-full glass-input-premium bg-white/[0.02] text-gray-500 font-mono cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 font-mono">MEDIA CONSOLE CACHE</label>
                <input
                  type="text"
                  disabled
                  value="./storage/previews/"
                  className="w-full glass-input-premium bg-white/[0.02] text-gray-500 font-mono cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
