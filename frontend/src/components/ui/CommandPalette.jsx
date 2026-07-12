import React, { useState, useEffect } from "react";
import { Search, Terminal, LayoutGrid, Settings2, Video, Key, X } from "lucide-react";

export default function CommandPalette({ isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState("");

  const commands = [
    { label: "Go to Control Center", action: "dashboard", icon: LayoutGrid },
    { label: "Go to Ingestion Console", action: "upload", icon: Terminal },
    { label: "Go to Video Library", action: "library", icon: Video },
    { label: "Go to System Settings", action: "settings", icon: Settings2 }
  ];

  const filteredCommands = commands.filter((c) => 
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleCommandClick = (action) => {
    onNavigate(action);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm select-none">
      {/* Outer panel wrapper */}
      <div className="w-full max-w-lg glass-panel border border-white/10 shadow-glass overflow-hidden">
        {/* Search Input bar */}
        <div className="flex items-center border-b border-white/5 px-4 py-3 bg-black/20">
          <Search className="w-4.5 h-4.5 text-gray-500 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search workspace..."
            className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-semibold"
            autoFocus
          />
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded text-gray-500 hover:text-white transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Suggestion links list */}
        <div className="p-2 space-y-0.5 max-h-60 overflow-y-auto">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.action}
                  onClick={() => handleCommandClick(cmd.action)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-semibold text-gray-400 hover:bg-white/5 hover:text-white border border-transparent transition-all"
                >
                  <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{cmd.label}</span>
                </button>
              );
            })
          ) : (
            <p className="p-3 text-[10px] text-gray-500 font-mono text-center">No commands found.</p>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between text-[8px] font-mono text-gray-600 border-t border-white/5 px-4 py-2 bg-black/10">
          <span>Navigate with arrows, select with Enter</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
