import React, { useState, useEffect } from "react";
import { Play, Activity, Bell, Cpu, LayoutGrid, ChevronDown, Clock, Search, ShieldCheck } from "lucide-react";
import axios from "axios";

export default function Navbar() {
  const [health, setHealth] = useState(null);
  const [latency, setLatency] = useState(0);
  const [currentTime, setCurrentTime] = useState("");

  // Clock ticks
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll diagnostics
  useEffect(() => {
    const checkDiagnostics = async () => {
      try {
        const start = performance.now();
        const res = await axios.get("http://localhost:8000/api/v1/health");
        const end = performance.now();
        setLatency(Math.round(end - start));
        setHealth(res.data);
      } catch (err) {
        setHealth({ status: "offline", system: { cpu_usage_percent: 0, memory_usage_percent: 0 } });
        setLatency(0);
      }
    };
    checkDiagnostics();
    const interval = setInterval(checkDiagnostics, 8000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (!health) return "bg-gray-500 shadow-gray-500/50";
    if (health.status === "healthy") return "bg-status-success shadow-status-success/50 animate-pulse";
    if (health.status === "degraded") return "bg-status-warning shadow-status-warning/50 animate-pulse";
    return "bg-status-offline shadow-status-offline/50";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.04] bg-background-dark/30 backdrop-blur-glass px-6 py-3 flex items-center justify-between shadow-glass select-none">
      {/* Brand & Workspace Toggler */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary via-secondary to-accent-purple p-[1px] shadow-glow flex items-center justify-center">
            <div className="w-full h-full bg-background-dark rounded-xl flex items-center justify-center">
              <Play className="w-4 h-4 text-secondary fill-secondary/20" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              VideoSense <span className="text-[10px] bg-gradient-to-r from-primary/20 to-secondary/20 text-cyan-400 border border-secondary/20 px-2 py-0.5 rounded-full font-mono font-bold">OS v1</span>
            </h1>
          </div>
        </div>

        {/* Workspace Selector */}
        <div className="hidden sm:flex items-center gap-2 border-l border-white/10 pl-6">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-all border border-transparent hover:border-white/5">
            <LayoutGrid className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-300 font-medium">Personal Workspace</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Center Search Trigger */}
      <div className="hidden lg:flex items-center gap-2 bg-black/40 border border-white/5 hover:border-white/15 px-3 py-1.5 rounded-xl w-80 cursor-pointer transition-all">
        <Search className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs text-gray-500 flex-1">Search scenes, objects, logs...</span>
        <kbd className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-400 font-mono">⌘K</kbd>
      </div>

      {/* Diagnostics / Right Section */}
      <div className="flex items-center gap-6">
        {/* Hardware Status */}
        {health && (
          <div className="hidden xl:flex items-center gap-4 text-xs font-mono border-r border-white/10 pr-6">
            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-lg">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-gray-500">CPU:</span>
              <span className="text-gray-200 font-bold">{health.system?.cpu_usage_percent || 0}%</span>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-lg">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-gray-500">RAM:</span>
              <span className="text-gray-200 font-bold">{health.system?.memory_usage_percent || 0}%</span>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-gray-500">Latency:</span>
              <span className="text-gray-200 font-bold">{latency}ms</span>
            </div>
          </div>
        )}

        {/* Time display */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-gray-400 bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-xl">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{currentTime}</span>
        </div>

        {/* Dynamic connection pinger dot */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor()} shadow-sm`}></span>
          </div>
          
          {/* Notification bell */}
          <button className="relative w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center transition-all border border-transparent hover:border-white/5">
            <Bell className="w-4 h-4 text-gray-400" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent-pink rounded-full"></span>
          </button>

          {/* User Profile Avatar */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent-pink p-[1px]">
            <div className="w-full h-full bg-background-dark rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" 
                alt="Profile Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
