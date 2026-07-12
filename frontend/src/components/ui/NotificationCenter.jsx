import React, { useState } from "react";
import { Bell, ShieldCheck, Cpu, Database, FileText, CheckCircle2, AlertCircle } from "lucide-react";

export default function NotificationCenter() {
  const [logs, setLogs] = useState([
    { id: 1, type: "processing", title: "Model Pipeline Completed", desc: "Surveillance Floor Cam 4 successfully ingested in 17.5s.", time: "12 mins ago", severity: "success" },
    { id: 2, type: "reports", title: "PDF Analytics Report Generated", desc: "Shoe matches inventory report compiled and saved to archive.", time: "1 hour ago", severity: "success" },
    { id: 3, type: "system", title: "GPU Memory Threshold Exceeded", desc: "CUDA memory allocation warned at 85% capacity during Whisper batch runs.", time: "2 hours ago", severity: "warning" },
    { id: 4, type: "uploads", title: "Stream Upload Ingested", desc: "Main Register POS Counter upload verified.", time: "3 hours ago", severity: "success" }
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 select-none">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          Notification Center
        </h2>
        <p className="text-gray-400 mt-2 text-sm">
          System events and pipelines status triggers catalog.
        </p>
      </div>

      <div className="space-y-4">
        {logs.map((log) => {
          const isWarning = log.severity === "warning";
          return (
            <div 
              key={log.id} 
              className={`glass-panel p-5 flex items-start gap-4 border transition-all ${
                isWarning ? "bg-amber-500/5 border-amber-500/10" : "border-white/5 hover:border-white/10"
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                isWarning ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
              }`}>
                {isWarning ? <AlertCircle className="w-4.5 h-4.5" /> : <CheckCircle2 className="w-4.5 h-4.5" />}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-bold ${isWarning ? "text-amber-400" : "text-white"}`}>
                    {log.title}
                  </h4>
                  <span className="text-[10px] text-gray-500 font-mono">{log.time}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">{log.desc}</p>
                <div className="pt-2 text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                  category: {log.type}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
