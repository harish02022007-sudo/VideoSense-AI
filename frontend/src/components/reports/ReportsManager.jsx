import React from "react";
import { Download, FileText, Share2, Calendar, FileCheck, Eye, RefreshCw } from "lucide-react";

export default function ReportsManager() {
  const reportsList = [
    { id: "rep-1", title: "Multimodal Scene Target Summary Cam 4", date: "July 11, 2026", size: "1.2 MB", type: "Visual Audit" },
    { id: "rep-2", title: "E-Commerce Shoe Matches & Confidence index", date: "July 10, 2026", size: "820 KB", type: "Catalog Sync" },
    { id: "rep-3", title: "POS Registry Cashier Actions logs", date: "July 08, 2026", size: "2.4 MB", type: "Security" }
  ];

  return (
    <div className="space-y-8 select-none">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          Reports Center
        </h2>
        <p className="text-gray-400 mt-2 text-sm">
          Generate, export, and manage analytical PDF documents detailing classification indices and audio transcripts.
        </p>
      </div>

      {/* Reports Generation Controls */}
      <div className="glass-panel p-6 space-y-4 border-white/[0.04]">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Create New Analytics Report</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-white/5 bg-black/20 hover:border-secondary/30 transition-all cursor-pointer space-y-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <h4 className="text-xs font-bold text-white">Full Ingestion Audit</h4>
            <p className="text-[10px] text-gray-500">Compiles transcript blocks, object frequency indexes, and scene descriptions.</p>
          </div>
          <div className="p-4 rounded-xl border border-white/5 bg-black/20 hover:border-secondary/30 transition-all cursor-pointer space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <FileCheck className="w-4.5 h-4.5" />
            </div>
            <h4 className="text-xs font-bold text-white">Security Event Logs</h4>
            <p className="text-[10px] text-gray-500">Isolates time stamps of high-confidence custom objects matches.</p>
          </div>
          <div className="p-4 rounded-xl border border-white/5 bg-black/20 hover:border-secondary/30 transition-all cursor-pointer space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <RefreshCw className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-xs font-bold text-white">Scheduled Reports</h4>
              <p className="text-[10px] text-gray-500">Configure recurring weekly audits to write directly to database tracks.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reports Catalog */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Reports Archive</h3>
        <div className="space-y-4">
          {reportsList.map((rep) => (
            <div 
              key={rep.id}
              className="glass-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-white/5 hover:border-white/10 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-cyan-400">
                  <FileText className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-snug">{rep.title}</h4>
                  <div className="flex items-center gap-2 text-[9px] text-gray-500 mt-1 font-mono">
                    <Calendar className="w-3 h-3 text-secondary" />
                    <span>{rep.date}</span>
                    <span className="text-gray-700">|</span>
                    <span>{rep.size}</span>
                    <span className="text-gray-700">|</span>
                    <span className="text-cyan-400 font-bold bg-cyan-500/5 px-2 py-0.5 rounded-full border border-cyan-500/10">{rep.type}</span>
                  </div>
                </div>
              </div>

              {/* Actions group */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => alert(`Previewing PDF Report ${rep.id}...`)}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:border-white/15 transition-all"
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => alert(`Generating shared hook links...`)}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:border-white/15 transition-all"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => alert(`Downloading file: ${rep.title}.pdf`)}
                  className="btn-gradient px-4 py-2 text-[10px] font-bold uppercase rounded-xl flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
