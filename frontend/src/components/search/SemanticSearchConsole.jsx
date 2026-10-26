import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Search, Sparkles, Clock, Video, ArrowRight, Filter, Loader2, 
  AlertCircle, Eye, MessageSquare, FileText, Target, Play, 
  ExternalLink, Sliders, Check, Copy, History, X, Film, ChevronDown,
  Layers, Compass, Download, Maximize2, Tag, CheckCircle2, Shield,
  Share2, RefreshCw, BarChart2, Info, Grid, List, LayoutGrid,
  PlayCircle, Pause, ChevronLeft, ChevronRight, Hash, Bookmark,
  Split, SlidersHorizontal, Volume2, VolumeX, Flame
} from "lucide-react";
import api, { API_BASE_URL } from "../../services/api";

export default function SemanticSearchConsole({ selectedVideoId = null, onSelectVideo = null, onNavigate = null }) {
  // Primary Search States
  const [query, setQuery] = useState("");
  const [modality, setModality] = useState("ALL");
  const [targetVideoId, setTargetVideoId] = useState(selectedVideoId || "ALL");
  const [minSimilarity, setMinSimilarity] = useState(0.25);
  const [topK, setTopK] = useState(25);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);
  const [videoList, setVideoList] = useState([]);
  
  // Secondary In-Page Filtering & Views
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'grid' | 'timeline'
  const [sortBy, setSortBy] = useState("relevance"); // 'relevance' | 'timestamp' | 'confidence'
  const [resultVideoFilter, setResultVideoFilter] = useState("ALL");
  const [selectedTagFilter, setSelectedTagFilter] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [timeRangeFilter, setTimeRangeFilter] = useState({ min: 0, max: 9999 });
  const [showThumbnailBoxes, setShowThumbnailBoxes] = useState(true);

  // Card & Playback Interactions
  const [activePreviewIdx, setActivePreviewIdx] = useState(null);
  const [inspectedResult, setInspectedResult] = useState(null);
  const [inspectedIdx, setInspectedIdx] = useState(null);
  const [modalImgDims, setModalImgDims] = useState({ width: 1280, height: 720 });
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState(new Set());
  const [timelineHoverItem, setTimelineHoverItem] = useState(null);

  // Search History
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("videosense_search_history") || "[]");
    } catch {
      return ["car", "bus", "pedestrian", "traffic light", "motorcycle", "backpack", "umbrella"];
    }
  });

  const searchInputRef = useRef(null);

  // Categorized Smart Suggestions
  const categorizedSuggestions = {
    ALL: [
      { label: "Cars & Traffic", query: "car" },
      { label: "Buses & Transit", query: "bus" },
      { label: "Pedestrians", query: "person" },
      { label: "Traffic Lights", query: "traffic light" },
      { label: "Motorcycles / Scooters", query: "motorcycle" },
      { label: "Bicycles", query: "bicycle" },
      { label: "Backpacks", query: "backpack" },
      { label: "Umbrellas", query: "umbrella" }
    ],
    VEHICLES: [
      { label: "Passenger Cars", query: "car" },
      { label: "Transit Bus", query: "bus" },
      { label: "Heavy Truck", query: "truck" },
      { label: "Motorcycle", query: "motorcycle" },
      { label: "Bicycle", query: "bicycle" },
      { label: "Auto Rickshaw", query: "auto rickshaw" }
    ],
    PEOPLE: [
      { label: "Pedestrians", query: "person" },
      { label: "Crowd Groups", query: "crowd" },
      { label: "Man / Worker", query: "man" },
      { label: "Woman", query: "woman" },
      { label: "Child", query: "child" }
    ],
    OBJECTS: [
      { label: "Traffic Signals", query: "traffic light" },
      { label: "Travel Backpack", query: "backpack" },
      { label: "Street Umbrella", query: "umbrella" },
      { label: "Handbag", query: "handbag" },
      { label: "Shop Signs", query: "shop" }
    ],
    TEXT_SIGNS: [
      { label: "Storefront Signage", query: "associates" },
      { label: "Commercial Signs", query: "hotel" },
      { label: "Roadway Text", query: "street" },
      { label: "Banner Text", query: "pal" }
    ]
  };

  // Fetch available videos for target dropdown
  useEffect(() => {
    const loadVideos = async () => {
      try {
        const vids = await api.getVideos();
        setVideoList(vids || []);
      } catch (e) {
        console.error("Failed to load videos list for search:", e);
      }
    };
    loadVideos();
  }, []);

  // Sync if selectedVideoId changes externally
  useEffect(() => {
    if (selectedVideoId) {
      setTargetVideoId(selectedVideoId);
    }
  }, [selectedVideoId]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // '/' to focus search bar
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // 'Escape' closes inspection modal or active video preview
      if (e.key === "Escape") {
        if (inspectedResult) setInspectedResult(null);
        if (activePreviewIdx !== null) setActivePreviewIdx(null);
      }
      // Arrow keys in modal
      if (inspectedResult && inspectedIdx !== null) {
        if (e.key === "ArrowLeft" && inspectedIdx > 0) {
          stepModalFrame(-1);
        } else if (e.key === "ArrowRight" && inspectedIdx < filteredResults.length - 1) {
          stepModalFrame(1);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inspectedResult, inspectedIdx]);

  const saveHistory = (newQ) => {
    if (!newQ.trim()) return;
    const clean = newQ.trim();
    const updated = [clean, ...searchHistory.filter(h => h.toLowerCase() !== clean.toLowerCase())].slice(0, 10);
    setSearchHistory(updated);
    try {
      localStorage.setItem("videosense_search_history", JSON.stringify(updated));
    } catch {}
  };

  const clearHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem("videosense_search_history");
    } catch {}
  };

  const removeHistoryItem = (e, item) => {
    e.stopPropagation();
    const updated = searchHistory.filter(h => h !== item);
    setSearchHistory(updated);
    try {
      localStorage.setItem("videosense_search_history", JSON.stringify(updated));
    } catch {}
  };

  const triggerSearch = async (overrideQuery = null, overrideModality = null) => {
    const q = overrideQuery !== null ? overrideQuery : query;
    if (!q.trim()) return;
    setQuery(q);
    setIsSearching(true);
    setError(null);
    setSearched(true);
    setActivePreviewIdx(null);
    setSelectedCardIds(new Set());
    saveHistory(q);

    const activeMod = overrideModality !== null ? overrideModality : modality;

    try {
      const data = await api.searchVideos({
        query: q,
        videoId: targetVideoId === "ALL" ? null : targetVideoId,
        modality: activeMod === "ALL" ? null : activeMod,
        topK: topK
      });
      setResults(data || []);
      setResultVideoFilter("ALL");
      setSelectedTagFilter("ALL");
      setTimeRangeFilter({ min: 0, max: 9999 });
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to execute multimodal search. Please verify backend connection.");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Unique video IDs from current results for filter dropdown
  const resultVideos = useMemo(() => {
    const map = new Map();
    results.forEach(r => {
      if (r.video_id && !map.has(r.video_id)) {
        map.set(r.video_id, r.video_title || `Video ${r.video_id.slice(0, 8)}`);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [results]);

  // Unique detected object tags from current results for tag cloud filter
  const resultTags = useMemo(() => {
    const counts = {};
    results.forEach(r => {
      (r.detected_objects || []).forEach(obj => {
        const clean = obj.toLowerCase().trim();
        if (clean) counts[clean] = (counts[clean] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
  }, [results]);

  // Filtered & Sorted Results
  const filteredResults = useMemo(() => {
    let list = results.filter(r => (r.similarity_score || 0) >= minSimilarity);

    // Apply video filter if selected
    if (resultVideoFilter !== "ALL") {
      list = list.filter(r => r.video_id === resultVideoFilter);
    }

    // Apply detected tag filter
    if (selectedTagFilter !== "ALL") {
      list = list.filter(r => 
        (r.detected_objects || []).some(o => o.toLowerCase() === selectedTagFilter.toLowerCase()) ||
        (r.matched_labels || []).some(l => l.toLowerCase() === selectedTagFilter.toLowerCase())
      );
    }

    // Apply time range filter
    list = list.filter(r => {
      const t = r.timestamp || 0;
      return t >= timeRangeFilter.min && t <= timeRangeFilter.max;
    });

    // Sorting
    if (sortBy === "timestamp") {
      list = [...list].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    } else if (sortBy === "confidence") {
      list = [...list].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    } else {
      list = [...list].sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
    }

    return list;
  }, [results, minSimilarity, sortBy, resultVideoFilter, selectedTagFilter, timeRangeFilter]);

  // Maximum timestamp for timeline bar
  const maxVideoTimestamp = useMemo(() => {
    if (filteredResults.length === 0) return 60;
    const maxT = Math.max(...filteredResults.map(r => r.timestamp || 0));
    return Math.max(maxT, 10);
  }, [filteredResults]);

  // Modality Visual Badge Definitions
  const getModalityBadge = (mod) => {
    switch (mod) {
      case "OBJECT":
        return {
          label: "Visual Object",
          color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          dotColor: "bg-emerald-400",
          icon: Target
        };
      case "TEXT":
      case "OCR":
        return {
          label: "OCR Text Sign",
          color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
          dotColor: "bg-purple-400",
          icon: FileText
        };
      case "FRAME":
        return {
          label: "Visual Scene",
          color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
          dotColor: "bg-cyan-400",
          icon: Eye
        };
      case "AUDIO":
        return {
          label: "Dialogue",
          color: "bg-pink-500/10 text-pink-400 border-pink-500/30",
          dotColor: "bg-pink-400",
          icon: MessageSquare
        };
      default:
        return {
          label: "Hybrid Entity",
          color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
          dotColor: "bg-blue-400",
          icon: Sparkles
        };
    }
  };

  const copyTimestamp = (res, idx) => {
    const text = `Video: ${res.video_title || res.video_id} at ${res.timestamp?.toFixed(1) || 0}s (${res.matched_content})`;
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?tab=search&q=${encodeURIComponent(query)}&mod=${modality}&vid=${targetVideoId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handlePlayAtTimestamp = (res) => {
    if (onSelectVideo) {
      onSelectVideo(res.video_id, res.timestamp);
    }
    if (onNavigate) {
      onNavigate("player");
    }
  };

  const toggleSelectCard = (idx) => {
    const updated = new Set(selectedCardIds);
    if (updated.has(idx)) updated.delete(idx);
    else updated.add(idx);
    setSelectedCardIds(updated);
  };

  const selectAllCards = () => {
    if (selectedCardIds.size === filteredResults.length) {
      setSelectedCardIds(new Set());
    } else {
      setSelectedCardIds(new Set(filteredResults.map((_, i) => i)));
    }
  };

  const openInspectionModal = (res, idx) => {
    setInspectedResult(res);
    setInspectedIdx(idx);
  };

  const stepModalFrame = (direction) => {
    if (inspectedIdx === null) return;
    const nextIdx = inspectedIdx + direction;
    if (nextIdx >= 0 && nextIdx < filteredResults.length) {
      setInspectedIdx(nextIdx);
      setInspectedResult(filteredResults[nextIdx]);
    }
  };

  // Export Results
  const exportResults = (format = "csv") => {
    const targetSet = selectedCardIds.size > 0 
      ? filteredResults.filter((_, i) => selectedCardIds.has(i))
      : filteredResults;

    if (targetSet.length === 0) return;

    if (format === "json") {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(targetSet, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `videosense_search_${query || "results"}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else if (format === "markdown") {
      // Markdown Table Export
      let md = `# VideoSense AI Semantic Search Results\n\n`;
      md += `**Query:** \`${query}\` | **Total Matches:** ${targetSet.length} | **Target Scope:** ${targetVideoId}\n\n`;
      md += `| # | Video | Timestamp | Match Type | Confidence | Summary |\n`;
      md += `|---|-------|-----------|------------|------------|---------|\n`;
      targetSet.forEach((r, i) => {
        md += `| ${i + 1} | ${r.video_title || r.video_id} | ${r.timestamp}s | ${r.match_type || r.modality} | ${Math.round((r.similarity_score || 0) * 100)}% | ${r.matched_content} |\n`;
      });
      const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
      const link = document.createElement("a");
      link.setAttribute("href", dataStr);
      link.setAttribute("download", `videosense_search_${query || "results"}.md`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else {
      // CSV Export
      const headers = ["Rank", "Video Title", "Timestamp (s)", "Match Type", "Similarity %", "Content", "Visible Objects"];
      const rows = targetSet.map((r, i) => [
        i + 1,
        `"${(r.video_title || r.video_id || "").replace(/"/g, '""')}"`,
        r.timestamp ?? 0,
        `"${r.match_type || r.modality || ""}"`,
        Math.round((r.similarity_score || 0) * 100),
        `"${(r.matched_content || "").replace(/"/g, '""')}"`,
        `"${(r.detected_objects || []).join("; ").replace(/"/g, '""')}"`
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `videosense_search_${query || "results"}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  // Highlight query term in matched text
  const renderHighlightedContent = (text, qTerm) => {
    if (!text || !qTerm) return text;
    const parts = text.split(new RegExp(`(${qTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === qTerm.toLowerCase() ? (
        <span key={i} className="text-cyan-300 font-bold bg-cyan-500/20 px-1 py-0.5 rounded border border-cyan-500/30">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none text-gray-200">
      
      {/* =========================================================================
          SECTION 1: HEADER & LIVE ENGINE METRICS
         ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 border-white/[0.06] shadow-xl">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 shadow-glow">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-3">
                Multimodal Semantic Search
                <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold">
                  YOLO + OCR + CLIP + Whisper
                </span>
              </h1>
              <p className="text-gray-400 text-xs mt-0.5">
                Query across visual detections, on-screen text, dense video embeddings, and spoken dialogues in real-time.
              </p>
            </div>
          </div>
        </div>

        {/* Global Quick Action Tools */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <span className="text-[11px] font-mono text-gray-400 px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-cyan-400" />
            <span>{videoList.length} Videos Indexed</span>
          </span>

          <button
            onClick={copyShareLink}
            className="btn-glass px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 text-gray-300 hover:text-white transition-all cursor-pointer"
            title="Copy shareable search link"
          >
            {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copiedShare ? "Link Copied" : "Share"}</span>
          </button>

          {filteredResults.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => exportResults("csv")}
                className="btn-glass px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 text-gray-300 hover:text-white transition-all cursor-pointer"
                title="Export results as CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => exportResults("json")}
                className="btn-glass px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 text-gray-300 hover:text-white transition-all cursor-pointer"
                title="Export results as JSON"
              >
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>JSON</span>
              </button>
              <button
                onClick={() => exportResults("markdown")}
                className="btn-glass px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 text-gray-300 hover:text-white transition-all cursor-pointer"
                title="Export results as Markdown Summary"
              >
                <Copy className="w-3.5 h-3.5 text-blue-400" />
                <span>MD</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: COMMAND CARD (SEARCH BAR + DUAL-TIER FILTER SYSTEM)
         ========================================================================= */}
      <div className="glass-panel p-6 border-white/[0.06] space-y-5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Large Prominent Search Bar */}
        <div className="relative flex items-center bg-black/60 border border-white/10 hover:border-cyan-500/40 focus-within:border-cyan-500 rounded-2xl transition-all shadow-inner px-4 py-3.5">
          <Search className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && triggerSearch()}
            placeholder="Type any visual object (car, person, bus, motorcycle), OCR text, or scene description... (Press '/' to focus)"
            className="bg-transparent border-none text-sm text-white placeholder-gray-500 focus:outline-none flex-1 font-medium"
          />
          {query && (
            <button 
              onClick={() => setQuery("")}
              className="text-gray-500 hover:text-white mr-3 transition-colors p-1"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => triggerSearch()}
            disabled={isSearching}
            className="btn-gradient px-6 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 shrink-0 shadow-lg cursor-pointer"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Search</span>
            <kbd className="hidden sm:inline-block text-[10px] bg-black/30 px-1.5 py-0.5 rounded border border-white/20 font-mono font-normal">
              ⏎
            </kbd>
          </button>
        </div>

        {/* -----------------------------------------------------------------------
            TIER 1 CONTROLS: TARGET SCOPE, MODALITY CHANNELS, & VIEW MODES
           ----------------------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-1 border-t border-white/[0.04]">
          {/* Target Video Scope Dropdown (4 Cols) */}
          <div className="md:col-span-4 flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
              <Film className="w-3.5 h-3.5 text-cyan-400" /> Scope:
            </span>
            <div className="relative flex-1">
              <select
                value={targetVideoId}
                onChange={(e) => setTargetVideoId(e.target.value)}
                className="w-full appearance-none bg-black/50 border border-white/10 hover:border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 pr-8 cursor-pointer truncate"
              >
                <option value="ALL">🌐 All Videos (Global VideoSense Index)</option>
                {videoList.map((v) => (
                  <option key={v.id} value={v.id}>
                    🎬 {v.filename || `Video ${v.id.slice(0, 8)}`} {v.duration ? `(${v.duration.toFixed(0)}s)` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Modality Channels (6 Cols) */}
          <div className="md:col-span-5 flex flex-wrap items-center gap-1 bg-black/50 border border-white/5 p-1 rounded-xl">
            {[
              { id: "ALL", label: "Omni-Modal", icon: Sparkles },
              { id: "OBJECT", label: "Objects", icon: Target },
              { id: "TEXT", label: "Text Signs", icon: FileText },
              { id: "FRAME", label: "Scenes", icon: Eye },
              { id: "AUDIO", label: "Dialogue", icon: MessageSquare }
            ].map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setModality(m.id);
                    if (query.trim()) triggerSearch(query, m.id);
                  }}
                  className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    modality === m.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-glow"
                      : "text-gray-400 hover:text-gray-200 border border-transparent"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* View Mode Switcher (3 Cols) */}
          <div className="md:col-span-3 flex items-center justify-end gap-1 bg-black/40 border border-white/5 p-1 rounded-xl self-start md:self-auto">
            <span className="text-[10px] font-mono text-gray-500 px-2 font-bold uppercase">View:</span>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg text-xs transition-all flex items-center gap-1 ${
                viewMode === "list" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-gray-400 hover:text-white"
              }`}
              title="Detailed List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs transition-all flex items-center gap-1 ${
                viewMode === "grid" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-gray-400 hover:text-white"
              }`}
              title="Visual Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`p-1.5 rounded-lg text-xs transition-all flex items-center gap-1 ${
                viewMode === "timeline" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-gray-400 hover:text-white"
              }`}
              title="Chronological Storyboard View"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            TIER 2 CONTROLS: PRECISION SLIDER, RETICLE TOGGLE, & RESULTS LIMIT
           ----------------------------------------------------------------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-2 border-t border-white/[0.04]">
          {/* Relevance Threshold Slider (5 Cols) */}
          <div className="sm:col-span-5 flex items-center gap-3 bg-black/40 border border-white/5 rounded-xl px-3.5 py-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-center text-[10px] font-semibold text-gray-400">
                <span>Confidence / Match Gate</span>
                <span className="text-cyan-400 font-bold font-mono">
                  {Math.round(minSimilarity * 100)}%
                  <span className="text-gray-500 font-normal ml-1">
                    ({minSimilarity >= 0.6 ? "Strict" : minSimilarity >= 0.35 ? "Balanced" : "Permissive"})
                  </span>
                </span>
              </div>
              <input
                type="range"
                min="0.15"
                max="0.85"
                step="0.05"
                value={minSimilarity}
                onChange={(e) => setMinSimilarity(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg block"
              />
            </div>
          </div>

          {/* Results Top-K Limit (3 Cols) */}
          <div className="sm:col-span-3 flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl px-3 py-2">
            <Hash className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="text-[11px] font-semibold text-gray-400 whitespace-nowrap">Limit:</span>
            <select
              value={topK}
              onChange={(e) => {
                const k = parseInt(e.target.value);
                setTopK(k);
                if (query.trim()) triggerSearch(query, modality);
              }}
              className="bg-transparent border-none text-xs font-bold text-white focus:outline-none cursor-pointer flex-1"
            >
              <option value="10">10 results</option>
              <option value="25">25 results</option>
              <option value="50">50 results</option>
              <option value="100">100 results</option>
            </select>
          </div>

          {/* Bounding Box Reticles Toggle (4 Cols) */}
          <div className="sm:col-span-4 flex items-center justify-start sm:justify-end">
            <label className="flex items-center gap-2.5 bg-black/40 border border-white/5 hover:border-cyan-500/30 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-300 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={showThumbnailBoxes}
                onChange={(e) => setShowThumbnailBoxes(e.target.checked)}
                className="rounded accent-cyan-400 w-4 h-4 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 text-[11px]">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                <span>Detection Reticles</span>
              </span>
            </label>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            CATEGORIZED EXPLORATION CHIPS
           ----------------------------------------------------------------------- */}
        <div className="pt-2 border-t border-white/[0.04] space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono mr-1">
              Explore:
            </span>
            {[
              { id: "ALL", label: "Popular" },
              { id: "VEHICLES", label: "🚗 Vehicles" },
              { id: "PEOPLE", label: "👥 People" },
              { id: "OBJECTS", label: "📦 Items" },
              { id: "TEXT_SIGNS", label: "📝 Signboards" }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedCategory === cat.id 
                    ? "bg-white/15 text-white font-bold border border-white/10" 
                    : "text-gray-400 hover:text-gray-200 bg-black/30 border border-white/5"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(categorizedSuggestions[selectedCategory] || categorizedSuggestions.ALL).map((s) => (
              <button
                key={s.label}
                onClick={() => triggerSearch(s.query)}
                className="text-[10px] font-medium bg-white/5 border border-white/5 hover:border-cyan-500/40 hover:text-cyan-300 px-3 py-1 rounded-full text-gray-400 transition-all font-mono flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Tag className="w-2.5 h-2.5 text-gray-500" />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            SEARCH HISTORY WITH INDIVIDUAL REMOVAL
           ----------------------------------------------------------------------- */}
        {searchHistory.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.04] text-[10px] text-gray-500">
            <div className="flex flex-wrap items-center gap-2">
              <History className="w-3 h-3 text-gray-500" />
              <span className="uppercase tracking-wider font-mono font-semibold">Recent:</span>
              <div className="flex flex-wrap gap-1.5">
                {searchHistory.map((h, i) => (
                  <div
                    key={i}
                    onClick={() => triggerSearch(h)}
                    className="inline-flex items-center gap-1 bg-black/40 border border-white/5 hover:border-cyan-500/30 px-2 py-0.5 rounded-md text-gray-300 hover:text-cyan-300 transition-colors cursor-pointer group"
                  >
                    <span>{h}</span>
                    <button
                      onClick={(e) => removeHistoryItem(e, h)}
                      className="text-gray-600 hover:text-red-400 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove from history"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={clearHistory}
              className="text-gray-600 hover:text-red-400 text-[9px] uppercase font-mono transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 3: ERROR & LOADING STATES
         ========================================================================= */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isSearching && (
        <div className="glass-panel p-16 flex flex-col items-center justify-center text-center border-white/5 space-y-4 shadow-2xl">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
            <Sparkles className="w-4 h-4 text-cyan-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div>
            <p className="text-base font-bold text-white">Synthesizing Multimodal Knowledge Base...</p>
            <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
              Correlating YOLOv11 bounding coordinates, EasyOCR signages, spoken transcripts, and CLIP visual vectors.
            </p>
          </div>
        </div>
      )}

      {/* No Results */}
      {!isSearching && searched && !error && filteredResults.length === 0 && (
        <div className="glass-panel p-12 text-center border-white/5 space-y-3 shadow-xl">
          <Search className="w-12 h-12 text-gray-600 mx-auto" />
          <p className="text-base font-bold text-white">No semantic matches found for "{query}"</p>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Try reducing the Match Gate threshold (currently {Math.round(minSimilarity * 100)}%), clearing active tag filters, or selecting one of the suggested search pills above.
          </p>
        </div>
      )}

      {/* =========================================================================
          SECTION 4: RESULTS CONTAINER WITH TIMELINE HEATMAP & MULTI-VIEW MODES
         ========================================================================= */}
      {!isSearching && filteredResults.length > 0 && (
        <div className="space-y-4">
          
          {/* -------------------------------------------------------------------
              FEATURE A: INTERACTIVE MATCH TIMELINE HEATMAP / SCRUBBER BAR
             ------------------------------------------------------------------- */}
          <div className="glass-panel p-4 border-white/[0.05] space-y-2 shadow-lg">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Match Distribution Across Timeline</span>
              </span>
              <span className="text-[11px] font-mono text-gray-400">
                Time Span: <strong className="text-white">0.0s – {maxVideoTimestamp.toFixed(1)}s</strong>
              </span>
            </div>

            {/* Interactive Timeline Track */}
            <div className="relative h-6 bg-black/60 rounded-xl border border-white/10 overflow-hidden flex items-center px-2 group">
              {/* Timeline background track guide */}
              <div className="absolute inset-x-2 h-1 bg-white/10 rounded-full" />

              {/* Match Markers */}
              {filteredResults.map((r, i) => {
                const badge = getModalityBadge(r.modality);
                const percent = Math.min(100, Math.max(1, ((r.timestamp || 0) / maxVideoTimestamp) * 100));

                return (
                  <button
                    key={i}
                    onClick={() => {
                      const element = document.getElementById(`result-card-${i}`);
                      element?.scrollIntoView({ behavior: "smooth", block: "center" });
                      element?.classList.add("ring-2", "ring-cyan-400");
                      setTimeout(() => element?.classList.remove("ring-2", "ring-cyan-400"), 1500);
                    }}
                    onMouseEnter={() => setTimelineHoverItem(r)}
                    onMouseLeave={() => setTimelineHoverItem(null)}
                    style={{ left: `${percent}%` }}
                    className={`absolute -translate-x-1/2 w-2.5 h-4 rounded-full ${badge.dotColor} hover:scale-150 hover:z-20 transition-all cursor-pointer shadow-md`}
                    title={`${r.video_title || "Video"} @ ${r.timestamp?.toFixed(1)}s: ${r.match_type || r.modality}`}
                  />
                );
              })}
            </div>

            {/* Scrubber Tooltip Preview on Hover */}
            {timelineHoverItem && (
              <div className="text-[11px] font-mono text-cyan-300 flex items-center justify-between bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                <span>⏱️ Keyframe at <strong>{timelineHoverItem.timestamp?.toFixed(1)}s</strong></span>
                <span className="text-gray-400 truncate max-w-sm">{timelineHoverItem.matched_content}</span>
                <span className="text-emerald-400 font-bold">{Math.round((timelineHoverItem.similarity_score || 0) * 100)}% Match</span>
              </div>
            )}
          </div>

          {/* -------------------------------------------------------------------
              FEATURE B: DETECTED ENTITY TAG CLOUD CO-OCCURRENCE FILTER
             ------------------------------------------------------------------- */}
          {resultTags.length > 0 && (
            <div className="glass-panel p-3 border-white/[0.04] flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                <Tag className="w-3 h-3 text-cyan-400" /> Filter Tag:
              </span>

              <button
                onClick={() => setSelectedTagFilter("ALL")}
                className={`text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedTagFilter === "ALL"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold"
                    : "bg-black/40 text-gray-400 hover:text-white border border-white/5"
                }`}
              >
                All Entities ({results.length})
              </button>

              {resultTags.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTagFilter(selectedTagFilter === tag ? "ALL" : tag)}
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedTagFilter === tag
                      ? "bg-cyan-500 text-black font-bold shadow-glow"
                      : "bg-black/40 text-gray-300 hover:border-cyan-500/30 border border-white/5"
                  }`}
                >
                  <span className="capitalize">{tag}</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded ${selectedTagFilter === tag ? "bg-black/30 text-white" : "bg-white/10 text-gray-400"}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* -------------------------------------------------------------------
              FEATURE C: RESULTS SUMMARY & BATCH ACTIONS TOOLBAR
             ------------------------------------------------------------------- */}
          <div className="glass-panel p-3.5 border-white/[0.04] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={selectAllCards}
                className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedCardIds.size === filteredResults.length && filteredResults.length > 0}
                  onChange={selectAllCards}
                  className="rounded accent-cyan-400 w-3.5 h-3.5 cursor-pointer"
                />
                <span>{selectedCardIds.size > 0 ? `${selectedCardIds.size} Selected` : "Select All"}</span>
              </button>

              <span className="text-gray-600">|</span>

              <div className="flex items-center gap-1.5 text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-white">
                  {filteredResults.length} Matched Keyframes
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">
                  Peak match: <strong className="text-cyan-400">{Math.round((filteredResults[0]?.similarity_score || 0) * 100)}%</strong>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Secondary Video Filter Dropdown if multi-video */}
              {resultVideos.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 text-[11px]">Video:</span>
                  <select
                    value={resultVideoFilter}
                    onChange={(e) => setResultVideoFilter(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="ALL">All ({results.length})</option>
                    {resultVideos.map(v => (
                      <option key={v.id} value={v.id}>{v.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sorting Pills */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                <span className="text-gray-500 text-[10px] px-1 font-semibold">Sort:</span>
                <button
                  onClick={() => setSortBy("relevance")}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                    sortBy === "relevance" ? "bg-cyan-500/20 text-cyan-300" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Relevance
                </button>
                <button
                  onClick={() => setSortBy("timestamp")}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                    sortBy === "timestamp" ? "bg-cyan-500/20 text-cyan-300" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Timestamp
                </button>
                <button
                  onClick={() => setSortBy("confidence")}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                    sortBy === "confidence" ? "bg-cyan-500/20 text-cyan-300" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Confidence
                </button>
              </div>
            </div>
          </div>

          {/* ===================================================================
              VIEW MODE 1: DETAILED LIST VIEW (PERFECTLY ALIGNED)
             =================================================================== */}
          {viewMode === "list" && (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredResults.map((res, idx) => {
                const badge = getModalityBadge(res.modality);
                const BadgeIcon = badge.icon;
                const simPercent = Math.round((res.similarity_score || 0) * 100);
                const isPreviewActive = activePreviewIdx === idx;
                const isSelected = selectedCardIds.has(idx);

                return (
                  <div 
                    id={`result-card-${idx}`}
                    key={idx}
                    className={`glass-panel p-4 border-white/[0.05] hover:border-cyan-500/30 hover:bg-white/[0.015] transition-all flex flex-col md:flex-row items-start justify-between gap-4 group ${
                      isSelected ? "border-cyan-500/40 bg-cyan-500/[0.02]" : ""
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start gap-4 w-full md:w-auto flex-1">
                      
                      {/* Checkbox for batch selection */}
                      <div className="pt-1 hidden sm:block">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectCard(idx)}
                          className="rounded accent-cyan-400 w-3.5 h-3.5 cursor-pointer"
                        />
                      </div>

                      {/* Thumbnail Container / Inline Video Player Preview */}
                      <div className="relative w-full sm:w-52 aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0 shadow-lg group-hover:border-cyan-500/40 transition-colors">
                        {isPreviewActive ? (
                          <div className="w-full h-full relative bg-black">
                            <video
                              src={`${API_BASE_URL}/api/v1/videos/${res.video_id}/stream#t=${Math.max(0, (res.timestamp || 0) - 1)}`}
                              autoPlay
                              controls
                              playsInline
                              className="w-full h-full object-contain"
                            />
                            <button
                              onClick={() => setActivePreviewIdx(null)}
                              className="absolute top-1 right-1 bg-black/80 hover:bg-red-500/80 p-1 rounded-md text-white z-20 cursor-pointer"
                              title="Stop Preview"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => openInspectionModal(res, idx)}
                            className="w-full h-full cursor-pointer relative"
                          >
                            {res.thumbnail_url ? (
                              <img 
                                src={`${API_BASE_URL}${res.thumbnail_url}`} 
                                alt={`Frame at ${res.timestamp}s`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            
                            {/* Fallback */}
                            <div 
                              className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-2 text-center"
                              style={{ display: res.thumbnail_url ? 'none' : 'flex' }}
                            >
                              <Video className="w-6 h-6 text-gray-600 mb-1" />
                              <span className="text-[10px] font-mono">Frame #{res.frame_number || 1}</span>
                            </div>

                            {/* Bounding box reticles indicator */}
                            {showThumbnailBoxes && res.bounding_boxes && res.bounding_boxes.length > 0 && (
                              <div className="absolute top-1.5 right-1.5 bg-black/80 backdrop-blur-xs text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-cyan-500/30 text-cyan-400 flex items-center gap-1 z-10">
                                <Target className="w-2.5 h-2.5" />
                                <span>{res.bounding_boxes.length} Box{res.bounding_boxes.length > 1 ? "es" : ""}</span>
                              </div>
                            )}

                            {/* Floating Timestamp */}
                            <div className="absolute bottom-1.5 left-1.5 bg-black/80 backdrop-blur-xs text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-white/10 text-white flex items-center gap-1 z-10">
                              <Clock className="w-3 h-3 text-cyan-400" />
                              <span>{res.timestamp !== undefined ? `${res.timestamp.toFixed(1)}s` : "0.0s"}</span>
                            </div>

                            {/* Rank Tag */}
                            <div className="absolute top-1.5 left-1.5 bg-black/80 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded text-gray-400 border border-white/10 z-10">
                              #{idx + 1}
                            </div>

                            {/* Quick Play Hover Trigger */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                              <span className="bg-black/90 px-2 py-1 rounded text-[10px] font-semibold text-white flex items-center gap-1 shadow-md hover:text-cyan-400">
                                <Maximize2 className="w-3 h-3" /> Inspect
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Content Details Block */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Modality Badge */}
                          <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 ${badge.color}`}>
                            <BadgeIcon className="w-3 h-3" />
                            <span>{res.match_type || badge.label}</span>
                          </span>

                          {/* Similarity Match Badge */}
                          <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" />
                            {simPercent}% Match
                          </span>

                          {/* Confidence */}
                          {res.confidence && (
                            <span className="text-[10px] font-mono font-semibold text-gray-400 bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full">
                              Conf: {(res.confidence * 100).toFixed(0)}%
                            </span>
                          )}

                          {/* Video Title */}
                          <span className="text-[11px] font-semibold text-gray-400 truncate max-w-xs" title={res.video_title}>
                            🎬 {res.video_title || `Video ${res.video_id?.slice(0, 8)}`}
                          </span>
                        </div>

                        {/* Matched Content Explanation */}
                        <p className="text-xs text-gray-200 leading-relaxed font-medium">
                          {renderHighlightedContent(res.matched_content, query)}
                        </p>

                        {/* Detected Entities Tags in this Frame */}
                        {res.detected_objects && res.detected_objects.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-mono">
                              Entities:
                            </span>
                            {res.detected_objects.map((obj, i) => {
                              const isMatch = obj.toLowerCase().includes(query.toLowerCase());
                              return (
                                <button
                                  key={i}
                                  onClick={() => triggerSearch(obj)}
                                  className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                                    isMatch 
                                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30 shadow-xs" 
                                      : "bg-white/5 border-white/5 text-gray-300 hover:border-cyan-500/30"
                                  }`}
                                  title={`Search for '${obj}'`}
                                >
                                  {obj}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Standardized Aligned Action Column */}
                    <div className="flex md:flex-col items-stretch gap-2 w-full md:w-44 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5 justify-end">
                      {/* Seek to Full Player */}
                      <button 
                        onClick={() => handlePlayAtTimestamp(res)}
                        className="btn-gradient py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        title="Open video in Full Player at this exact second"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Seek to {res.timestamp !== undefined ? `${res.timestamp.toFixed(1)}s` : "0.0s"}</span>
                      </button>

                      {/* Quick Inline Preview & Inspect Row */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => setActivePreviewIdx(isPreviewActive ? null : idx)}
                          className={`btn-glass py-1.5 px-2 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer ${
                            isPreviewActive ? "text-cyan-400 border-cyan-500/40 bg-cyan-500/10" : "text-gray-300 hover:text-white"
                          }`}
                          title="Play short video preview inline"
                        >
                          {isPreviewActive ? <Pause className="w-3 h-3" /> : <PlayCircle className="w-3 h-3 text-cyan-400" />}
                          <span>{isPreviewActive ? "Stop" : "Preview"}</span>
                        </button>

                        <button 
                          onClick={() => openInspectionModal(res, idx)}
                          className="btn-glass py-1.5 px-2 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1.5 text-gray-300 hover:text-white cursor-pointer"
                          title="Inspect bounding reticles and metadata"
                        >
                          <Eye className="w-3 h-3 text-purple-400" />
                          <span>Inspect</span>
                        </button>
                      </div>

                      {/* Secondary Action Row: Copy & Reverse Find */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button 
                          onClick={() => copyTimestamp(res, idx)}
                          className="btn-glass py-1.5 px-2 text-[10px] font-semibold rounded-xl flex items-center justify-center gap-1 text-gray-400 hover:text-white cursor-pointer"
                          title="Copy timestamp note"
                        >
                          {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedIdx === idx ? "Copied" : "Copy"}</span>
                        </button>

                        <button 
                          onClick={() => triggerSearch(res.matched_labels?.[0] || res.detected_objects?.[0] || query)}
                          className="btn-glass py-1.5 px-2 text-[10px] font-semibold rounded-xl flex items-center justify-center gap-1 text-gray-400 hover:text-cyan-300 cursor-pointer"
                          title="Find similar scenes using primary detected label"
                        >
                          <Compass className="w-3 h-3 text-cyan-400" />
                          <span>Similar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ===================================================================
              VIEW MODE 2: VISUAL GRID VIEW (MODERN SCENE CARDS)
             =================================================================== */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResults.map((res, idx) => {
                const badge = getModalityBadge(res.modality);
                const BadgeIcon = badge.icon;
                const simPercent = Math.round((res.similarity_score || 0) * 100);
                const isPreviewActive = activePreviewIdx === idx;

                return (
                  <div
                    id={`result-card-${idx}`}
                    key={idx}
                    className="glass-panel border-white/[0.05] hover:border-cyan-500/30 hover:bg-white/[0.015] transition-all flex flex-col justify-between overflow-hidden group shadow-lg"
                  >
                    {/* Hero Thumbnail / Video Player */}
                    <div className="relative aspect-video w-full bg-black/60 overflow-hidden border-b border-white/10">
                      {isPreviewActive ? (
                        <div className="w-full h-full relative bg-black">
                          <video
                            src={`${API_BASE_URL}/api/v1/videos/${res.video_id}/stream#t=${Math.max(0, (res.timestamp || 0) - 1)}`}
                            autoPlay
                            controls
                            playsInline
                            className="w-full h-full object-contain"
                          />
                          <button
                            onClick={() => setActivePreviewIdx(null)}
                            className="absolute top-1.5 right-1.5 bg-black/80 hover:bg-red-500/80 p-1 rounded-md text-white z-20 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => openInspectionModal(res, idx)}
                          className="w-full h-full cursor-pointer relative"
                        >
                          {res.thumbnail_url ? (
                            <img 
                              src={`${API_BASE_URL}${res.thumbnail_url}`} 
                              alt={`Frame at ${res.timestamp}s`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}

                          <div 
                            className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-2 text-center"
                            style={{ display: res.thumbnail_url ? 'none' : 'flex' }}
                          >
                            <Video className="w-8 h-8 text-gray-600 mb-1" />
                            <span className="text-[10px] font-mono">Frame #{res.frame_number || 1}</span>
                          </div>

                          {/* Floating Top Left Badge */}
                          <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                            <span className="bg-black/80 text-[10px] font-mono font-bold px-2 py-0.5 rounded text-white border border-white/10">
                              #{idx + 1}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${badge.color}`}>
                              <BadgeIcon className="w-2.5 h-2.5" />
                              <span>{res.match_type || badge.label}</span>
                            </span>
                          </div>

                          {/* Floating Top Right Match Meter */}
                          <div className="absolute top-2 right-2 bg-black/80 text-[10px] font-mono font-bold text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30 flex items-center gap-1 z-10">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>{simPercent}%</span>
                          </div>

                          {/* Floating Bottom Left Timestamp */}
                          <div className="absolute bottom-2 left-2 bg-black/80 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-white/10 text-white flex items-center gap-1 z-10">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span>{res.timestamp !== undefined ? `${res.timestamp.toFixed(1)}s` : "0.0s"}</span>
                          </div>

                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                            <span className="bg-black/90 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1 shadow-md">
                              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" /> Inspect
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                          <span className="truncate max-w-[180px] font-semibold" title={res.video_title}>
                            🎬 {res.video_title || `Video ${res.video_id?.slice(0, 8)}`}
                          </span>
                          {res.confidence && (
                            <span className="font-mono text-gray-500">
                              Conf: {(res.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-200 line-clamp-2 font-medium">
                          {renderHighlightedContent(res.matched_content, query)}
                        </p>
                      </div>

                      {/* Tag row */}
                      {res.detected_objects && res.detected_objects.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          {res.detected_objects.slice(0, 4).map((obj, i) => (
                            <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-gray-300">
                              {obj}
                            </span>
                          ))}
                          {res.detected_objects.length > 4 && (
                            <span className="text-[9px] font-mono text-gray-500">
                              +{res.detected_objects.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Card Bottom Actions */}
                      <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handlePlayAtTimestamp(res)}
                          className="btn-gradient py-1.5 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Seek</span>
                        </button>
                        <button
                          onClick={() => setActivePreviewIdx(isPreviewActive ? null : idx)}
                          className={`btn-glass py-1.5 px-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 cursor-pointer ${
                            isPreviewActive ? "text-cyan-400 border-cyan-500/40 bg-cyan-500/10" : "text-gray-300 hover:text-white"
                          }`}
                        >
                          {isPreviewActive ? <Pause className="w-3 h-3" /> : <PlayCircle className="w-3 h-3 text-cyan-400" />}
                          <span>{isPreviewActive ? "Stop" : "Preview"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ===================================================================
              VIEW MODE 3: CHRONOLOGICAL STORYBOARD VIEW
             =================================================================== */}
          {viewMode === "timeline" && (
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:inset-y-0 before:left-3 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500/50 before:via-purple-500/30 before:to-transparent">
              {filteredResults.map((res, idx) => {
                const badge = getModalityBadge(res.modality);
                const BadgeIcon = badge.icon;
                const simPercent = Math.round((res.similarity_score || 0) * 100);

                return (
                  <div 
                    id={`result-card-${idx}`}
                    key={idx} 
                    className="relative flex flex-col sm:flex-row items-start gap-4 glass-panel p-4 border-white/[0.05] hover:border-cyan-500/30 transition-all shadow-md group"
                  >
                    {/* Storyboard Node Marker */}
                    <div className="absolute -left-6 sm:-left-8 top-5 -translate-x-1/2 w-4 h-4 rounded-full bg-black border-2 border-cyan-400 flex items-center justify-center shadow-glow">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    </div>

                    {/* Thumbnail */}
                    <div 
                      onClick={() => openInspectionModal(res, idx)}
                      className="relative w-full sm:w-44 aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0 shadow-lg cursor-pointer"
                    >
                      {res.thumbnail_url ? (
                        <img 
                          src={`${API_BASE_URL}${res.thumbnail_url}`} 
                          alt={`Frame at ${res.timestamp}s`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : null}
                      <div className="absolute bottom-1.5 left-1.5 bg-black/80 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded text-white flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-cyan-400" />
                        <span>{res.timestamp?.toFixed(1)}s</span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${badge.color}`}>
                          <BadgeIcon className="w-2.5 h-2.5" />
                          <span>{res.match_type || badge.label}</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                          {simPercent}% Match
                        </span>
                        <span className="text-xs text-gray-400 font-semibold truncate max-w-xs">
                          {res.video_title}
                        </span>
                      </div>

                      <p className="text-xs text-gray-200">
                        {renderHighlightedContent(res.matched_content, query)}
                      </p>
                    </div>

                    {/* Seek Button */}
                    <button
                      onClick={() => handlePlayAtTimestamp(res)}
                      className="btn-gradient py-2 px-3 text-xs font-bold rounded-xl flex items-center gap-1.5 self-end sm:self-center shrink-0 cursor-pointer shadow-md"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Seek to {res.timestamp?.toFixed(1)}s</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 5: ENHANCED VISUAL INSPECTION MODAL DIALOG
         ========================================================================= */}
      {inspectedResult && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-4xl w-full border-cyan-500/30 overflow-hidden shadow-2xl space-y-4 p-6 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Target className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  Keyframe Reticle Inspection
                </h3>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                  {inspectedResult.timestamp?.toFixed(1) || 0}s (Frame #{inspectedResult.frame_number || 1})
                </span>
              </div>

              {/* Navigation & Close */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => stepModalFrame(-1)}
                  disabled={inspectedIdx === 0}
                  className="btn-glass p-1.5 rounded-lg text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous Keyframe (Left Arrow)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-gray-400">
                  {(inspectedIdx ?? 0) + 1} / {filteredResults.length}
                </span>
                <button
                  onClick={() => stepModalFrame(1)}
                  disabled={inspectedIdx === filteredResults.length - 1}
                  className="btn-glass p-1.5 rounded-lg text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Next Keyframe (Right Arrow)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button 
                  onClick={() => setInspectedResult(null)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image Display with Interactive Precision Reticles */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center p-2">
              {inspectedResult.thumbnail_url ? (
                <div className="relative inline-block max-h-full max-w-full">
                  <img 
                    src={`${API_BASE_URL}${inspectedResult.thumbnail_url}`} 
                    alt="Inspected keyframe"
                    onLoad={(e) => {
                      if (e.target.naturalWidth && e.target.naturalHeight) {
                        setModalImgDims({
                          width: e.target.naturalWidth,
                          height: e.target.naturalHeight
                        });
                      }
                    }}
                    className="max-h-[420px] w-auto max-w-full object-contain block select-none pointer-events-none rounded-lg shadow-2xl"
                  />
                  {/* Bounding box overlays strictly mapped to image bounds */}
                  <div className="absolute inset-0 pointer-events-none overflow-visible">
                    {inspectedResult.bounding_boxes?.map((b, i) => {
                      const frameW = modalImgDims.width || 1280;
                      const frameH = modalImgDims.height || 720;
                      const box = b.box || [0, 0, 0, 0];
                      const left = Math.max(0, (box[0] / frameW) * 100);
                      const top = Math.max(0, (box[1] / frameH) * 100);
                      const width = Math.min(100 - left, ((box[2] - box[0]) / frameW) * 100);
                      const height = Math.min(100 - top, ((box[3] - box[1]) / frameH) * 100);

                      return (
                        <div
                          key={i}
                          style={{
                            left: `${left}%`,
                            top: `${top}%`,
                            width: `${width}%`,
                            height: `${height}%`,
                          }}
                          className="absolute border-2 border-cyan-400 bg-cyan-400/20 shadow-glow rounded-xs pointer-events-auto group/box hover:bg-cyan-400/35 hover:scale-[1.01] transition-all"
                        >
                          {/* Corner Reticles */}
                          <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t-2 border-l-2 border-white pointer-events-none"></div>
                          <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t-2 border-r-2 border-white pointer-events-none"></div>
                          <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b-2 border-l-2 border-white pointer-events-none"></div>
                          <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b-2 border-r-2 border-white pointer-events-none"></div>

                          {/* Top Tag */}
                          <div className="absolute -top-5 left-0 flex items-center gap-1 z-30 pointer-events-none">
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-tight uppercase whitespace-nowrap bg-cyan-400 text-black shadow-md">
                              {b.label} {(b.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <Video className="w-12 h-12" />
                </div>
              )}
            </div>

            {/* Modal Bottom Metadata & Action Row */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-gray-400">
                  Video: <strong className="text-white">{inspectedResult.video_title}</strong>
                </span>
                <span className="text-gray-400">
                  Similarity Score: <strong className="text-cyan-400">{Math.round((inspectedResult.similarity_score || 0) * 100)}%</strong>
                </span>
              </div>

              {/* Detected Entities List */}
              {inspectedResult.bounding_boxes && inspectedResult.bounding_boxes.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">
                    Detected Bounding Entities:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {inspectedResult.bounding_boxes.map((b, i) => (
                      <div key={i} className="p-2 rounded-xl bg-black/40 border border-white/10 text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white capitalize">{b.label}</span>
                          <span className="text-cyan-400 font-mono font-semibold">{(b.confidence * 100).toFixed(0)}%</span>
                        </div>
                        {b.box && (
                          <div className="text-[9px] font-mono text-gray-500 truncate">
                            [{b.box.map(n => Math.round(n)).join(", ")}]
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Content Explanation */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-gray-300">
                {inspectedResult.matched_content}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setInspectedResult(null)}
                  className="btn-glass px-4 py-2 text-xs font-semibold rounded-xl text-gray-400 hover:text-white cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handlePlayAtTimestamp(inspectedResult);
                    setInspectedResult(null);
                  }}
                  className="btn-gradient px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Seek to {inspectedResult.timestamp?.toFixed(1) || 0}s in Player</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
