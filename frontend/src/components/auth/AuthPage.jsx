import React, { useState } from "react";
import { Play, Key, Mail, Lock, User, ArrowRight, ShieldCheck } from "lucide-react";

export default function AuthPage({ onLoginSuccess }) {
  const [mode, setMode] = useState("login"); // login, signup, forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate successful login authentication
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen text-gray-100 flex items-center justify-center p-6 relative overflow-hidden bg-background-dark">
      {/* Background gradients */}
      <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[60px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] bg-secondary/8 rounded-full blur-[60px] pointer-events-none"></div>

      {/* Main glass panel auth card */}
      <div className="w-full max-w-md glass-panel p-8 space-y-6 border-white/[0.04]">
        {/* Header Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary p-[1px] shadow-glow flex items-center justify-center">
            <div className="w-full h-full bg-background-dark rounded-2xl flex items-center justify-center">
              <Play className="w-5 h-5 text-secondary fill-secondary/20" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {mode === "login" && "Access AI Platform"}
              {mode === "signup" && "Create Developer Account"}
              {mode === "forgot" && "Reset Security Key"}
            </h2>
            <p className="text-xs text-gray-400 mt-1">VideoSense AI Deep Vision Workspace</p>
          </div>
        </div>

        {/* Input Forms */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="relative flex items-center bg-black/40 border border-white/5 focus-within:border-secondary/40 rounded-xl transition-all px-3 py-2">
              <User className="w-4 h-4 text-gray-500 mr-2.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-medium"
              />
            </div>
          )}

          <div className="relative flex items-center bg-black/40 border border-white/5 focus-within:border-secondary/40 rounded-xl transition-all px-3 py-2">
            <Mail className="w-4 h-4 text-gray-500 mr-2.5" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-medium"
            />
          </div>

          {mode !== "forgot" && (
            <div className="relative flex items-center bg-black/40 border border-white/5 focus-within:border-secondary/40 rounded-xl transition-all px-3 py-2">
              <Lock className="w-4 h-4 text-gray-500 mr-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Secure Password"
                className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-medium"
              />
            </div>
          )}

          {/* Action trigger button */}
          <button type="submit" className="btn-gradient w-full py-3 justify-center text-xs font-bold uppercase tracking-wider">
            {mode === "login" && "Authorize Workspace"}
            {mode === "signup" && "Initialize Onboarding"}
            {mode === "forgot" && "Send Reset Link"} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle options footer */}
        <div className="flex items-center justify-between text-[10px] text-gray-500 pt-2 border-t border-white/5 font-mono">
          {mode === "login" ? (
            <>
              <button onClick={() => setMode("signup")} className="hover:text-cyan-400">Create Account</button>
              <button onClick={() => setMode("forgot")} className="hover:text-cyan-400">Forgot Password?</button>
            </>
          ) : (
            <button onClick={() => setMode("login")} className="hover:text-cyan-400 w-full text-center">Return to Login</button>
          )}
        </div>
      </div>
    </div>
  );
}
