import React, { useState, useEffect, useMemo } from "react";
import { 
  Video, Search, Filter, ShieldCheck, Grid, List, Play, CheckCircle2, 
  Loader2, RefreshCw, AlertCircle, Clock, Crosshair, Film, HardDrive, 
  ArrowUpDown, Download, CheckSquare, Square, ExternalLink, Copy, Check,
  Sparkles, Layers, MessageSquare, ChevronRight, HelpCircle
} from "lucide-react";
import api, { API_BASE_URL } from "../../services/api";

export default function VideoLibrary({ onSelectVideo, onNavigate }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, duration_desc, duration_asc, objects_desc, size_desc
  const [viewMode, setViewMode] = useState("grid"); // grid, table
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [copiedId, setCopiedId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getVideos();
      setVideos(data || []);
    } catch (err) {
      console.error("Failed to fetch videos:", err);
      setError("Failed to connect to backend server. Make sure FastAPI is running on port 8001 or 8000.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyId = (e, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    showToast(`Video ID copied to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      const remainingMins = mins % 60;
      return `${hrs}:${remainingMins < 10 ? "0" : ""}${remainingMins}:${secs < 10 ? "0" : ""}${secs}`;
    }
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  // Top KPI Metrics calculated over the full video collection
  const metrics = useMemo(() => {
    const totalVideos = videos.length;
    const totalDurationSecs = videos.reduce((acc, v) => acc + (v.duration || 0), 0);
    const totalObjects = videos.reduce((acc, v) => acc + (v.total_objects || 0), 0);
    const totalFrames = videos.reduce((acc, v) => acc + (v.total_frames || 0), 0);
    const completedCount = videos.filter((v) => v.status === "completed").length;
    const completionRate = totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0;

    return {
      totalVideos,
      totalDurationSecs,
      totalObjects,
      totalFrames,
      completedCount,
      completionRate
    };
  }, [videos]);

  // Filtering & Sorting
  const filteredAndSortedVideos = useMemo(() => {
    let result = [...videos];

    // Filter by status
    if (filter === "completed") {
      result = result.filter((v) => v.status === "completed");
    } else if (filter === "processing") {
      result = result.filter((v) => v.status === "processing" || v.status === "queued");
    } else if (filter === "failed") {
      result = result.filter((v) => v.status === "failed");
    }

    // Filter by search string
    if (search.trim()) {
      const query = search.toLowerCase().trim();
      result = result.filter((v) => {
        const titleMatch = (v.filename || v.title || "").toLowerCase().includes(query);
        const idMatch = (v.id || "").toLowerCase().includes(query);
        return titleMatch || idMatch;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0);
      }
      if (sortBy === "oldest") {
        return new Date(a.uploaded_at || 0) - new Date(b.uploaded_at || 0);
      }
      if (sortBy === "duration_desc") {
        return (b.duration || 0) - (a.duration || 0);
      }
      if (sortBy === "duration_asc") {
        return (a.duration || 0) - (b.duration || 0);
      }
      if (sortBy === "objects_desc") {
        return (b.total_objects || 0) - (a.total_objects || 0);
      }
      if (sortBy === "size_desc") {
        return (b.size_bytes || 0) - (a.size_bytes || 0);
      }
      return 0;
    });

    return result;
  }, [videos, filter, search, sortBy]);

  // Paginated videos
  const paginatedVideos = useMemo(() => {
    return filteredAndSortedVideos.slice(0, page * itemsPerPage);
  }, [filteredAndSortedVideos, page]);

  // Batch Selection Handlers
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedVideos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedVideos.map((v) => v.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleExportSelected = () => {
    const selectedVideos = videos.filter((v) => selectedIds.has(v.id));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedVideos, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `videosense_library_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Exported ${selectedVideos.length} videos metadata to JSON`);
  };

  return (
    <div className="space-y-6 select-none max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-black/90 backdrop-blur-md border border-cyan-500/40 text-cyan-300 px-4 py-2.5 rounded-xl shadow-glow-cyan text-xs font-mono flex items-center gap-2 animate-fade-in">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Video Library
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30">
              {videos.length} Streams Ingested
            </span>
          </div>
          <p className="text-gray-400 mt-1.5 text-xs">
            Browse, filter, and inspect ingested surveillance streams, multimodal keyframes, and object detections.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onNavigate && (
            <button
              onClick={() => onNavigate("upload")}
              className="btn-glass px-3.5 py-2 text-xs flex items-center gap-2 font-semibold hover:border-cyan-400/40"
            >
              <Video className="w-3.5 h-3.5 text-cyan-400" /> Upload Stream
            </button>
          )}
          <button 
            onClick={fetchVideos}
            className="btn-glass px-3.5 py-2 text-xs flex items-center gap-2 font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} /> 
            Refresh
          </button>
        </div>
      </div>

      {/* Top KPI Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="glass-panel p-3.5 border-white/[0.05] bg-black/40 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <Video className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Total Videos</div>
            <div className="text-xl font-extrabold text-white font-mono">{metrics.totalVideos}</div>
          </div>
        </div>

        <div className="glass-panel p-3.5 border-white/[0.05] bg-black/40 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Total Runtime</div>
            <div className="text-xl font-extrabold text-white font-mono">{formatDuration(metrics.totalDurationSecs)}</div>
          </div>
        </div>

        <div className="glass-panel p-3.5 border-white/[0.05] bg-black/40 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Crosshair className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Objects Detected</div>
            <div className="text-xl font-extrabold text-emerald-400 font-mono">
              {metrics.totalObjects.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="glass-panel p-3.5 border-white/[0.05] bg-black/40 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Pipeline Ready</div>
            <div className="text-xl font-extrabold text-white font-mono">
              {metrics.completionRate}% <span className="text-xs text-gray-500 font-normal">({metrics.completedCount})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control, Search, Filter & View Mode Bar */}
      <div className="glass-panel p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-white/[0.05] bg-black/40">
        {/* Left: Search input */}
        <div className="relative flex items-center bg-black/60 border border-white/10 focus-within:border-cyan-400/50 rounded-xl transition-all px-3 py-1.5 w-full md:w-80 shadow-inner">
          <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by title, filename, or ID..."
            className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-mono"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-gray-500 hover:text-white text-xs px-1"
            >
              ×
            </button>
          )}
        </div>

        {/* Right: Status Filters, Sort, View Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter Chips */}
          <div className="flex items-center bg-black/60 border border-white/10 rounded-xl p-1">
            {[
              { id: "all", label: "All" },
              { id: "completed", label: "Ready" },
              { id: "processing", label: "Processing" },
              { id: "failed", label: "Failed" }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setFilter(item.id);
                  setPage(1);
                }}
                className={`text-[11px] font-mono font-bold px-3 py-1 rounded-lg transition-all capitalize cursor-pointer ${
                  filter === item.id 
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm" 
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 rounded-xl px-2.5 py-1 text-xs font-mono">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-500 text-[10px]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-white text-[11px] focus:outline-none cursor-pointer font-mono"
            >
              <option value="newest" className="bg-gray-900 text-white">Newest First</option>
              <option value="oldest" className="bg-gray-900 text-white">Oldest First</option>
              <option value="duration_desc" className="bg-gray-900 text-white">Longest Duration</option>
              <option value="duration_asc" className="bg-gray-900 text-white">Shortest Duration</option>
              <option value="objects_desc" className="bg-gray-900 text-white">Most Objects</option>
              <option value="size_desc" className="bg-gray-900 text-white">File Size</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-black/60 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "grid" 
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" 
                  : "text-gray-400 hover:text-white"
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "table" 
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" 
                  : "text-gray-400 hover:text-white"
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Batch Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div className="glass-panel p-3 px-4 flex flex-wrap items-center justify-between gap-3 border-cyan-500/30 bg-cyan-950/20 shadow-glow-cyan animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-cyan-400" />
              {selectedIds.size} video{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            <button
              onClick={handleSelectAll}
              className="text-[11px] font-mono text-gray-300 hover:text-white underline cursor-pointer"
            >
              {selectedIds.size === filteredAndSortedVideos.length ? "Deselect All" : "Select All Filtered"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportSelected}
              className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/35 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export Metadata (JSON)
            </button>
            <button
              onClick={handleClearSelection}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-mono transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="glass-panel p-16 flex flex-col items-center justify-center text-center border-white/5">
          <div className="relative">
            <Loader2 className="w-9 h-9 text-cyan-400 animate-spin mb-3" />
            <Sparkles className="w-4 h-4 text-secondary absolute -top-1 -right-1 animate-pulse" />
          </div>
          <p className="text-sm font-semibold text-white">Loading video streams & visual metadata...</p>
          <p className="text-xs text-gray-500 mt-1 font-mono">Syncing with PostgreSQL database and keyframe index</p>
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
          <button 
            onClick={fetchVideos}
            className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-mono text-[11px] font-bold"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredAndSortedVideos.length === 0 && (
        <div className="glass-panel p-16 text-center border-white/5 space-y-3">
          <Video className="w-10 h-10 text-gray-600 mx-auto" />
          <p className="text-base font-semibold text-white">No matching videos found</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {search 
              ? `No videos match "${search}". Try adjusting your query or filter.` 
              : "No videos in this category. Upload videos via the Upload Center to populate your library."}
          </p>
          {onNavigate && (
            <button
              onClick={() => onNavigate("upload")}
              className="mt-3 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold font-mono hover:bg-cyan-500/30 transition-all inline-flex items-center gap-2"
            >
              <Video className="w-3.5 h-3.5" /> Upload Video Now
            </button>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. GRID VIEW MODE                                        */}
      {/* ======================================================== */}
      {!isLoading && !error && viewMode === "grid" && filteredAndSortedVideos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedVideos.map((video) => {
            const isSelected = selectedIds.has(video.id);
            const thumbUrl = api.getVideoThumbnailUrl(video.id);

            return (
              <div 
                key={video.id}
                className={`glass-panel border transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:border-cyan-500/40 hover:shadow-glow-cyan ${
                  isSelected ? "border-cyan-400 ring-2 ring-cyan-400/40 bg-cyan-950/10" : "border-white/[0.05] bg-black/40"
                }`}
              >
                {/* Visual Thumbnail Poster */}
                <div className="aspect-video bg-black/90 relative overflow-hidden flex items-center justify-center">
                  {/* Real Keyframe Poster Image with fallback */}
                  <img
                    src={thumbUrl}
                    alt={video.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback gracefully to placeholder icon if image fails
                      e.target.style.display = "none";
                      if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                    }}
                  />

                  {/* Fallback Display if image missing/loading */}
                  <div 
                    style={{ display: "none" }} 
                    className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center text-gray-500 space-y-1"
                  >
                    <Video className="w-8 h-8 text-cyan-400/40" />
                    <span className="text-[10px] font-mono">Stream Keyframe</span>
                  </div>

                  {/* Hover Overlay Play Icon */}
                  <div 
                    onClick={() => onSelectVideo(video.id)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center cursor-pointer z-10"
                  >
                    <div className="w-12 h-12 rounded-full bg-cyan-500/30 border border-cyan-400 text-cyan-300 flex items-center justify-center shadow-glow-cyan group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-cyan-300 ml-0.5" />
                    </div>
                  </div>

                  {/* Top-left: Selection Checkbox */}
                  <div className="absolute top-2.5 left-2.5 z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(video.id);
                      }}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-cyan-500 text-black border border-cyan-300 shadow-md" 
                          : "bg-black/70 text-gray-400 hover:text-white border border-white/20"
                      }`}
                      title={isSelected ? "Deselect video" : "Select video"}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Square className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Top-right: Duration Tag */}
                  <span className="absolute top-2.5 right-2.5 text-[10px] font-mono font-bold bg-black/80 px-2 py-0.5 rounded-md text-gray-200 border border-white/10 z-20">
                    {formatDuration(video.duration)}
                  </span>

                  {/* Bottom-left: Resolution badge */}
                  {video.width && video.height && (
                    <span className="absolute bottom-2 left-2.5 text-[9px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded z-20">
                      {video.width}×{video.height}
                    </span>
                  )}

                  {/* Bottom-right: FPS badge */}
                  {video.fps && (
                    <span className="absolute bottom-2 right-2.5 text-[9px] font-mono text-gray-300 bg-black/80 px-1.5 py-0.5 rounded border border-white/10 z-20">
                      {video.fps} fps
                    </span>
                  )}
                </div>

                {/* Video Info Section */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                  <div className="space-y-1.5">
                    {/* Title */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 
                        onClick={() => onSelectVideo(video.id)}
                        className="text-xs font-bold text-white leading-snug line-clamp-1 hover:text-cyan-400 transition-colors cursor-pointer" 
                        title={video.filename}
                      >
                        {video.filename}
                      </h4>
                      <button
                        onClick={(e) => handleCopyId(e, video.id)}
                        className="text-gray-500 hover:text-cyan-400 p-0.5 transition-colors shrink-0"
                        title="Copy Video UUID"
                      >
                        {copiedId === video.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Metadata line: Size + Date */}
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                      <span>{formatFileSize(video.size_bytes)}</span>
                      <span>•</span>
                      <span>{video.uploaded_at ? new Date(video.uploaded_at).toLocaleDateString() : "Recent"}</span>
                    </div>

                    {/* Intelligence Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Crosshair className="w-3 h-3" />
                        {video.total_objects ?? 0} objs
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        <Film className="w-3 h-3" />
                        {video.total_frames ?? 0} frames
                      </span>

                      {video.total_transcripts > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          <MessageSquare className="w-3 h-3" />
                          {video.total_transcripts} lines
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Status Footer */}
                  <div className="pt-2.5 border-t border-white/[0.05] flex items-center justify-between gap-2">
                    {/* Status Pill */}
                    {video.status === "completed" ? (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Ready
                      </span>
                    ) : video.status === "failed" ? (
                      <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md font-mono font-bold">
                        Failed
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-yellow-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{video.progress || 0}%</span>
                      </div>
                    )}

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {onNavigate && (
                        <button
                          onClick={() => {
                            onSelectVideo(video.id);
                            onNavigate("search");
                          }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-cyan-400 border border-white/5 transition-all"
                          title="Search in Semantic Console"
                        >
                          <Search className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => onSelectVideo(video.id)}
                        className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 hover:border-cyan-400 transition-all flex items-center gap-1 cursor-pointer shadow-glow-cyan"
                      >
                        <span>Explore Timeline</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TABLE VIEW MODE                                       */}
      {/* ======================================================== */}
      {!isLoading && !error && viewMode === "table" && filteredAndSortedVideos.length > 0 && (
        <div className="glass-panel border-white/[0.05] bg-black/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-white/[0.02] border-b border-white/[0.06] text-gray-400 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-10">
                    <button
                      onClick={handleSelectAll}
                      className="text-gray-400 hover:text-white"
                      title="Select / Deselect All"
                    >
                      {selectedIds.size === filteredAndSortedVideos.length && filteredAndSortedVideos.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3">Video Stream</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Objects</th>
                  <th className="p-3">Frames</th>
                  <th className="p-3">Resolution</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {paginatedVideos.map((video) => {
                  const isSelected = selectedIds.has(video.id);
                  const thumbUrl = api.getVideoThumbnailUrl(video.id);

                  return (
                    <tr 
                      key={video.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isSelected ? "bg-cyan-950/20" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3">
                        <button
                          onClick={() => toggleSelect(video.id)}
                          className={`p-1 rounded transition-colors ${
                            isSelected ? "text-cyan-400" : "text-gray-500 hover:text-white"
                          }`}
                        >
                          {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>

                      {/* Video Stream + Mini Poster */}
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => onSelectVideo(video.id)}
                            className="w-16 h-10 rounded-lg overflow-hidden bg-black shrink-0 relative group cursor-pointer border border-white/10"
                          >
                            <img
                              src={thumbUrl}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              onError={(e) => { e.target.style.display = "none"; }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Play className="w-3 h-3 text-white fill-white" />
                            </div>
                          </div>
                          <div>
                            <div 
                              onClick={() => onSelectVideo(video.id)}
                              className="font-bold text-white hover:text-cyan-400 cursor-pointer line-clamp-1 max-w-xs" 
                              title={video.filename}
                            >
                              {video.filename}
                            </div>
                            <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                              <span>{video.uploaded_at ? new Date(video.uploaded_at).toLocaleDateString() : ""}</span>
                              <span>•</span>
                              <span 
                                onClick={(e) => handleCopyId(e, video.id)}
                                className="hover:text-cyan-400 cursor-pointer"
                                title="Click to copy UUID"
                              >
                                {video.id.slice(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="p-3 text-cyan-300 font-bold">
                        {formatDuration(video.duration)}
                      </td>

                      {/* Objects */}
                      <td className="p-3">
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {video.total_objects ?? 0}
                        </span>
                      </td>

                      {/* Frames */}
                      <td className="p-3 text-purple-300 font-bold">
                        {video.total_frames ?? 0}
                      </td>

                      {/* Resolution */}
                      <td className="p-3 text-gray-400 text-[11px]">
                        {video.width ? `${video.width}×${video.height}` : "Auto"}
                      </td>

                      {/* Size */}
                      <td className="p-3 text-gray-400 text-[11px]">
                        {formatFileSize(video.size_bytes)}
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        {video.status === "completed" ? (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                            Ready
                          </span>
                        ) : video.status === "failed" ? (
                          <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded font-bold">
                            Failed
                          </span>
                        ) : (
                          <span className="text-[10px] text-yellow-400 font-bold">
                            {video.progress || 0}%
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onNavigate && (
                            <button
                              onClick={() => {
                                onSelectVideo(video.id);
                                onNavigate("search");
                              }}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-cyan-400 border border-white/5"
                              title="Semantic Search"
                            >
                              <Search className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onSelectVideo(video.id)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold flex items-center gap-1"
                          >
                            <span>Open</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination / Load More Footer */}
      {!isLoading && !error && filteredAndSortedVideos.length > paginatedVideos.length && (
        <div className="flex items-center justify-center pt-4">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-mono text-xs font-bold transition-all flex items-center gap-2 hover:border-cyan-400/40"
          >
            <span>Load More Videos ({paginatedVideos.length} of {filteredAndSortedVideos.length})</span>
          </button>
        </div>
      )}
    </div>
  );
}
