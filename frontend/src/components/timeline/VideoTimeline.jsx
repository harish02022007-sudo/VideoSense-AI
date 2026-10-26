import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Maximize, Clock, Cpu, 
  Search, Eye, EyeOff, Database, BarChart3, HelpCircle, HardDrive, 
  Loader2, FileVideo, ChevronLeft, ChevronRight, Sliders, Filter, 
  Sparkles, Layers, Crosshair, Tag, Film, CheckCircle2, Zap,
  ExternalLink, Info, ShieldCheck, Video, LayoutGrid, MonitorPlay, AlertTriangle,
  Download, ArrowLeftRight, SkipBack, SkipForward, ArrowUpDown, Check, RefreshCw
} from "lucide-react";
import api, { API_BASE_URL } from "../../services/api";

export default function VideoTimeline({ videoId, initialSeekTime = null, onClearSeekTime = null }) {
  const [currentVideoId, setCurrentVideoId] = useState(videoId || null);
  const [videoList, setVideoList] = useState([]);
  const [videoInfo, setVideoInfo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [useNativeControls, setUseNativeControls] = useState(false);
  const [videoError, setVideoError] = useState(null);

  // View modes: 'split' (Side-by-side), 'studio' (AI Keyframe & Detection Studio), 'player' (Video Stream Player), 'filmstrip' (Filmstrip focus)
  const [viewMode, setViewMode] = useState("split");
  const [activeTab, setActiveTab] = useState("objects"); // objects, transcript, ocr, scenes, mlops
  const [isLoading, setIsLoading] = useState(true);

  // Multimodal Insights Data
  const [keyframes, setKeyframes] = useState([]);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [transcriptSegments, setTranscriptSegments] = useState([]);
  const [objectDetections, setObjectDetections] = useState([]);
  const [ocrResults, setOcrResults] = useState([]);
  const [sceneSummaries, setSceneSummaries] = useState([]);
  const [streamUrl, setStreamUrl] = useState(null);

  // Keyframe Studio Inspection State
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [minConfidence, setMinConfidence] = useState(0.35);
  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");
  const [hoveredObjectId, setHoveredObjectId] = useState(null);
  const [selectedObjectId, setSelectedObjectId] = useState(null);

  // Custom Open-Vocabulary Class Prompting State
  const [customClassInput, setCustomClassInput] = useState("");
  const [isDetectingCustom, setIsDetectingCustom] = useState(false);
  const [customDetectionMsg, setCustomDetectionMsg] = useState(null);

  // In-Tab Search & Filter States
  const [objectSearch, setObjectSearch] = useState("");
  const [objectSortBy, setObjectSortBy] = useState("time"); // time, confidence
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [ocrSearch, setOcrSearch] = useState("");

  const videoRef = useRef(null);
  const filmstripRef = useRef(null);

  // Quick class prompt suggestion chips
  const suggestedClassPrompts = ["car", "person", "dog", "bottle", "traffic cone", "shoe", "phone", "chair"];

  // Format time utility (seconds -> MM:SS.ms)
  const formatTime = (time, showMs = false) => {
    if (!time && time !== 0) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    if (showMs) {
      const ms = Math.floor((time % 1) * 10);
      return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}.${ms}`;
    }
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Color mapping by detection class
  const getClassStyle = (label) => {
    const l = (label || "").toLowerCase();
    if (l.includes("diamond") || l.includes("ring") || l.includes("jewelry") || l.includes("gold")) {
      return {
        border: "border-yellow-400",
        bg: "bg-yellow-400/20",
        badge: "bg-yellow-400 text-black font-extrabold shadow-glow",
        text: "text-yellow-400",
        hex: "#FACC15",
        glow: "rgba(250, 204, 21, 0.6)"
      };
    }
    if (l.includes("traffic cone") || l.includes("cone")) {
      return {
        border: "border-red-500",
        bg: "bg-red-500/20",
        badge: "bg-red-500 text-white font-extrabold shadow-md",
        text: "text-red-400",
        hex: "#EF4444",
        glow: "rgba(239, 68, 68, 0.5)"
      };
    }
    if (l.includes("safety vest") || l.includes("reflective vest") || l.includes("vest")) {
      return {
        border: "border-lime-400",
        bg: "bg-lime-500/20",
        badge: "bg-lime-400 text-black font-extrabold shadow-md",
        text: "text-lime-300",
        hex: "#84CC16",
        glow: "rgba(132, 204, 22, 0.5)"
      };
    }
    if (l.includes("miniature") || l.includes("toy") || l.includes("figurine")) {
      return {
        border: "border-purple-400",
        bg: "bg-purple-500/20",
        badge: "bg-purple-500 text-white font-bold shadow-md",
        text: "text-purple-300",
        hex: "#A855F7",
        glow: "rgba(168, 85, 247, 0.5)"
      };
    }
    if (l.includes("hand") || l.includes("finger") || l.includes("arm")) {
      return {
        border: "border-rose-400",
        bg: "bg-rose-500/20",
        badge: "bg-rose-500 text-white font-bold shadow-md",
        text: "text-rose-300",
        hex: "#F43F5E",
        glow: "rgba(244, 63, 94, 0.5)"
      };
    }
    if (l.includes("boot") || l.includes("shoe") || l.includes("glove")) {
      return {
        border: "border-teal-400",
        bg: "bg-teal-500/20",
        badge: "bg-teal-500 text-black font-bold shadow-md",
        text: "text-teal-300",
        hex: "#14B8A6",
        glow: "rgba(20, 184, 166, 0.5)"
      };
    }
    if (l.includes("car") || l.includes("truck") || l.includes("vehicle") || l.includes("bus") || l.includes("bike")) {
      return {
        border: "border-amber-400",
        bg: "bg-amber-500/20",
        badge: "bg-amber-500 text-black font-bold",
        text: "text-amber-400",
        hex: "#F59E0B",
        glow: "rgba(245, 158, 11, 0.45)"
      };
    }
    if (l.includes("person") || l.includes("man") || l.includes("woman") || l.includes("child")) {
      return {
        border: "border-cyan-400",
        bg: "bg-cyan-500/20",
        badge: "bg-cyan-500 text-black font-bold shadow-glow-cyan",
        text: "text-cyan-300",
        hex: "#06B6D4",
        glow: "rgba(6, 182, 212, 0.5)"
      };
    }
    if (l.includes("window") || l.includes("door") || l.includes("building") || l.includes("wall")) {
      return {
        border: "border-emerald-400",
        bg: "bg-emerald-500/20",
        badge: "bg-emerald-500 text-black font-bold shadow-glow-green",
        text: "text-emerald-400",
        hex: "#10B981",
        glow: "rgba(16, 185, 129, 0.45)"
      };
    }
    // Default violet
    return {
      border: "border-purple-400",
      bg: "bg-purple-500/20",
      badge: "bg-purple-500 text-white font-bold shadow-glow-purple",
      text: "text-purple-400",
      hex: "#A855F7",
      glow: "rgba(168, 85, 247, 0.45)"
    };
  };

  // 1. Fetch available videos
  useEffect(() => {
    const init = async () => {
      try {
        const videos = await api.getVideos();
        setVideoList(videos || []);

        if (!videoId && videos && videos.length > 0) {
          const completedVideo = videos.find((v) => v.status === "completed") || videos[0];
          setCurrentVideoId(completedVideo.id);
        } else if (videoId) {
          setCurrentVideoId(videoId);
        }
      } catch (err) {
        console.error("Failed to load videos for timeline:", err);
      }
    };
    init();
  }, [videoId]);

  // 2. Load insights & keyframes when currentVideoId changes
  useEffect(() => {
    if (!currentVideoId) {
      setIsLoading(false);
      return;
    }

    const loadAllData = async () => {
      setIsLoading(true);
      setVideoError(null);
      try {
        setStreamUrl(api.getVideoStreamUrl(currentVideoId));

        const [insights, details, framesData] = await Promise.all([
          api.getVideoInsights(currentVideoId).catch((e) => {
            console.warn("Insights fetch error:", e);
            return null;
          }),
          api.getVideoDetails(currentVideoId).catch((e) => {
            console.warn("Details fetch error:", e);
            return null;
          }),
          api.getVideoFrames(currentVideoId).catch((e) => {
            console.warn("Frames fetch error:", e);
            return null;
          })
        ]);

        if (insights) {
          setTranscriptSegments(insights.transcripts || []);
          setObjectDetections(insights.objects || []);
          setOcrResults(insights.ocr_results || []);
          setSceneSummaries(insights.scenes || []);
          if (insights.duration) setDuration(insights.duration);
        }

        if (details) {
          setVideoInfo(details);
        }

        if (framesData && Array.isArray(framesData)) {
          setKeyframes(framesData);
          setSelectedFrameIndex(0);
        } else {
          setKeyframes([]);
        }
      } catch (err) {
        console.error("Failed to load video data:", err);
        setVideoError("Failed to load video analysis data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, [currentVideoId]);

  // Current selected keyframe in the inspector
  const currentFrame = useMemo(() => {
    if (!keyframes || keyframes.length === 0) return null;
    return keyframes[selectedFrameIndex] || keyframes[0];
  }, [keyframes, selectedFrameIndex]);

  // Available classes in current frame for filtering
  const availableClasses = useMemo(() => {
    if (!currentFrame || !currentFrame.objects) return [];
    const set = new Set(currentFrame.objects.map((o) => o.label));
    return Array.from(set).sort();
  }, [currentFrame]);

  // Filtered objects on the current frame based on confidence & class
  const visibleFrameObjects = useMemo(() => {
    if (!currentFrame || !currentFrame.objects) return [];
    return currentFrame.objects.filter((obj) => {
      const passesConfidence = (obj.confidence ?? 0) >= minConfidence;
      const passesClass = selectedClassFilter === "ALL" || obj.label.toLowerCase() === selectedClassFilter.toLowerCase();
      return passesConfidence && passesClass;
    });
  }, [currentFrame, minConfidence, selectedClassFilter]);

  // Filtered object detections for the bottom intelligence tab
  const filteredTabObjects = useMemo(() => {
    let list = [...objectDetections];
    if (objectSearch.trim()) {
      const q = objectSearch.toLowerCase().trim();
      list = list.filter((o) => (o.label || "").toLowerCase().includes(q));
    }
    if (objectSortBy === "confidence") {
      list.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    } else {
      list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }
    return list;
  }, [objectDetections, objectSearch, objectSortBy]);

  // Filtered transcripts
  const filteredTranscripts = useMemo(() => {
    if (!transcriptSearch.trim()) return transcriptSegments;
    const q = transcriptSearch.toLowerCase().trim();
    return transcriptSegments.filter((s) => (s.text || "").toLowerCase().includes(q));
  }, [transcriptSegments, transcriptSearch]);

  // Filtered OCR
  const filteredOcr = useMemo(() => {
    if (!ocrSearch.trim()) return ocrResults;
    const q = ocrSearch.toLowerCase().trim();
    return ocrResults.filter((o) => (o.text || "").toLowerCase().includes(q));
  }, [ocrResults, ocrSearch]);

  // On-demand custom class detection
  const handleDetectCustom = async (e) => {
    if (e) e.preventDefault();
    if (!customClassInput.trim() || !currentVideoId) return;
    const classes = customClassInput.split(",").map((c) => c.trim()).filter((c) => c.length > 1);
    if (classes.length === 0) return;

    try {
      setIsDetectingCustom(true);
      setCustomDetectionMsg(`Detecting [${classes.join(", ")}] across keyframes...`);
      const res = await api.detectCustomClasses(currentVideoId, classes, 0.28);
      if (res?.success) {
        setCustomDetectionMsg(`Found ${res.data?.detected_count || 0} objects for: ${classes.join(", ")}`);
        setCustomClassInput("");
        // Reload keyframes and insights
        const framesData = await api.getVideoFrames(currentVideoId);
        if (framesData && Array.isArray(framesData)) {
          setKeyframes(framesData);
        }
        const insights = await api.getVideoInsights(currentVideoId);
        if (insights?.objects) {
          setObjectDetections(insights.objects);
        }
      }
    } catch (err) {
      console.error("Custom detection error:", err);
      setCustomDetectionMsg("Failed to run custom detection. Please try again.");
    } finally {
      setIsDetectingCustom(false);
      setTimeout(() => setCustomDetectionMsg(null), 6000);
    }
  };

  const handleAddPromptTag = (tag) => {
    if (!customClassInput) {
      setCustomClassInput(tag);
    } else if (!customClassInput.includes(tag)) {
      setCustomClassInput(`${customClassInput}, ${tag}`);
    }
  };

  // Video Player controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch((err) => {
        console.warn("Play error:", err);
        setVideoError("Playback failed. Please toggle Native Controls or retry.");
      });
      setIsPlaying(true);
    }
  };

  const handleSeek = (timestamp) => {
    const clampedTime = Math.max(0, Math.min(timestamp, duration || 999999));
    setCurrentTime(clampedTime);
    if (videoRef.current) {
      videoRef.current.currentTime = clampedTime;
    }
    // Also find nearest keyframe and select it
    if (keyframes && keyframes.length > 0) {
      let nearestIdx = 0;
      let minDiff = Infinity;
      keyframes.forEach((kf, idx) => {
        const diff = Math.abs(kf.timestamp - clampedTime);
        if (diff < minDiff) {
          minDiff = diff;
          nearestIdx = idx;
        }
      });
      setSelectedFrameIndex(nearestIdx);
      scrollFilmstripTo(nearestIdx);
    }
  };

  // Initial seek handler
  useEffect(() => {
    if (initialSeekTime !== null && initialSeekTime !== undefined && keyframes && keyframes.length > 0) {
      handleSeek(initialSeekTime);
      if (videoRef.current) {
        videoRef.current.currentTime = initialSeekTime;
      }
      if (onClearSeekTime) {
        onClearSeekTime();
      }
    }
  }, [initialSeekTime, keyframes]);

  const jumpToFrame = (idx) => {
    if (!keyframes || idx < 0 || idx >= keyframes.length) return;
    setSelectedFrameIndex(idx);
    const targetTime = keyframes[idx].timestamp;
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
    setCurrentTime(targetTime);
    scrollFilmstripTo(idx);
  };

  const scrollFilmstripTo = (idx) => {
    if (filmstripRef.current) {
      const child = filmstripRef.current.children[idx];
      if (child) {
        child.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  };

  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.volume = volume || 0.5;
      }
    } else {
      setIsMuted(true);
      if (videoRef.current) {
        videoRef.current.muted = true;
      }
    }
  };

  const handlePlaybackRateChange = (rate) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleDownloadKeyframe = () => {
    if (!currentFrame?.image_url) return;
    const a = document.createElement("a");
    a.href = `${API_BASE_URL}${currentFrame.image_url}`;
    a.download = `keyframe_${selectedFrameIndex + 1}_${Math.round(currentFrame.timestamp)}s.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-6 select-none pb-12 max-w-7xl mx-auto">
      {/* ======================================================== */}
      {/* 1. UNIFIED COMMAND HEADER & VIDEO SELECTOR               */}
      {/* ======================================================== */}
      <div className="glass-panel p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-white/[0.06] bg-black/40">
        {/* Left: Active Stream Title & Specs */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-primary/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-glow-cyan">
            <Film className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white truncate max-w-xs sm:max-w-md">
                {videoInfo?.filename || "Surveillance Timeline Explorer"}
              </h2>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Ready
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono flex flex-wrap items-center gap-2.5 mt-0.5">
              <span>Duration: <strong className="text-white">{formatTime(duration)}</strong></span>
              <span>•</span>
              <span>Keyframes: <strong className="text-cyan-400">{keyframes.length}</strong></span>
              <span>•</span>
              <span>Detections: <strong className="text-secondary">{objectDetections.length}</strong></span>
              {videoInfo?.width && (
                <>
                  <span>•</span>
                  <span>{videoInfo.width}×{videoInfo.height}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right: View Mode Selector & Video Switcher Dropdown */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* View Mode Switcher Pills */}
          <div className="flex items-center bg-black/60 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode("split")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                viewMode === "split" 
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm" 
                  : "text-gray-400 hover:text-white"
              }`}
              title="Side-by-side Video Player and AI Frame Studio"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
            <button
              onClick={() => setViewMode("studio")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                viewMode === "studio" 
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm" 
                  : "text-gray-400 hover:text-white"
              }`}
              title="Focus on AI Bounding Boxes & Keyframe Canvas"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Frame Studio</span>
            </button>
            <button
              onClick={() => setViewMode("player")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                viewMode === "player" 
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm" 
                  : "text-gray-400 hover:text-white"
              }`}
              title="Focus on Stream Video Player"
            >
              <MonitorPlay className="w-3.5 h-3.5" />
              <span>Player Only</span>
            </button>
          </div>

          {/* Video Dropdown Switcher */}
          <div className="relative">
            <select 
              value={currentVideoId || ""} 
              onChange={(e) => setCurrentVideoId(e.target.value)}
              className="bg-black/80 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono cursor-pointer max-w-[200px] truncate"
            >
              {videoList.map((v) => (
                <option key={v.id} value={v.id} className="bg-gray-900 text-white">
                  {v.filename ? v.filename.slice(0, 24) : v.id.slice(0, 8)}...
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading ? (
        <div className="glass-panel p-20 flex flex-col items-center justify-center text-center border-white/5 space-y-4">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
            <Sparkles className="w-4 h-4 text-secondary absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Loading Multimodal AI Pipeline Data...</h3>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              Retrieving Grounding DINO bounding boxes, keyframes, Whisper transcripts, and OCR matrices
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ======================================================== */}
          {/* 2. MAIN VISUAL WORKSPACE (Split / Player / Studio)       */}
          {/* ======================================================== */}
          <div className={`grid gap-6 ${viewMode === "split" ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
            
            {/* -------------------------------------------------------- */}
            {/* 2A. VIDEO STREAM PLAYER                                  */}
            {/* -------------------------------------------------------- */}
            {(viewMode === "split" || viewMode === "player") && (
              <div className="glass-panel p-4 flex flex-col space-y-3.5 border-white/[0.06] bg-black/40">
                {/* Player Header */}
                <div className="flex items-center justify-between pb-1 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-200 font-mono flex items-center gap-2">
                      Live Stream Player
                      <span className="text-[10px] text-gray-400 font-normal">({formatTime(currentTime, true)} / {formatTime(duration)})</span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUseNativeControls(!useNativeControls)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer ${
                        useNativeControls
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                          : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                      }`}
                      title="Switch between Custom HUD and Native Browser Player controls"
                    >
                      {useNativeControls ? "Native Controls" : "Custom HUD"}
                    </button>
                    <a
                      href={streamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-cyan-400 transition-colors p-1"
                      title="Open Direct Video Stream"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Video Container Screen */}
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 group flex items-center justify-center shadow-glass">
                  {streamUrl ? (
                    <video
                      ref={videoRef}
                      src={streamUrl}
                      playsInline
                      preload="auto"
                      controls={useNativeControls}
                      onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                      onLoadedMetadata={(e) => {
                        if (e.target.duration && !isNaN(e.target.duration)) {
                          setDuration(e.target.duration);
                        }
                      }}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onError={(e) => {
                        console.error("Video error event:", e);
                        setVideoError("Video stream loading error. You can test opening the stream link or verify format.");
                      }}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center space-y-2 p-6">
                      <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                      <p className="text-xs text-gray-300 font-medium">No valid video stream URL available.</p>
                    </div>
                  )}

                  {videoError && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                      <AlertTriangle className="w-10 h-10 text-amber-400" />
                      <p className="text-xs text-red-300 max-w-md">{videoError}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setVideoError(null);
                            if (videoRef.current) videoRef.current.load();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold"
                        >
                          Retry Playback
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Custom HUD Player Overlay (shown on hover) */}
                  {!useNativeControls && !videoError && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                      {/* Timeline Scrubber */}
                      <div 
                        className="w-full h-2 bg-white/20 hover:h-3 rounded-full cursor-pointer relative transition-all"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const newTime = (clickX / rect.width) * (duration || 1);
                          handleSeek(newTime);
                        }}
                      >
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full relative" 
                          style={{ width: `${((currentTime || 0) / (duration || 1)) * 100}%` }}
                        >
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-cyan-400 scale-100 group-hover:scale-125 transition-transform"></div>
                        </div>

                        {/* Scene Cut Markers */}
                        {sceneSummaries.map((scene, i) => (
                          <div 
                            key={i} 
                            className="absolute w-1 h-3 bg-cyan-400/80 top-[-2px] rounded-xs pointer-events-none"
                            style={{ left: `${(scene.start / (duration || 1)) * 100}%` }}
                            title={`Scene: ${scene.title} (${formatTime(scene.start)})`}
                          />
                        ))}
                      </div>

                      {/* HUD Control Buttons */}
                      <div className="flex items-center justify-between text-white text-xs font-mono">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={togglePlay} 
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white hover:text-cyan-400 transition-all cursor-pointer"
                          >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white hover:fill-cyan-400" />}
                          </button>
                          
                          {/* Steppers: -5s, +5s */}
                          <button 
                            onClick={() => handleSeek(Math.max(0, currentTime - 5))} 
                            className="p-1 rounded-md hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer text-[10px]"
                            title="Rewind 5s"
                          >
                            -5s
                          </button>
                          <button 
                            onClick={() => handleSeek(Math.min(duration, currentTime + 5))} 
                            className="p-1 rounded-md hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer text-[10px]"
                            title="Forward 5s"
                          >
                            +5s
                          </button>

                          {/* Volume & Mute */}
                          <div className="flex items-center gap-1.5">
                            <button onClick={toggleMute} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer">
                              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={isMuted ? 0 : volume}
                              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                              className="w-14 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                            />
                          </div>

                          <span className="text-gray-300 text-xs">
                            {formatTime(currentTime, true)} / {formatTime(duration)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {/* Playback rate speed */}
                          <div className="flex items-center bg-black/60 rounded-md border border-white/10 px-2 py-0.5 text-[10px]">
                            <span className="text-gray-400 mr-1">SPEED:</span>
                            {[0.5, 1, 1.5, 2].map((rate) => (
                              <button
                                key={rate}
                                onClick={() => handlePlaybackRateChange(rate)}
                                className={`px-1 rounded cursor-pointer ${playbackRate === rate ? "text-cyan-400 font-bold" : "text-gray-500 hover:text-white"}`}
                              >
                                {rate}x
                              </button>
                            ))}
                          </div>

                          <button 
                            onClick={() => {
                              if (videoRef.current) {
                                if (document.fullscreenElement) {
                                  document.exitFullscreen();
                                } else {
                                  videoRef.current.requestFullscreen();
                                }
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer"
                            title="Fullscreen"
                          >
                            <Maximize className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Player Footer & Quick Sync */}
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 px-1 pt-1">
                  <div className="flex items-center gap-3">
                    <span>Codec: <strong className="text-white">{videoInfo?.codec || "H.264 / AAC"}</strong></span>
                    <span>•</span>
                    <span>FPS: <strong className="text-white">{videoInfo?.fps || 30}</strong></span>
                  </div>

                  {currentFrame && (
                    <button
                      onClick={() => handleSeek(currentFrame.timestamp)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-glow-cyan"
                      title="Sync playback time to the currently selected keyframe in the studio"
                    >
                      <Zap className="w-3 h-3 text-cyan-400" />
                      <span>Sync to Frame #{selectedFrameIndex + 1} ({formatTime(currentFrame.timestamp)})</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* 2B. AI KEYFRAME & DETECTION STUDIO                       */}
            {/* -------------------------------------------------------- */}
            {(viewMode === "split" || viewMode === "studio") && (
              <div className="glass-panel p-4 flex flex-col space-y-3.5 border-white/[0.06] bg-black/40">
                {/* Studio Header Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                      AI Keyframe Studio
                      <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/25 px-2 py-0.5 rounded-full">
                        Grounding DINO Swin-T
                      </span>
                    </h3>
                  </div>

                  {/* Frame Navigation Steppers */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => jumpToFrame(0)}
                      disabled={selectedFrameIndex === 0}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-white text-xs border border-white/5 cursor-pointer"
                      title="First Frame"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => jumpToFrame(selectedFrameIndex - 1)}
                      disabled={selectedFrameIndex <= 0}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-white text-xs border border-white/5 cursor-pointer"
                      title="Previous Frame"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="text-xs font-mono text-cyan-300 px-2 font-bold whitespace-nowrap">
                      Frame {selectedFrameIndex + 1} / {keyframes.length || 1}
                    </span>

                    <button
                      onClick={() => jumpToFrame(selectedFrameIndex + 1)}
                      disabled={selectedFrameIndex >= keyframes.length - 1}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-white text-xs border border-white/5 cursor-pointer"
                      title="Next Frame"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => jumpToFrame(keyframes.length - 1)}
                      disabled={selectedFrameIndex === keyframes.length - 1}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-white text-xs border border-white/5 cursor-pointer"
                      title="Last Frame"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>

                    {/* Download Keyframe JPEG */}
                    <button
                      onClick={handleDownloadKeyframe}
                      className="ml-1 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs cursor-pointer"
                      title="Download Current Keyframe Image"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Open-Vocabulary Custom Classes Prompting Bar */}
                <div className="flex flex-col gap-2">
                  <form 
                    onSubmit={handleDetectCustom} 
                    className="flex items-center gap-2 bg-gradient-to-r from-cyan-950/40 via-black/80 to-purple-950/30 p-2 rounded-xl border border-cyan-500/25 text-xs font-mono shadow-inner"
                  >
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 ml-1.5 animate-pulse" />
                    <input
                      type="text"
                      placeholder="Prompt AI with custom classes (e.g. car, person, traffic cone, safety vest, miniature, phone)..."
                      value={customClassInput}
                      onChange={(e) => setCustomClassInput(e.target.value)}
                      className="bg-transparent border-none text-white text-[11px] placeholder:text-gray-500 focus:outline-none flex-1 font-mono"
                      disabled={isDetectingCustom}
                    />
                    <button
                      type="submit"
                      disabled={isDetectingCustom || !customClassInput.trim()}
                      className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 border border-cyan-500/35 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-glow-cyan"
                    >
                      {isDetectingCustom ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                          <span>Detecting...</span>
                        </>
                      ) : (
                        <>
                          <Crosshair className="w-3 h-3 text-cyan-400" />
                          <span>Detect Classes</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Suggestion tags for quick prompt addition */}
                  <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono text-gray-400 pb-0.5 scrollbar-none">
                    <span className="text-gray-500 shrink-0">Quick tags:</span>
                    {suggestedClassPrompts.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddPromptTag(tag)}
                        className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/5 transition-colors shrink-0 cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>

                  {customDetectionMsg && (
                    <div className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-lg flex items-center gap-2 animate-fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{customDetectionMsg}</span>
                    </div>
                  )}
                </div>

                {/* Studio Inspection Controls (Toggles, Slider, Class Filter) */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-black/60 p-2.5 rounded-xl border border-white/5 text-xs font-mono">
                  {/* Toggles */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        showBoundingBoxes 
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" 
                          : "bg-white/5 text-gray-500 border-white/10"
                      }`}
                    >
                      {showBoundingBoxes ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      Boxes: {showBoundingBoxes ? "ON" : "OFF"}
                    </button>

                    <button
                      onClick={() => setShowLabels(!showLabels)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        showLabels 
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/30" 
                          : "bg-white/5 text-gray-500 border-white/10"
                      }`}
                    >
                      <Tag className="w-3 h-3" />
                      Labels: {showLabels ? "ON" : "OFF"}
                    </button>
                  </div>

                  {/* Confidence Slider */}
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-gray-400">Min Conf:</span>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.05"
                      value={minConfidence}
                      onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                      className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <span className="text-cyan-400 font-bold w-8">{Math.round(minConfidence * 100)}%</span>
                  </div>

                  {/* Class Filter */}
                  {availableClasses.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-gray-400">Class:</span>
                      <select
                        value={selectedClassFilter}
                        onChange={(e) => setSelectedClassFilter(e.target.value)}
                        className="bg-black/80 border border-white/15 rounded-lg px-2 py-0.5 text-white text-[10px] focus:outline-none focus:border-cyan-400 font-mono cursor-pointer"
                      >
                        <option value="ALL">All ({currentFrame?.objects?.length || 0})</option>
                        {availableClasses.map((cls) => (
                          <option key={cls} value={cls}>
                            {cls} ({currentFrame?.objects?.filter(o => o.label === cls).length})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* The Interactive Keyframe Canvas */}
                <div className="relative w-full h-[480px] rounded-2xl overflow-hidden bg-black/95 border border-white/10 flex items-center justify-center shadow-glass group p-3">
                  {currentFrame ? (
                    <div className="relative inline-block max-h-full max-w-full">
                      {/* Real Keyframe JPEG Image */}
                      <img
                        src={`${API_BASE_URL}${currentFrame.image_url}`}
                        alt={`Keyframe at ${formatTime(currentFrame.timestamp)}`}
                        className="max-h-[450px] w-auto max-w-full object-contain block select-none pointer-events-none rounded-lg shadow-2xl"
                      />

                      {/* Bounding Box Overlays Layer */}
                      <div className="absolute inset-0 pointer-events-none overflow-visible">
                        {showBoundingBoxes && visibleFrameObjects.map((obj) => {
                          const frameW = currentFrame.width || 720;
                          const frameH = currentFrame.height || 1280;
                          const box = obj.box || [0, 0, 0, 0];
                          const left = (box[0] / frameW) * 100;
                          const top = (box[1] / frameH) * 100;
                          const width = ((box[2] - box[0]) / frameW) * 100;
                          const height = ((box[3] - box[1]) / frameH) * 100;

                          const isHovered = hoveredObjectId === obj.id;
                          const isSelected = selectedObjectId === obj.id;
                          const styleConfig = getClassStyle(obj.label);

                          return (
                            <div
                              key={obj.id}
                              onMouseEnter={() => setHoveredObjectId(obj.id)}
                              onMouseLeave={() => setHoveredObjectId(null)}
                              onClick={() => setSelectedObjectId(obj.id === selectedObjectId ? null : obj.id)}
                              className={`absolute border-2 transition-all cursor-pointer pointer-events-auto group/box ${styleConfig.border} ${styleConfig.bg} ${
                                isHovered || isSelected ? "ring-2 ring-white scale-[1.01] z-30" : "z-10 hover:z-30"
                              }`}
                              style={{
                                left: `${left}%`,
                                top: `${top}%`,
                                width: `${width}%`,
                                height: `${height}%`,
                                boxShadow: isHovered || isSelected ? `0 0 15px ${styleConfig.glow}` : "none"
                              }}
                            >
                              {/* Corner reticles */}
                              <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t-2 border-l-2 border-white pointer-events-none"></div>
                              <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t-2 border-r-2 border-white pointer-events-none"></div>
                              <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b-2 border-l-2 border-white pointer-events-none"></div>
                              <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b-2 border-r-2 border-white pointer-events-none"></div>

                              {/* Label Badge */}
                              {showLabels && (
                                <div className={`absolute ${top < 6 ? "top-0.5 left-0.5" : "-top-5 left-0"} flex items-center gap-1 z-30 pointer-events-none`}>
                                  <span className={`px-1 py-0.2 rounded text-[8px] font-mono font-bold tracking-tight uppercase whitespace-nowrap shadow-md ${styleConfig.badge}`}>
                                    {obj.label} {Math.round(obj.confidence * 100)}%
                                  </span>
                                </div>
                              )}

                              {/* Hover Details Tooltip */}
                              {(isHovered || isSelected) && (
                                <div className="absolute bottom-full mb-1 left-0 bg-black/95 backdrop-blur-md border border-white/20 rounded-md p-1.5 text-[9px] font-mono text-white whitespace-nowrap z-40 shadow-xl pointer-events-none">
                                  <div>Target: <strong className="text-cyan-300">{obj.label}</strong> ({Math.round(obj.confidence * 100)}%)</div>
                                  <div className="text-gray-400">Coords: [{Math.round(box[0])}, {Math.round(box[1])}] → [{Math.round(box[2])}, {Math.round(box[3])}]</div>
                                  <div className="text-purple-300">Grounding DINO Swin-T</div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2 p-6">
                      <Film className="w-8 h-8 text-gray-500 mx-auto" />
                      <p className="text-xs text-gray-400">No keyframe selected.</p>
                    </div>
                  )}

                  {/* Time Badge Overlay */}
                  {currentFrame && (
                    <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg text-[10px] font-mono text-cyan-300 z-20 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      <span>{formatTime(currentFrame.timestamp, true)}</span>
                      <span className="text-gray-500">•</span>
                      <span>{visibleFrameObjects.length} Objects</span>
                    </div>
                  )}
                </div>

                {/* Detected Objects Pills for Current Frame */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      Detections on Frame #{selectedFrameIndex + 1} ({visibleFrameObjects.length}):
                    </span>
                    <span className="text-gray-500 text-[10px]">Hover pill to highlight box</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 scrollbar-thin">
                    {visibleFrameObjects.length === 0 ? (
                      <p className="text-[11px] text-gray-500 font-mono italic">
                        No objects detected at this confidence threshold ({Math.round(minConfidence * 100)}%).
                      </p>
                    ) : (
                      visibleFrameObjects.map((obj) => {
                        const styleConfig = getClassStyle(obj.label);
                        const isHovered = hoveredObjectId === obj.id;
                        return (
                          <button
                            key={obj.id}
                            onMouseEnter={() => setHoveredObjectId(obj.id)}
                            onMouseLeave={() => setHoveredObjectId(null)}
                            onClick={() => setSelectedObjectId(obj.id === selectedObjectId ? null : obj.id)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                              isHovered 
                                ? "bg-white/20 text-white border-white scale-105" 
                                : "bg-black/40 text-gray-300 border-white/10 hover:border-white/25"
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: styleConfig.hex }}></span>
                            <span>{obj.label}</span>
                            <span className={styleConfig.text}>{Math.round(obj.confidence * 100)}%</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* 3. HORIZONTAL KEYFRAME FILMSTRIP GALLERY                 */}
          {/* ======================================================== */}
          <div className="glass-panel p-4 space-y-3 border-white/[0.06] bg-black/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-white font-mono">
                  Extracted Keyframe Timeline ({keyframes.length} Frames)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-gray-400">
                Click any frame thumbnail to inspect bounding boxes and sync playback
              </span>
            </div>

            {/* Scrollable Filmstrip */}
            <div 
              ref={filmstripRef}
              className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin scroll-smooth"
            >
              {keyframes.map((frame, idx) => {
                const isSelected = selectedFrameIndex === idx;
                const isAtCurrentVideoTime = Math.abs(currentTime - frame.timestamp) < 1.0;
                const objsCount = frame.objects_count || frame.objects?.length || 0;

                return (
                  <div
                    key={frame.id || idx}
                    onClick={() => jumpToFrame(idx)}
                    className={`group relative shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all border ${
                      isSelected
                        ? "border-cyan-400 ring-2 ring-cyan-400/50 scale-105 shadow-glow-cyan z-10"
                        : isAtCurrentVideoTime
                        ? "border-secondary/80 ring-1 ring-secondary/30"
                        : "border-white/10 hover:border-white/30 opacity-75 hover:opacity-100"
                    }`}
                    style={{ width: "110px" }}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-black flex items-center justify-center overflow-hidden">
                      <img
                        src={`${API_BASE_URL}${frame.image_url}`}
                        alt={`Thumb ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>

                    {/* Frame Info Overlay */}
                    <div className="p-1.5 bg-black/85 flex flex-col gap-0.5 text-[9px] font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold">#{idx + 1}</span>
                        <span className="text-cyan-300">{formatTime(frame.timestamp)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[8px]">
                        <span className={objsCount > 0 ? "text-emerald-400 font-bold" : "text-gray-500"}>
                          {objsCount} objs
                        </span>
                        {isSelected && <span className="text-cyan-400 font-bold">ACTIVE</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 4. TABBED MULTIMODAL INTELLIGENCE WORKSPACE              */}
          {/* ======================================================== */}
          <div className="glass-panel flex flex-col border-white/[0.06] bg-black/40 overflow-hidden">
            {/* Tabs Header */}
            <div className="flex border-b border-white/[0.06] p-1.5 bg-black/30 overflow-x-auto scrollbar-none">
              {[
                { key: "objects", label: `Detected Objects (${objectDetections.length})`, icon: Crosshair },
                { key: "transcript", label: `Whisper Speech (${transcriptSegments.length})`, icon: Clock },
                { key: "ocr", label: `Screen Text OCR (${ocrResults.length})`, icon: Tag },
                { key: "scenes", label: `Scene Segments (${sceneSummaries.length})`, icon: Film },
                { key: "mlops", label: "MLOps & Model Specs", icon: Cpu }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all border shrink-0 mr-1.5 cursor-pointer ${
                      activeTab === tab.key 
                        ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-glow-cyan" 
                        : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="p-5 max-h-[480px] overflow-y-auto scrollbar-thin">
              
              {/* ---------------------------------------------------- */}
              {/* Tab 1: Grounding DINO Objects with Search & Filter   */}
              {/* ---------------------------------------------------- */}
              {activeTab === "objects" && (
                <div className="space-y-4">
                  {/* In-tab search & sort bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/50 p-2.5 rounded-xl border border-white/5">
                    <div className="relative flex items-center bg-black/70 border border-white/10 rounded-lg px-2.5 py-1 text-xs w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        value={objectSearch}
                        onChange={(e) => setObjectSearch(e.target.value)}
                        placeholder="Search detected objects..."
                        className="bg-transparent border-none text-white text-xs placeholder:text-gray-500 focus:outline-none flex-1 font-mono"
                      />
                      {objectSearch && (
                        <button onClick={() => setObjectSearch("")} className="text-gray-500 hover:text-white text-xs">×</button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-gray-400 text-[10px]">Sort:</span>
                      <select
                        value={objectSortBy}
                        onChange={(e) => setObjectSortBy(e.target.value)}
                        className="bg-black/80 border border-white/10 rounded-lg px-2 py-1 text-white text-xs font-mono"
                      >
                        <option value="time">Timeline Order</option>
                        <option value="confidence">Highest Confidence</option>
                      </select>
                      <span className="text-gray-500 text-[10px] ml-2">
                        Showing {filteredTabObjects.length} of {objectDetections.length}
                      </span>
                    </div>
                  </div>

                  {/* Objects Cards Grid */}
                  {filteredTabObjects.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 font-mono text-xs">
                      No objects match "{objectSearch}".
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredTabObjects.slice(0, 75).map((obj, idx) => {
                        const styleConfig = getClassStyle(obj.label);
                        const isHovered = hoveredObjectId === obj.id;
                        return (
                          <div
                            key={obj.id || idx}
                            onClick={() => {
                              handleSeek(obj.timestamp);
                              if (obj.frame_id) {
                                const fIdx = keyframes.findIndex(k => k.id === obj.frame_id);
                                if (fIdx !== -1) setSelectedFrameIndex(fIdx);
                              }
                              setSelectedObjectId(obj.id);
                            }}
                            onMouseEnter={() => setHoveredObjectId(obj.id)}
                            onMouseLeave={() => setHoveredObjectId(null)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-black/40 hover:bg-white/[0.04] ${
                              isHovered 
                                ? "border-cyan-400 shadow-glow-cyan" 
                                : "border-white/5 hover:border-white/15"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: styleConfig.hex }}></span>
                                <span className="font-bold text-white text-sm font-mono">{obj.label}</span>
                              </div>
                              <span className="text-xs font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                                {Math.round(obj.confidence * 100)}%
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                              <span>Time: <strong className="text-white">{formatTime(obj.timestamp, true)}</strong></span>
                              <span>Model: <strong className="text-purple-400">Grounding DINO</strong></span>
                            </div>

                            {obj.bbox && (
                              <div className="mt-2 text-[9px] font-mono text-gray-500 truncate">
                                Box: [{Math.round(obj.bbox[0])}, {Math.round(obj.bbox[1])}, {Math.round(obj.bbox[2])}, {Math.round(obj.bbox[3])}]
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* Tab 2: Faster-Whisper Dialogue Transcripts           */}
              {/* ---------------------------------------------------- */}
              {activeTab === "transcript" && (
                <div className="space-y-3.5">
                  <div className="relative flex items-center bg-black/70 border border-white/10 rounded-lg px-2.5 py-1 text-xs w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={transcriptSearch}
                      onChange={(e) => setTranscriptSearch(e.target.value)}
                      placeholder="Search spoken dialogue..."
                      className="bg-transparent border-none text-white text-xs placeholder:text-gray-500 focus:outline-none flex-1 font-mono"
                    />
                    {transcriptSearch && (
                      <button onClick={() => setTranscriptSearch("")} className="text-gray-500 hover:text-white text-xs">×</button>
                    )}
                  </div>

                  {filteredTranscripts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 font-mono text-xs">
                      {transcriptSearch ? `No dialogue matches "${transcriptSearch}".` : "No speech dialogues detected in this audio track."}
                    </div>
                  ) : (
                    filteredTranscripts.map((segment, idx) => {
                      const isActive = currentTime >= segment.start && currentTime < segment.end;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleSeek(segment.start)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer font-mono ${
                            isActive
                              ? "bg-cyan-500/10 border-cyan-500/40 text-white shadow-glow-cyan"
                              : "bg-black/30 border-white/5 text-gray-400 hover:text-gray-200 hover:border-white/10"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-cyan-400 mb-1.5">
                            <span className="font-bold">{formatTime(segment.start)} → {formatTime(segment.end)}</span>
                            <span className="text-gray-500">Segment #{idx + 1}</span>
                          </div>
                          <p className="text-xs leading-relaxed text-gray-200">{segment.text}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* Tab 3: EasyOCR Screen Text                           */}
              {/* ---------------------------------------------------- */}
              {activeTab === "ocr" && (
                <div className="space-y-3.5">
                  <div className="relative flex items-center bg-black/70 border border-white/10 rounded-lg px-2.5 py-1 text-xs w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={ocrSearch}
                      onChange={(e) => setOcrSearch(e.target.value)}
                      placeholder="Search on-screen text..."
                      className="bg-transparent border-none text-white text-xs placeholder:text-gray-500 focus:outline-none flex-1 font-mono"
                    />
                    {ocrSearch && (
                      <button onClick={() => setOcrSearch("")} className="text-gray-500 hover:text-white text-xs">×</button>
                    )}
                  </div>

                  {filteredOcr.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 font-mono text-xs">
                      {ocrSearch ? `No OCR matches "${ocrSearch}".` : "No on-screen text detected by EasyOCR."}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredOcr.slice(0, 60).map((ocr, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSeek(ocr.timestamp)}
                          className="p-3 rounded-xl bg-black/40 border border-white/5 hover:border-white/15 cursor-pointer font-mono flex items-center justify-between"
                        >
                          <div className="space-y-0.5">
                            <span className="text-white text-xs font-bold block">"{ocr.text}"</span>
                            <span className="text-[10px] text-gray-400">{formatTime(ocr.timestamp, true)}</span>
                          </div>
                          <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {Math.round(ocr.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* Tab 4: PySceneDetect Scene Cuts                      */}
              {activeTab === "scenes" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sceneSummaries.map((scene, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSeek(scene.start)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        currentTime >= scene.start && currentTime < scene.end
                          ? "bg-cyan-500/10 border-cyan-500/40 text-white shadow-glow-cyan"
                          : "bg-black/30 border-white/5 text-gray-400 hover:border-white/15"
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-xs mb-1">
                        <span className="text-cyan-400 font-bold">{scene.title || `Scene ${idx + 1}`}</span>
                        <span className="text-gray-400">{formatTime(scene.start)} - {formatTime(scene.end)}</span>
                      </div>
                      <p className="text-xs text-gray-300 mt-2 leading-relaxed">{scene.summary}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* Tab 5: MLOps Telemetry & Hardware Spec               */}
              {activeTab === "mlops" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-3">
                    <h4 className="text-cyan-400 font-bold flex items-center gap-2">
                      <Cpu className="w-4 h-4" /> Vision & Detection Stack
                    </h4>
                    <div className="space-y-2 text-gray-300 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-500">Object Detector</span>
                        <span className="text-white font-bold">Grounding DINO (Swin-T Transformer)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-500">Execution Device</span>
                        <span className="text-emerald-400 font-bold">NVIDIA GeForce RTX 3050 (CUDA)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-500">Text Prompts</span>
                        <span className="text-white">person . car . bottle . window . table</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-500">Total Keyframes Sampled</span>
                        <span className="text-cyan-400 font-bold">{keyframes.length} frames</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">Total Detections</span>
                        <span className="text-cyan-400 font-bold">{objectDetections.length} bounding boxes</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-3">
                    <h4 className="text-secondary font-bold flex items-center gap-2">
                      <Layers className="w-4 h-4" /> Multimodal AI Services
                    </h4>
                    <div className="space-y-2 text-gray-300 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-500">Speech Recognition</span>
                        <span className="text-white font-bold">Faster-Whisper (CTranslate2)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-500">OCR Engine</span>
                        <span className="text-white font-bold">EasyOCR (PyTorch CRAFT + CRNN)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-500">Scene Segmentation</span>
                        <span className="text-white font-bold">PySceneDetect ContentDetector</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-500">Vector Embeddings</span>
                        <span className="text-white font-bold">FAISS IndexFlatIP (512-dim)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">Pipeline Status</span>
                        <span className="text-emerald-400 font-bold uppercase">10 / 10 Stages Complete</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
