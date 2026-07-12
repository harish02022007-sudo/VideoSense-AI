import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Sparkles, Cpu, ShieldCheck, ArrowRight, Video, Search, MessageSquare, Database, LineChart } from "lucide-react";

// CountUp Component for statistics
function CountUp({ end, suffix = "", duration = 2000 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span className="text-glow-cyan">{count.toLocaleString()}{suffix}</span>;
}

export default function LandingPage({ onGetStarted }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Parallax tracker
  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const x = (clientX - window.innerWidth / 2) / 50;
    const y = (clientY - window.innerHeight / 2) / 50;
    setMousePos({ x, y });
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const features = [
    { title: "Object Tracking", desc: "Real-time classifications and frame bounding boxes via YOLOv11.", icon: Sparkles },
    { title: "Semantic Search", desc: "Natural language retrieval mapping query embeddings against FAISS.", icon: Search },
    { title: "Multimodal Chat", desc: "Interactive dialogue context compiled using transcripts and OCR reads.", icon: MessageSquare },
    { title: "E-Commerce Matcher", desc: "Isolating visual frames to recommend catalog items.", icon: Database }
  ];

  // Motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="min-h-screen text-gray-100 flex flex-col justify-between select-none relative overflow-hidden bg-background-dark">
      {/* 7-Layer Background System */}
      <div className="aurora-mesh animate-mesh-spin absolute inset-0 z-0 pointer-events-none"></div>
      <div className="aurora-grid absolute inset-0 z-0 pointer-events-none"></div>
      <div className="aurora-noise absolute inset-0 z-0 pointer-events-none"></div>

      {/* Floating low-opacity AI Visual Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-15">
        <div 
          className="absolute border border-cyan-500/30 p-2 rounded-lg w-28 h-20 animate-float"
          style={{ top: "15%", left: "10%", animationDuration: "12s" }}
        >
          <span className="text-[8px] font-mono text-cyan-400">YOLO: PERSON</span>
          <div className="border border-cyan-500/20 w-full h-8 mt-2 rounded"></div>
        </div>

        <div 
          className="absolute border border-purple-500/30 p-2 rounded-lg w-36 h-12 animate-float"
          style={{ top: "35%", right: "12%", animationDuration: "16s", animationDelay: "2s" }}
        >
          <span className="text-[8px] font-mono text-purple-400">WHISPER: TRANSCRIPT</span>
          <div className="w-full h-1 bg-white/10 mt-2 rounded-full"></div>
        </div>

        <div 
          className="absolute border border-amber-500/30 p-2 rounded-lg w-20 h-20 animate-float"
          style={{ bottom: "25%", left: "8%", animationDuration: "18s", animationDelay: "4s" }}
        >
          <span className="text-[8px] font-mono text-amber-400">CLIP VECTOR</span>
          <div className="grid grid-cols-3 gap-1 mt-2">
            {[...Array(9)].map((_, i) => <div key={i} className="w-2.5 h-2.5 bg-amber-500/20 rounded"></div>)}
          </div>
        </div>
      </div>

      {/* Main hero segment */}
      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 max-w-6xl mx-auto px-6 py-20 flex flex-col items-center text-center space-y-12 z-10"
        style={{
          transform: `translate3d(${mousePos.x}px, ${mousePos.y}px, 0)`,
          transition: "transform 0.2s ease-out"
        }}
      >
        <motion.div variants={itemVariants} className="space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 shadow-glow-cyan animate-pulse">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen Multimodal AI
          </span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-tight">
            Video Understanding <br />
            <span className="text-gradient-primary">Operating System</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed pt-2">
            VideoSense AI orchestrates Vision, Speech, and Large Language models to parse video streams, generate analytical reports, and enable semantic chats.
          </p>
        </motion.div>

        {/* CTA Buttons with hover lift */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={onGetStarted} 
            className="btn-gradient px-8 py-3.5 text-base hover:scale-105 transition-all duration-300 shadow-glow"
          >
            Start For Free <ArrowRight className="w-5 h-5 animate-pulse" />
          </button>
          <button 
            onClick={() => alert("Redirecting to documentation...")} 
            className="btn-glass px-8 py-3.5 text-base hover:bg-white/10 transition-all duration-300"
          >
            Read AI Research Paper
          </button>
        </motion.div>

        {/* Statistics count up cards */}
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-3 gap-6 w-full max-w-2xl py-6 border-y border-white/[0.04] text-center"
        >
          <div>
            <span className="text-gray-500 block text-[9px] uppercase font-bold tracking-widest">Inference Speed</span>
            <p className="text-2xl font-black text-white mt-1">
              <CountUp end={45} suffix=" ms" />
            </p>
          </div>
          <div className="border-x border-white/5">
            <span className="text-gray-500 block text-[9px] uppercase font-bold tracking-widest">Target Accuracy</span>
            <p className="text-2xl font-black text-white mt-1">
              <CountUp end={99} suffix="%" />
            </p>
          </div>
          <div>
            <span className="text-gray-500 block text-[9px] uppercase font-bold tracking-widest">Index volume</span>
            <p className="text-2xl font-black text-white mt-1">
              <CountUp end={32489} suffix="+" />
            </p>
          </div>
        </motion.div>

        {/* Features row with scale-in reveal */}
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full pt-8"
        >
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div 
                key={feat.title} 
                className="glass-panel p-5 text-left space-y-4 border-white/[0.04] hover:border-cyan-400/25 hover:bg-white/[0.01] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer shadow-lg"
              >
                <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-secondary">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{feat.title}</h3>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </motion.div>
      </motion.main>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 text-center text-[10px] text-gray-600 bg-black/20 backdrop-blur-sm z-10 select-none">
        <p>© 2026 VideoSense AI Inc. Developed by World-class Frontend Engineers. All rights reserved.</p>
      </footer>
    </div>
  );
}
