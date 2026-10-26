import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  Send, Sparkles, Brain, Cpu, Clock, HelpCircle, ArrowRight, Video, 
  Play, Pause, Volume2, VolumeX, RotateCcw, Download, Copy, Check, 
  Mic, MicOff, MessageSquare, Shield, Layers, FileText, Compass, 
  ExternalLink, ChevronDown, CheckCircle2, AlertCircle, Info, 
  RefreshCw, BarChart2, Tag, Flame, CornerDownLeft, Maximize2
} from "lucide-react";
import api, { API_BASE_URL } from "../../services/api";

// Available AI Personas
const PERSONAS = [
  {
    id: "analyst",
    name: "Security Analyst",
    icon: Shield,
    color: "from-cyan-500 to-blue-600",
    badgeColor: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
    desc: "Focuses on temporal milestones, tracking timelines, and entity confidence."
  },
  {
    id: "traffic",
    name: "Traffic Specialist",
    icon: Flame,
    color: "from-amber-500 to-orange-600",
    badgeColor: "bg-amber-500/15 border-amber-500/30 text-amber-300",
    desc: "Optimized for vehicle counts, roadway density, transit congestion & flow."
  },
  {
    id: "executive",
    name: "Executive Brief",
    icon: BarChart2,
    color: "from-purple-500 to-indigo-600",
    badgeColor: "bg-purple-500/15 border-purple-500/30 text-purple-300",
    desc: "High-level strategic summaries, KPI tables, and bulleted takeaways."
  },
  {
    id: "general",
    name: "Multimodal Copilot",
    icon: Brain,
    color: "from-emerald-500 to-teal-600",
    badgeColor: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
    desc: "Flexible open-ended conversational reasoning across all video modalities."
  }
];

// Lightweight Markdown Renderer Component
function MarkdownContent({ content }) {
  if (!content) return null;

  // Split lines
  const lines = content.split("\n");

  return (
    <div className="space-y-2 text-sm leading-relaxed text-gray-200">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Headers
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="text-sm font-bold text-white tracking-wide mt-3 mb-1 border-b border-white/5 pb-1">
              {trimmed.replace("### ", "")}
            </h4>
          );
        }
        if (trimmed.startsWith("#### ")) {
          return (
            <h5 key={idx} className="text-xs font-bold text-cyan-300 uppercase tracking-wider mt-2.5 mb-1">
              {trimmed.replace("#### ", "")}
            </h5>
          );
        }

        // Bullet points
        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          const itemText = trimmed.replace(/^[\*\-]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-cyan-400 font-bold mt-1 text-xs">•</span>
              <span className="flex-1">{formatInlineStyles(itemText)}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="font-mono text-xs font-semibold text-cyan-400 mt-0.5">{numMatch[1]}.</span>
              <span className="flex-1">{formatInlineStyles(numMatch[2])}</span>
            </div>
          );
        }

        // Blockquotes / Executive Callout Card
        if (trimmed.startsWith("> ")) {
          const quoteText = trimmed.replace(/^>\s+/, "");
          return (
            <div key={idx} className="my-2.5 p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/20 border-l-4 border-cyan-400 text-cyan-50 text-sm leading-relaxed shadow-lg shadow-cyan-950/30 backdrop-blur-sm">
              {formatInlineStyles(quoteText)}
            </div>
          );
        }

        // Horizontal Separator
        if (trimmed === "---") {
          return <hr key={idx} className="my-3 border-white/10" />;
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-gray-300 text-sm">
            {formatInlineStyles(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

// Inline formatting helper for bold, code, and links
function formatInlineStyles(text) {
  if (!text) return text;

  // Split tokens by bold **text** or inline `code`
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code key={match.index} className="font-mono text-xs bg-white/10 text-cyan-300 px-1.5 py-0.5 rounded border border-white/5">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={match.index} className="italic text-gray-300">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export default function VideoChatPanel({ 
  selectedVideoId = null, 
  onSelectVideo = null, 
  onNavigate = null 
}) {
  // Video selection state
  const [videoList, setVideoList] = useState([]);
  const [currentVideoId, setCurrentVideoId] = useState(selectedVideoId || null);
  const [videoDossier, setVideoDossier] = useState(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  // Persona state
  const [activePersona, setActivePersona] = useState("analyst");

  // Chat conversation state
  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      role: "assistant",
      persona: "analyst",
      content: "👋 Welcome to VideoSense Multimodal AI Chat! I have indexed all detected objects, OCR signage, Whisper dialogue, and scene cuts. Ask any question, or select a quick intelligence prompt below.",
      citations: [],
      suggestedPrompts: [
        "Provide an executive summary of this video",
        "How many vehicles were detected in total?",
        "What text or signboards appear on screen?",
        "When does the first entity appear?"
      ],
      modalities: ["Multimodal RAG", "Object Tracking", "OCR", "Audio"],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Player synchronization state
  const videoPlayerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeCitationTime, setActiveCitationTime] = useState(null);
  const [showBoundingBox, setShowBoundingBox] = useState(true);
  const [activeBox, setActiveBox] = useState(null);

  // Dossier sub-tabs
  const [dossierTab, setDossierTab] = useState("telemetry"); // 'telemetry' | 'objects' | 'ocr' | 'dialogue'

  // Voice Interaction state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const recognitionRef = useRef(null);

  const messageEndRef = useRef(null);
  const chatScrollContainerRef = useRef(null);

  // 1. Fetch Ingested Video List on mount
  useEffect(() => {
    let isMounted = true;
    const fetchVideos = async () => {
      try {
        const videos = await api.getVideos();
        if (isMounted) {
          setVideoList(videos || []);
          if (!currentVideoId && videos && videos.length > 0) {
            // Pick first completed video
            const completed = videos.find(v => v.status === "completed") || videos[0];
            setCurrentVideoId(completed.id);
          }
        }
      } catch (err) {
        console.error("Failed to load video list for chat:", err);
      }
    };
    fetchVideos();
    return () => { isMounted = false; };
  }, []);

  // Update currentVideoId when selectedVideoId prop changes
  useEffect(() => {
    if (selectedVideoId && selectedVideoId !== currentVideoId) {
      setCurrentVideoId(selectedVideoId);
    }
  }, [selectedVideoId]);

  // 2. Fetch Video Dossier whenever currentVideoId changes
  useEffect(() => {
    if (!currentVideoId) {
      setVideoDossier(null);
      return;
    }

    let isMounted = true;
    setLoadingDossier(true);
    const fetchDossier = async () => {
      try {
        const data = await api.getVideoDossier(currentVideoId);
        if (isMounted) {
          setVideoDossier(data);
          setLoadingDossier(false);
        }
      } catch (err) {
        console.error("Failed to fetch video dossier:", err);
        if (isMounted) setLoadingDossier(false);
      }
    };
    fetchDossier();
    return () => { isMounted = false; };
  }, [currentVideoId]);

  // 3. Initialize Speech Recognition (Web Speech API)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          handleSend(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (e) => {
        console.warn("Speech recognition error:", e.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Auto-scroll chat to latest message
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Format time (seconds -> mm:ss)
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Video Player Event Handlers
  const handleTimeUpdate = () => {
    if (videoPlayerRef.current) {
      setCurrentTime(videoPlayerRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoPlayerRef.current) {
      setDuration(videoPlayerRef.current.duration);
    }
  };

  // Seek Video to exact citation timestamp and trigger momentary highlight
  const seekToTimestamp = (seconds, box = null) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = Math.max(0, seconds);
      videoPlayerRef.current.play().catch(() => {});
      setIsPlaying(true);
      setActiveCitationTime(seconds);
      if (box) setActiveBox(box);

      // Auto-clear box after 4 seconds
      setTimeout(() => {
        setActiveBox(null);
      }, 4000);
    }
  };

  // Send Chat Message
  const handleSend = async (customPrompt = null) => {
    const queryText = (customPrompt || input).trim();
    if (!queryText) return;

    // Check if user clicked an Open-World detection trigger (e.g. ⚡ Run Open-World Detection for 'xyz')
    const detectMatch = queryText.match(/⚡\s*Run Open-World Detection for ['"]?([^'"]+)['"]?/i);
    if (detectMatch && currentVideoId) {
      const targetClass = detectMatch[1].trim();
      const userMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: `Run open-world detection for '${targetClass}'`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);
      setErrorMsg(null);

      try {
        const detRes = await api.detectCustomClasses(currentVideoId, [targetClass, `${targetClass} item`], 0.28);
        const count = detRes.data?.detected_count || 0;
        
        // Refresh video dossier
        try {
          const newDossier = await api.getVideoDossier(currentVideoId);
          setVideoDossier(newDossier);
        } catch (e) {}

        // Query the newly detected frames
        const followupRes = await api.sendChatMessage({
          message: `In which frame did ${targetClass} appear?`,
          videoId: currentVideoId,
          persona: activePersona,
          history: []
        });

        const assistantMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          persona: followupRes.persona || activePersona,
          content: `✅ **Open-World Vision Scan Complete:** Successfully scanned video keyframes and extracted **${count} new detection(s)** for **'${targetClass}'**!\n\n${followupRes.answer}`,
          citations: followupRes.citations || [],
          suggestedPrompts: followupRes.suggested_prompts || [],
          modalities: ["Grounding DINO", "Zero-Shot Discovery", ...(followupRes.modality_sources || [])],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      } catch (detErr) {
        console.error("Open-world detection error:", detErr);
        // Fallback to normal chat
      }
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInput("");
    setIsTyping(true);
    setErrorMsg(null);

    try {
      // Build conversation history payload
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await api.sendChatMessage({
        message: queryText,
        videoId: currentVideoId,
        persona: activePersona,
        history: historyPayload
      });

      const assistantMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        persona: res.persona || activePersona,
        content: res.answer,
        citations: res.citations || [],
        suggestedPrompts: res.suggested_prompts || [],
        modalities: res.modality_sources || ["Multimodal RAG"],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If Text-To-Speech is active, read the summary sentence aloud
      if (ttsEnabled && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const cleanText = res.answer.replace(/[*#`_]/g, "").slice(0, 200);
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.rate = 1.05;
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn("TTS playback error:", e);
        }
      }

    } catch (err) {
      console.error("AI Chat failed:", err);
      setErrorMsg("Failed to communicate with VideoSense Intelligence backend. Please ensure the backend is running.");
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: "assistant",
          persona: activePersona,
          content: "⚠️ **System Communication Notice:** Unable to reach the AI reasoning pipeline. The server might be processing other jobs or the video has not completed feature extraction.",
          citations: [],
          suggestedPrompts: ["Check video processing status", "Try a simpler query"],
          modalities: ["Error"],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Toggle Voice Recognition
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn("Mic start error:", e);
        setIsListening(false);
      }
    }
  };

  // Speak specific message
  const speakMessage = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#`_]/g, "").slice(0, 300);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  // Copy message text to clipboard
  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export Chat Session as Markdown file
  const handleExportChat = () => {
    const activeVideoName = videoDossier?.filename || "Global VideoSense Library";
    let exportText = `# VideoSense AI Chat Intelligence Report\n`;
    exportText += `**Video:** ${activeVideoName}\n`;
    exportText += `**Date:** ${new Date().toLocaleString()}\n`;
    exportText += `**Selected Persona:** ${PERSONAS.find(p => p.id === activePersona)?.name}\n\n---\n\n`;

    messages.forEach((m) => {
      const roleTitle = m.role === "user" ? "👤 User Query" : `🤖 VideoSense AI (${m.persona || "Assistant"})`;
      exportText += `### ${roleTitle} [${m.timestamp}]\n\n${m.content}\n\n`;
      if (m.citations && m.citations.length > 0) {
        exportText += `**Citations:**\n`;
        m.citations.forEach(c => {
          exportText += `- [${formatTime(c.timestamp)}] ${c.label} (${c.modality}, Conf: ${Math.round((c.confidence || 0) * 100)}%)\n`;
        });
        exportText += `\n`;
      }
      exportText += `---\n\n`;
    });

    const blob = new Blob([exportText], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `videosense-chat-export-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear Chat History
  const handleClearChat = () => {
    if (window.confirm("Clear all chat messages and reset conversation history?")) {
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          role: "assistant",
          persona: activePersona,
          content: "Conversation history cleared. Ready for your next multimodal question.",
          citations: [],
          suggestedPrompts: [
            "Summarize the events in this video",
            "What objects were detected?",
            "What text appears on screen?"
          ],
          modalities: ["Ready"],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const activeVideo = useMemo(() => {
    return videoList.find(v => v.id === currentVideoId) || null;
  }, [videoList, currentVideoId]);

  return (
    <div className="w-full space-y-4">
      {/* 1. TOP HEADER & TELEMETRY CONTROLS */}
      <div className="glass-panel p-4 rounded-2xl border-white/[0.06] shadow-glass flex flex-wrap items-center justify-between gap-4">
        {/* Left: Title & Persona Picker */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">AI Multimodal Video Chat</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Grounded RAG
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Ask natural questions grounded in YOLO entities, EasyOCR signages, and Whisper audio.
              </p>
            </div>
          </div>

          {/* Persona Switcher Chips */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/5 p-1 rounded-xl">
            {PERSONAS.map((p) => {
              const Icon = p.icon;
              const isSelected = activePersona === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePersona(p.id)}
                  title={p.desc}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? `bg-gradient-to-r ${p.color} text-white shadow-md`
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Video Selector & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Video Selector Dropdown */}
          <div className="relative">
            <select
              value={currentVideoId || ""}
              onChange={(e) => {
                const vid = e.target.value;
                setCurrentVideoId(vid || null);
                if (onSelectVideo) onSelectVideo(vid);
              }}
              className="bg-black/40 border border-white/10 hover:border-cyan-500/40 text-xs font-medium text-white pl-8 pr-8 py-2 rounded-xl focus:outline-none focus:border-cyan-500 appearance-none transition-all cursor-pointer min-w-[220px]"
            >
              <option value="" className="bg-gray-900 text-gray-300">
                🌐 Global Video Index (Cross-Video RAG)
              </option>
              {videoList.map((v) => (
                <option key={v.id} value={v.id} className="bg-gray-900 text-white">
                  🎥 {v.filename} {v.duration ? `(${Math.round(v.duration)}s)` : ""}
                </option>
              ))}
            </select>
            <Video className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Text-To-Speech Toggle */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            title={ttsEnabled ? "Audio Readout Enabled" : "Enable Audio Readout (TTS)"}
            className={`p-2 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 ${
              ttsEnabled
                ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                : "bg-white/5 border-white/5 text-gray-400 hover:text-gray-200"
            }`}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Export Chat Button */}
          <button
            onClick={handleExportChat}
            title="Export Conversation as Markdown"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-medium"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Reset/Clear Chat Button */}
          <button
            onClick={handleClearChat}
            title="Reset Chat Session"
            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/30 text-gray-400 hover:text-red-400 transition-all text-xs"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. MAIN SPLIT-SCREEN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: SYNCHRONIZED VIDEO PLAYER & INTELLIGENCE DOSSIER */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* HTML5 Video Player with Interactive Reticle Overlay */}
          <div className="glass-panel p-4 rounded-2xl border-white/[0.06] shadow-glass relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/5 text-xs">
              <div className="flex items-center gap-2 text-white font-semibold truncate max-w-[280px]">
                <Video className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">{activeVideo?.filename || "Live Video Synchronizer"}</span>
              </div>
              {activeCitationTime !== null && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <Clock className="w-3 h-3 animate-spin" />
                  Cited: {formatTime(activeCitationTime)}
                </span>
              )}
            </div>

            {/* Video Viewport Container */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10 group shadow-inner">
              {currentVideoId ? (
                <>
                  <video
                    ref={videoPlayerRef}
                    src={`${API_BASE_URL}/api/v1/videos/${currentVideoId}/stream`}
                    className="w-full h-full object-contain"
                    controls
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />

                  {/* Bounding Box Reticle Overlay for Active Citation */}
                  {showBoundingBox && activeBox && (
                    <div
                      className="absolute border-2 border-cyan-400 bg-cyan-400/20 rounded pointer-events-none transition-all duration-300 animate-pulse"
                      style={{
                        left: `${(activeBox[0] || 0) * 100}%`,
                        top: `${(activeBox[1] || 0) * 100}%`,
                        width: `${((activeBox[2] || 1) - (activeBox[0] || 0)) * 100}%`,
                        height: `${((activeBox[3] || 1) - (activeBox[1] || 0)) * 100}%`,
                      }}
                    >
                      <span className="absolute -top-5 left-0 bg-cyan-500 text-black font-mono font-bold text-[9px] px-1.5 py-0.5 rounded shadow">
                        Target Reticle
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-gray-500">
                  <Video className="w-12 h-12 mb-2 text-gray-600" />
                  <p className="text-xs font-medium">Select a video from the top dropdown to activate the synchronized timeline player.</p>
                </div>
              )}
            </div>

            {/* Playback Controls Helper */}
            {currentVideoId && (
              <div className="flex items-center justify-between pt-2.5 text-xs text-gray-400 font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{formatTime(currentTime)}</span>
                  <span>/</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowBoundingBox(!showBoundingBox)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                      showBoundingBox
                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                        : "bg-white/5 border-white/5 text-gray-400"
                    }`}
                  >
                    Reticle Overlay: {showBoundingBox ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Intelligence Dossier Tabs */}
          <div className="glass-panel p-4 rounded-2xl border-white/[0.06] shadow-glass space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Video Dossier</span>
              </div>
              
              {/* Sub-tab navigation */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5 text-[11px]">
                <button
                  onClick={() => setDossierTab("telemetry")}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    dossierTab === "telemetry" ? "bg-white/10 text-white font-semibold" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Stats
                </button>
                <button
                  onClick={() => setDossierTab("objects")}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    dossierTab === "objects" ? "bg-white/10 text-white font-semibold" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Objects ({videoDossier?.stats?.unique_classes || 0})
                </button>
                <button
                  onClick={() => setDossierTab("ocr")}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    dossierTab === "ocr" ? "bg-white/10 text-white font-semibold" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  OCR Text
                </button>
                <button
                  onClick={() => setDossierTab("dialogue")}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    dossierTab === "dialogue" ? "bg-white/10 text-white font-semibold" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Audio
                </button>
              </div>
            </div>

            {/* Dossier Tab Content */}
            <div className="min-h-[160px] max-h-[240px] overflow-y-auto scrollbar-thin pr-1 text-xs">
              {loadingDossier ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500 gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                  <span>Loading multimodal dossier...</span>
                </div>
              ) : !videoDossier ? (
                <div className="text-center py-8 text-gray-500">
                  Select a video to view real-time entity tracking and telemetry.
                </div>
              ) : (
                <>
                  {/* TAB 1: TELEMETRY & STATS */}
                  {dossierTab === "telemetry" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                          <span className="text-[10px] text-gray-400 uppercase font-mono block">Resolution / FPS</span>
                          <span className="text-xs font-bold text-white font-mono mt-0.5 block">
                            {videoDossier.resolution} @ {videoDossier.fps} FPS
                          </span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                          <span className="text-[10px] text-gray-400 uppercase font-mono block">Duration</span>
                          <span className="text-xs font-bold text-white font-mono mt-0.5 block">
                            {Math.round(videoDossier.duration || 0)}s ({formatTime(videoDossier.duration)})
                          </span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                          <span className="text-[10px] text-gray-400 uppercase font-mono block">Objects Detected</span>
                          <span className="text-xs font-bold text-cyan-400 font-mono mt-0.5 block">
                            {videoDossier.stats.total_objects} instances ({videoDossier.stats.unique_classes} classes)
                          </span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                          <span className="text-[10px] text-gray-400 uppercase font-mono block">OCR Text Signages</span>
                          <span className="text-xs font-bold text-amber-400 font-mono mt-0.5 block">
                            {videoDossier.stats.total_text_signs} frame signs
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/15 text-gray-300">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                          Multimodal Index Status
                        </span>
                        <p className="text-[11px] leading-relaxed">
                          YOLOv8 bounding boxes, EasyOCR word clusters, and Whisper transcripts are cached in FAISS vector embeddings for zero-latency retrieval.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: DETECTED OBJECT CLASSES */}
                  {dossierTab === "objects" && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-gray-400">
                        Click any detected entity class to immediately ask the AI about its occurrence:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {videoDossier.object_classes && Object.entries(videoDossier.object_classes).length > 0 ? (
                          Object.entries(videoDossier.object_classes).map(([label, count]) => (
                            <button
                              key={label}
                              onClick={() => handleSend(`How many ${label} are in this video and when do they appear?`)}
                              className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 hover:border-cyan-400/50 text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition-all group"
                            >
                              <Tag className="w-3 h-3 text-cyan-400" />
                              <span className="capitalize">{label}</span>
                              <span className="font-mono text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-white group-hover:bg-cyan-500/40">
                                {count}x
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="text-gray-500 py-3">No object entities indexed for this video.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: OCR SIGNAGE HIGHLIGHTS */}
                  {dossierTab === "ocr" && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-gray-400">
                        Signboards and on-screen text recognized in the feed:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {videoDossier.ocr_highlights && videoDossier.ocr_highlights.length > 0 ? (
                          videoDossier.ocr_highlights.map((txt, i) => (
                            <button
                              key={i}
                              onClick={() => handleSend(`Where is the text '${txt}' shown in the video?`)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 hover:border-amber-400/50 text-amber-200 text-xs font-mono flex items-center gap-1.5 transition-all"
                            >
                              <FileText className="w-3 h-3 text-amber-400" />
                              <span className="truncate max-w-[150px]">"{txt}"</span>
                            </button>
                          ))
                        ) : (
                          <div className="text-gray-500 py-3">No text signages detected.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: AUDIO PREVIEW */}
                  {dossierTab === "dialogue" && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-gray-400">
                        Transcribed speech from Whisper audio model:
                      </p>
                      {videoDossier.audio_preview ? (
                        <div className="p-3 bg-black/30 border border-white/5 rounded-xl text-gray-300 font-mono text-xs leading-relaxed">
                          "{videoDossier.audio_preview}"
                        </div>
                      ) : (
                        <div className="text-gray-500 py-3">No active speech or dialogue recorded in this stream.</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 1-Click Quick Intelligence Prompt Bar */}
          <div className="glass-panel p-3.5 rounded-2xl border-white/[0.06] shadow-glass space-y-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Quick Intelligence Queries
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleSend("Provide a comprehensive executive summary of this video.")}
                className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-cyan-500/30 text-left text-gray-300 hover:text-white transition-all font-medium flex items-center gap-2"
              >
                <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">📋 Executive Brief</span>
              </button>
              <button
                onClick={() => handleSend("How many vehicles and moving entities were detected?")}
                className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-amber-500/30 text-left text-gray-300 hover:text-white transition-all font-medium flex items-center gap-2"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">🚦 Traffic Density</span>
              </button>
              <button
                onClick={() => handleSend("List chronological event milestones with timestamps.")}
                className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-purple-500/30 text-left text-gray-300 hover:text-white transition-all font-medium flex items-center gap-2"
              >
                <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="truncate">⏱️ Timeline Milestones</span>
              </button>
              <button
                onClick={() => handleSend("What signs, banners, or text appear on screen?")}
                className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-emerald-500/30 text-left text-gray-300 hover:text-white transition-all font-medium flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">🏷️ Screen Signages</span>
              </button>
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: CONVERSATIONAL AI CONSOLE & CITATIONS */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 flex flex-col h-[720px] glass-panel rounded-2xl border-white/[0.06] shadow-glass overflow-hidden">
          
          {/* Chat Stream Area */}
          <div 
            ref={chatScrollContainerRef}
            className="flex-1 p-5 overflow-y-auto space-y-5 scrollbar-thin scrollbar-thumb-white/10"
          >
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              const personaConfig = PERSONAS.find(p => p.id === (msg.persona || activePersona)) || PERSONAS[0];

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5`}
                >
                  {/* Sender Label & Timestamp */}
                  <div className="flex items-center gap-2 px-2 text-[10px] font-mono text-gray-500">
                    {!isUser && (
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${personaConfig.badgeColor}`}>
                        {personaConfig.name}
                      </span>
                    )}
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[92%] rounded-2xl p-4 text-xs transition-all shadow-lg ${
                      isUser
                        ? "bg-gradient-to-r from-cyan-600/80 to-blue-600/80 text-white rounded-tr-sm shadow-cyan-900/20"
                        : "bg-black/50 border border-white/10 text-gray-200 rounded-tl-sm backdrop-blur-md"
                    }`}
                  >
                    {/* Assistant Header Modalities */}
                    {!isUser && msg.modalities && msg.modalities.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pb-2.5 mb-2.5 border-b border-white/10 text-[10px]">
                        <span className="text-gray-400 font-medium">Modalities used:</span>
                        {msg.modalities.map((mod, i) => (
                          <span
                            key={i}
                            className="bg-white/10 text-cyan-300 px-2 py-0.5 rounded-full font-mono text-[9px] border border-white/5"
                          >
                            {mod}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Main Markdown Text */}
                    <MarkdownContent content={msg.content} />

                    {/* Visual Evidence Citations */}
                    {!isUser && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5" />
                          Visual Citations & Keyframes (Click to seek player):
                        </span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                          {msg.citations.map((cit, citIdx) => {
                            const timeFmt = formatTime(cit.timestamp);
                            const thumb = cit.thumbnail_url 
                              ? (cit.thumbnail_url.startsWith("http") ? cit.thumbnail_url : `${API_BASE_URL}${cit.thumbnail_url}`)
                              : null;

                            return (
                              <button
                                key={citIdx}
                                onClick={() => seekToTimestamp(cit.timestamp, cit.box)}
                                className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 text-left transition-all group"
                              >
                                {thumb ? (
                                  <div className="w-14 h-10 rounded-lg overflow-hidden bg-black shrink-0 relative border border-white/10">
                                    <img src={thumb} alt={cit.label} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent flex items-center justify-center transition-all">
                                      <Play className="w-3 h-3 text-white drop-shadow opacity-75 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                                    <Play className="w-3.5 h-3.5 text-cyan-400" />
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {cit.label.startsWith("Frame #") ? (
                                        <>
                                          <span className="font-mono text-[9px] font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-500/40 px-1.5 py-0.5 rounded shrink-0">
                                            {cit.label.split(":")[0]}
                                          </span>
                                          <span className="font-bold text-white text-[11px] truncate group-hover:text-cyan-300">
                                            {cit.label.split(":").slice(1).join(":").trim()}
                                          </span>
                                        </>
                                      ) : (
                                        <span className="font-bold text-white text-[11px] truncate group-hover:text-cyan-300">
                                          {cit.label}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/15 px-1.5 py-0.5 rounded ml-1 shrink-0">
                                      [{timeFmt}]
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[9px] text-gray-400 mt-0.5">
                                    <span className="uppercase font-mono bg-white/5 px-1 rounded">{cit.modality}</span>
                                    {cit.confidence && (
                                      <span>{Math.round(cit.confidence * 100)}% match</span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Assistant Message Actions */}
                    {!isUser && (
                      <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-white/5 text-gray-400">
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          title="Copy response"
                          className="hover:text-white p-1 rounded transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => speakMessage(msg.content)}
                          title="Read aloud"
                          className="hover:text-white p-1 rounded transition-colors"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Suggested Follow-ups Chips */}
                  {!isUser && msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5 max-w-[92%]">
                      {msg.suggestedPrompts.map((promptText, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleSend(promptText)}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 text-gray-300 hover:text-cyan-300 transition-all flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>{promptText}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing / Thinking Shimmer Indicator */}
            {isTyping && (
              <div className="flex items-start gap-2">
                <div className="bg-black/40 border border-cyan-500/30 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span className="text-xs text-cyan-300 font-mono">
                    Searching FAISS vector space & reasoning with video models...
                  </span>
                </div>
              </div>
            )}

            <div ref={messageEndRef} />
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="px-5 py-2 bg-red-500/10 border-t border-red-500/20 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Chat Input Console Bar */}
          <div className="p-4 bg-black/60 border-t border-white/[0.06] backdrop-blur-lg">
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 hover:border-cyan-500/40 rounded-2xl p-1.5 transition-all focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/30">
              
              {/* Voice Input (Speech-to-Text) Button */}
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  title={isListening ? "Stop Listening" : "Speak your query (Speech to Text)"}
                  className={`p-2.5 rounded-xl transition-all ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}

              {/* Text Input */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  isListening
                    ? "Listening... Speak your question now"
                    : activeVideo
                    ? `Ask about ${activeVideo.filename} (e.g. 'How many vehicles?', 'What text is visible?')...`
                    : "Ask anything about the video repository..."
                }
                className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 px-2 font-medium"
              />

              {/* Clear button if text entered */}
              {input && (
                <button
                  onClick={() => setInput("")}
                  className="text-gray-500 hover:text-gray-300 p-1 text-xs"
                >
                  ✕
                </button>
              )}

              {/* Send Button */}
              <button
                disabled={!input.trim() || isTyping}
                onClick={() => handleSend()}
                className={`p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 ${
                  input.trim() && !isTyping
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/30"
                    : "bg-white/5 text-gray-500 cursor-not-allowed"
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between px-2 pt-2 text-[10px] text-gray-500">
              <span className="flex items-center gap-1 font-mono">
                <CornerDownLeft className="w-3 h-3 text-cyan-400" />
                Press Enter to send
              </span>
              <span>Grounded on YOLOv8, EasyOCR, Whisper & FAISS embeddings</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
