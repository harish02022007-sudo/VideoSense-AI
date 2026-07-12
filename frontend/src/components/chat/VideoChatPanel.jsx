import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Brain, Cpu, Clock, HelpCircle, ArrowRight } from "lucide-react";

export default function VideoChatPanel() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am your Multimodal RAG Assistant. Ask me anything about the uploaded video stream.",
      sources: []
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messageEndRef = useRef(null);

  // Auto-scroll chat window
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const prompts = [
    "What object did the shopper select?",
    "Show me when the POS register opened.",
    "Was any promotional text visible?"
  ];

  const handleSend = (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsTyping(true);

    // Simulate RAG context indexing and Qwen 2.5 3B reasoning pipeline
    setTimeout(() => {
      let content = "The shopper selected a **blue sneaker** at timestamp **0:12**. Bounding boxes show that they examined the product package (confidence: 89%).";
      let sources = [{ segment: "Scene 2", time: 12.5 }];

      if (text.toLowerCase().includes("promotional") || text.toLowerCase().includes("text")) {
        content = "Yes, the screen text extracted by PaddleOCR displays '**SALE - 50% OFF**' starting from timestamp **0:27**.";
        sources = [{ segment: "Scene 3", time: 27.5 }];
      } else if (text.toLowerCase().includes("register") || text.toLowerCase().includes("pos")) {
        content = "The register area became active around timestamp **0:32**. A cashier was detected at checkout POS.";
        sources = [{ segment: "Scene 3", time: 32.0 }];
      }

      setMessages((prev) => [...prev, { role: "assistant", content, sources }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="glass-panel p-5 flex flex-col h-[500px] border-white/[0.04] shadow-glass select-none">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-4 mb-4 text-xs font-mono">
        <div className="flex items-center gap-2 text-cyan-400">
          <Brain className="w-4 h-4" />
          <span className="font-bold">Multimodal RAG Assistant</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500 bg-white/[0.02] border border-white/5 px-2 py-1 rounded">
          <Cpu className="w-3.5 h-3.5 text-purple-400 animate-pulse" /> Qwen 2.5 3B
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scrollbar-thin">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
              msg.role === "user" 
                ? "bg-black/35 border border-white/5 text-gray-100 shadow-inner" 
                : "bg-background-card border border-primary/20 text-gray-300 relative shadow-glow"
            }`}>
              <p>{msg.content}</p>
              
              {/* Cited sources links */}
              {msg.sources.length > 0 && (
                <div className="flex gap-2 mt-3 pt-2.5 border-t border-white/5">
                  {msg.sources.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => alert(`Seeking timeline player to timestamp ${src.time}s`)}
                      className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase text-secondary hover:text-white bg-secondary/10 border border-secondary/25 px-2 py-0.5 rounded transition-all"
                    >
                      <Clock className="w-3 h-3" />
                      {src.segment} ({src.time}s) <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator shimmer */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-background-card border border-primary/10 rounded-2xl p-4 flex gap-1 items-center shadow-sm">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>

      {/* Suggested prompting cards */}
      {messages.length === 1 && (
        <div className="space-y-2 mb-4">
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5" /> Suggested Prompts</span>
          <div className="flex flex-col gap-2">
            {prompts.map((p) => (
              <button
                key={p}
                onClick={() => handleSend(p)}
                className="text-left text-xs bg-white/5 border border-white/5 hover:border-secondary/20 hover:text-cyan-400 p-2.5 rounded-xl text-gray-400 transition-all font-medium"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center bg-black/40 border border-white/5 hover:border-white/10 rounded-2xl p-2 transition-all">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask something about this video feed..."
          className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 px-3 font-medium"
        />
        <button
          onClick={() => handleSend()}
          className="btn-gradient p-2.5 rounded-xl shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
