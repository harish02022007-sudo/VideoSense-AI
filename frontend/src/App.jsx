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

import { ArrowLeft, Brain } from "lucide-react";

export default function App() {
  // Pre-App state manager: landing, auth, onboarding, app (defaults to app so dashboard is immediately active)
  const [appState, setAppState] = useState(() => {
    return localStorage.getItem("videosense_app_state") || "app";
  });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [initialSeekTime, setInitialSeekTime] = useState(null);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);

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

  // Pre-App Page switchers
  if (appState === "landing") {
    return (
      <LandingPage 
        onGetStarted={() => updateAppState("auth")} 
        onExplore={() => updateAppState("app")} 
      />
    );
  }

  if (appState === "auth") {
    return <AuthPage onLoginSuccess={() => updateAppState("onboarding")} />;
  }

  if (appState === "onboarding") {
    return <OnboardingFlow onOnboardingComplete={() => updateAppState("app")} />;
  }

  return (
    <div className="relative min-h-screen text-gray-100 flex flex-col select-none">
      {/* 7-Layer Backdrop System */}
      <BackgroundBlobs />

      {/* Floating Header */}
      <Navbar />

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

          {/* Product Discovery matching cards */}
          {activeTab === "products" && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white">Visual Product Discovery</h2>
                <p className="text-gray-400 mt-2 text-sm">
                  Detected shoe, clothing, and item frames matched against a local e-commerce vector repository.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[
                  { name: "Retro Run Sneaker", brand: "SpeedForce", similarity: 94, category: "Shoes", price: "$120" },
                  { name: "Urban Tech Backpack", brand: "Cortex", similarity: 89, category: "Bags", price: "$85" },
                  { name: "Smart POS Display Panel", brand: "BytePOS", similarity: 81, category: "Electronics", price: "$340" }
                ].map((prod, idx) => (
                  <div key={idx} className="glass-panel-glow border-white/[0.04] p-4 space-y-4">
                    <div className="aspect-square rounded-xl bg-black/40 flex items-center justify-center relative border border-white/5 overflow-hidden">
                      <span className="absolute top-2 left-2 text-[10px] font-mono font-bold bg-secondary/10 text-secondary border border-secondary/25 px-2 py-0.5 rounded">
                        {prod.similarity}% Similarity
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 font-mono uppercase">{prod.brand}</span>
                        <span className="text-cyan-400 text-xs font-bold font-mono">{prod.price}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white leading-snug">{prod.name}</h4>
                      <p className="text-[10px] text-gray-400">{prod.category}</p>
                    </div>
                    <button 
                      onClick={() => alert(`Redirecting to catalog detail for ${prod.name}`)}
                      className="w-full btn-glass py-2 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      Inspect Catalog Item
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <AnalyticsDashboard 
              selectedVideoId={selectedVideoId} 
              onSelectVideo={handleSelectVideo} 
              onNavigate={setActiveTab} 
            />
          )}

          {activeTab === "reports" && <ReportsManager />}

          {activeTab === "notifications" && <NotificationCenter />}

          {activeTab === "models" && <AIModels />}

          {activeTab === "monitor" && <SystemMonitor />}

          {activeTab === "logs" && <ActivityLogs />}

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
