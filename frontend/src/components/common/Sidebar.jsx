import React, { useState } from "react";
import { 
  LayoutDashboard, UploadCloud, Video, Zap, Play, Search, MessageSquare, 
  ShoppingBag, BarChart3, FileText, Bell, Cpu, Monitor, Terminal, User, Settings2,
  ChevronLeft, ChevronRight, HardDrive
} from "lucide-react";

export default function Sidebar({ activeTab, setActiveTab }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuSections = [
    {
      title: "Workspace",
      items: [
        { id: "dashboard", label: "Command Center", icon: LayoutDashboard },
        { id: "upload", label: "Upload Center", icon: UploadCloud },
        { id: "library", label: "Video Library", icon: Video },
        { id: "player", label: "Timeline Explorer", icon: Play }
      ]
    },
    {
      title: "AI Engines",
      items: [
        { id: "processing", label: "AI Processing", icon: Zap },
        { id: "search", label: "Semantic Search", icon: Search },
        { id: "chat", label: "AI Chat", icon: MessageSquare },
        { id: "products", label: "Product Discovery", icon: ShoppingBag }
      ]
    },
    {
      title: "Analytics & Logs",
      items: [
        { id: "analytics", label: "Analytics Hub", icon: BarChart3 },
        { id: "reports", label: "Reports Center", icon: FileText },
        { id: "notifications", label: "Notification Center", icon: Bell },
        { id: "models", label: "AI Models", icon: Cpu }
      ]
    },
    {
      title: "Administration",
      items: [
        { id: "monitor", label: "System Monitor", icon: Monitor },
        { id: "logs", label: "Activity Logs", icon: Terminal },
        { id: "profile", label: "Profile", icon: User },
        { id: "settings", label: "Settings", icon: Settings2 }
      ]
    }
  ];

  return (
    <aside 
      className={`border-r border-white/[0.04] bg-background-dark/20 backdrop-blur-glass p-3 flex flex-col justify-between h-[calc(100vh-62px)] transition-all duration-300 relative ${
        isCollapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Collapse Toggle Trigger */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-4 w-6 h-6 rounded-full bg-[#0d0d1b] border border-white/10 hover:border-cyan-400/40 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer z-20 shadow-md"
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin select-none">
        {menuSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-2 mb-1">{section.title}</p>
            )}
            <nav className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={isCollapsed ? item.label : ""}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all relative ${
                      isActive 
                        ? "bg-gradient-to-r from-primary/10 to-secondary/5 text-secondary border border-secondary/25 shadow-glow-cyan" 
                        : "text-gray-400 hover:bg-white/[0.02] hover:text-white border border-transparent"
                    }`}
                  >
                    {isActive && <div className="active-indicator"></div>}
                    <Icon className={`w-3.5 h-3.5 shrink-0 transition-transform duration-300 ${isActive ? "text-secondary scale-110" : "text-gray-400"}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Mini Storage quota footer */}
      <div className="pt-3 border-t border-white/[0.04] space-y-2">
        {!isCollapsed ? (
          <div className="bg-white/[0.01] border border-white/[0.04] p-2.5 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-mono text-gray-500">
              <span className="flex items-center gap-1"><HardDrive className="w-3 h-3 text-cyan-400" /> STORAGE</span>
              <span className="text-gray-300">4.5 / 50 GB</span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: "9%" }}></div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center text-gray-500 hover:text-white py-1 cursor-pointer" title="SSD Storage: 9%">
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
        )}
      </div>
    </aside>
  );
}
