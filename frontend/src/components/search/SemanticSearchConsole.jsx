import React, { useState } from "react";
import { Search, Mic, Sparkles, Clock, Video, ArrowRight, Filter } from "lucide-react";

export default function SemanticSearchConsole() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);

  // Mock suggestion items
  const suggestions = [
    "shopper picking up blue shoe",
    "customer checkout POS receipt scan",
    "forklift carrying palette",
    "delivery truck docking bay",
    "yellow safety helmet"
  ];

  // Mock Search results
  const mockResults = [
    {
      id: "res-1",
      videoTitle: "Store Floor Camera 4",
      timestamp: 12.5,
      confidence: 94,
      desc: "Matched frame: shopper selecting sneaker item near center shelf unit",
      previewPath: "SCN_002"
    },
    {
      id: "res-2",
      videoTitle: "Store Floor Camera 4",
      timestamp: 18.0,
      confidence: 88,
      desc: "Matched frame: visual boundary scan tracking shoe packaging box close-up",
      previewPath: "SCN_002"
    },
    {
      id: "res-3",
      videoTitle: "Register Counter POS",
      timestamp: 32.5,
      confidence: 82,
      desc: "Matched frame: receipt screen text containing pricing labels",
      previewPath: "SCN_003"
    }
  ];

  const triggerSearch = (searchQuery) => {
    const q = searchQuery || query;
    if (!q) return;
    setQuery(q);
    setIsSearching(true);
    
    // Simulate vector database lookups
    setTimeout(() => {
      setResults(mockResults);
      setIsSearching(false);
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 select-none">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          Semantic Search
        </h2>
        <p className="text-gray-400 mt-2 text-sm">
          Query indexed video feeds using natural language description. Our system runs visual CLIP embeddings and indexes FAISS vectors offline.
        </p>
      </div>

      {/* Large search query input box */}
      <div className="glass-panel p-6 space-y-4">
        <div className="relative flex items-center bg-black/40 border border-white/5 hover:border-white/10 rounded-2xl transition-all shadow-inner px-4 py-3">
          <Search className="w-5 h-5 text-gray-500 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && triggerSearch()}
            placeholder="Describe what you want to find (e.g. shopper picking up shoes)..."
            className="bg-transparent border-none text-sm text-white placeholder-gray-500 focus:outline-none flex-1 font-medium"
          />
          <button className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all mr-2" title="Voice Search">
            <Mic className="w-4 h-4" />
          </button>
          <button 
            onClick={() => triggerSearch()}
            className="btn-gradient px-4 py-2 text-xs rounded-xl flex items-center gap-1.5"
          >
            {isSearching ? <Loader2Placeholder className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Search
          </button>
        </div>

        {/* Suggestion list */}
        <div className="flex flex-wrap gap-2 pt-2 items-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-2 flex items-center gap-1">
            <Filter className="w-3 h-3 text-cyan-400" /> SUGGESTIONS:
          </span>
          {suggestions.map((item) => (
            <button
              key={item}
              onClick={() => triggerSearch(item)}
              className="text-[10px] font-medium bg-white/5 border border-white/5 hover:border-secondary/20 hover:text-cyan-400 px-3 py-1 rounded-full text-gray-400 transition-all font-mono"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Search results mapping list */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Similarity Search Matches</h3>
          
          <div className="space-y-4">
            {results.map((res) => (
              <div 
                key={res.id}
                className="glass-panel p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-white/5 hover:border-white/10 hover:bg-white/[0.01] transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/5 shadow-inner flex items-center justify-center text-blue-400 shrink-0">
                    <Video className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-bold text-white leading-snug">{res.videoTitle}</h4>
                      <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/5 border border-cyan-500/10 px-2 py-0.5 rounded-full">
                        {res.confidence}% Match
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-xl">{res.desc}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono mt-2">
                      <Clock className="w-3.5 h-3.5 text-secondary" />
                      <span>Timestamp Seek: {res.timestamp}s</span>
                      <span className="text-gray-700">|</span>
                      <span>Segment ID: {res.previewPath}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => alert(`Seeking timeline player to timestamp ${res.timestamp}s`)}
                  className="px-4 py-2 text-xs font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-secondary/30 rounded-xl transition-all shrink-0 flex items-center gap-1"
                >
                  Locate Scene <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Loader2Placeholder(props) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
