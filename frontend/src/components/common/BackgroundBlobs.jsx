import React, { useEffect, useState } from "react";

export default function BackgroundBlobs() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Spotlight mouse tracker
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="aurora-canvas">
      {/* Layer 2 & 3: Rotating Mesh and Aurora Flow */}
      <div className="aurora-mesh animate-mesh-spin"></div>
      
      {/* Floating Aurora shapes */}
      <div 
        className="absolute top-[20%] left-[15%] w-[350px] h-[350px] rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-[60px] animate-aurora-flow"
        style={{ animationDuration: "12s" }}
      ></div>
      <div 
        className="absolute bottom-[20%] right-[10%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-secondary/8 to-transparent blur-[70px] animate-aurora-flow"
        style={{ animationDuration: "18s", animationDelay: "2s" }}
      ></div>
      <div 
        className="absolute top-[50%] left-[60%] w-[300px] h-[300px] rounded-full bg-gradient-to-br from-accent-purple/8 to-transparent blur-[50px] animate-aurora-flow"
        style={{ animationDuration: "22s", animationDelay: "4s" }}
      ></div>

      {/* Layer 4: Floating Tiny Particles */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        {[...Array(20)].map((_, i) => {
          const size = Math.random() * 2 + 1;
          const delay = Math.random() * 6;
          const duration = Math.random() * 10 + 10;
          const left = Math.random() * 100;
          const top = Math.random() * 100;
          return (
            <span
              key={i}
              className="absolute bg-cyan-400 rounded-full animate-float"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${left}%`,
                top: `${top}%`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
                opacity: Math.random() * 0.5 + 0.1
              }}
            ></span>
          );
        })}
      </div>

      {/* Layer 5: Technology Grid overlay */}
      <div className="aurora-grid"></div>

      {/* Layer 6: Film Noise Overlay */}
      <div className="aurora-noise"></div>

      {/* Layer 7: Interactive Mouse Spotlight */}
      <div 
        className="spotlight-glow hidden sm:block"
        style={{
          left: `${mousePos.x}px`,
          top: `${mousePos.y}px`,
        }}
      ></div>
    </div>
  );
}
