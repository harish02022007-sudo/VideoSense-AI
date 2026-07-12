import React, { useState } from "react";
import { MessageSquare, X, Brain, Send, ArrowRight, HelpCircle } from "lucide-react";

export default function FloatingAssistant({ onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I am your VideoSense Workspace Copilot. You can tell me to navigate pages or ask about model states." }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const prompts = [
    "Navigate to Ingestion Console",
    "Open System Resource Monitor",
    "Go to Settings panel"
  ];

  const handleSend = (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      let content = "I can help you navigate. Type commands like 'go to search' or 'open settings'.";
      const normalizedText = text.toLowerCase();

      // Conversational navigation triggers
      if (normalizedText.includes("search")) {
        content = "Understood. Navigating to the **Semantic Search Console**...";
        onNavigate("search");
      } else if (normalizedText.includes("upload") || normalizedText.includes("ingest")) {
        content = "Opening the **Ingestion & Upload Console**...";
        onNavigate("upload");
      } else if (normalizedText.includes("settings")) {
        content = "Redirecting to **System Configuration Settings**...";
        onNavigate("settings");
      } else if (normalizedText.includes("monitor") || normalizedText.includes("hardware")) {
        content = "Launching the **System Resource Monitor**...";
        onNavigate("monitor");
      } else if (normalizedText.includes("processing") || normalizedText.includes("pipeline")) {
        content = "Navigating to the **AI Processing Console**...";
        onNavigate("processing");
      } else if (normalizedText.includes("library") || normalizedText.includes("videos")) {
        content = "Opening **Video Library Explorer**...";
        onNavigate("library");
      } else if (normalizedText.includes("dashboard") || normalizedText.includes("center")) {
        content = "Returning to the **Command Center**...";
        onNavigate("dashboard");
      }

      setMessages((prev) => [...prev, { role: "assistant", content }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-secondary p-[1px] shadow-glow flex items-center justify-center cursor-pointer hover:scale-105 transition-all text-white animate-bounce"
          style={{ animationDuration: "3s" }}
        >
          <Brain className="w-5 h-5 text-secondary" />
        </button>
      )}

      {isOpen && (
        <div className="w-80 h-96 glass-panel flex flex-col justify-between border-white/[0.04] shadow-glass relative">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.04] p-3 bg-black/10">
            <span className="text-[10px] font-bold text-cyan-400 font-mono flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 animate-pulse" /> AI Workspace Copilot
            </span>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-all cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`p-3 rounded-xl text-[10px] leading-relaxed max-w-[85%] ${
                  msg.role === "user" ? "bg-black/35 border border-white/5" : "bg-background-card border border-primary/20 text-gray-300"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-background-card border border-primary/10 rounded-xl p-2.5 flex gap-1 items-center">
                  <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce"></span>
                  <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
          </div>

          {/* Suggested prompts */}
          {messages.length === 1 && (
            <div className="p-3 border-t border-white/[0.04] bg-black/5 space-y-1.5">
              {prompts.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSend(p)}
                  className="w-full text-left text-[9px] bg-white/5 border border-white/5 hover:border-secondary/20 hover:text-cyan-400 p-2 rounded-lg text-gray-400 transition-all font-semibold"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input field */}
          <div className="flex items-center border-t border-white/[0.04] p-2 bg-black/10">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask Copilot (e.g. go to search)..."
              className="bg-transparent border-none text-[10px] text-white placeholder-gray-500 focus:outline-none flex-1 px-2 font-medium"
            />
            <button onClick={() => handleSend()} className="btn-gradient p-2 rounded-xl">
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
