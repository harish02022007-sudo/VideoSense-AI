import React, { useState } from "react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, Legend
} from "recharts";
import { BarChart3, Download, Award, Cpu, ShieldCheck } from "lucide-react";

export default function AnalyticsDashboard() {
  const [activeSubTab, setActiveSubTab] = useState("objects");

  // Objects Area Data
  const objectTrends = [
    { name: "00:10", Person: 2, Sneaker: 0, Package: 0 },
    { name: "00:20", Person: 3, Sneaker: 1, Package: 1 },
    { name: "00:30", Person: 4, Sneaker: 2, Package: 3 },
    { name: "00:40", Person: 2, Sneaker: 1, Package: 5 },
    { name: "00:50", Person: 1, Sneaker: 0, Package: 2 },
    { name: "01:00", Person: 3, Sneaker: 1, Package: 1 }
  ];

  // Speech Bar Data
  const speechStats = [
    { name: "Segment 1", Confidence: 94, Words: 12 },
    { name: "Segment 2", Confidence: 88, Words: 24 },
    { name: "Segment 3", Confidence: 98, Words: 18 },
    { name: "Segment 4", Confidence: 91, Words: 15 }
  ];

  // Business Radar Data
  const modelStats = [
    { subject: "Inference Precision", A: 96, B: 90, fullMark: 100 },
    { subject: "Ingestion Coverage", A: 92, B: 85, fullMark: 100 },
    { subject: "OCR Recall", A: 98, B: 92, fullMark: 100 },
    { subject: "Search Precision", A: 91, B: 80, fullMark: 100 },
    { subject: "RAG Relevance", A: 94, B: 85, fullMark: 100 }
  ];

  return (
    <div className="space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Analytics Hub
          </h2>
          <p className="text-gray-400 mt-2 text-sm">
            Detailed performance charts monitoring vision trackers, sound transcript segment limits, and retrieval metrics.
          </p>
        </div>
        <button 
          onClick={() => alert("Downloading PDF summary report...")}
          className="btn-gradient self-start sm:self-center text-xs font-bold"
        >
          <Download className="w-4 h-4" /> Export Analytics
        </button>
      </div>

      {/* Sub-tab Selectors */}
      <div className="flex border-b border-white/[0.04] p-1 bg-black/15 rounded-xl max-w-md">
        {["objects", "speech", "business"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`flex-1 text-center py-2 text-[10px] font-bold rounded-lg capitalize transition-all border ${
              activeSubTab === tab 
                ? "bg-white/5 text-secondary border-white/10" 
                : "text-gray-500 border-transparent hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Primary Graphs Row */}
      <div className="glass-panel p-6 border-white/[0.04]">
        {activeSubTab === "objects" && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-cyan-400" /> Objects Detection Frequency
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={objectTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPerson" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0052FF" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0052FF" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSneaker" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00F0FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(10, 11, 20, 0.9)', borderColor: 'rgba(255,255,255,0.1)', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="Person" stroke="#0052FF" fillOpacity={1} fill="url(#colorPerson)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Sneaker" stroke="#00F0FF" fillOpacity={1} fill="url(#colorSneaker)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeSubTab === "speech" && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <Award className="w-4 h-4 text-purple-400" /> Speech Segments Confidence
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={speechStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(10, 11, 20, 0.9)', borderColor: 'rgba(255,255,255,0.1)', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar dataKey="Confidence" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Words" fill="#00F0FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeSubTab === "business" && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Model Performance Precision
            </h3>
            <div className="h-72 w-full flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={modelStats}>
                  <PolarGrid stroke="rgba(255,255,255,0.03)" />
                  <PolarAngleAxis dataKey="subject" stroke="#9ca3af" style={{ fontSize: '10px' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#4b5563" style={{ fontSize: '9px' }} />
                  <Radar name="VideoSense Target" dataKey="A" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.2} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(10, 11, 20, 0.9)', borderColor: 'rgba(255,255,255,0.1)' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Latencies summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
        <div className="glass-panel p-4 flex items-center justify-between border-white/5">
          <span className="text-gray-500 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-cyan-400" /> CUDA Core Load</span>
          <span className="text-white font-bold">48%</span>
        </div>
        <div className="glass-panel p-4 flex items-center justify-between border-white/5">
          <span className="text-gray-500 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> System precision</span>
          <span className="text-secondary font-bold">0.94 F1</span>
        </div>
        <div className="glass-panel p-4 flex items-center justify-between border-white/5">
          <span className="text-gray-500 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5 text-amber-500" /> Avg Latency</span>
          <span className="text-white font-bold">45 ms</span>
        </div>
      </div>
    </div>
  );
}
