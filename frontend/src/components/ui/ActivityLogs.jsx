import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Terminal, ShieldCheck, UploadCloud, Search, MessageSquare, Download,
  Cpu, Sparkles, Eye, Box, FileText, Radio, Volume2, Layers,
  Database, CheckCircle2, AlertCircle, AlertTriangle, RefreshCw,
  Play, Pause, Clock, Filter, X, ChevronDown, ChevronUp, Copy,
  Check, ExternalLink, FileVideo, User, ArrowDown, Activity, FileSpreadsheet
} from "lucide-react";
import api from "../../services/api";

export default function ActivityLogs({ onSelectVideo, onNavigate }) {
  // Activity state
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [videos, setVideos] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [selectedVideo, setSelectedVideo] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Live stream control
  const [isLive, setIsLive] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(4000); // 4s

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Toast message
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (text, type = "info") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg({ text, type });
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 3500);
  };

  // --------------------------------------------------------------------------
  // Data Fetching
  // --------------------------------------------------------------------------
  const fetchLogs = useCallback(async (isInitial = false, currentOffset = 0) => {
    try {
      if (isInitial && currentOffset === 0) setIsLoading(true);
      if (currentOffset > 0) setIsLoadingMore(true);

      const [logData, statsData] = await Promise.all([
        api.getActivityLogs({
          category: selectedCategory,
          severity: selectedSeverity,
          videoId: selectedVideo === "all" ? null : selectedVideo,
          search: searchQuery,
          limit,
          offset: currentOffset
        }).catch(() => ({ items: [], total_count: 0 })),
        api.getActivityStats().catch(() => null)
      ]);

      if (currentOffset === 0) {
        setLogs(logData.items || []);
      } else {
        setLogs(prev => [...prev, ...(logData.items || [])]);
      }

      setTotalCount(logData.total_count || 0);
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error("Activity logs fetch error:", err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [selectedCategory, selectedSeverity, selectedVideo, searchQuery, limit]);

  // Initial video list load
  useEffect(() => {
    api.getVideos()
      .then(vList => setVideos(vList || []))
      .catch(() => setVideos([]));
  }, []);

  // Filter change reset
  useEffect(() => {
    setOffset(0);
    fetchLogs(true, 0);
  }, [selectedCategory, selectedSeverity, selectedVideo, searchQuery, fetchLogs]);

  // Auto-refresh timer
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      fetchLogs(false, 0);
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [isLive, refreshInterval, fetchLogs]);

  // Load More pagination
  const handleLoadMore = () => {
    const nextOffset = offset + limit;
    setOffset(nextOffset);
    fetchLogs(false, nextOffset);
  };

  // Export handlers
  const handleExport = (format = "json") => {
    try {
      const url = api.exportActivityLogsUrl(format);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `VideoSense_Audit_Logs.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Exported audit logs in ${format.toUpperCase()} format!`, "success");
    } catch (err) {
      showToast("Export failed: " + err.message, "error");
    }
  };

  // Copy helper
  const handleCopy = (text, type = "id") => {
    navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  // Icon mapping by category/stage
  const getEventIcon = (category, stage, severity) => {
    if (severity === "ERROR") return { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" };
    if (stage === "pipeline_completed") return { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
    if (stage?.includes("object") || stage?.includes("detection")) return { icon: Eye, color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20" };
    if (stage?.includes("ocr")) return { icon: FileText, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" };
    if (stage?.includes("speech") || stage?.includes("audio")) return { icon: Radio, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" };
    if (stage?.includes("embedding")) return { icon: Layers, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" };
    if (category === "user_action") return { icon: Search, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" };
    if (category === "ingestion") return { icon: UploadCloud, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" };
    return { icon: Terminal, color: "text-gray-400", bg: "bg-white/5", border: "border-white/10" };
  };

  return (
    <div className="space-y-6 select-none text-gray-200">
      {/* ------------------------------------------------------------------ */}
      {/* TOP HEADER & LIVE STREAM BANNER                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass-panel p-5 border-white/[0.06]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Terminal className="w-6 h-6 text-cyan-400" />
              Workspace Activity & Audit Trail
            </h2>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              LIVE AUDIT STREAM ACTIVE
            </span>
          </div>
          <p className="text-gray-400 text-xs">
            Chronological forensic event feed tracking video ingestions, AI inferences, semantic searches, and pipeline execution stages.
          </p>
        </div>

        {/* Live Controls & Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Pause / Resume Live Stream */}
          <button
            onClick={() => setIsLive(!isLive)}
            className={`btn-glass px-3 py-1.5 text-xs flex items-center gap-1.5 font-medium transition-colors ${
              isLive ? "border-cyan-500/30 text-cyan-300 bg-cyan-500/10" : "text-gray-400"
            }`}
            title={isLive ? "Pause live event polling" : "Resume live event polling"}
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
              <option value={2000} className="bg-gray-900">2.0s</option>
              <option value={4000} className="bg-gray-900">4.0s</option>
              <option value={8000} className="bg-gray-900">8.0s</option>
            </select>
          </div>

          {/* Export JSON */}
          <button
            onClick={() => handleExport("json")}
            className="btn-glass px-3 py-1.5 text-xs flex items-center gap-1.5 text-gray-300 hover:text-white border-white/10 hover:border-cyan-500/30"
            title="Download complete audit trail as JSON"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export JSON</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={() => handleExport("csv")}
            className="btn-glass px-3 py-1.5 text-xs flex items-center gap-1.5 text-gray-300 hover:text-white border-white/10 hover:border-emerald-500/30"
            title="Download audit trail as CSV spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          {/* Force Refresh */}
          <button
            onClick={() => fetchLogs(false, 0)}
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
      {/* SUMMARY STAT CARDS (AUDIT KPIS)                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 border-white/[0.04] space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Audit Events</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{stats?.total_events || totalCount || 0}</div>
          <p className="text-[10px] text-gray-500">Across all multimodal operations</p>
        </div>

        <div className="glass-panel p-4 border-white/[0.04] space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pipeline Executions</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{stats?.pipeline_events || 0}</div>
          <p className="text-[10px] text-gray-500">Demux, YOLO, Whisper, OCR stages</p>
        </div>

        <div className="glass-panel p-4 border-white/[0.04] space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pipeline Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {stats?.success_rate_percent !== undefined ? `${stats.success_rate_percent}%` : "100%"}
          </div>
          <p className="text-[10px] text-gray-500">{stats?.error_count || 0} errors recorded</p>
        </div>

        <div className="glass-panel p-4 border-white/[0.04] space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Video Streams</span>
            <FileVideo className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{stats?.active_videos_count || videos.length || 0}</div>
          <p className="text-[10px] text-gray-500">Ingested surveillance assets</p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FILTER CONTROLS TOOLBAR                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="glass-panel p-4 border-white/[0.06] space-y-3">
        {/* Category Pills */}
        <div className="flex border-b border-white/5 pb-3 gap-1 overflow-x-auto">
          {[
            { id: "all", label: "All Activities", icon: Terminal, count: totalCount },
            { id: "pipeline", label: "Pipeline Engine", icon: Cpu, count: stats?.by_category?.pipeline },
            { id: "ai_inference", label: "AI Inferences", icon: Sparkles, count: stats?.by_category?.ai_inference },
            { id: "ingestion", label: "Ingestions", icon: UploadCloud, count: stats?.by_category?.ingestion },
            { id: "user_action", label: "User Interactions", icon: Search, count: stats?.by_category?.user_action }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <cat.icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              {cat.count !== undefined && cat.count > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/40 text-gray-300">
                  {cat.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Dropdown Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by keyword, stage, message, or video filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 w-full font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Target Video Selector */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono">
              <FileVideo className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={selectedVideo}
                onChange={(e) => setSelectedVideo(e.target.value)}
                className="bg-transparent text-gray-200 focus:outline-none cursor-pointer text-xs max-w-[180px] truncate"
              >
                <option value="all" className="bg-gray-900">All Ingested Videos</option>
                {videos.map(v => (
                  <option key={v.id} value={v.id} className="bg-gray-900">
                    {v.filename || v.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-transparent text-gray-200 focus:outline-none cursor-pointer text-xs"
              >
                <option value="ALL" className="bg-gray-900">All Levels</option>
                <option value="SUCCESS" className="bg-gray-900">SUCCESS</option>
                <option value="INFO" className="bg-gray-900">INFO</option>
                <option value="ERROR" className="bg-gray-900">ERROR</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TIMELINE EVENT STREAM FEED                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="glass-panel p-6 border-white/[0.04] space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            Audit Event Stream ({logs.length} of {totalCount} records)
          </h3>
          <span className="text-[11px] font-mono text-gray-500">
            Chronological Order • Descending
          </span>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            <p className="text-sm text-gray-400 font-mono">Querying immutable database audit ledger...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && logs.length === 0 && (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto text-gray-500">
              <Terminal className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">No activity records found</h4>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                {searchQuery || selectedCategory !== "all" || selectedSeverity !== "ALL" || selectedVideo !== "all"
                  ? "No activity logs match the selected filter criteria. Try resetting filters."
                  : "No events recorded yet. Upload and analyze a video or run semantic searches to generate activity records here."}
              </p>
            </div>
          </div>
        )}

        {/* Timeline Events List */}
        {!isLoading && logs.length > 0 && (
          <div className="space-y-5 relative pl-6 border-l border-white/10 ml-2">
            {logs.map((item, idx) => {
              const { icon: Icon, color, bg, border } = getEventIcon(item.category, item.stage, item.severity);
              return (
                <div
                  key={item.id || idx}
                  onClick={() => setSelectedLog(item)}
                  className="relative group p-4 rounded-xl bg-black/30 border border-white/5 hover:border-cyan-500/30 hover:bg-white/[0.02] cursor-pointer transition-all space-y-2 shadow-sm"
                >
                  {/* Glowing Node Marker on Timeline */}
                  <div className={`absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full ${bg} ${border} border flex items-center justify-center shadow-sm`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${color.replace("text-", "bg-")}`}></div>
                  </div>

                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`p-1.5 rounded-lg ${bg} ${border} border ${color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors">
                        {item.title}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                        item.severity === "ERROR" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        item.severity === "SUCCESS" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      }`}>
                        {item.severity}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                      <span>{item.relative_time}</span>
                    </div>
                  </div>

                  {/* Description / Message */}
                  <p className="text-xs text-gray-300 font-mono line-clamp-2">
                    {item.description}
                  </p>

                  {/* Bottom Metadata Tags */}
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-gray-400 pt-1 border-t border-white/[0.04]">
                    {item.video_filename && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 text-gray-300">
                        <FileVideo className="w-3 h-3 text-cyan-400" />
                        <span className="truncate max-w-[200px]">{item.video_filename}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 text-gray-400">
                      <User className="w-3 h-3 text-gray-500" />
                      <span>{item.author}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/5 text-gray-500 uppercase">
                      Stage: {item.stage}
                    </span>
                    <span className="ml-auto text-[10px] text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      View Audit Details &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More Pagination */}
        {!isLoading && logs.length > 0 && logs.length < totalCount && (
          <div className="pt-4 text-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="btn-glass px-6 py-2.5 text-xs text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/10 transition-all font-semibold inline-flex items-center gap-2"
            >
              {isLoadingMore ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading more audit events...</span>
                </>
              ) : (
                <>
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>Load More Records ({logs.length} of {totalCount})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* LOG FORENSIC INSPECTION MODAL                                      */}
      {/* ================================================================== */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl glass-panel border-white/10 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                  Forensic Event Inspection
                </span>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  {selectedLog.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event Key Facts Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-gray-500 block text-[10px] uppercase">Timestamp (UTC)</span>
                <span className="text-white font-bold">{selectedLog.timestamp}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-gray-500 block text-[10px] uppercase">Severity Level</span>
                <span className={`font-bold ${
                  selectedLog.severity === "ERROR" ? "text-red-400" :
                  selectedLog.severity === "SUCCESS" ? "text-emerald-400" : "text-cyan-400"
                }`}>
                  {selectedLog.severity}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-gray-500 block text-[10px] uppercase">Category</span>
                <span className="text-purple-300 font-bold uppercase">{selectedLog.category}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 col-span-2 sm:col-span-1">
                <span className="text-gray-500 block text-[10px] uppercase">Target Video</span>
                <span className="text-gray-200 truncate block">{selectedLog.video_filename || "N/A"}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-gray-500 block text-[10px] uppercase">Execution Stage</span>
                <span className="text-amber-300 font-bold">{selectedLog.stage}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-gray-500 block text-[10px] uppercase">Author / Identity</span>
                <span className="text-white">{selectedLog.author}</span>
              </div>
            </div>

            {/* Full Message */}
            <div className="p-4 rounded-xl bg-black/50 border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">
                Detailed Execution Log Message
              </span>
              <p className="text-xs text-gray-200 font-mono leading-relaxed">
                {selectedLog.description}
              </p>
            </div>

            {/* Raw JSON Payload Viewer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                <span>Raw Execution Metadata (JSON)</span>
                <button
                  onClick={() => handleCopy(JSON.stringify(selectedLog, null, 2), "json")}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedJson ? "Copied!" : "Copy Payload"}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-black/80 border border-white/5 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-48 leading-relaxed">
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
              <button
                onClick={() => handleCopy(selectedLog.id, "id")}
                className="flex items-center gap-1.5 text-gray-400 hover:text-white font-mono"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>ID: {selectedLog.id}</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedLog.video_id && onSelectVideo && (
                  <button
                    onClick={() => {
                      onSelectVideo(selectedLog.video_id);
                      if (onNavigate) onNavigate("player");
                      setSelectedLog(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-all font-semibold"
                  >
                    <FileVideo className="w-3.5 h-3.5" />
                    <span>Open in Player</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedLog(null)}
                  className="btn-glass px-5 py-2 font-semibold text-white"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
