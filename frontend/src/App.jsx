import React, { useState, useEffect } from "react";
import Navbar from "./components/common/Navbar";
import Sidebar from "./components/common/Sidebar";
import BackgroundBlobs from "./components/common/BackgroundBlobs";
import Overview from "./components/dashboard/Overview";
import UploadPanel from "./components/upload/UploadPanel";
import VideoTimeline from "./components/timeline/VideoTimeline";
import SemanticSearchConsole from "./components/search/SemanticSearchConsole";
import VideoChatPanel from "./components/chat/VideoChatPanel";
import AnalyticsDashboard from "./components/analytics/AnalyticsDashboard";
import SummaryPage from "./components/summary/SummaryPage";
import ProductDeliveryConsole from "./components/products/ProductDeliveryConsole";

// V2.0 & V3.0 views
import LandingPage from "./components/landing/LandingPage";
import AuthPage from "./components/auth/AuthPage";
import OnboardingFlow from "./components/onboarding/OnboardingFlow";
import VideoLibrary from "./components/library/VideoLibrary";
import AIProcessingConsole from "./components/ui/AIProcessingConsole";
import ReportsManager from "./components/reports/ReportsManager";
import SettingsPanel from "./components/ui/SettingsPanel";
import NotificationCenter from "./components/ui/NotificationCenter";
import AIModels from "./components/ui/AIModels";
import SystemMonitor from "./components/ui/SystemMonitor";
import ActivityLogs from "./components/ui/ActivityLogs";
import ProfilePanel from "./components/ui/ProfilePanel";
import FloatingAssistant from "./components/ui/FloatingAssistant";
import CommandPalette from "./components/ui/CommandPalette";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { ArrowLeft, Brain, Cpu, Play } from "lucide-react";

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Pre-App state manager: landing, auth, onboarding, app
  const [appState, setAppState] = useState(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    return (params && params.get("appState")) || localStorage.getItem("videosense_app_state") || "app";
  });
  const [activeTab, setActiveTab] = useState(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    return (params && params.get("tab")) || "dashboard";
  });
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [initialSeekTime, setInitialSeekTime] = useState(null);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Clear selected video whenever user session changes (login/logout/switch)
  useEffect(() => {
    setSelectedVideoId(null);
    setInitialSeekTime(null);
  }, [user?.id]);

  const updateAppState = (state) => {
    setAppState(state);
    try {
      localStorage.setItem("videosense_app_state", state);
    } catch (e) {}
  };

  // Ctrl+K key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectVideo = (videoId, seekTime = null) => {
    setSelectedVideoId(videoId);
    if (seekTime !== null && seekTime !== undefined) {
      setInitialSeekTime(seekTime);
    }
    setActiveTab("player");
  };

  // Initial loading splash screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-dark text-gray-100 flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
        <BackgroundBlobs />
        <div className="z-10 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 via-primary to-purple-500 p-[1px] shadow-glow animate-pulse flex items-center justify-center">
            <div className="w-full h-full bg-background-dark rounded-2xl flex items-center justify-center">
              <Play className="w-6 h-6 text-cyan-400 fill-cyan-400/20" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">VideoSense AI</h2>
            <p className="text-xs text-gray-400 font-mono mt-1">Initializing secure session...</p>
          </div>
        </div>
      </div>
    );
  }

  // Pre-App Page switchers
  if (appState === "landing") {
    return (
      <LandingPage 
        onGetStarted={() => updateAppState(isAuthenticated ? "app" : "auth")} 
        onExplore={() => updateAppState(isAuthenticated ? "app" : "auth")} 
      />
    );
  }

  if (appState === "auth") {
    return (
      <AuthPage 
        onLoginSuccess={() => updateAppState("app")} 
      />
    );
  }

  if (appState === "onboarding") {
    return <OnboardingFlow onOnboardingComplete={() => updateAppState("app")} />;
  }

  // If user is trying to access app dashboard but is unauthenticated, redirect to auth
  if (!isAuthenticated && appState === "app") {
    return (
      <AuthPage 
        onLoginSuccess={() => updateAppState("app")} 
      />
    );
  }

  return (
    <div className="relative min-h-screen text-gray-100 flex flex-col select-none">
      {/* 7-Layer Backdrop System */}
      <BackgroundBlobs />

      {/* Floating Header */}
      <Navbar 
        activeTab={activeTab} 
        onNavigate={(tab) => {
          if (tab === "auth") {
            updateAppState("auth");
          } else {
            setActiveTab(tab);
          }
        }} 
        onSignOut={() => updateAppState("auth")}
      />

      {/* Main Body Grid */}
      <div className="flex flex-1">
        {/* Collapsible Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Content Viewer Panel */}
        <main className="flex-1 p-8 overflow-y-auto max-h-[calc(100vh-62px)]">
          {activeTab === "dashboard" && (
            <Overview 
              onSelectVideo={handleSelectVideo} 
              onNavigateUpload={() => setActiveTab("upload")} 
            />
          )}

          {activeTab === "upload" && (
            <UploadPanel onSelectVideo={handleSelectVideo} />
          )}

          {activeTab === "library" && (
            <VideoLibrary onSelectVideo={handleSelectVideo} onNavigate={setActiveTab} />
          )}

          {/* Sync Video Player Workspace */}
          {activeTab === "player" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setActiveTab("dashboard")}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20">
                  <Brain className="w-3.5 h-3.5 animate-pulse" /> RAG CONTEXT ENABLED
                </span>
              </div>

              <div className="grid grid-cols-1">
                <VideoTimeline 
                  videoId={selectedVideoId} 
                  initialSeekTime={initialSeekTime} 
                  onClearSeekTime={() => setInitialSeekTime(null)} 
                />
              </div>
            </div>
          )}

          {activeTab === "summary" && (
            <SummaryPage 
              selectedVideoId={selectedVideoId} 
              onSelectVideo={handleSelectVideo}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "processing" && (
            <AIProcessingConsole onSelectVideo={handleSelectVideo} onNavigate={setActiveTab} />
          )}

          {activeTab === "search" && (
            <SemanticSearchConsole 
              selectedVideoId={selectedVideoId}
              onSelectVideo={handleSelectVideo} 
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "chat" && (
            <VideoChatPanel 
              selectedVideoId={selectedVideoId} 
              onSelectVideo={handleSelectVideo}
              onNavigate={setActiveTab}
            />
          )}

          {/* Visual Product Discovery & Delivery Logistics */}
          {activeTab === "products" && (
            <ProductDeliveryConsole 
              selectedVideoId={selectedVideoId} 
              onSelectVideo={handleSelectVideo}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsDashboard 
              selectedVideoId={selectedVideoId} 
              onSelectVideo={handleSelectVideo} 
              onNavigate={setActiveTab} 
            />
          )}

          {activeTab === "reports" && (
            <ReportsManager 
              selectedVideoId={selectedVideoId} 
              onSelectVideo={handleSelectVideo} 
              onNavigate={setActiveTab} 
            />
          )}

          {activeTab === "notifications" && (
            <NotificationCenter 
              onNavigate={setActiveTab} 
              onSelectVideo={handleSelectVideo} 
            />
          )}

          {activeTab === "models" && <AIModels onNavigate={setActiveTab} />}

          {activeTab === "monitor" && <SystemMonitor />}

          {activeTab === "logs" && (
            <ActivityLogs 
              onSelectVideo={handleSelectVideo} 
              onNavigate={setActiveTab} 
            />
          )}

          {activeTab === "profile" && <ProfilePanel />}

          {activeTab === "settings" && <SettingsPanel />}
        </main>
      </div>

      {/* Floating AI Copilot Widget */}
      <FloatingAssistant onNavigate={setActiveTab} />

      {/* Ctrl+K Command Palette Modal Overlay */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
        onNavigate={setActiveTab} 
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
