import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Activity,
  Bell,
  Cpu,
  LayoutGrid,
  ChevronDown,
  Clock,
  Search,
  ShieldCheck,
  User,
  LogOut,
  Settings,
  LogIn,
  Key
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function Navbar({ activeTab, onNavigate, onSignOut }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [health, setHealth] = useState(null);
  const [latency, setLatency] = useState(0);
  const [currentTime, setCurrentTime] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Clock ticks
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll dynamic unread notifications count from API
  useEffect(() => {
    const checkUnread = async () => {
      try {
        const stats = await api.getNotificationStats();
        if (stats && typeof stats.unread === "number") {
          setUnreadCount(stats.unread);
          try {
            localStorage.setItem("videosense_unread_count", String(stats.unread));
          } catch (e) {}
          return;
        }
      } catch (err) {
        // Fallback to cached count if backend unreachable
        try {
          const cached = localStorage.getItem("videosense_unread_count");
          if (cached !== null) {
            setUnreadCount(parseInt(cached, 10) || 0);
          }
        } catch (e) {}
      }
    };
    checkUnread();
    const interval = setInterval(checkUnread, 4000);
    return () => clearInterval(interval);
  }, []);

  // Poll diagnostics
  useEffect(() => {
    const checkDiagnostics = async () => {
      try {
        const start = performance.now();
        const data = await api.getHealth();
        const end = performance.now();
        setLatency(Math.round(end - start));
        setHealth(data);
      } catch (err) {
        setHealth({ status: "offline", system: { cpu_usage_percent: 0, memory_usage_percent: 0 } });
        setLatency(0);
      }
    };
    checkDiagnostics();
    const interval = setInterval(checkDiagnostics, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    await logout();
    if (onSignOut) {
      onSignOut();
    }
  };

  const getStatusColor = () => {
    if (!health) return "bg-gray-500 shadow-gray-500/50";
    if (health.status === "healthy") return "bg-status-success shadow-status-success/50 animate-pulse";
    if (health.status === "degraded") return "bg-status-warning shadow-status-warning/50 animate-pulse";
    return "bg-status-offline shadow-status-offline/50";
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.04] bg-background-dark/30 backdrop-blur-glass px-6 py-3 flex items-center justify-between shadow-glass select-none">
      {/* Brand & Workspace Toggler */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary via-secondary to-accent-purple p-[1px] shadow-glow flex items-center justify-center">
            <div className="w-full h-full bg-background-dark rounded-xl flex items-center justify-center">
              <Play className="w-4 h-4 text-secondary fill-secondary/20" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              VideoSense <span className="text-[10px] bg-gradient-to-r from-primary/20 to-secondary/20 text-cyan-400 border border-secondary/20 px-2 py-0.5 rounded-full font-mono font-bold">OS v1</span>
            </h1>
          </div>
        </div>

        {/* Workspace Selector */}
        <div className="hidden sm:flex items-center gap-2 border-l border-white/10 pl-6">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-all border border-transparent hover:border-white/5">
            <LayoutGrid className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-300 font-medium">
              {user ? `${user.full_name.split(' ')[0]}'s Workspace` : "Default Workspace"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Center Search Trigger */}
      <div className="hidden lg:flex items-center gap-2 bg-black/40 border border-white/5 hover:border-white/15 px-3 py-1.5 rounded-xl w-80 cursor-pointer transition-all">
        <Search className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs text-gray-500 flex-1">Search scenes, objects, logs...</span>
        <kbd className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-400 font-mono">⌘K</kbd>
      </div>

      {/* Diagnostics / Right Section */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Hardware Status */}
        {health && (
          <div className="hidden xl:flex items-center gap-4 text-xs font-mono border-r border-white/10 pr-6">
            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-lg">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-gray-500">CPU:</span>
              <span className="text-gray-200 font-bold">{health.system?.cpu_usage_percent || 0}%</span>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-lg">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-gray-500">RAM:</span>
              <span className="text-gray-200 font-bold">{health.system?.memory_usage_percent || 0}%</span>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-gray-500">Latency:</span>
              <span className="text-gray-200 font-bold">{latency}ms</span>
            </div>
          </div>
        )}

        {/* Time display */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-gray-400 bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-xl">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{currentTime}</span>
        </div>

        {/* Dynamic connection pinger dot */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor()} shadow-sm`} />
          </div>
          
          {/* Notification bell */}
          <button 
            onClick={() => onNavigate?.("notifications")}
            className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all border cursor-pointer ${
              activeTab === "notifications"
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                : "hover:bg-white/5 border-transparent hover:border-white/5 text-gray-400 hover:text-white"
            }`}
            title="Notification Center"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-accent-pink text-[9px] font-bold font-mono text-white flex items-center justify-center shadow-md shadow-accent-pink/40 animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Avatar / Sign In */}
          {isAuthenticated && user ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                aria-label="User profile menu"
                className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 via-primary to-purple-500 p-[1px] hover:shadow-glow cursor-pointer transition-all"
              >
                <div className="w-full h-full bg-background-dark rounded-lg flex items-center justify-center text-xs font-bold text-white font-mono uppercase">
                  {getInitials(user.full_name)}
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 glass-panel bg-black/90 border border-white/10 rounded-2xl shadow-2xl p-3 space-y-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
                    <p className="text-xs font-bold text-white truncate">{user.full_name}</p>
                    <p className="text-[10px] text-gray-400 font-mono truncate">{user.email}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold uppercase">
                        {user.role || "Developer"}
                      </span>
                      {user.is_email_verified && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <ShieldCheck className="w-2.5 h-2.5" /> Verified
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-1 space-y-1">
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onNavigate?.("profile");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all text-left cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Profile & Security</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onNavigate?.("settings");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all text-left cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-gray-400" />
                      <span>Workspace Settings</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-white/5">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all text-left cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onNavigate?.("auth")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-bold cursor-pointer transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
