import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Bell, BellRing, CheckCheck, Trash2, Filter, Search, ShieldAlert, ShieldCheck,
  Cpu, FileText, CheckCircle2, AlertTriangle, AlertCircle, Info, Sparkles,
  Zap, Play, ArrowRight, Settings, Sliders, Volume2, VolumeX, Download,
  ExternalLink, Clock, X, RefreshCw, ShoppingBag, Boxes, Eye, EyeOff,
  Layers, Terminal, Check, ChevronDown, ChevronUp, BellOff, Volume1,
  Radio, CheckCircle, UploadCloud
} from "lucide-react";
import api, { API_V1 } from "../../services/api";

// Sound synthesis helper using browser Web Audio API (zero external sound file dependency)
const playChime = (type = "info") => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    
    // Choose frequencies based on alert type
    let f1 = 587.33; // D5
    let f2 = 880.00; // A5
    if (type === "critical") {
      f1 = 440.00; // A4
      f2 = 349.23; // F4
    } else if (type === "warning") {
      f1 = 523.25; // C5
      f2 = 659.25; // E5
    } else if (type === "success") {
      f1 = 523.25; // C5
      f2 = 783.99; // G5
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(f1, now);
    osc.frequency.exponentialRampToValueAtTime(f2, now + 0.12);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {
    // AudioContext blocked or not supported
  }
};

export default function NotificationCenter({ onNavigate, onSelectVideo }) {
  // 1. Notifications & Stats State (Real backend-driven)
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    critical: 0,
    warning: 0,
    success: 0,
    info: 0,
    resolved: 0,
    by_category: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(new Date());

  // 2. User Preferences State
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem("videosense_notif_prefs");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      soundEnabled: true,
      browserPushEnabled: false,
      categories: {
        security: true,
        processing: true,
        delivery: true,
        system: true,
        reports: true
      },
      minSeverity: "all",
      autoArchiveDays: 7
    };
  });

  // UI state
  const [activeCategory, setActiveCategory] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'unread', 'read'
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [browserPermission, setBrowserPermission] = useState(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const prevUnreadRef = useRef(0);

  // Fetch notifications and stats from backend API
  const fetchNotificationData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const [listData, statsData] = await Promise.all([
        api.getNotifications({
          category: activeCategory !== "all" ? activeCategory : undefined,
          severity: severityFilter !== "all" ? severityFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          search: searchQuery.trim() || undefined,
          limit: 100
        }),
        api.getNotificationStats()
      ]);

      setNotifications(listData || []);
      if (statsData) {
        setStats(statsData);
        // Play audio chime if new unread notification arrived
        if (
          prevUnreadRef.current !== undefined &&
          statsData.unread > prevUnreadRef.current &&
          preferences.soundEnabled
        ) {
          playChime("info");
        }
        prevUnreadRef.current = statsData.unread;

        // Sync count with localStorage for Navbar fallback
        try {
          localStorage.setItem("videosense_unread_count", String(statsData.unread));
        } catch (e) {}
      }
      setLastSyncedTime(new Date());
    } catch (err) {
      console.warn("Failed to fetch notification feed:", err);
    } finally {
      setIsLoading(false);
      if (showIndicator) setIsRefreshing(false);
    }
  }, [activeCategory, severityFilter, statusFilter, searchQuery, preferences.soundEnabled]);

  // Initial fetch and fetch on filter change
  useEffect(() => {
    fetchNotificationData();
  }, [fetchNotificationData]);

  // Real-time polling every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchNotificationData(false);
    }, 4000);
    return () => clearInterval(timer);
  }, [fetchNotificationData]);

  // Save preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("videosense_notif_prefs", JSON.stringify(preferences));
    } catch (e) {}
  }, [preferences]);

  // Request browser notification permission
  const handleRequestPushPermission = async () => {
    if (!("Notification" in window)) {
      showFeedback("Browser notifications are not supported in this environment.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      if (permission === "granted") {
        setPreferences(p => ({ ...p, browserPushEnabled: true }));
        showFeedback("Browser notifications successfully enabled!");
        new Notification("VideoSense AI Notifications", {
          body: "Push notification alert channel is now active.",
          icon: "/favicon.ico"
        });
      } else {
        setPreferences(p => ({ ...p, browserPushEnabled: false }));
        showFeedback("Browser notification permission was denied.");
      }
    } catch (e) {
      showFeedback("Failed to request notification permission.");
    }
  };

  const showFeedback = (text) => {
    setFeedbackMsg(text);
    setTimeout(() => setFeedbackMsg(""), 3500);
  };

  // Actions
  const handleMarkAsRead = async (id) => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, isRead: true } : n));
    setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    try {
      await api.markNotificationRead(id);
    } catch (e) {
      fetchNotificationData();
    }
  };

  const handleToggleRead = async (id) => {
    const target = notifications.find(n => n.id === id);
    if (!target) return;
    const newRead = !target.read;

    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: newRead, isRead: newRead } : n));
    setStats(prev => ({
      ...prev,
      unread: newRead ? Math.max(0, prev.unread - 1) : prev.unread + 1
    }));

    try {
      if (newRead) {
        await api.markNotificationRead(id);
      } else {
        await api.markNotificationUnread(id);
      }
    } catch (e) {
      fetchNotificationData();
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
    setStats(prev => ({ ...prev, unread: 0 }));
    try {
      await api.markAllNotificationsRead();
      showFeedback("All notifications marked as read");
    } catch (e) {
      fetchNotificationData();
    }
  };

  const handleDelete = async (id) => {
    const target = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (target && !target.read) {
      setStats(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        unread: Math.max(0, prev.unread - 1)
      }));
    } else {
      setStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    }

    try {
      await api.deleteNotification(id);
      showFeedback("Notification dismissed");
    } catch (e) {
      fetchNotificationData();
    }
  };

  const handleClearRead = async () => {
    const readCount = notifications.filter(n => n.read).length;
    setNotifications(prev => prev.filter(n => !n.read));
    setStats(prev => ({ ...prev, total: Math.max(0, prev.total - readCount) }));

    try {
      await api.clearReadNotifications();
      showFeedback(`Cleared ${readCount} read notifications`);
    } catch (e) {
      fetchNotificationData();
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notifications, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `videosense_notifications_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
    showFeedback("Exported notification audit trail (JSON)");
  };

  // Categories
  const categories = [
    { id: "all", label: "All Feeds", icon: Layers },
    { id: "processing", label: "AI Pipeline", icon: Zap },
    { id: "security", label: "Security & Threat", icon: ShieldAlert },
    { id: "delivery", label: "Logistics & POD", icon: ShoppingBag },
    { id: "system", label: "System & Infrastructure", icon: Cpu },
    { id: "reports", label: "Reports & Dossiers", icon: FileText }
  ];

  // Dynamic counts
  const totalCount = stats.total || notifications.length;
  const unreadCount = stats.unread;
  const criticalCount = stats.critical;
  const warningCount = stats.warning;

  const getCategoryIcon = (type) => {
    switch (type) {
      case "security": return ShieldAlert;
      case "processing": return Zap;
      case "delivery": return ShoppingBag;
      case "system": return Cpu;
      case "reports": return FileText;
      default: return Bell;
    }
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case "critical":
        return {
          cardBg: "bg-rose-500/[0.04] border-rose-500/20 hover:border-rose-500/35",
          iconBg: "bg-rose-500/10 border-rose-500/25 text-rose-400",
          textBadge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
          icon: AlertCircle
        };
      case "warning":
        return {
          cardBg: "bg-amber-500/[0.04] border-amber-500/20 hover:border-amber-500/35",
          iconBg: "bg-amber-500/10 border-amber-500/25 text-amber-400",
          textBadge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          icon: AlertTriangle
        };
      case "success":
        return {
          cardBg: "bg-emerald-500/[0.03] border-emerald-500/15 hover:border-emerald-500/30",
          iconBg: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
          textBadge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          icon: CheckCircle2
        };
      default:
        return {
          cardBg: "bg-cyan-500/[0.02] border-cyan-500/15 hover:border-cyan-500/30",
          iconBg: "bg-cyan-500/10 border-cyan-500/25 text-cyan-400",
          textBadge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
          icon: Info
        };
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 select-none pb-12">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-2 bg-[#0d1527] border border-cyan-500/30 text-cyan-300 text-xs px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="w-4 h-4 text-cyan-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>
            Notification Command Center
            {unreadCount > 0 && (
              <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-accent-pink/15 text-accent-pink border border-accent-pink/30 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-pink animate-ping"></span>
                {unreadCount} Unread
              </span>
            )}
          </h2>
          <p className="text-gray-400 mt-1.5 text-xs md:text-sm">
            Centralized event bus aggregating AI pipeline milestones, security triggers, logistics proof, and infrastructure alerts.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => fetchNotificationData(true)}
            className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-400/40 text-xs text-gray-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            title="Refresh event stream"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-400/40 text-xs text-gray-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mark All Read</span>
            </button>
          )}

          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-xs text-gray-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            title="Export notification audit log as JSON"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => setIsPreferencesOpen(!isPreferencesOpen)}
            className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              isPreferencesOpen 
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300" 
                : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-gray-300 hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-4 border-white/[0.06] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-white font-mono">{totalCount}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Total Alerts</div>
          </div>
        </div>

        <div className="glass-panel p-4 border-white/[0.06] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-pink/10 border border-accent-pink/20 text-accent-pink flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-accent-pink font-mono">{unreadCount}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Unread Feed</div>
          </div>
        </div>

        <div className="glass-panel p-4 border-white/[0.06] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-rose-400 font-mono">{criticalCount}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Critical Threats</div>
          </div>
        </div>

        <div className="glass-panel p-4 border-white/[0.06] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-amber-400 font-mono">{warningCount}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Resource Warnings</div>
          </div>
        </div>
      </div>

      {/* Live Event Stream Status Bar */}
      <div className="glass-panel p-3.5 border-white/[0.06] bg-gradient-to-r from-cyan-950/20 via-background-dark to-purple-950/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </div>
          <span className="text-xs font-semibold text-gray-200">Event Stream:</span>
          <span className="text-[11px] text-gray-400">
            Connected to VideoSense AI Event Bus. Actively receiving real pipeline milestones and detection events.
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-400 font-mono">
          <span>Synced: {lastSyncedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <button
            onClick={() => fetchNotificationData(true)}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[11px] font-medium text-cyan-300 transition-all cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh Stream
          </button>
        </div>
      </div>

      {/* Preferences Panel Drawer (Collapsible) */}
      {isPreferencesOpen && (
        <div className="glass-panel p-5 border-cyan-500/30 bg-[#090d16]/90 space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Notification Alert Channel Rules</h3>
            </div>
            <button
              onClick={() => setIsPreferencesOpen(false)}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Audio chime toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2.5">
                {preferences.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-gray-500" />
                )}
                <div>
                  <div className="font-semibold text-white">Synthesized Audio Chimes</div>
                  <div className="text-[10px] text-gray-400">Play tone for critical and completed pipeline runs</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => playChime("success")}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 border border-white/10"
                >
                  Test Tone
                </button>
                <input
                  type="checkbox"
                  checked={preferences.soundEnabled}
                  onChange={(e) => setPreferences(p => ({ ...p, soundEnabled: e.target.checked }))}
                  className="rounded border-white/20 text-cyan-500 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Browser push notifications */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2.5">
                <BellRing className={`w-4 h-4 ${preferences.browserPushEnabled ? "text-emerald-400" : "text-gray-500"}`} />
                <div>
                  <div className="font-semibold text-white">Desktop Push Alerts</div>
                  <div className="text-[10px] text-gray-400">
                    Native browser toast alerts when tab is in background ({browserPermission})
                  </div>
                </div>
              </div>
              <button
                onClick={handleRequestPushPermission}
                className={`px-3 py-1 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
                  browserPermission === "granted" && preferences.browserPushEnabled
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                    : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20"
                }`}
              >
                {browserPermission === "granted" ? "Active" : "Enable"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Controls */}
      <div className="space-y-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const count = cat.id === "all" 
              ? totalCount 
              : (stats.by_category && stats.by_category[cat.id]) || notifications.filter(n => (n.category || n.type) === cat.id).length;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-500/10"
                    : "bg-white/[0.02] border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-gray-400"}`} />
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? "bg-cyan-400/20 text-cyan-200" : "bg-white/5 text-gray-500"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter sub-bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/[0.015] border border-white/[0.04] p-2.5 rounded-2xl">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notifications by title, video, model, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/20 border border-white/5 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/40 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Severity filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-500/40 cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Threats</option>
              <option value="warning">Warnings</option>
              <option value="success">Success / Completed</option>
              <option value="info">Informational</option>
            </select>

            {/* Read status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-500/40 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>

            {/* Clear Read Button */}
            {notifications.some(n => n.read) && (
              <button
                onClick={handleClearRead}
                className="p-1.5 rounded-xl bg-white/[0.03] hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/30 text-gray-400 hover:text-rose-300 transition-all cursor-pointer"
                title="Clear read notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="glass-panel p-12 text-center border-dashed border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto"></div>
            <div className="text-xs text-gray-400">Loading live notification feed from database...</div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-panel p-12 text-center border-dashed border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto text-gray-500">
              <BellOff className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-gray-300">
              {searchQuery || severityFilter !== "all" || statusFilter !== "all" || activeCategory !== "all"
                ? "No matching notifications found"
                : "No notifications yet"}
            </div>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery || severityFilter !== "all" || statusFilter !== "all" || activeCategory !== "all"
                ? "Try clearing your search filters or switching categories."
                : "Upload and analyze a video to receive analysis updates here."}
            </p>
            {searchQuery || severityFilter !== "all" || statusFilter !== "all" || activeCategory !== "all" ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSeverityFilter("all");
                  setStatusFilter("all");
                  setActiveCategory("all");
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-cyan-300 border border-white/10 cursor-pointer"
              >
                Reset All Filters
              </button>
            ) : (
              onNavigate && (
                <button
                  onClick={() => onNavigate("player")}
                  className="px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-xs text-cyan-300 border border-cyan-500/30 flex items-center gap-2 mx-auto cursor-pointer transition-all shadow-md shadow-cyan-500/10"
                >
                  <UploadCloud className="w-4 h-4 text-cyan-400" />
                  <span>Upload & Analyze Video</span>
                </button>
              )
            )}
          </div>
        ) : (
          notifications.map((notif) => {
            const catType = notif.category || notif.type;
            const CatIcon = getCategoryIcon(catType);
            const style = getSeverityStyle(notif.severity);
            const SeverityIcon = style.icon;
            const isExpanded = expandedId === notif.id;

            return (
              <div
                key={notif.id}
                className={`glass-panel p-4 md:p-5 border transition-all duration-200 relative overflow-hidden group ${style.cardBg} ${
                  !notif.read ? "ring-1 ring-cyan-500/30" : "opacity-90"
                }`}
              >
                {/* Visual Unread Glow Indicator */}
                {!notif.read && (
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-cyan-400 to-accent-pink shadow-md shadow-cyan-400/50"></div>
                )}

                <div className="flex items-start gap-3.5 pl-1.5">
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${style.iconBg}`}>
                    <SeverityIcon className="w-4.5 h-4.5" />
                  </div>

                  {/* Content Body */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center flex-wrap gap-2">
                        <h4 className={`text-xs md:text-sm font-bold ${!notif.read ? "text-white" : "text-gray-300"}`}>
                          {notif.title}
                        </h4>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border uppercase tracking-wider font-semibold ${style.textBadge}`}>
                          {notif.severity}
                        </span>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-gray-500 font-mono">
                        <Clock className="w-3 h-3 text-gray-600" />
                        <span>{notif.time}</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 leading-relaxed">
                      {notif.message || notif.desc}
                    </p>

                    {/* Tags & Action Bar */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center flex-wrap gap-2 text-gray-400">
                        {/* Category */}
                        <span className="flex items-center gap-1 text-[10px] font-mono text-gray-400 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/5 uppercase tracking-wider">
                          <CatIcon className="w-3 h-3 text-cyan-400" />
                          {catType}
                        </span>

                        {/* Model */}
                        {notif.model && (
                          <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                            {notif.model}
                          </span>
                        )}

                        {/* Video Reference */}
                        {notif.videoTitle && (
                          <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                            <span>Src:</span>
                            <span className="text-gray-300 font-medium">{notif.videoTitle}</span>
                          </span>
                        )}
                      </div>

                      {/* Right action triggers */}
                      <div className="flex items-center gap-2">
                        {/* Contextual Deep Link Button */}
                        {notif.actionTab && (
                          <button
                            onClick={() => {
                              if (!notif.read) handleMarkAsRead(notif.id);
                              if (notif.videoId && onSelectVideo) {
                                onSelectVideo(notif.videoId);
                              }
                              if (onNavigate) {
                                onNavigate(notif.actionTab);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                          >
                            <span>{notif.actionLabel || "View Feature"}</span>
                            <ArrowRight className="w-3 h-3 text-cyan-400" />
                          </button>
                        )}

                        {/* Expand Details Trigger */}
                        {notif.metadata && Object.keys(notif.metadata).length > 0 && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : notif.id)}
                            className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-all cursor-pointer"
                            title="Toggle technical details"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        {/* Toggle Read */}
                        <button
                          onClick={() => handleToggleRead(notif.id)}
                          className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-all cursor-pointer"
                          title={notif.read ? "Mark as unread" : "Mark as read"}
                        >
                          {notif.read ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
                        </button>

                        {/* Dismiss */}
                        <button
                          onClick={() => handleDelete(notif.id)}
                          className="p-1 rounded hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-all cursor-pointer"
                          title="Dismiss notification"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Inspector Drawer */}
                    {isExpanded && notif.metadata && Object.keys(notif.metadata).length > 0 && (
                      <div className="mt-3 p-3 rounded-xl bg-black/40 border border-white/5 text-xs font-mono space-y-1.5 animate-in fade-in duration-150">
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
                          <Terminal className="w-3 h-3 text-cyan-400" /> Technical Payload & Diagnostic Metrics
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                          {Object.entries(notif.metadata).map(([k, v]) => (
                            <div key={k} className="bg-white/[0.02] p-1.5 rounded border border-white/5">
                              <span className="text-gray-500 block text-[9px] uppercase">{k}</span>
                              <span className="text-cyan-300 font-semibold">{String(v)}</span>
                            </div>
                          ))}
                          <div className="bg-white/[0.02] p-1.5 rounded border border-white/5">
                            <span className="text-gray-500 block text-[9px] uppercase">ISO Timestamp</span>
                            <span className="text-gray-400 text-[10px]">{notif.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Audit Summary & Sync */}
      <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>Displaying {notifications.length} of {totalCount} total alerts</span>
          <span>•</span>
          <span className="font-mono text-cyan-400/80">VideoSense Event Bus v3.2</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchNotificationData(true)}
            className="text-gray-400 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer hover:underline text-[11px]"
          >
            <RefreshCw className={`w-3 h-3 text-gray-500 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh Event Stream
          </button>
        </div>
      </div>
    </div>
  );
}
