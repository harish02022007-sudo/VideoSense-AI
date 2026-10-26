import React, { useState, useEffect, useMemo } from "react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from "recharts";
import { 
  BarChart3, TrendingUp, Layers, Type, Target, Download, RefreshCw, 
  Sliders, Film, CheckCircle2, Clock, Sparkles, Filter, Search, 
  ArrowUpRight, Cpu, ShieldCheck, Eye, Activity, FileText, LayoutGrid,
  ChevronDown
} from "lucide-react";
import { api } from "../../services/api";

export default function AnalyticsDashboard({ selectedVideoId = null, onSelectVideo = null, onNavigate = null }) {
  // State
  const [activeScope, setActiveScope] = useState(selectedVideoId || "overview");
  const [videoList, setVideoList] = useState([]);
  const [activeTab, setActiveTab] = useState("distribution"); // distribution | timeline | spatial | ocr | calibration
  const [minConfidence, setMinConfidence] = useState(0.20);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [ocrSearch, setOcrSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Analytics data from API
  const [overviewData, setOverviewData] = useState(null);
  const [videoData, setVideoData] = useState(null);

  // Sync if selectedVideoId changes from outside
  useEffect(() => {
    if (selectedVideoId) {
      setActiveScope(selectedVideoId);
    }
  }, [selectedVideoId]);

  // Load videos list & initial overview
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, videosRes] = await Promise.all([
        api.getAnalyticsOverview(),
        api.getVideos()
      ]);
      setOverviewData(overviewRes);
      setVideoList(videosRes || []);

      // If a specific video is selected, fetch its detailed analytics
      if (activeScope && activeScope !== "overview") {
        const vRes = await api.getVideoAnalytics(activeScope, minConfidence);
        setVideoData(vRes);
      } else {
        setVideoData(null);
      }
    } catch (err) {
      console.error("Failed to load analytics data:", err);
      setError("Unable to load real-time analytics data. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeScope, minConfidence]);

  // Categories list
  const categories = ["ALL", "Living Beings", "Vehicles", "Wearables", "Infrastructure", "Objects"];

  // Filtered classes based on category and confidence
  const filteredClassDistribution = useMemo(() => {
    const source = activeScope === "overview" 
      ? (overviewData?.top_classes || []) 
      : (videoData?.class_distribution || []);

    return source.filter(item => {
      const matchesCat = categoryFilter === "ALL" || item.category === categoryFilter;
      const matchesConf = (item.avg_confidence || 0) >= minConfidence;
      return matchesCat && matchesConf;
    });
  }, [activeScope, overviewData, videoData, categoryFilter, minConfidence]);

  // Filtered OCR stream
  const filteredOcrStream = useMemo(() => {
    const list = videoData?.ocr_stream || [];
    if (!ocrSearch.trim()) return list;
    return list.filter(item => item.text.toLowerCase().includes(ocrSearch.toLowerCase()));
  }, [videoData, ocrSearch]);

  // Active Video details object
  const activeVideoMeta = useMemo(() => {
    if (activeScope === "overview") return null;
    return videoList.find(v => v.id === activeScope) || videoData?.video || null;
  }, [activeScope, videoList, videoData]);

  // Export CSV
  const exportCSV = () => {
    if (!filteredClassDistribution.length) {
      alert("No data available to export.");
      return;
    }
    const headers = ["Class Label", "Category", "Occurrences", "Avg Confidence"];
    const rows = filteredClassDistribution.map(c => [
      `"${c.label}"`,
      `"${c.category || 'N/A'}"`,
      c.count,
      (c.avg_confidence * 100).toFixed(1) + "%"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `videosense_analytics_${activeScope}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const exportJSON = () => {
    const payload = activeScope === "overview" ? overviewData : videoData;
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `videosense_analytics_${activeScope}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Palette colors for bars
  const BAR_COLORS = ["#00F0FF", "#0052FF", "#7C3AED", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#06B6D4"];

  return (
    <div className="space-y-8 select-none text-gray-200">
      {/* Top Header & Scope Bar */}
      <div className="glass-panel p-6 border-white/[0.06] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                  Analytics Hub
                  <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    Multimodal Intelligence
                  </span>
                </h1>
                <p className="text-xs text-gray-400 mt-1">
                  High-fidelity telemetry across open-world Grounding DINO vision proposals, OCR signages, and temporal distributions.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="btn-glass text-xs font-semibold py-2 px-3.5 flex items-center gap-2 hover:border-cyan-500/40"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            {activeScope !== "overview" && onNavigate && (
              <button
                onClick={() => {
                  if (onSelectVideo) onSelectVideo(activeScope);
                  onNavigate("player");
                }}
                className="btn-glass text-xs font-semibold py-2 px-3.5 flex items-center gap-2 text-cyan-300 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Open in Frame Studio</span>
              </button>
            )}

            <button
              onClick={exportCSV}
              className="btn-glass text-xs font-semibold py-2 px-3.5 flex items-center gap-2"
              title="Export as CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>

            <button
              onClick={exportJSON}
              className="btn-gradient text-xs font-bold py-2 px-4 flex items-center gap-2"
              title="Export as JSON"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Scope Selector & Live Filter Bar */}
        <div className="mt-6 pt-5 border-t border-white/[0.05] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Video Scope Dropdown */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
              <Film className="w-3.5 h-3.5 text-cyan-400" /> Target Video:
            </label>
            <div className="relative flex-1">
              <select
                value={activeScope}
                onChange={(e) => setActiveScope(e.target.value)}
                className="w-full appearance-none bg-black/40 border border-white/10 hover:border-cyan-500/40 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 pr-9 transition-colors cursor-pointer"
              >
                <option value="overview">🌐 All Videos (Fleet Overview)</option>
                {videoList.map((v) => (
                  <option key={v.id} value={v.id}>
                    🎬 {v.filename || `Video ${v.id.slice(0, 8)}`} {v.duration ? `(${v.duration.toFixed(0)}s)` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Confidence Threshold Slider */}
          <div className="flex items-center gap-4 bg-black/30 border border-white/5 rounded-xl px-4 py-2">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-400 whitespace-nowrap">
                Min Conf: <span className="text-cyan-400 font-bold">{(minConfidence * 100).toFixed(0)}%</span>
              </span>
              <input
                type="range"
                min="0.10"
                max="0.80"
                step="0.05"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                className="w-24 lg:w-32 accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
              />
            </div>
          </div>

          {/* Active Target Badge */}
          {activeVideoMeta && (
            <div className="hidden xl:flex items-center gap-2 text-xs text-gray-400 bg-white/5 border border-white/5 rounded-xl px-3 py-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-[11px] text-white truncate max-w-[200px]">
                {activeVideoMeta.filename}
              </span>
              <span className="text-gray-500">|</span>
              <span className="text-[10px] text-gray-400 font-mono">
                {activeVideoMeta.resolution || "1080p"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Detections */}
        <div className="glass-panel p-4 border-white/[0.05] hover:border-cyan-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Objects</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {activeScope === "overview" 
                ? (overviewData?.summary?.total_objects?.toLocaleString() || "0")
                : (videoData?.kpis?.total_objects?.toLocaleString() || "0")}
            </span>
          </div>
          <p className="text-[10px] text-cyan-400/80 mt-1 flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3" />
            {activeScope === "overview" 
              ? `${overviewData?.summary?.total_frames || 0} keyframes analyzed`
              : `${((videoData?.kpis?.total_objects || 0) / (videoData?.video?.total_frames_analyzed || 1)).toFixed(1)} avg / frame`}
          </p>
        </div>

        {/* Unique Classes */}
        <div className="glass-panel p-4 border-white/[0.05] hover:border-blue-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unique Classes</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {activeScope === "overview"
                ? (overviewData?.top_classes?.length || "0")
                : (videoData?.kpis?.unique_classes || "0")}
            </span>
            <span className="text-[10px] text-gray-500">categories</span>
          </div>
          <p className="text-[10px] text-blue-400/80 mt-1 font-medium">
            Open-world zero-shot taxonomy
          </p>
        </div>

        {/* OCR Inscriptions */}
        <div className="glass-panel p-4 border-white/[0.05] hover:border-purple-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">OCR Inscriptions</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Type className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {activeScope === "overview"
                ? (overviewData?.summary?.total_ocr?.toLocaleString() || "0")
                : (videoData?.kpis?.ocr_hits_count || "0")}
            </span>
          </div>
          <p className="text-[10px] text-purple-400/80 mt-1 font-medium">
            Signages & screen text regions
          </p>
        </div>

        {/* Mean AI Fidelity */}
        <div className="glass-panel p-4 border-white/[0.05] hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mean AI Fidelity</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {activeScope === "overview"
                ? `${((overviewData?.summary?.avg_confidence || 0) * 100).toFixed(1)}%`
                : `${((videoData?.kpis?.avg_confidence || 0) * 100).toFixed(1)}%`}
            </span>
          </div>
          <p className="text-[10px] text-emerald-400/80 mt-1 font-medium">
            Grounding DINO + CLIP mean
          </p>
        </div>

        {/* Keyframe / Video Duration Coverage */}
        <div className="glass-panel p-4 border-white/[0.05] hover:border-amber-500/30 transition-all duration-300 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Coverage</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {activeScope === "overview"
                ? `${overviewData?.summary?.total_duration_sec ? (overviewData.summary.total_duration_sec / 60).toFixed(1) : "0"}m`
                : `${videoData?.video?.duration || "0"}s`}
            </span>
            <span className="text-[10px] text-gray-500">
              {activeScope === "overview" ? "video runtime" : `${videoData?.video?.total_frames_analyzed || 0} frames`}
            </span>
          </div>
          <p className="text-[10px] text-amber-400/80 mt-1 font-medium">
            100% extracted keyframe coverage
          </p>
        </div>
      </div>

      {/* Analytics Subtabs Navigator */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "distribution", label: "Class Distribution", icon: BarChart3 },
            { id: "timeline", label: "Temporal Density", icon: TrendingUp },
            { id: "spatial", label: "Spatial Heatmap", icon: LayoutGrid },
            { id: "ocr", label: "OCR Text Inscriptions", icon: Type },
            { id: "calibration", label: "Model Calibration", icon: Activity }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-300 border border-cyan-500/30 shadow-glow"
                    : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-gray-500"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Category Pill Filters (active on distribution tab) */}
        {activeTab === "distribution" && (
          <div className="hidden lg:flex items-center gap-1.5 bg-black/40 border border-white/5 p-1 rounded-xl">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                  categoryFilter === cat
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-gray-500 hover:text-gray-300 border border-transparent"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab 1: Class Distribution & Rankings */}
      {activeTab === "distribution" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Bar Chart */}
          <div className="lg:col-span-7 glass-panel p-6 border-white/[0.05]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  Object Occurrence Frequency
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Frequency of detected objects matching category filter: <span className="text-cyan-400 font-bold">{categoryFilter}</span>
                </p>
              </div>
              <span className="text-xs font-mono text-gray-500">
                {filteredClassDistribution.length} classes
              </span>
            </div>

            <div className="h-80 w-full">
              {filteredClassDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={filteredClassDistribution.slice(0, 10)} 
                    margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis 
                      dataKey="label" 
                      stroke="#9ca3af" 
                      style={{ fontSize: "10px", fontWeight: "600" }} 
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: "10px" }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "rgba(10, 11, 20, 0.95)", 
                        borderColor: "rgba(0, 240, 255, 0.2)", 
                        borderRadius: "12px",
                        fontSize: "11px",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
                      }}
                      formatter={(val, name, props) => [
                        `${val} detections (${((props.payload.avg_confidence || 0) * 100).toFixed(1)}% conf)`,
                        "Count"
                      ]}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {filteredClassDistribution.slice(0, 10).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs gap-2">
                  <Filter className="w-6 h-6 text-gray-600" />
                  <span>No objects match the current category and confidence filter.</span>
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard Table / Breakdown */}
          <div className="lg:col-span-5 glass-panel p-6 border-white/[0.05] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Class Fidelity Leaderboard
                </h3>
                <span className="text-[10px] text-gray-500 font-mono">Ranked by count</span>
              </div>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {filteredClassDistribution.slice(0, 8).map((cls, idx) => (
                  <div 
                    key={cls.label}
                    className="p-2.5 rounded-xl bg-black/30 border border-white/5 hover:border-cyan-500/30 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-md bg-white/5 text-gray-400 text-[10px] font-bold flex items-center justify-center font-mono">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-white capitalize">{cls.label}</div>
                        <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">
                          {cls.category || "General"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-cyan-300">
                        {cls.count} <span className="text-[10px] text-gray-500">hits</span>
                      </div>
                      <div className="w-20 bg-white/5 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                          style={{ width: `${Math.min(100, (cls.avg_confidence || 0) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
              <span>Taxonomy: Universal 5-Pass</span>
              <span className="text-cyan-400 font-semibold font-mono">Grounding DINO + CLIP</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Temporal Density & Timeline Activity */}
      {activeTab === "timeline" && (
        <div className="glass-panel p-6 border-white/[0.05]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Temporal Density Progression
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Surge and variation of detected visual entities across the video's timeline progression.
              </p>
            </div>
            {videoData?.video && (
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-lg">
                Duration: {videoData.video.duration}s ({videoData.video.total_frames_analyzed} frames)
              </span>
            )}
          </div>

          <div className="h-80 w-full">
            {videoData?.timeline_density?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={videoData.timeline_density} 
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorDensity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#0052FF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis 
                    dataKey="timestamp_sec" 
                    stroke="#9ca3af" 
                    style={{ fontSize: "10px" }}
                    tickFormatter={(val) => `${val.toFixed(1)}s`}
                  />
                  <YAxis stroke="#6b7280" style={{ fontSize: "10px" }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "rgba(10, 11, 20, 0.95)", 
                      borderColor: "rgba(0, 240, 255, 0.2)", 
                      borderRadius: "12px",
                      fontSize: "11px"
                    }}
                    formatter={(val, name, props) => [
                      `${val} objects (${props.payload.top_labels || "None"})`,
                      "Density"
                    ]}
                    labelFormatter={(val) => `Timestamp: ${val}s (Frame #${videoData.timeline_density.find(d => d.timestamp_sec === val)?.frame_number || 1})`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="objects_count" 
                    stroke="#00F0FF" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorDensity)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs gap-2">
                <Clock className="w-6 h-6 text-gray-600" />
                <span>
                  {activeScope === "overview" 
                    ? "Select a specific video from the top dropdown to view its temporal timeline density curve."
                    : "No keyframe timeline density points found for this video."}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Spatial Screen Heatmap */}
      {activeTab === "spatial" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Visual Quadrant Screen Grid */}
          <div className="lg:col-span-7 glass-panel p-6 border-white/[0.05]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <LayoutGrid className="w-4 h-4 text-cyan-400" />
              Viewport Framing & Spatial Heatmap
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              Distribution of bounding box centers across video framing quadrants (Top, Bottom, Center).
            </p>

            <div className="relative aspect-video max-w-lg mx-auto bg-black/60 rounded-2xl border border-white/10 p-3 grid grid-cols-2 grid-rows-2 gap-2 overflow-hidden shadow-2xl">
              {/* Center Zone Overlay */}
              <div className="absolute inset-x-1/4 inset-y-1/4 rounded-xl border border-dashed border-cyan-400/50 bg-cyan-500/10 backdrop-blur-xs z-10 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">Center Stage</span>
                <span className="text-lg font-black text-white font-mono mt-0.5">
                  {videoData?.spatial_distribution?.find(s => s.quadrant === "Center Zone")?.count || 0}
                </span>
                <span className="text-[9px] text-gray-400">focal objects</span>
              </div>

              {/* Quadrant 1: Top Left */}
              <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex flex-col justify-between hover:bg-white/[0.05] transition-colors">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Top Left</span>
                <span className="text-xl font-bold text-white font-mono">
                  {videoData?.spatial_distribution?.find(s => s.quadrant === "Top Left")?.count || 0}
                </span>
              </div>

              {/* Quadrant 2: Top Right */}
              <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex flex-col justify-between hover:bg-white/[0.05] transition-colors">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Top Right</span>
                <span className="text-xl font-bold text-white font-mono">
                  {videoData?.spatial_distribution?.find(s => s.quadrant === "Top Right")?.count || 0}
                </span>
              </div>

              {/* Quadrant 3: Bottom Left */}
              <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex flex-col justify-between hover:bg-white/[0.05] transition-colors">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bottom Left</span>
                <span className="text-xl font-bold text-white font-mono">
                  {videoData?.spatial_distribution?.find(s => s.quadrant === "Bottom Left")?.count || 0}
                </span>
              </div>

              {/* Quadrant 4: Bottom Right */}
              <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex flex-col justify-between hover:bg-white/[0.05] transition-colors">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bottom Right</span>
                <span className="text-xl font-bold text-white font-mono">
                  {videoData?.spatial_distribution?.find(s => s.quadrant === "Bottom Right")?.count || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="lg:col-span-5 glass-panel p-6 border-white/[0.05] flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-emerald-400" />
                Spatial Radar Polygon
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                Comparison of object mass concentration across quadrants.
              </p>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart 
                    cx="50%" 
                    cy="50%" 
                    outerRadius="75%" 
                    data={videoData?.spatial_distribution || [
                      { quadrant: "Top Left", count: 20 },
                      { quadrant: "Top Right", count: 15 },
                      { quadrant: "Bottom Right", count: 12 },
                      { quadrant: "Bottom Left", count: 10 },
                      { quadrant: "Center Zone", count: 35 }
                    ]}
                  >
                    <PolarGrid stroke="rgba(255,255,255,0.05)" />
                    <PolarAngleAxis dataKey="quadrant" stroke="#9ca3af" style={{ fontSize: "10px" }} />
                    <PolarRadiusAxis stroke="#4b5563" style={{ fontSize: "9px" }} />
                    <Radar 
                      name="Objects Count" 
                      dataKey="count" 
                      stroke="#00F0FF" 
                      fill="#00F0FF" 
                      fillOpacity={0.25} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "rgba(10, 11, 20, 0.95)", 
                        borderColor: "rgba(0, 240, 255, 0.2)",
                        borderRadius: "12px",
                        fontSize: "11px"
                      }} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <p className="text-[10px] text-gray-500 font-mono text-center mt-2">
              Normalized over {videoData?.video?.resolution || "1920x1080"} frame coordinates
            </p>
          </div>
        </div>
      )}

      {/* Tab 4: OCR Text Inscriptions */}
      {activeTab === "ocr" && (
        <div className="glass-panel p-6 border-white/[0.05]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Type className="w-4 h-4 text-purple-400" />
                OCR On-Screen Text Inscriptions
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Extracted street banners, storefront signs, vehicle registrations, and watermarks.
              </p>
            </div>

            {/* OCR Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search extracted text..."
                value={ocrSearch}
                onChange={(e) => setOcrSearch(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2">
            {filteredOcrStream.length > 0 ? (
              filteredOcrStream.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 rounded-xl bg-black/30 border border-white/5 hover:border-purple-500/30 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-400 text-xs font-bold flex items-center justify-center font-mono">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-mono font-bold text-white">{item.text}</div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                        <span>Frame #{item.frame_number || 1}</span>
                        <span>•</span>
                        <span>Timestamp: {item.timestamp_sec?.toFixed(1) || 0}s</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
                      {((item.confidence || 0) * 100).toFixed(1)}% conf
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 text-xs">
                {activeScope === "overview" 
                  ? "Select a specific video from the top dropdown to inspect its extracted OCR text stream."
                  : "No OCR text inscriptions match your query."}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Model Calibration */}
      {activeTab === "calibration" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 glass-panel p-6 border-white/[0.05]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              AI Proposal Confidence Distribution
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              Distribution of candidate proposal scores evaluating open-world grounding precision.
            </p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeScope === "overview" ? overviewData?.confidence_distribution : videoData?.confidence_distribution}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="range" stroke="#9ca3af" style={{ fontSize: "10px" }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: "10px" }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "rgba(10, 11, 20, 0.95)", 
                      borderColor: "rgba(16, 185, 129, 0.2)",
                      borderRadius: "12px",
                      fontSize: "11px"
                    }}
                  />
                  <Bar dataKey="count" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 glass-panel p-6 border-white/[0.05] flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Pipeline Telemetry
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                Multimodal model execution stack.
              </p>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Vision Backbone</span>
                    <p className="text-[10px] text-gray-400">Grounding DINO (Swin-T OGC)</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    CUDA Active
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Open-World Refiner</span>
                    <p className="text-[10px] text-gray-400">Zero-Shot OpenAI CLIP ViT-B/32</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    CPU Memory-Safe
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">OCR Engine</span>
                    <p className="text-[10px] text-gray-400">EasyOCR Multi-Language</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Online
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-gray-500 flex items-center justify-between">
              <span>Database: PostgreSQL 16</span>
              <span>Vector DB: FAISS</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
