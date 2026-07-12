import React from "react";
import { Terminal, ShieldCheck, UploadCloud, Search, MessageSquare, Download } from "lucide-react";

export default function ActivityLogs() {
  const activitiesList = [
    { type: "Ingest", text: "Successfully uploaded video 'store_cam_4.mp4'", user: "Harish", time: "12 mins ago", icon: UploadCloud },
    { type: "Search", text: "Ran semantic vector query: 'shopper picking up shoes'", user: "Harish", time: "25 mins ago", icon: Search },
    { type: "Chat", text: "Polled Qwen LLM context segment details", user: "Harish", time: "30 mins ago", icon: MessageSquare },
    { type: "Export", text: "Downloaded PDF summary report of Cam 4 targets", user: "Harish", time: "1 hour ago", icon: Download }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 select-none">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          Activity Logs
        </h2>
        <p className="text-gray-400 mt-2 text-sm">
          Audit timeline tracing user actions and workspace queries.
        </p>
      </div>

      <div className="glass-panel p-6 border-white/[0.04] space-y-6">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-cyan-400" /> System Action Feed
        </h3>

        <div className="space-y-6 relative pl-4 border-l border-white/5">
          {activitiesList.map((act, idx) => {
            const Icon = act.icon;
            return (
              <div key={idx} className="relative space-y-1.5">
                {/* Visual marker dot */}
                <div className="absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm border border-[#020206] shadow-cyan-400/80"></div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 text-secondary" /> {act.text}</span>
                  <span className="text-[10px] text-gray-500 font-mono">{act.time}</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-gray-500 font-mono">
                  <span>Author: {act.user}</span>
                  <span>|</span>
                  <span className="text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded-full border border-cyan-500/10 uppercase tracking-wider">{act.type}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
