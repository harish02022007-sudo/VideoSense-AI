import React, { useState } from "react";
import { 
  Play, Pause, RotateCcw, Volume2, Maximize, Clock, Cpu, 
  Search, MessageSquare, ZoomIn, ZoomOut, AlertCircle, ShoppingBag, 
  BookMarked, Eye, Database, BarChart3, HelpCircle, HardDrive
} from "lucide-react";

export default function VideoTimeline() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(12.5);
  const [activeTab, setActiveTab] = useState("transcript"); // transcript, objects, ocr, summary, products, metadata, analytics
  const [bookmarks, setBookmarks] = useState([12.5, 32.0]);
  const duration = 120.0;

  // Mock Timeline Data
  const transcriptSegments = [
    { start: 0, end: 5.2, text: "Welcome to VideoSense AI control console presentation." },
    { start: 5.2, end: 12.0, text: "In this segment, we observe shopper interactions near the shelf area." },
    { start: 12.0, end: 18.5, text: "Shopper approaches the shelf and picks up a blue premium shoe." },
    { start: 18.5, end: 25.0, text: "Note the yolo bounding box tracking shopper gestures in real-time." },
    { start: 25.0, end: 35.8, text: "PaddleOCR agent begins scanning logo labels on checkout packages." }
  ];

  const objectDetections = [
    { timestamp: 2.1, label: "Laptop", confidence: 0.94, color: "border-blue-500 bg-blue-500/10" },
    { timestamp: 5.5, label: "Person", confidence: 0.98, color: "border-purple-500 bg-purple-500/10" },
    { timestamp: 12.5, label: "Shoe (Sneaker)", confidence: 0.89, color: "border-cyan-500 bg-cyan-500/10" },
    { timestamp: 14.2, label: "Shopping Bag", confidence: 0.76, color: "border-pink-500 bg-pink-500/10" },
    { timestamp: 27.0, label: "Product Package", confidence: 0.91, color: "border-amber-500 bg-amber-500/10" }
  ];

  const ocrResults = [
    { timestamp: 1.5, text: "VideoSense AI" },
    { timestamp: 27.5, text: "SALE - 50% OFF" },
    { timestamp: 32.0, text: "Brand Premium" }
  ];

  const sceneSummaries = [
    { start: 0, end: 12.0, title: "Scene 1: Environment Calibration", summary: "Camera initialization, light calibration checks." },
    { start: 12.0, end: 25.0, title: "Scene 2: Shopper Target Selection", summary: "Shopper targets apparel item, triggers visual product discovery search." },
    { start: 25.0, end: 45.0, title: "Scene 3: Barcode Scan & OCR Checks", summary: "Close scan of text and receipt labels." }
  ];

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleTimelineClick = (timestamp) => {
    setCurrentTime(timestamp);
    setIsPlaying(true);
  };

  const toggleBookmark = () => {
    if (bookmarks.includes(currentTime)) {
      setBookmarks(bookmarks.filter((b) => b !== currentTime));
    } else {
      setBookmarks([...bookmarks, currentTime]);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 select-none">
      {/* Left Column: Premiere Player, Bookmarks, and Scenes */}
      <div className="xl:col-span-2 space-y-6">
        {/* Custom Video Player screen */}
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/[0.04] shadow-glass group">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(transparent_50%,rgba(0,240,255,0.15)_50%)] bg-[length:100%_4px] pointer-events-none"></div>

            <div className="text-center space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20">
                <Cpu className="w-3.5 h-3.5" /> Direct CUDA Stream
              </span>
              <p className="text-xs text-gray-500 font-mono">feed_channel_security_04.mp4</p>
              <h3 className="text-4xl font-black text-white text-glow-cyan tracking-tight">{formatTime(currentTime)}</h3>
              
              {/* Bounding overlay boxes */}
              {currentTime >= 12.0 && currentTime <= 24.0 && (
                <div 
                  className="absolute border-2 border-cyan-400 bg-cyan-400/5 p-3 text-[10px] font-bold text-white rounded-xl shadow-glow-cyan flex flex-col justify-between"
                  style={{ top: "20%", left: "30%", width: "220px", height: "240px" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="bg-cyan-500 text-black px-1.5 py-0.5 rounded font-mono font-bold">Shopper (98%)</span>
                    <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="border border-white/10 rounded-lg p-2 bg-black/60 backdrop-blur-sm space-y-1">
                    <span className="text-gray-400 block text-[8px]">REACHING PRODUCT</span>
                    <span className="text-secondary font-mono font-bold flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5" /> Sneaker (89%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Player controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/45 to-transparent flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {/* Scrubber */}
            <div className="w-full h-1 bg-white/20 rounded-full cursor-pointer relative" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const newTime = (clickX / rect.width) * duration;
              handleTimelineClick(newTime);
            }}>
              <div 
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full relative" 
                style={{ width: `${(currentTime / duration) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg border border-secondary"></div>
              </div>

              {/* Bookmark markers overlay */}
              {bookmarks.map((mark, i) => (
                <div 
                  key={i} 
                  className="absolute w-1.5 h-3 bg-yellow-400 border border-black rounded-sm top-[-4px] cursor-pointer"
                  style={{ left: `${(mark / duration) * 100}%` }}
                  onClick={(e) => { e.stopPropagation(); handleTimelineClick(mark); }}
                  title={`Bookmark at ${formatTime(mark)}`}
                ></div>
              ))}
            </div>

            {/* Icons */}
            <div className="flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-6">
                <button onClick={() => setIsPlaying(!isPlaying)} className="hover:text-secondary transition-all cursor-pointer">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white hover:fill-secondary" />}
                </button>
                <button onClick={() => handleTimelineClick(0)} className="hover:text-secondary transition-all cursor-pointer">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={toggleBookmark} className="hover:text-yellow-400 transition-all cursor-pointer" title="Toggle Bookmark">
                  <BookMarked className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">80%</span>
                </div>
                <div className="text-gray-300 font-mono font-bold">
                  <span>{formatTime(currentTime)}</span>
                  <span className="text-gray-600 mx-1.5">/</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              <button className="hover:text-secondary transition-all">
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Video Scenes List Selector */}
        <div className="glass-panel p-5 space-y-4 border-white/5">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Scenes Index Explorer</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {sceneSummaries.map((scene) => (
              <div
                key={scene.start}
                onClick={() => handleTimelineClick(scene.start)}
                className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  currentTime >= scene.start && currentTime < scene.end
                    ? "bg-primary/5 border-secondary/35 text-white"
                    : "bg-black/20 border-white/5 text-gray-400 hover:border-white/10"
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[9px] mb-1">
                  <span>{scene.title.split(":")[0]}</span>
                  <span>{formatTime(scene.start)}</span>
                </div>
                <p className="font-bold text-white line-clamp-1">{scene.title.split(":")[1] || scene.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Tabbed Workspace Metadata Sheets */}
      <div className="glass-panel flex flex-col h-[520px] border-white/5">
        {/* Selectors header */}
        <div className="flex border-b border-white/[0.04] p-1.5 bg-black/10 overflow-x-auto scrollbar-none shrink-0">
          {["transcript", "objects", "ocr", "summary", "products", "metadata", "analytics"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-[9px] font-bold rounded-lg capitalize transition-all border shrink-0 mr-1 ${
                activeTab === tab 
                  ? "bg-white/5 text-secondary border-white/10" 
                  : "text-gray-500 border-transparent hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Dynamic Sheets viewports */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin text-xs">
          {activeTab === "transcript" && (
            <div className="space-y-3">
              {transcriptSegments.map((segment) => {
                const isActive = currentTime >= segment.start && currentTime < segment.end;
                return (
                  <div
                    key={segment.start}
                    onClick={() => handleTimelineClick(segment.start)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive 
                        ? "bg-primary/5 border-primary/30 text-white font-medium" 
                        : "bg-black/20 border-transparent text-gray-400 hover:bg-white/[0.01]"
                    }`}
                  >
                    <span className="text-[9px] text-gray-500 block mb-1 font-mono">{formatTime(segment.start)}</span>
                    <p className="leading-relaxed">{segment.text}</p>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "objects" && (
            <div className="space-y-2">
              {objectDetections.map((obj) => (
                <div
                  key={obj.timestamp}
                  onClick={() => handleTimelineClick(obj.timestamp)}
                  className="flex items-center justify-between p-3 rounded-xl bg-black/20 hover:bg-white/[0.01] border border-white/5 cursor-pointer"
                >
                  <span className="font-bold text-white font-mono">{obj.label}</span>
                  <span className="text-secondary font-mono font-bold bg-secondary/5 px-2 py-0.5 rounded text-[10px] border border-secondary/15">
                    {Math.round(obj.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "ocr" && (
            <div className="space-y-2">
              {ocrResults.map((ocr) => (
                <div
                  key={ocr.timestamp}
                  onClick={() => handleTimelineClick(ocr.timestamp)}
                  className="flex items-center justify-between p-3 rounded-xl bg-black/20 hover:bg-white/[0.01] border border-white/5 cursor-pointer font-mono"
                >
                  <span className="text-gray-300">"{ocr.text}"</span>
                  <span className="text-gray-500">{formatTime(ocr.timestamp)}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "summary" && (
            <div className="space-y-3">
              {sceneSummaries.map((scene) => (
                <div key={scene.start} className="bg-black/20 p-4 border border-white/5 rounded-xl space-y-2">
                  <h4 className="font-bold text-white leading-snug">{scene.title}</h4>
                  <p className="text-[10px] text-gray-400 leading-relaxed">{scene.summary}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "products" && (
            <div className="space-y-3">
              <div className="glass-panel p-3 flex items-center gap-3 border-white/5">
                <div className="w-12 h-12 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center text-secondary shrink-0">
                  <ShoppingBag className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Retro Run Sneaker</h4>
                  <p className="text-[10px] text-gray-500">SpeedForce • 94% Confidence</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "metadata" && (
            <div className="space-y-4 font-mono text-[11px]">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-gray-500">FORMAT CODEC</span>
                <span className="text-white font-bold">H.264 / AVC</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-gray-500">RESOLUTION</span>
                <span className="text-white font-bold">1920 x 1080 (1080p)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-gray-500">FRAME RATE</span>
                <span className="text-white font-bold">30.0 fps</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500">SSD SIZE</span>
                <span className="text-white font-bold">12.4 MB</span>
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-4">
              <div className="h-32 w-full flex items-end gap-1.5 justify-between py-2 border-b border-white/5">
                {[45, 80, 55, 90, 70, 40, 65, 85, 99, 60, 75, 50].map((val, idx) => (
                  <div key={idx} className="flex-1 bg-gradient-to-t from-primary/20 to-secondary/60 rounded-t" style={{ height: `${val}%` }}></div>
                ))}
              </div>
              <div className="flex items-center justify-between font-mono text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5 text-cyan-400" /> GPU THREAD UTILIZATION</span>
                <span>Active</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
