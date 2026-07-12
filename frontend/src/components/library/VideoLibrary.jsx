import React, { useState } from "react";
import { Video, Search, Filter, ShieldCheck, Grid, List, Play, CheckCircle2, Loader2 } from "lucide-react";

export default function VideoLibrary({ onSelectVideo }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const videos = [
    {
      id: "mock-uuid-1",
      title: "Store Surveillance Floor Cam 4",
      duration: "00:45",
      resolution: "1080p",
      size: "12.4 MB",
      status: "completed",
      progress: 100,
      timestamp: "12 mins ago",
      objects: 42,
      faces: 3,
      confidence: 96,
      tags: ["Shopper", "Shelf Interaction", "Checkout"]
    },
    {
      id: "mock-uuid-2",
      title: "Warehouse Logistics & Loading Dock",
      duration: "02:00",
      resolution: "4K",
      size: "38.2 MB",
      status: "processing",
      progress: 45,
      timestamp: "1 hour ago",
      objects: 18,
      faces: 0,
      confidence: 89,
      tags: ["Forklift", "Delivery Truck", "Palette"]
    },
    {
      id: "mock-uuid-3",
      title: "Main Register POS Counter",
      duration: "01:15",
      resolution: "1080p",
      size: "24.8 MB",
      status: "completed",
      progress: 100,
      timestamp: "3 hours ago",
      objects: 94,
      faces: 5,
      confidence: 98,
      tags: ["POS terminal", "Customer Queue", "Cashier"]
    }
  ];

  const filteredVideos = videos.filter((vid) => {
    if (filter === "completed" && vid.status !== "completed") return false;
    if (filter === "processing" && vid.status !== "processing") return false;
    return vid.title.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8 select-none">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Video Library</h2>
          <p className="text-gray-400 mt-2 text-sm">Browse, filter, and inspect ingested surveillance streams and video files.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-white/[0.04]">
        {/* Search */}
        <div className="relative flex items-center bg-black/40 border border-white/5 focus-within:border-secondary/40 rounded-xl transition-all px-3 py-2 w-full md:w-80">
          <Search className="w-4 h-4 text-gray-500 mr-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-medium"
          />
        </div>

        {/* Filters Button group */}
        <div className="flex flex-wrap items-center gap-2">
          {["all", "completed", "processing"].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`text-xs font-semibold px-4 py-2 rounded-xl border transition-all capitalize ${
                filter === item 
                  ? "bg-white/5 text-cyan-400 border-white/10" 
                  : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map((video) => (
          <div 
            key={video.id}
            className="glass-panel-glow border-white/[0.04] flex flex-col justify-between"
          >
            {/* Visual Canvas Block */}
            <div className="aspect-video bg-black/40 border-b border-white/[0.04] relative flex items-center justify-center group overflow-hidden">
              <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(transparent_50%,rgba(0,240,255,0.15)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
              <Video className="w-8 h-8 text-blue-500/40 group-hover:scale-110 transition-transform duration-300" />
              <span className="absolute bottom-2 right-2 text-[10px] font-mono font-bold bg-black/60 px-2 py-0.5 rounded text-gray-300 border border-white/5">
                {video.duration}
              </span>
              <span className="absolute top-2 left-2 text-[10px] font-mono font-bold bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded">
                {video.resolution}
              </span>
            </div>

            {/* Video detail details */}
            <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white leading-snug line-clamp-1">{video.title}</h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {video.tags.map((tag) => (
                    <span key={tag} className="text-[9px] font-medium bg-white/5 text-gray-400 px-2 py-0.5 rounded-full border border-white/5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/[0.04] text-[10px] font-mono text-center">
                <div>
                  <span className="text-gray-500 block uppercase text-[8px]">Objects</span>
                  <span className="text-white font-bold">{video.objects}</span>
                </div>
                <div className="border-x border-white/5">
                  <span className="text-gray-500 block uppercase text-[8px]">Faces</span>
                  <span className="text-white font-bold">{video.faces}</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase text-[8px]">Confidence</span>
                  <span className="text-secondary font-bold">{video.confidence}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-1">
                {video.status === "completed" ? (
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500"></span> Ready
                  </span>
                ) : (
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-yellow-400">Processing...</span>
                      <span className="text-white">{video.progress}%</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500" style={{ width: `${video.progress}%` }}></div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => onSelectVideo(video.id)}
                  className="px-4 py-2 text-[10px] font-bold uppercase rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-secondary/30 transition-all shrink-0"
                >
                  Open Workspace
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
