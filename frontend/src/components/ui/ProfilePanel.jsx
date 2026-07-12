import React from "react";
import { User, ShieldCheck, Cpu, HardDrive, Award } from "lucide-react";

export default function ProfilePanel() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 select-none">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          User Profile
        </h2>
        <p className="text-gray-400 mt-2 text-sm">
          Manage credentials and inspect workspace usage achievements.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Profile Avatar Info */}
        <div className="md:col-span-1 glass-panel p-6 flex flex-col items-center text-center space-y-4 border-white/[0.04]">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-secondary p-[1px] shadow-glow">
            <div className="w-full h-full bg-background-dark rounded-full overflow-hidden flex items-center justify-center">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-snug">Harish</h3>
            <span className="text-[10px] text-gray-500 font-mono">WORKSPACE ADMINISTRATOR</span>
          </div>
        </div>

        {/* Right Stats and usage */}
        <div className="md:col-span-2 space-y-6">
          {/* Settings info form */}
          <div className="glass-panel p-6 border-white/[0.04] space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Workspace Details</h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-gray-500 block uppercase text-[8px] font-semibold">User Role</span>
                <span className="text-white font-bold">Admin</span>
              </div>
              <div className="space-y-1">
                <span className="text-gray-500 block uppercase text-[8px] font-semibold">Joined</span>
                <span className="text-white font-bold">July 2026</span>
              </div>
              <div className="space-y-1 pt-2 border-t border-white/5">
                <span className="text-gray-500 block uppercase text-[8px] font-semibold">Active Session</span>
                <span className="text-emerald-400 font-bold">Online</span>
              </div>
              <div className="space-y-1 pt-2 border-t border-white/5">
                <span className="text-gray-500 block uppercase text-[8px] font-semibold">Workspace Limit</span>
                <span className="text-white font-bold">9% Storage Load</span>
              </div>
            </div>
          </div>

          {/* Stats counters */}
          <div className="glass-panel p-6 border-white/[0.04] space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono"><Award className="w-4 h-4 text-secondary inline mr-1" /> Achievement Metrics</h3>
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-3 bg-black/20 border border-white/5 rounded-xl">
                <span className="text-gray-500 block uppercase text-[7px]">Videos Ingested</span>
                <span className="text-white font-bold text-[14px]">14</span>
              </div>
              <div className="p-3 bg-black/20 border border-white/5 rounded-xl border-x">
                <span className="text-gray-500 block uppercase text-[7px]">Entities Tagged</span>
                <span className="text-white font-bold text-[14px]">32,489</span>
              </div>
              <div className="p-3 bg-black/20 border border-white/5 rounded-xl">
                <span className="text-gray-500 block uppercase text-[7px]">Qwen Queries</span>
                <span className="text-white font-bold text-[14px]">104</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
