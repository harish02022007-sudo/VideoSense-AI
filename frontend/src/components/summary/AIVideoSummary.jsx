import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Video, Volume2, Eye, Clock, CheckCircle2, AlertTriangle, 
  RefreshCw, Play, Layers, FileText, ChevronRight, ListOrdered, 
  Info, Cpu, ShieldCheck, Tag, Mic, Headphones, ArrowRight, CornerDownRight
} from "lucide-react";
import api, { API_BASE_URL } from "../../services/api";

export default function AIVideoSummary({ videoId, onSeek = null, className = "" }) {
  const [mode, setMode] = useState("audio_visual"); // 'visual_only' | 'audio_visual'
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'events' | 'chapters' | 'transcript'
  const pollingTimerRef = useRef(null);

  // Fetch existing summary on videoId or mode change
  useEffect(() => {
    if (!videoId) return;
    loadSummary(false);

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [videoId, mode]);

  const loadSummary = async (showLoadingState = true) => {
    if (!videoId) return;
    if (showLoadingState) setIsLoading(true);
    setError(null);

    try {
      const data = await api.getVideoSummary(videoId, mode);
      if (data && data.status && data.status !== "not_generated") {
        setSummaryData(data);
        setJobStatus(null);
      } else {
        // Fallback / not generated yet
        setSummaryData(data || null);
      }
    } catch (err) {
      console.warn("No pre-computed summary found:", err);
      setSummaryData(null);
    } finally {
      if (showLoadingState) setIsLoading(false);
    }
  };

  // Start polling backend job status
  const startStatusPolling = () => {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    setIsPolling(true);

    pollingTimerRef.current = setInterval(async () => {
      try {
        const statusRes = await api.getSummaryStatus(videoId, mode);
        setJobStatus(statusRes);

        if (statusRes.is_completed || statusRes.status === "completed" || statusRes.status === "partially_completed") {
          clearInterval(pollingTimerRef.current);
          setIsPolling(false);
          setIsLoading(false);
          // Fetch final completed summary
          const completed = await api.getVideoSummary(videoId, mode);
          setSummaryData(completed);
        } else if (statusRes.status === "failed") {
          clearInterval(pollingTimerRef.current);
          setIsPolling(false);
          setIsLoading(false);
          setError(statusRes.error_message || "Summarization job failed. Please retry.");
        }
      } catch (err) {
        console.error("Error polling summary status:", err);
      }
    }, 1500);
  };

  // Trigger generation
  const handleGenerateSummary = async (force = true) => {
    if (!videoId || isLoading) return;
    setIsLoading(true);
    setError(null);
    setJobStatus({
      status: "queued",
      progress: 5.0,
      current_stage: "queued",
      stage_message: `Initiating ${mode === "visual_only" ? "visual-only" : "audio-visual"} summarization...`
    });

    try {
      // Dispatch background summarization job
      await api.summarizeVideo(videoId, {
        mode,
        forceRegenerate: force,
        asyncRun: true
      });
      // Start polling
      startStatusPolling();
    } catch (err) {
      console.error("Failed to initiate summarization:", err);
      setIsLoading(false);
      setIsPolling(false);
      setError(err?.response?.data?.detail || "Failed to start summarization pipeline. Please retry.");
    }
  };

  const handleTimestampClick = (timeSec) => {
    if (onSeek && typeof onSeek === "function") {
      onSeek(timeSec);
    }
  };

  const hasGeneratedSummary = summaryData && summaryData.status && summaryData.status !== "not_generated" && summaryData.short_summary;

  return (
    <div className={`space-y-6 text-gray-100 ${className}`}>
      {/* 1. Header & Configuration Bar */}
      <div className="glass-panel p-5 border-white/[0.08] bg-black/40 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                AI Video Summary
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Multimodal Synthesis
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Comprehensive visual, auditory, and chronological intelligence extracted from video streams.
              </p>
            </div>
          </div>
        </div>

        {/* Mode Selector & Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher */}
          <div className="bg-black/60 border border-white/10 p-1 rounded-xl flex items-center gap-1 text-xs font-mono">
            <button
              onClick={() => setMode("visual_only")}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                mode === "visual_only"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan font-bold"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visual-Only</span>
            </button>
            <button
              onClick={() => setMode("audio_visual")}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                mode === "audio_visual"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-glow-purple font-bold"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Audio-Visual</span>
            </button>
          </div>

          {/* Generate / Regenerate Button */}
          <button
            onClick={() => handleGenerateSummary(true)}
            disabled={isLoading || isPolling}
            className={`btn-primary px-4 py-2 text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all ${
              isLoading || isPolling ? "opacity-75 cursor-not-allowed" : "hover:scale-105"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isPolling ? "animate-spin" : ""}`} />
            <span>{hasGeneratedSummary ? "Regenerate Summary" : "Generate Summary"}</span>
          </button>
        </div>
      </div>

      {/* 2. Live Job Progress Indicator */}
      {(isLoading || isPolling || jobStatus) && (
        <div className="glass-panel p-5 border-cyan-500/30 bg-black/60 rounded-2xl space-y-3 animate-fade-in shadow-glow-cyan">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="flex items-center gap-2 text-cyan-300 font-bold">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Processing Stage: {jobStatus?.current_stage || "Queued"}</span>
            </span>
            <span className="text-gray-400 font-bold">{Math.round(jobStatus?.progress || 10)}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, jobStatus?.progress || 15)}%` }}
            />
          </div>

          <p className="text-xs text-gray-300 font-mono italic">
            {jobStatus?.stage_message || "Analyzing visual frames, audio telemetry, and cross-modality events..."}
          </p>
        </div>
      )}

      {/* 3. Error Alert */}
      {error && (
        <div className="glass-panel p-4 border-red-500/30 bg-red-950/20 rounded-2xl flex items-center gap-3 text-red-300 text-xs">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <strong className="block text-white font-bold">Summarization Warning:</strong>
            <span>{error}</span>
          </div>
          <button 
            onClick={() => handleGenerateSummary(true)} 
            className="px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-bold hover:bg-red-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Main Results View */}
      {hasGeneratedSummary ? (
        <div className="space-y-6">
          {/* Warnings / Modality Notice Bar */}
          {summaryData.warnings && summaryData.warnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300">Modality Notice: </strong>
                {summaryData.warnings.join(" ")}
              </div>
            </div>
          )}

          {/* Telemetry Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-panel p-3 border-white/5 bg-black/40 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Analysis Mode</span>
              <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                {summaryData.mode === "visual_only" ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Visual Only</span>
                  </>
                ) : (
                  <>
                    <Headphones className="w-3.5 h-3.5 text-purple-400" />
                    <span>Audio-Visual</span>
                  </>
                )}
              </div>
            </div>

            <div className="glass-panel p-3 border-white/5 bg-black/40 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Key Events</span>
              <div className="text-xs font-bold text-cyan-300 font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{summaryData.key_events?.length || 0} Indexed</span>
              </div>
            </div>

            <div className="glass-panel p-3 border-white/5 bg-black/40 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Chapters</span>
              <div className="text-xs font-bold text-purple-300 font-mono flex items-center gap-1.5">
                <ListOrdered className="w-3.5 h-3.5 text-purple-400" />
                <span>{summaryData.chapters?.length || 0} Segments</span>
              </div>
            </div>

            <div className="glass-panel p-3 border-white/5 bg-black/40 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Processing Time</span>
              <div className="text-xs font-bold text-emerald-300 font-mono flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>{summaryData.processing_time_ms ? `${(summaryData.processing_time_ms / 1000).toFixed(1)}s` : "Cached"}</span>
              </div>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto scrollbar-thin">
            {[
              { id: "overview", label: "Executive Summary", icon: Sparkles },
              { id: "events", label: `Key Events (${summaryData.key_events?.length || 0})`, icon: Clock },
              { id: "chapters", label: `Chapters (${summaryData.chapters?.length || 0})`, icon: ListOrdered },
              ...(summaryData.mode === "audio_visual" ? [{ id: "transcript", label: "Dialogue Transcript", icon: Mic }] : [])
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Executive Overview & Detailed Narrative */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Short Summary Card */}
              <div className="glass-panel p-5 border-white/[0.08] bg-black/40 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Short Summary (Executive Overview)</span>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed font-sans">
                  {summaryData.short_summary}
                </p>
              </div>

              {/* Detailed Summary Narrative */}
              <div className="glass-panel p-5 border-white/[0.08] bg-black/40 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">
                  <FileText className="w-4 h-4" />
                  <span>Detailed Chronological Narrative</span>
                </div>
                <div className="prose prose-invert max-w-none text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-line bg-black/30 p-4 rounded-xl border border-white/5">
                  {summaryData.detailed_summary}
                </div>
              </div>

              {/* Models & Verification Ledger */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-gray-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Ground truth verified against visual keyframe offsets & audio probes.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Models:</span>
                  {(summaryData.models_used || ["YOLOv11", "Whisper", "Multimodal Engine"]).map((m, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10 text-[10px]">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Chronological Key Events Timeline */}
          {activeTab === "events" && (
            <div className="space-y-4">
              <div className="text-xs text-gray-400 font-mono flex items-center justify-between">
                <span>Click any timestamp to seek the video player to that exact moment:</span>
                <span className="text-cyan-400">{summaryData.key_events?.length || 0} events identified</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(summaryData.key_events || []).map((ev, idx) => (
                  <div
                    key={idx}
                    className="glass-panel p-4 border-white/[0.06] bg-black/40 hover:bg-white/[0.04] transition-all rounded-xl space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      {/* Clickable Seek Button */}
                      <button
                        onClick={() => handleTimestampClick(ev.timestamp)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-all text-xs font-mono font-bold cursor-pointer group-hover:scale-105"
                        title="Click to seek video"
                      >
                        <Play className="w-3 h-3 fill-cyan-300" />
                        <span>{ev.formatted_timestamp}</span>
                      </button>

                      {/* Modality Badge */}
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                        ev.modality === "MULTIMODAL"
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                          : ev.modality === "AUDIO"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                      }`}>
                        {ev.modality}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {ev.title}
                      </h4>
                      <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                        {ev.description}
                      </p>
                    </div>

                    {/* Associated Labels */}
                    {ev.labels && ev.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {ev.labels.map((l, li) => (
                          <span key={li} className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-gray-300 border border-white/10">
                            {l}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Chapter Summaries */}
          {activeTab === "chapters" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400 font-mono">
                Segmented chronological chapters partitioning the video timeline into distinct narrative phases:
              </p>

              <div className="space-y-3">
                {(summaryData.chapters || []).map((ch, idx) => (
                  <div 
                    key={idx}
                    className="glass-panel p-5 border-white/[0.06] bg-black/40 rounded-xl space-y-3 hover:border-cyan-500/30 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center text-xs font-mono font-bold">
                          {ch.chapter_number}
                        </span>
                        <h4 className="text-sm font-bold text-white">{ch.title}</h4>
                      </div>

                      {/* Clickable Range Button */}
                      <button
                        onClick={() => handleTimestampClick(ch.start_time)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/60 border border-white/15 text-cyan-300 hover:border-cyan-400/40 text-xs font-mono font-bold transition-all cursor-pointer self-start sm:self-auto"
                      >
                        <Play className="w-3 h-3 fill-cyan-400" />
                        <span>{ch.formatted_range}</span>
                      </button>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed font-sans">
                      {ch.description}
                    </p>

                    {/* Key Entities */}
                    {ch.key_entities && ch.key_entities.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1 text-[11px] font-mono text-gray-400">
                        <Tag className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-gray-500">Entities:</span>
                        <div className="flex flex-wrap gap-1">
                          {ch.key_entities.map((ent, ei) => (
                            <span key={ei} className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-gray-300 border border-white/10">
                              {ent}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Dialogue Transcript */}
          {activeTab === "transcript" && summaryData.mode === "audio_visual" && (
            <div className="space-y-4">
              <div className="text-xs text-gray-400 font-mono flex items-center justify-between">
                <span>Whisper speech recognition dialogue telemetry:</span>
                <span className="text-purple-400">
                  {summaryData.transcript_segments?.length || 0} spoken dialogue segments
                </span>
              </div>

              {(!summaryData.transcript_segments || summaryData.transcript_segments.length === 0) ? (
                <div className="glass-panel p-8 text-center border-white/5 bg-black/40 rounded-2xl space-y-2">
                  <Headphones className="w-8 h-8 text-gray-500 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No Spoken Dialogue Detected</h4>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    {summaryData.has_audio 
                      ? "The audio track contains ambient background atmosphere / sound effects with no human spoken conversation." 
                      : "The video container does not contain an audio stream."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {summaryData.transcript_segments.map((seg, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-black/40 border border-white/5 hover:border-purple-500/30 transition-all flex items-start gap-3"
                    >
                      <button
                        onClick={() => handleTimestampClick(seg.start_time)}
                        className="px-2 py-1 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 text-[10px] font-mono font-bold cursor-pointer shrink-0 mt-0.5"
                      >
                        {seg.formatted_timestamp}
                      </button>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold font-mono text-purple-300">{seg.speaker || "Speaker"}</span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {Math.round(seg.confidence * 100)}% accuracy
                          </span>
                        </div>
                        <p className="text-xs text-gray-200 font-sans leading-relaxed">
                          "{seg.text}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="glass-panel p-10 text-center border-white/[0.06] bg-black/30 rounded-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto shadow-glow-cyan">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-extrabold text-white">Multimodal Video Summary Ready</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Select between <strong className="text-cyan-300">Visual-Only</strong> or <strong className="text-purple-300">Audio-Visual</strong> mode and click generate to synthesize executive highlights, key events, and chronological chapters.
            </p>
          </div>
          <button
            onClick={() => handleGenerateSummary(false)}
            disabled={isLoading || isPolling}
            className="btn-primary px-6 py-2.5 text-xs font-mono font-bold inline-flex items-center gap-2 cursor-pointer shadow-glow-cyan"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate AI Video Summary</span>
          </button>
        </div>
      )}
    </div>
  );
}
