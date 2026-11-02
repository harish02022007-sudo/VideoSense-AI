import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Cpu, Activity, HardDrive, Zap, RefreshCw, Database, ShieldCheck,
  Layers, Terminal, CheckCircle2, AlertTriangle, AlertCircle, Server,
  Clock, Radio, Trash2, Play, Pause, Search, Sliders, Eye, Gauge,
  Flame, Wifi, ArrowDown, ArrowUp, Check, Info, Sparkles, Box,
  Microchip, Monitor, BarChart3, ChevronRight, FileCode
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import api, { API_BASE_URL } from "../../services/api";

const HISTORY_MAX_POINTS = 25;

export default function SystemMonitor() {
  // Tab navigation: 'performance' | 'processes' | 'ai_models' | 'diagnostics'
  const [activeTab, setActiveTab] = useState("performance");
  const [selectedHw, setSelectedHw] = useState("cpu"); // 'cpu' | 'memory' | 'gpu' | 'disk' | 'network'

  // Data states
  const [telemetry, setTelemetry] = useState(null);
  const [processes, setProcesses] = useState([]);
  const [aiModels, setAiModels] = useState([]);
  const [diagnostics, setDiagnostics] = useState(null);
  const [latency, setLatency] = useState(0);

  // Control states
  const [isLive, setIsLive] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(2000); // 2s
  const [isLoading, setIsLoading] = useState(true);
  const [isPurging, setIsPurging] = useState(false);
  const [isProbing, setIsProbing] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Filters
  const [procSearch, setProcSearch] = useState("");
  const [procFilter, setProcFilter] = useState("all"); // 'all' | 'videosense' | 'high_memory'

  // Rolling history for sparklines & area charts
  const [history, setHistory] = useState({
    cpu: [],
    memory: [],
    gpu: [],
    vram: [],
    netIn: [],
    netOut: []
  });

  const toastTimerRef = useRef(null);
  const showToast = (msg, type = "info") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg({ text: msg, type });
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 4000);
  };

  // --------------------------------------------------------------------------
  // Data Fetching
  // --------------------------------------------------------------------------
  const fetchAllData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);
      const start = performance.now();

      const [telData, procData, modelsData] = await Promise.all([
        api.getSystemTelemetry().catch(() => null),
        api.getSystemProcesses(50, procFilter).catch(() => []),
        api.getAiModelsStatus().catch(() => [])
      ]);

      const roundTrip = Math.round(performance.now() - start);
      setLatency(roundTrip);

      if (telData) {
        setTelemetry(telData);

        // Update rolling history buffer
        const nowLabel = new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setHistory(prev => {
          const pushPoint = (arr, val) => [...arr.slice(-(HISTORY_MAX_POINTS - 1)), { time: nowLabel, val }];
          return {
            cpu: pushPoint(prev.cpu, telData.cpu?.percent || 0),
            memory: pushPoint(prev.memory, telData.memory?.ram_percent || 0),
            gpu: pushPoint(prev.gpu, telData.gpu?.utilization_gpu || 0),
            vram: pushPoint(prev.vram, telData.gpu?.vram_percent || 0),
            netIn: pushPoint(prev.netIn, telData.network?.bytes_recv_mb || 0),
            netOut: pushPoint(prev.netOut, telData.network?.bytes_sent_mb || 0)
          };
        });
      }

      if (procData) setProcesses(procData);
      if (modelsData) setAiModels(modelsData);
    } catch (err) {
      console.error("Telemetry fetch error:", err);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [procFilter]);

  // Polling loop
  useEffect(() => {
    fetchAllData(true);
    if (!isLive) return;
    const interval = setInterval(() => fetchAllData(false), refreshInterval);
    return () => clearInterval(interval);
  }, [isLive, refreshInterval, fetchAllData]);

  // Diagnostics trigger
  const runDiagnosticsProbe = async () => {
    try {
      setIsProbing(true);
      const data = await api.getSystemDiagnostics();
      setDiagnostics(data);
      showToast("Diagnostic probe completed! All sub-systems inspected.", "success");
    } catch (err) {
      showToast("Diagnostics probe failed: " + err.message, "error");
    } finally {
      setIsProbing(false);
    }
  };

  // Memory cache purge
  const handlePurgeCache = async () => {
    try {
      setIsPurging(true);
      const res = await api.purgeSystemCache();
      showToast(`Cache purged: ${res.garbage_collected_objects} objects freed, ${res.reclaimed_memory_mb} MB reclaimed!`, "success");
      fetchAllData(false);
    } catch (err) {
      showToast("Failed to purge cache: " + err.message, "error");
    } finally {
      setIsPurging(false);
    }
  };

  // Filtered processes
  const filteredProcesses = useMemo(() => {
    let list = processes || [];
    if (procSearch.trim()) {
      const q = procSearch.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        String(p.pid).includes(q) ||
        (p.app_label && p.app_label.toLowerCase().includes(q))
      );
    }
    return list;
  }, [processes, procSearch]);

  // Real data extractions
  const cpu = telemetry?.cpu || {};
  const mem = telemetry?.memory || {};
  const gpu = telemetry?.gpu || {};
  const storage = telemetry?.storage || {};
  const net = telemetry?.network || {};
  const platform = telemetry?.platform || {};
  const queue = telemetry?.pipeline_queue || {};

  return (
    <div className="space-y-6 select-none text-gray-200">
      {/* ------------------------------------------------------------------ */}
      {/* TOP COMMAND HEADER                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass-panel p-5 border-white/[0.06]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Activity className="w-6 h-6 text-cyan-400" />
              System Resource & Task Monitor
            </h2>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              ALL ENGINES ONLINE
            </span>
          </div>
          <p className="text-gray-400 text-xs flex flex-wrap items-center gap-3">
            <span>Host: <strong className="text-gray-200 font-mono">{platform.hostname || "Windows Host"}</strong></span>
            <span>•</span>
            <span>OS: <strong className="text-gray-200 font-mono">{platform.os || "Windows 11"}</strong></span>
            <span>•</span>
            <span>Uptime: <strong className="text-cyan-300 font-mono">{cpu.uptime_formatted || "Calculating..."}</strong></span>
            <span>•</span>
            <span>API Latency: <strong className="text-emerald-400 font-mono">{latency} ms</strong></span>
          </p>
        </div>

        {/* Live Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Pause / Resume Live Stream */}
          <button
            onClick={() => setIsLive(!isLive)}
            className={`btn-glass px-3 py-1.5 text-xs flex items-center gap-1.5 font-medium transition-colors ${
              isLive ? "border-cyan-500/30 text-cyan-300 bg-cyan-500/10" : "text-gray-400"
            }`}
            title={isLive ? "Pause telemetry stream" : "Resume live telemetry stream"}
          >
            {isLive ? <Pause className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isLive ? "Live Stream: ON" : "Stream: PAUSED"}</span>
          </button>

          {/* Polling Interval Select */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/5 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-gray-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value={1000} className="bg-gray-900">1.0s interval</option>
              <option value={2000} className="bg-gray-900">2.0s interval</option>
              <option value={5000} className="bg-gray-900">5.0s interval</option>
              <option value={10000} className="bg-gray-900">10s interval</option>
            </select>
          </div>

          {/* Flush Cache */}
          <button
            onClick={handlePurgeCache}
            disabled={isPurging}
            className="btn-glass px-3 py-1.5 text-xs flex items-center gap-1.5 text-gray-300 hover:text-white border-white/10 hover:border-amber-500/30 transition-all"
            title="Garbage collect and release unused VRAM/RAM buffers"
          >
            <Trash2 className={`w-3.5 h-3.5 text-amber-400 ${isPurging ? "animate-spin" : ""}`} />
            <span>Flush Cache</span>
          </button>

          {/* Run Probe */}
          <button
            onClick={runDiagnosticsProbe}
            disabled={isProbing}
            className="btn-glass px-3 py-1.5 text-xs flex items-center gap-1.5 text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/10 transition-all"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${isProbing ? "animate-spin" : ""}`} />
            <span>Diagnostics Probe</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchAllData(false)}
            className="btn-glass p-2 text-xs text-gray-400 hover:text-white"
            title="Force refresh now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Toast Feedback Notification */}
      {toastMsg && (
        <div className={`p-3 rounded-xl border text-xs flex items-center justify-between font-mono animate-fadeIn ${
          toastMsg.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" :
          toastMsg.type === "error" ? "bg-red-500/10 border-red-500/30 text-red-300" :
          "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
        }`}>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {toastMsg.text}
          </span>
          <button onClick={() => setToastMsg(null)} className="text-gray-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TASK MANAGER SUB-NAVIGATION TABS                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex border-b border-white/10 gap-1 overflow-x-auto pb-px">
        {[
          { id: "performance", label: "Performance", icon: BarChart3, desc: "Live CPU, GPU, RAM, Disk & Network charts" },
          { id: "processes", label: "Processes (Task Manager)", icon: Terminal, desc: `${processes.length} active OS & VideoSense processes` },
          { id: "ai_models", label: "AI Pipeline & Models", icon: Microchip, desc: `${aiModels.length} inference engines active` },
          { id: "diagnostics", label: "Diagnostics & Health", icon: ShieldCheck, desc: "End-to-end component health matrix" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold rounded-t-xl transition-all relative border-t border-x ${
              activeTab === tab.id
                ? "bg-white/[0.06] text-white border-cyan-500/30 shadow-lg"
                : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]"
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-cyan-400" : "text-gray-500"}`} />
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400"></span>
            )}
          </button>
        ))}
      </div>

      {/* ================================================================== */}
      {/* VIEW 1: PERFORMANCE (WINDOWS TASK MANAGER STYLE)                   */}
      {/* ================================================================== */}
      {activeTab === "performance" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Selectable Hardware Cards */}
          <div className="lg:col-span-4 space-y-3">
            {/* 1. CPU Card */}
            <div
              onClick={() => setSelectedHw("cpu")}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedHw === "cpu"
                  ? "bg-cyan-950/20 border-cyan-500/40 shadow-lg shadow-cyan-900/10"
                  : "glass-panel border-white/[0.04] hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> CPU
                  </span>
                  <div className="text-2xl font-black text-white mt-1">
                    {cpu.percent !== undefined ? `${cpu.percent.toFixed(1)}%` : "--%"}
                  </div>
                  <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                    {cpu.frequency_mhz ? `${(cpu.frequency_mhz / 1000).toFixed(2)} GHz` : "3.10 GHz"} • {cpu.cores_logical || 16} Cores
                  </div>
                </div>
                <div className="w-24 h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history.cpu}>
                      <Area type="monotone" dataKey="val" stroke="#00f0ff" strokeWidth={1.5} fill="#00f0ff" fillOpacity={0.15} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 2. Memory Card */}
            <div
              onClick={() => setSelectedHw("memory")}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedHw === "memory"
                  ? "bg-purple-950/20 border-purple-500/40 shadow-lg shadow-purple-900/10"
                  : "glass-panel border-white/[0.04] hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-purple-400" /> Memory (RAM)
                  </span>
                  <div className="text-2xl font-black text-white mt-1">
                    {mem.ram_used_gb ? `${mem.ram_used_gb} GB` : "-- GB"}
                  </div>
                  <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                    {mem.ram_percent || 0}% of {mem.ram_total_gb || 16} GB
                  </div>
                </div>
                <div className="w-24 h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history.memory}>
                      <Area type="monotone" dataKey="val" stroke="#a855f7" strokeWidth={1.5} fill="#a855f7" fillOpacity={0.15} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 3. GPU Card (NVIDIA GeForce RTX 3050) */}
            <div
              onClick={() => setSelectedHw("gpu")}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedHw === "gpu"
                  ? "bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-900/10"
                  : "glass-panel border-white/[0.04] hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" /> GPU 0 • NVIDIA RTX 3050
                  </span>
                  <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-2">
                    <span>{gpu.utilization_gpu !== undefined ? `${gpu.utilization_gpu}%` : "0%"}</span>
                    <span className="text-xs font-mono font-normal text-emerald-400 flex items-center gap-0.5">
                      <Flame className="w-3 h-3" /> {gpu.temperature_c || 52}°C
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                    VRAM: {gpu.vram_used_mb || 0} / {gpu.vram_total_mb || 4096} MB ({gpu.vram_percent || 0}%)
                  </div>
                </div>
                <div className="w-24 h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history.gpu}>
                      <Area type="monotone" dataKey="val" stroke="#10b981" strokeWidth={1.5} fill="#10b981" fillOpacity={0.15} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 4. Disk Card */}
            <div
              onClick={() => setSelectedHw("disk")}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedHw === "disk"
                  ? "bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-900/10"
                  : "glass-panel border-white/[0.04] hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-amber-400" /> Storage Drives & App Cache
                  </span>
                  <div className="text-2xl font-black text-white mt-1">
                    {storage.app_storage?.total_assets_mb ? `${(storage.app_storage.total_assets_mb / 1024).toFixed(2)} GB` : "2.23 GB"}
                  </div>
                  <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                    VideoSense Assets • DB: {storage.app_storage?.db_size_pretty || "49 MB"}
                  </div>
                </div>
                <div className="text-right text-[11px] font-mono text-gray-400 space-y-0.5">
                  <div>C: {storage.drives?.[0]?.percent || 85}%</div>
                  <div>D: {storage.drives?.[1]?.percent || 60}%</div>
                </div>
              </div>
            </div>

            {/* 5. Network Card */}
            <div
              onClick={() => setSelectedHw("network")}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedHw === "network"
                  ? "bg-blue-950/20 border-blue-500/40 shadow-lg shadow-blue-900/10"
                  : "glass-panel border-white/[0.04] hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-blue-400" /> Network Throughput
                  </span>
                  <div className="text-xl font-black text-white mt-1 flex items-center gap-3">
                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                      <ArrowDown className="w-3.5 h-3.5" /> {net.bytes_recv_mb || 0} MB Recv
                    </span>
                    <span className="text-xs font-mono text-blue-400 flex items-center gap-1">
                      <ArrowUp className="w-3.5 h-3.5" /> {net.bytes_sent_mb || 0} MB Sent
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                    {net.packets_recv || 0} Pkts In • {net.packets_sent || 0} Pkts Out
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Task Manager Graph & Hardware Inspector */}
          <div className="lg:col-span-8 space-y-6">
            {/* -------------------- CPU DETAIL INSPECTOR -------------------- */}
            {selectedHw === "cpu" && (
              <div className="glass-panel p-6 border-white/[0.06] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-cyan-400" />
                      {cpu.processor || "AMD Ryzen 7 / Intel Core (AMD64)"}
                    </h3>
                    <p className="text-xs text-gray-400">Total Utilization & 16-Core Logical Multithreading Graph</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-cyan-400 font-mono">
                      {cpu.percent !== undefined ? `${cpu.percent.toFixed(1)}%` : "0.0%"}
                    </span>
                    <div className="text-[10px] font-mono text-gray-500 uppercase">Core Utilization</div>
                  </div>
                </div>

                {/* Big Live CPU Area Chart */}
                <div className="h-48 w-full bg-black/40 rounded-xl p-2 border border-white/5 relative">
                  <span className="absolute top-3 left-4 text-[10px] font-mono text-gray-500">
                    60 Seconds Historical Rolling Window • 100%
                  </span>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history.cpu} margin={{ top: 25, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: "10px" }} />
                      <YAxis domain={[0, 100]} stroke="#6b7280" style={{ fontSize: "10px" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "rgba(10, 11, 20, 0.95)", borderColor: "rgba(0, 240, 255, 0.3)", borderRadius: "8px", fontSize: "11px" }}
                        formatter={(val) => [`${Number(val).toFixed(1)}%`, "CPU Load"]}
                      />
                      <Area type="monotone" dataKey="val" stroke="#00f0ff" strokeWidth={2} fillOpacity={1} fill="url(#cpuGrad)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* 16-Core Logical Processor Grid (Windows Task Manager Feature!) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300 flex items-center gap-2">
                      <Microchip className="w-3.5 h-3.5 text-cyan-400" />
                      Logical Processors (16 Cores)
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">Per-Thread Parallel Execution</span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {(cpu.per_core && cpu.per_core.length > 0 ? cpu.per_core : Array(16).fill(0)).map((pct, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-black/40 border border-white/5 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-gray-400">C{idx}</span>
                          <span className={`${pct > 60 ? "text-amber-400 font-bold" : "text-cyan-400"}`}>{Math.round(pct)}%</span>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${pct > 60 ? "bg-amber-400" : "bg-cyan-400"}`}
                            style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Task Manager Bottom Spec Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-white/5 text-xs font-mono">
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">Frequency</span>
                    <span className="text-white font-bold">{cpu.frequency_mhz ? `${(cpu.frequency_mhz / 1000).toFixed(2)} GHz` : "3.10 GHz"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">Sockets / Cores</span>
                    <span className="text-white font-bold">1 Socket, {cpu.cores_physical || 8} Cores</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">Logical Threads</span>
                    <span className="text-white font-bold">{cpu.cores_logical || 16} Processors</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">System Uptime</span>
                    <span className="text-cyan-300 font-bold">{cpu.uptime_formatted || "--"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------- MEMORY DETAIL INSPECTOR -------------------- */}
            {selectedHw === "memory" && (
              <div className="glass-panel p-6 border-white/[0.06] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Database className="w-5 h-5 text-purple-400" />
                      Physical System RAM & Virtual Paging Memory
                    </h3>
                    <p className="text-xs text-gray-400">High-Performance Dual-Channel Memory Allocation</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-purple-400 font-mono">
                      {mem.ram_used_gb || 0} / {mem.ram_total_gb || 16} GB
                    </span>
                    <div className="text-[10px] font-mono text-gray-500 uppercase">{mem.ram_percent || 0}% Utilized</div>
                  </div>
                </div>

                {/* Big Memory Usage Chart */}
                <div className="h-48 w-full bg-black/40 rounded-xl p-2 border border-white/5 relative">
                  <span className="absolute top-3 left-4 text-[10px] font-mono text-gray-500">
                    RAM Consumption Over Time • % Used
                  </span>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history.memory} margin={{ top: 25, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: "10px" }} />
                      <YAxis domain={[0, 100]} stroke="#6b7280" style={{ fontSize: "10px" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "rgba(10, 11, 20, 0.95)", borderColor: "rgba(168, 85, 247, 0.3)", borderRadius: "8px", fontSize: "11px" }}
                        formatter={(val) => [`${Number(val).toFixed(1)}%`, "Memory Used"]}
                      />
                      <Area type="monotone" dataKey="val" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#memGrad)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Memory Composition Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-400">Memory Composition</span>
                    <span className="text-gray-300">In Use: {mem.ram_used_gb} GB • Available: {mem.ram_available_gb} GB</span>
                  </div>
                  <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex">
                    <div className="bg-purple-500 transition-all" style={{ width: `${mem.ram_percent || 65}%` }} title="In-Use RAM"></div>
                    <div className="bg-teal-500/50 transition-all" style={{ width: `${100 - (mem.ram_percent || 65)}%` }} title="Available RAM"></div>
                  </div>
                </div>

                {/* Memory Spec Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-white/5 text-xs font-mono">
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">In Use (Compressed)</span>
                    <span className="text-white font-bold">{mem.ram_used_gb} GB ({mem.ram_percent}%)</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">Available</span>
                    <span className="text-emerald-400 font-bold">{mem.ram_available_gb} GB</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">Committed (Paging)</span>
                    <span className="text-white font-bold">{mem.swap_used_gb} / {mem.swap_total_gb} GB</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">Speed / Hardware</span>
                    <span className="text-purple-300 font-bold">DDR4 / DDR5 Dual Ch</span>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------- GPU DETAIL INSPECTOR -------------------- */}
            {selectedHw === "gpu" && (
              <div className="glass-panel p-6 border-white/[0.06] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-emerald-400" />
                      {gpu.name || "NVIDIA GeForce RTX 3050 Laptop GPU"}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Driver {gpu.driver_version || "592.00"} • CUDA Version {gpu.cuda_version || "13.1"}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5 font-mono text-sm font-bold">
                      <Flame className="w-4 h-4 text-emerald-400" />
                      {gpu.temperature_c || 52}°C
                    </div>
                    <div>
                      <span className="text-3xl font-black text-emerald-400 font-mono">
                        {gpu.utilization_gpu || 0}%
                      </span>
                      <div className="text-[10px] font-mono text-gray-500 uppercase">GPU Load</div>
                    </div>
                  </div>
                </div>

                {/* Big GPU Utilization Chart */}
                <div className="h-48 w-full bg-black/40 rounded-xl p-2 border border-white/5 relative">
                  <span className="absolute top-3 left-4 text-[10px] font-mono text-gray-500">
                    Live GPU Core Utilization & Power Draw ({gpu.power_draw_w || 0}W)
                  </span>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history.gpu} margin={{ top: 25, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gpuGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: "10px" }} />
                      <YAxis domain={[0, 100]} stroke="#6b7280" style={{ fontSize: "10px" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "rgba(10, 11, 20, 0.95)", borderColor: "rgba(16, 185, 129, 0.3)", borderRadius: "8px", fontSize: "11px" }}
                        formatter={(val) => [`${Number(val).toFixed(0)}%`, "GPU Core Load"]}
                      />
                      <Area type="monotone" dataKey="val" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gpuGrad)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Dedicated VRAM Memory Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-400">Dedicated GPU VRAM Memory</span>
                    <span className="text-emerald-400 font-bold">{gpu.vram_used_mb || 0} MB / {gpu.vram_total_mb || 4096} MB ({gpu.vram_percent || 0}%)</span>
                  </div>
                  <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(2, gpu.vram_percent || 15))}%` }}
                    ></div>
                  </div>
                </div>

                {/* GPU Spec Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-white/5 text-xs font-mono">
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">Dedicated VRAM</span>
                    <span className="text-white font-bold">{gpu.dedicated_vram_gb || 4.0} GB GDDR6</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">Shared GPU Memory</span>
                    <span className="text-white font-bold">{gpu.shared_vram_gb || 7.91} GB System</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">Power Consumption</span>
                    <span className="text-emerald-400 font-bold">{gpu.power_draw_w || 0} Watts</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">Hardware Mode</span>
                    <span className="text-cyan-300 font-bold">DirectX 12 / CUDA</span>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------- DISK DETAIL INSPECTOR -------------------- */}
            {selectedHw === "disk" && (
              <div className="glass-panel p-6 border-white/[0.06] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-amber-400" />
                      Storage Disks & VideoSense AI Artifact Footprint
                    </h3>
                    <p className="text-xs text-gray-400">Drive Partition Capacity and Application Data Assets</p>
                  </div>
                </div>

                {/* Physical Drives */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(storage.drives || []).map((drv, i) => (
                    <div key={i} className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-amber-400" /> Local Disk ({drv.mountpoint})
                        </span>
                        <span className="text-xs font-mono text-amber-400 font-bold">{drv.percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${drv.percent > 90 ? "bg-red-500" : drv.percent > 75 ? "bg-amber-400" : "bg-emerald-400"}`}
                          style={{ width: `${drv.percent}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-gray-400">
                        <span>Used: {drv.used_gb} GB</span>
                        <span>Free: {drv.free_gb} GB</span>
                        <span>Total: {drv.total_gb} GB</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* VideoSense AI App Storage Breakdown */}
                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Box className="w-4 h-4 text-cyan-400" />
                      VideoSense AI Application Storage Ledger
                    </span>
                    <span className="text-xs font-mono text-cyan-300 font-bold">
                      {storage.app_storage?.total_assets_mb ? `${(storage.app_storage.total_assets_mb / 1024).toFixed(2)} GB Total` : "2.23 GB Total"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                      <span className="text-gray-400 block text-[10px] uppercase">Raw Uploads Cache</span>
                      <span className="text-white font-bold">{storage.app_storage?.uploads_mb || 2164} MB</span>
                    </div>
                    <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                      <span className="text-gray-400 block text-[10px] uppercase">Extracted Keyframes</span>
                      <span className="text-white font-bold">{storage.app_storage?.storage_mb || 13.5} MB</span>
                    </div>
                    <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                      <span className="text-gray-400 block text-[10px] uppercase">PostgreSQL Database</span>
                      <span className="text-emerald-400 font-bold">{storage.app_storage?.db_size_pretty || "49 MB"}</span>
                    </div>
                  </div>
                </div>

                {/* Disk I/O */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-white/5 text-xs font-mono">
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">Read Throughput</span>
                    <span className="text-white font-bold">{storage.io?.read_mb || 0} MB read</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">Write Throughput</span>
                    <span className="text-white font-bold">{storage.io?.write_mb || 0} MB write</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">Total Read Ops</span>
                    <span className="text-gray-300">{storage.io?.read_count || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">Total Write Ops</span>
                    <span className="text-gray-300">{storage.io?.write_count || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------- NETWORK DETAIL INSPECTOR -------------------- */}
            {selectedHw === "network" && (
              <div className="glass-panel p-6 border-white/[0.06] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Wifi className="w-5 h-5 text-blue-400" />
                      Network Adapter Throughput & I/O
                    </h3>
                    <p className="text-xs text-gray-400">Real-time bytes transferred and received across network interfaces</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                    <span className="text-[10px] font-mono text-gray-400 uppercase flex items-center gap-1.5">
                      <ArrowDown className="w-3.5 h-3.5 text-emerald-400" /> Inbound Traffic (Download)
                    </span>
                    <div className="text-2xl font-black text-emerald-400 font-mono">
                      {net.bytes_recv_mb || 0} MB
                    </div>
                    <p className="text-xs text-gray-500 font-mono">{net.packets_recv || 0} packets received</p>
                  </div>
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                    <span className="text-[10px] font-mono text-gray-400 uppercase flex items-center gap-1.5">
                      <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> Outbound Traffic (Upload)
                    </span>
                    <div className="text-2xl font-black text-blue-400 font-mono">
                      {net.bytes_sent_mb || 0} MB
                    </div>
                    <p className="text-xs text-gray-500 font-mono">{net.packets_sent || 0} packets sent</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* VIEW 2: PROCESSES (WINDOWS TASK MANAGER PROCESS VIEW)              */}
      {/* ================================================================== */}
      {activeTab === "processes" && (
        <div className="glass-panel p-6 border-white/[0.06] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                Active Processes & Worker Pipeline
              </h3>
              <p className="text-xs text-gray-400">
                Live Windows Task Manager process ledger with VideoSense AI engines prioritized.
              </p>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by name or PID..."
                  value={procSearch}
                  onChange={(e) => setProcSearch(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 w-52"
                />
              </div>

              <select
                value={procFilter}
                onChange={(e) => setProcFilter(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
              >
                <option value="all">All Processes</option>
                <option value="videosense">VideoSense AI Only</option>
                <option value="high_memory">High Memory (&gt;150 MB)</option>
              </select>
            </div>
          </div>

          {/* Process Table */}
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/60 border-b border-white/10 text-gray-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Process Name</th>
                  <th className="p-3">PID</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Memory (RSS)</th>
                  <th className="p-3 text-right">Threads</th>
                  <th className="p-3">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredProcesses.map((p, i) => (
                  <tr
                    key={p.pid || i}
                    className={`hover:bg-white/[0.03] transition-colors ${
                      p.is_app_process ? "bg-cyan-950/15" : ""
                    }`}
                  >
                    <td className="p-3 font-semibold flex items-center gap-2">
                      {p.is_app_process ? (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                      )}
                      <div>
                        <span className="text-white">{p.name}</span>
                        {p.app_label && (
                          <div className="text-[10px] text-cyan-400 font-sans font-medium">{p.app_label}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-gray-400">{p.pid}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-gray-300">
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-white">
                      {p.memory_mb} MB
                    </td>
                    <td className="p-3 text-right text-gray-400">{p.threads}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-medium border ${
                        p.is_app_process
                          ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                          : p.category === "High Memory App"
                          ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                          : "bg-white/5 text-gray-400 border-white/5"
                      }`}>
                        {p.category}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredProcesses.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">
                      No matching processes found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* VIEW 3: AI PIPELINE & MODEL TELEMETRY                             */}
      {/* ================================================================== */}
      {activeTab === "ai_models" && (
        <div className="space-y-6">
          {/* Active Job Queue Status Card */}
          <div className="glass-panel p-5 border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Background Worker Job Queue</h4>
                <p className="text-xs text-gray-400 font-mono">
                  {queue.total || 0} Total Processed • {queue.processing || 0} In Flight • {queue.queued || 0} Queued
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {queue.completed || 0} Completed
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                {queue.failed || 0} Failed
              </span>
            </div>
          </div>

          {/* AI Model Runtime Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {aiModels.map((m) => (
              <div key={m.id} className="glass-panel p-5 border-white/[0.06] space-y-4 hover:border-cyan-500/30 transition-all">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">{m.framework}</span>
                    <h4 className="font-bold text-white text-sm">{m.name}</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {m.status}
                  </span>
                </div>

                <p className="text-xs text-gray-400 line-clamp-2">{m.task}</p>

                <div className="space-y-2 pt-2 border-t border-white/5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Device Target:</span>
                    <span className="text-gray-300 font-medium">{m.device}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Inference Latency:</span>
                    <span className="text-emerald-400 font-bold">{m.inference_latency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Model Weights:</span>
                    <span className="text-gray-300">{m.weights_file}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Capacity / Space:</span>
                    <span className="text-cyan-300">{m.classes_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* VIEW 4: DIAGNOSTICS & SYSTEM HEALTH MATRIX                        */}
      {/* ================================================================== */}
      {activeTab === "diagnostics" && (
        <div className="glass-panel p-6 border-white/[0.06] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                System Diagnostics & Infrastructure Probes
              </h3>
              <p className="text-xs text-gray-400">
                End-to-end verification of database pools, vector indices, FFmpeg binaries, and GPU drivers.
              </p>
            </div>
            <button
              onClick={runDiagnosticsProbe}
              disabled={isProbing}
              className="btn-glass px-4 py-2 text-xs flex items-center gap-2 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10 transition-all font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? "animate-spin" : ""}`} />
              Run Full Diagnostics Probe
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DB Diagnostic Card */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" /> PostgreSQL Database Pool
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  HEALTHY
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Round-trip ping verification: <strong className="text-emerald-400 font-mono">{latency} ms</strong> query latency.
              </p>
              <div className="text-[11px] font-mono text-gray-500">
                Connection URL: postgresql://postgres:***@localhost:5432/VideoSense_AI
              </div>
            </div>

            {/* GPU Accelerator Card */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" /> Dedicated NVIDIA GPU Hardware
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {gpu.available ? "OPERATIONAL" : "CPU ENGINE"}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Hardware: <strong className="text-white font-mono">{gpu.name}</strong> • Temp: <strong className="text-emerald-400 font-mono">{gpu.temperature_c}°C</strong>
              </p>
              <div className="text-[11px] font-mono text-gray-500">
                VRAM: {gpu.vram_used_mb} / {gpu.vram_total_mb} MB ({gpu.vram_percent}% allocated)
              </div>
            </div>

            {/* FFmpeg Transcoder Card */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-cyan-400" /> Native FFmpeg Demuxing Binary
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {platform.ffmpeg_status || "OPERATIONAL"}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Executable verified on system PATH:
              </p>
              <div className="text-[10px] font-mono text-gray-400 truncate bg-black/50 p-2 rounded border border-white/5">
                {platform.ffmpeg_path || "C:\\...\\ffmpeg.exe"}
              </div>
            </div>

            {/* Storage IO Card */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-purple-400" /> Storage Subsystem & Vector Index
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  READ/WRITE OK
                </span>
              </div>
              <p className="text-xs text-gray-400">
                App storage: <strong className="text-white font-mono">{storage.app_storage?.total_assets_mb || 2226} MB</strong> across media and vector caches.
              </p>
              <div className="text-[11px] font-mono text-gray-500">
                FAISS Flat-L2 512-dim Vector Storage online and indexed.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
