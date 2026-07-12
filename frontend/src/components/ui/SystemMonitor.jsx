import React from "react";
import { Cpu, HardDrive, ShieldCheck, Zap, LineChart } from "lucide-react";

export default function SystemMonitor() {
  const hardware = [
    { name: "CPU Utilization", value: "14%", desc: "Intel Core / AMD Ryzen Scheduler Active", pct: 14, color: "from-blue-500 to-cyan-500" },
    { name: "System Memory RAM", value: "4.8 GB / 16 GB", desc: "Seeded model weights footprints cached", pct: 30, color: "from-purple-500 to-pink-500" },
    { name: "SSD System Disk Space", value: "4.5 GB / 50 GB Used", desc: "Cached vision frames clips directories", pct: 9, color: "from-amber-500 to-red-500" }
  ];

  return (
    <div className="space-y-8 select-none">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          System Resource Monitor
        </h2>
        <p className="text-gray-400 mt-2 text-sm">
          Hardware utilization logs and CUDA processing thread pools statuses.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {hardware.map((hw) => (
          <div key={hw.name} className="glass-panel-glow border-white/[0.04] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{hw.name}</span>
              <Cpu className="w-4 h-4 text-cyan-400 opacity-60" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">{hw.value}</h3>
              <p className="text-[10px] text-gray-500 mt-1">{hw.desc}</p>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${hw.color}`} style={{ width: `${hw.pct}%` }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Concurrent Worker Telemetry */}
      <div className="glass-panel p-6 space-y-4 border-white/[0.04]">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Thread pools</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center">
            <span className="text-gray-500 block uppercase text-[8px] font-semibold">Active Workers</span>
            <span className="text-white font-bold">4 Threads</span>
          </div>
          <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center">
            <span className="text-gray-500 block uppercase text-[8px] font-semibold">SQL DB Pool</span>
            <span className="text-emerald-400 font-bold">Connected</span>
          </div>
          <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center">
            <span className="text-gray-500 block uppercase text-[8px] font-semibold">FAISS Memory Load</span>
            <span className="text-white font-bold">8.4 MB</span>
          </div>
          <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center">
            <span className="text-gray-500 block uppercase text-[8px] font-semibold">Inference Latency</span>
            <span className="text-cyan-400 font-bold">45 ms</span>
          </div>
        </div>
      </div>
    </div>
  );
}
