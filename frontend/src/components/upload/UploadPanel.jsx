import React, { useState, useEffect, useRef } from "react";
import { 
  UploadCloud, CheckCircle2, Loader2, Sparkles, Database, FileVideo, 
  ArrowRight, ShieldCheck, Zap, HardDrive, LineChart, Play, Pause, X, RefreshCw, AlertCircle
} from "lucide-react";
import api, { API_BASE_URL } from "../../services/api";

const PIPELINE_STAGES = [
  { key: "uploading", label: "Upload Video Stream", desc: "Multipart upload to FastAPI gateway" },
  { key: "metadata_validation", label: "Metadata & Codecs", desc: "Format, FPS & duration analysis" },
  { key: "frame_extraction", label: "Keyframe Slicing", desc: "FFmpeg keyframe sampling (1.0 fps)" },
  { key: "audio_extraction", label: "Audio Extraction", desc: "16kHz mono WAV audio extraction" },
  { key: "scene_detection", label: "Scene Detection", desc: "PySceneDetect boundary cut detection" },
  { key: "ocr", label: "OCR Text Scanning", desc: "EasyOCR multilingual screen text" },
  { key: "speech", label: "Speech Transcription", desc: "Faster-Whisper dialogue transcripts" },
  { key: "object_detection", label: "Object Detection", desc: "YOLOv8 visual target tracking" },
  { key: "embedding_generation", label: "Vector Embeddings", desc: "CLIP vision + MiniLM text vectors" },
  { key: "completed", label: "FAISS Storage Ready", desc: "Vector indexing & search enabled" }
];

export default function UploadPanel({ onSelectVideo }) {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("idle"); // idle, uploading, processing, completed, error
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState("initiating");
  const [rawStage, setRawStage] = useState("uploading");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const pollIntervalRef = useRef(null);

  // Load real uploaded videos history
  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const videos = await api.getVideos();
      setHistory(videos || []);
    } catch (err) {
      console.error("Failed to load video history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const isVideoFile = (file) => {
    if (!file) return false;
    if (file.type && file.type.startsWith("video/")) return true;
    const ext = file.name ? file.name.split(".").pop().toLowerCase() : "";
    return ["mp4", "avi", "mov", "mkv", "webm", "m4v", "flv", "wmv", "3gp", "ts", "mpg", "mpeg"].includes(ext);
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isVideoFile(droppedFile)) {
      setFile(droppedFile);
      setErrorMessage("");
    } else if (droppedFile) {
      setErrorMessage("Please select a supported video file (MP4, MKV, AVI, MOV, WEBM).");
    }
  };

  const handleSelectFile = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setErrorMessage("");
    }
  };

  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const loadSampleVideo = async (filename) => {
    try {
      setIsLoadingSample(true);
      setErrorMessage("");
      const res = await fetch(`${API_BASE_URL}/sample_videos/${encodeURIComponent(filename)}`);
      if (!res.ok) throw new Error("Could not retrieve sample video from server.");
      const blob = await res.blob();
      const sampleFile = new File([blob], filename, { type: "video/mp4" });
      setFile(sampleFile);
    } catch (err) {
      console.error("Failed to load sample video:", err);
      setErrorMessage("Could not load sample video. Ensure backend is running.");
    } finally {
      setIsLoadingSample(false);
    }
  };

  const triggerIngestion = async () => {
    if (!file) return;
    setUploadStatus("uploading");
    setProgress(10);
    setCurrentStage("Uploading video stream to server...");
    setErrorMessage("");

    try {
      setRawStage("uploading");
      // 1. Upload video file to FastAPI endpoint
      const uploadRes = await api.uploadVideo(file, file.name, (pct) => {
        // Map upload phase to 0-30%
        setProgress(Math.round(pct * 0.3));
      });

      const videoId = uploadRes.video_id;
      setActiveVideoId(videoId);
      setUploadStatus("processing");
      setRawStage("metadata_validation");
      setCurrentStage("Metadata extraction & validation...");

      // 2. Start Polling processing progress every 2.5s
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusData = await api.getVideoProcessingStatus(videoId);
          const { status, current_stage, progress: backendProgress, error_message } = statusData;
          if (current_stage) {
            setRawStage(current_stage);
          }

          // Format stage name human-readably
          const stageLabels = {
            metadata_validation: "Validating video stream format & codecs...",
            metadata_completed: "Metadata analyzed. Queuing AI workers...",
            frame_extraction: "FFmpeg keyframe extraction (1 fps)...",
            audio_extraction: "FFmpeg 16kHz mono audio extraction...",
            scene_detection: "PySceneDetect boundary cut detection...",
            ocr: "EasyOCR multilingual text scanning...",
            speech: "Faster-Whisper audio dialogue transcription...",
            object_detection: "YOLOv8 deep neural object detection...",
            embedding_generation: "CLIP & MiniLM multimodal vector embedding...",
            completed: "AI Ingestion pipeline completed!"
          };

          setCurrentStage(stageLabels[current_stage] || current_stage || "Processing AI pipeline...");
          setProgress(backendProgress || 30);

          if (status === "completed") {
            clearInterval(pollIntervalRef.current);
            setUploadStatus("completed");
            setRawStage("completed");
            setProgress(100);
            loadHistory();
          } else if (status === "failed") {
            clearInterval(pollIntervalRef.current);
            setUploadStatus("error");
            setErrorMessage(error_message || "Video processing encountered an error in the backend pipeline.");
          }
        } catch (pollErr) {
          console.error("Status poll error:", pollErr);
        }
      }, 2500);

    } catch (err) {
      console.error("Upload error:", err);
      setUploadStatus("error");
      const detailMsg = err?.response?.data?.detail || err?.response?.data?.message || err.message;
      setErrorMessage(detailMsg || "Failed to upload video.");
    }
  };

  const resetForm = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setFile(null);
    setUploadStatus("idle");
    setProgress(0);
    setCurrentStage("");
    setErrorMessage("");
    setActiveVideoId(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 select-none">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Upload Center</h2>
        <p className="text-gray-400 mt-2 text-sm">
          Load video streams into the VideoSense AI environment. Our agentic pipeline handles scene boundaries, detects visual targets (YOLO), extracts OCR text, transcribes speech (Whisper), and generates multimodal vector embeddings.
        </p>
      </div>

      {uploadStatus === "idle" && (
        <div className="space-y-8">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border border-white/[0.04] rounded-2xl p-12 bg-background-card/20 hover:bg-background-card/30 backdrop-blur-glass flex flex-col items-center justify-center transition-all cursor-pointer relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-secondary/0 to-accent-purple/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <input
              type="file"
              accept="video/*,.mp4,.avi,.mov,.mkv,.webm,.m4v,.wmv,.flv,.3gp,.ts,.mpg,.mpeg"
              className="hidden"
              id="file-upload"
              onChange={handleSelectFile}
            />
            <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer z-10">
              <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center border border-white/5 shadow-inner mb-4 group-hover:border-secondary/20 group-hover:shadow-glow-cyan transition-all">
                <UploadCloud className="w-8 h-8 text-blue-400 group-hover:text-secondary transition-all" />
              </div>
              <p className="text-sm font-semibold text-white">
                {file ? file.name : "Drag & drop your video here, or click to browse"}
              </p>
              <p className="text-xs text-gray-500 mt-2">Supports MP4, MKV, AVI, MOV, WEBM, M4V up to 1GB</p>
            </label>
          </div>

          {/* Quick Select Sample Video for Instant Testing */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> QUICK SELECT SAMPLE:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                id="load-whatsapp-sample-btn"
                onClick={() => loadSampleVideo("WhatsApp Video 2026-07-20 at 5.07.11 AM.mp4")}
                disabled={isLoadingSample}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-all flex items-center gap-1.5"
              >
                {isLoadingSample ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileVideo className="w-3.5 h-3.5" />}
                WhatsApp Video 2026-07-20 at 5.07.11 AM.mp4 (17.6MB)
              </button>
              <button
                type="button"
                id="load-video-sample-btn"
                onClick={() => loadSampleVideo("video.mp4")}
                disabled={isLoadingSample}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 transition-all flex items-center gap-1.5"
              >
                video.mp4 (3.9MB)
              </button>
            </div>
          </div>

          {file && (
            <div className="glass-panel p-5 flex items-center justify-between border-white/5">
              <div className="flex items-center gap-3 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-gray-300 font-medium">{file.name}</span>
                <span className="text-gray-600">|</span>
                <span className="font-mono text-gray-300">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setFile(null)} className="btn-glass px-4 py-2 text-xs">Clear</button>
                <button onClick={triggerIngestion} className="btn-gradient px-4 py-2 text-xs font-bold flex items-center gap-2">
                  Trigger Ingestion <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Real Upload History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Ingested Video Streams</h3>
              <button onClick={loadHistory} className="text-gray-500 hover:text-white text-xs flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-6 text-gray-500 text-xs">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading video stream library...
              </div>
            ) : history.length === 0 ? (
              <div className="glass-panel p-6 text-center text-gray-500 text-xs border-white/5">
                No videos uploaded yet. Upload a sample video above to launch the AI pipeline.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((vid) => (
                  <div key={vid.id} className="glass-panel p-4 flex items-center justify-between border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-3">
                      <FileVideo className="w-5 h-5 text-secondary" />
                      <div>
                        <h4 className="text-xs font-bold text-white font-mono">{vid.filename}</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {vid.duration ? `${Math.round(vid.duration)}s` : "Unknown duration"} • {(vid.size_bytes / (1024 * 1024)).toFixed(1)} MB • {vid.fps ? `${vid.fps} fps` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${
                        vid.status === "completed" ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/20" :
                        vid.status === "failed" ? "text-red-400 bg-red-500/5 border-red-500/20" :
                        "text-yellow-400 bg-yellow-500/5 border-yellow-500/20"
                      }`}>
                        {vid.status.toUpperCase()}
                      </span>
                      {onSelectVideo && vid.status === "completed" && (
                        <button 
                          onClick={() => onSelectVideo(vid.id)}
                          className="btn-glass px-3 py-1 text-xs text-cyan-400 hover:text-cyan-300"
                        >
                          Inspect
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {uploadStatus !== "idle" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Progress panel */}
          <div className="lg:col-span-2 glass-panel p-6 space-y-6 border-white/5">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {uploadStatus === "uploading" && <><Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Uploading Video File...</>}
                  {uploadStatus === "processing" && <><Sparkles className="w-4 h-4 animate-spin text-cyan-400" /> Running AI Pipeline...</>}
                  {uploadStatus === "completed" && <><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Ingestion & Vectors Complete!</>}
                  {uploadStatus === "error" && <><AlertCircle className="w-4 h-4 text-red-400" /> Pipeline Failed</>}
                </h3>
                <span className="text-[10px] text-gray-500 font-mono mt-1 block">{file?.name}</span>
              </div>

              <div className="flex gap-2">
                <button onClick={resetForm} className="p-2 bg-white/5 rounded-xl border border-white/5 text-gray-400 hover:text-white" title="Reset">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Current Stage Indicator */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-1">Active Pipeline Stage</span>
              <p className="text-xs font-semibold text-cyan-300">{currentStage}</p>
            </div>

            {/* Error Message if any */}
            {uploadStatus === "error" && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Progress line */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-500">INGESTION PROGRESS</span>
                <span className="text-white font-bold">{progress}%</span>
              </div>
              <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    uploadStatus === "error" ? "bg-red-500" :
                    uploadStatus === "completed" ? "bg-emerald-500" :
                    "bg-gradient-to-r from-primary via-secondary to-accent-purple"
                  }`} 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Visual 10-Stage Pipeline Checklist */}
            <div className="space-y-3 pt-3 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">
                  Pipeline Execution Checklist
                </span>
                <span className="text-[10px] font-mono text-cyan-400">
                  {uploadStatus === "completed" ? "10 / 10 Complete" : "Real-Time Tracking"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {PIPELINE_STAGES.map((st, idx) => {
                  const stageKeys = PIPELINE_STAGES.map((s) => s.key);
                  const currentIdx = stageKeys.indexOf(rawStage);
                  const isDone = uploadStatus === "completed" || (currentIdx > idx);
                  const isActive = (uploadStatus === "uploading" && idx === 0) || (uploadStatus === "processing" && currentIdx === idx);

                  return (
                    <div 
                      key={st.key}
                      className={`p-2.5 rounded-xl border flex items-center gap-3 transition-all ${
                        isDone 
                          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
                          : isActive
                          ? "bg-secondary/10 border-secondary/40 shadow-glow-cyan text-white"
                          : "bg-white/[0.01] border-white/5 text-gray-500"
                      }`}
                    >
                      <div className="shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isActive ? (
                          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-gray-700 flex items-center justify-center text-[9px] font-mono">
                            {idx + 1}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className="text-[11px] font-bold truncate leading-tight">{st.label}</h5>
                          <span className={`text-[8px] font-mono uppercase ${isDone ? "text-emerald-400 font-bold" : isActive ? "text-cyan-400 font-bold animate-pulse" : "text-gray-600"}`}>
                            {isDone ? "Done" : isActive ? "Active" : "Pending"}
                          </span>
                        </div>
                        <p className="text-[9px] text-gray-500 truncate mt-0.5">{st.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Completed Next Steps */}
            {uploadStatus === "completed" && (
              <div className="pt-4 border-t border-white/5 flex gap-4">
                {onSelectVideo && activeVideoId && (
                  <button 
                    onClick={() => onSelectVideo(activeVideoId)}
                    className="btn-gradient px-4 py-2 text-xs font-bold flex items-center gap-2"
                  >
                    Open in Timeline Player <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={resetForm}
                  className="btn-glass px-4 py-2 text-xs"
                >
                  Upload Another Video
                </button>
              </div>
            )}
          </div>

          {/* Telemetry metadata */}
          <div className="space-y-6">
            <div className="glass-panel p-5 space-y-4 border-white/5">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/[0.04] pb-3">Pipeline Pipeline Telemetry</h3>
              <div className="space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-yellow-400" /> ENGINE</span>
                  <span className="text-white font-bold">FastAPI + Async</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-blue-400" /> EMBEDDINGS</span>
                  <span className="text-white font-bold">CLIP + MiniLM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-purple-400" /> MODELS</span>
                  <span className="text-white font-bold">YOLOv8 + Whisper</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
