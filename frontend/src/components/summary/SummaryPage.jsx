import React, { useState, useEffect } from "react";
import { Sparkles, Video, ArrowLeft, Play, RefreshCw, Film } from "lucide-react";
import api from "../../services/api";
import AIVideoSummary from "./AIVideoSummary";

export default function SummaryPage({ selectedVideoId, onSelectVideo, onNavigate }) {
  const [videoList, setVideoList] = useState([]);
  const [currentVideoId, setCurrentVideoId] = useState(selectedVideoId || null);
  const [loadingVideos, setLoadingVideos] = useState(true);

  useEffect(() => {
    loadVideos();
  }, []);

  useEffect(() => {
    if (selectedVideoId) {
      setCurrentVideoId(selectedVideoId);
    }
  }, [selectedVideoId]);

  const loadVideos = async () => {
    setLoadingVideos(true);
    try {
      const res = await api.getVideos();
      const allVideos = Array.isArray(res) ? res : (res?.items || []);
      // Sort completed videos first
      const sorted = [...allVideos].sort((a, b) => {
        if (a.status === "completed" && b.status !== "completed") return -1;
        if (b.status === "completed" && a.status !== "completed") return 1;
        return new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0);
      });
      setVideoList(sorted);
      if (!currentVideoId && sorted.length > 0) {
        const preferred = sorted.find(v => v.id === "3a7edc72-5aeb-4855-8394-45e85a77bc07") || sorted[0];
        setCurrentVideoId(preferred.id);
      }
    } catch (err) {
      console.error("Failed to load video list:", err);
    } finally {
      setLoadingVideos(false);
    }
  };

  const currentVideo = videoList.find((v) => v.id === currentVideoId);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header & Video Selector */}
      <div className="glass-panel p-5 border-white/[0.08] bg-black/40 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            AI Video Summarization Center
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Multimodal evidence fusion combining visual keyframe telemetry and Whisper speech transcription.
          </p>
        </div>

        {/* Video Selector Dropdown */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-mono text-gray-400 flex items-center gap-1.5 shrink-0">
            <Video className="w-3.5 h-3.5 text-cyan-400" />
            Active Video:
          </label>
          <select
            value={currentVideoId || ""}
            onChange={(e) => setCurrentVideoId(e.target.value)}
            disabled={loadingVideos || videoList.length === 0}
            className="bg-black/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
          >
            {videoList.length === 0 ? (
              <option value="">No processed videos available</option>
            ) : (
              videoList.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.filename || `Video ${v.id.slice(0, 8)}`} ({v.duration ? `${Math.round(v.duration)}s` : "stream"})
                </option>
              ))
            )}
          </select>

          {currentVideoId && onSelectVideo && (
            <button
              onClick={() => onSelectVideo(currentVideoId, 0)}
              className="btn-glass px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 text-cyan-300 hover:text-white"
              title="Open in Timeline Player"
            >
              <Play className="w-3 h-3" />
              <span>Open Player</span>
            </button>
          )}
        </div>
      </div>

      {/* Main AIVideoSummary Panel */}
      {currentVideoId ? (
        <AIVideoSummary
          videoId={currentVideoId}
          onSeek={(t) => {
            if (onSelectVideo) onSelectVideo(currentVideoId, t);
          }}
        />
      ) : (
        <div className="glass-panel p-12 text-center border-white/5 bg-black/40 rounded-2xl space-y-3">
          <Film className="w-10 h-10 text-gray-500 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Video Selected</h3>
          <p className="text-xs text-gray-400">
            Please upload a video or select an existing video from your library to generate an AI summary.
          </p>
        </div>
      )}
    </div>
  );
}
