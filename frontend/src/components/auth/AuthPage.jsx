import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  RefreshCw,
  Phone,
  FileText,
  KeyRound,
  Check,
  ChevronLeft
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import PasswordStrengthMeter, { evaluatePassword } from "./PasswordStrengthMeter";

export default function AuthPage({ onLoginSuccess }) {
  const { login, register, verifyEmail, resendEmailOTP, forgotPassword, resetPassword } = useAuth();

  // Mode: "login" | "register" | "verify_email" | "forgot_password" | "reset_password"
  const [mode, setMode] = useState("login");

  // Form fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // OTP State (6 separate box inputs)
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = useState(0);
  const otpInputRefs = useRef([]);

  // Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Cooldown timer for OTP resend
  useEffect(() => {
    let timer = null;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  const clearAlerts = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  const switchMode = (newMode) => {
    clearAlerts();
    setMode(newMode);
  };

  // ==========================================
  // OTP Input Handler
  // ==========================================
  const handleOtpChange = (index, val) => {
    // Only accept numeric digit
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned && val !== "") return;

    const newDigits = [...otpDigits];
    newDigits[index] = cleaned.slice(-1);
    setOtpDigits(newDigits);

    // Auto-advance to next box if digit entered
    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    const focusIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  // ==========================================
  // Form Submission Handlers
  // ==========================================
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    clearAlerts();

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both identifier (email or username) and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await login(email.trim(), password, rememberMe);
      setSuccessMessage(res.message || "Login successful! Redirecting to workspace...");
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess();
      }, 700);
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
      if (detail === "EMAIL_NOT_VERIFIED") {
        setErrorMessage("Please verify your email address. A fresh verification code has been dispatched.");
        setCooldown(60);
        setMode("verify_email");
      } else {
        setErrorMessage(detail || "Invalid login credentials. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    clearAlerts();

    if (!fullName.trim() || !username.trim() || !email.trim()) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (!acceptTerms) {
      setErrorMessage("You must accept the Terms and Conditions to create an account.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Password confirmation does not match.");
      return;
    }

    const strength = evaluatePassword(password);
    if (!strength.isValid) {
      setErrorMessage("Password does not meet security requirements. Please use at least 12 characters with upper, lower, numbers, and symbols.");
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        confirm_password: confirmPassword,
        accept_terms: acceptTerms,
      });

      setSuccessMessage(res.message || "Registration successful! Verification code sent.");
      setCooldown(res.data?.cooldown_seconds || 60);
      setMode("verify_email");
      setOtpDigits(["", "", "", "", "", ""]);
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
      setErrorMessage(detail || "Registration failed. Please check your information and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailSubmit = async (e) => {
    e.preventDefault();
    clearAlerts();

    const fullCode = otpDigits.join("");
    if (fullCode.length !== 6) {
      setErrorMessage("Please enter all 6 digits of the verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyEmail(email.trim().toLowerCase(), fullCode);
      setSuccessMessage(res.message || "Email verified successfully! Entering workspace...");
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess();
      }, 700);
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
      setErrorMessage(detail || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    clearAlerts();
    setLoading(true);
    try {
      const res = await resendEmailOTP(email.trim().toLowerCase());
      setSuccessMessage(res.message || "A new 6-digit verification code has been dispatched.");
      setCooldown(res.data?.cooldown_seconds || 60);
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
      setErrorMessage(detail || "Failed to resend code. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    clearAlerts();

    if (!email.trim()) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(email.trim().toLowerCase());
      setSuccessMessage(res.message || "If an account exists, a reset code has been sent.");
      setCooldown(60);
      setMode("reset_password");
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
      setErrorMessage(detail || "Unable to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    clearAlerts();

    const fullCode = otpDigits.join("");
    if (fullCode.length !== 6) {
      setErrorMessage("Please enter the 6-digit reset code sent to your email.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("New passwords do not match.");
      return;
    }

    const strength = evaluatePassword(password);
    if (!strength.isValid) {
      setErrorMessage("New password does not meet security requirements (min 12 characters).");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({
        email: email.trim().toLowerCase(),
        otpCode: fullCode,
        newPassword: password,
        confirmPassword: confirmPassword,
      });

      setSuccessMessage(res.message || "Password successfully reset! Please sign in with your new password.");
      setTimeout(() => {
        setPassword("");
        setConfirmPassword("");
        setMode("login");
      }, 1500);
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
      setErrorMessage(detail || "Failed to reset password. Please check your reset code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-gray-100 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden bg-background-dark select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[15%] w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-purple-900/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Main SaaS Two-Column Container */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center z-10">
        
        {/* ========================================== */}
        {/* LEFT SECTION: Platform Brand & Value Props */}
        {/* ========================================== */}
        <div className="lg:col-span-6 space-y-8 text-left">
          {/* Logo & Headline */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary via-secondary to-accent-purple p-[1px] shadow-glow flex items-center justify-center">
                <div className="w-full h-full bg-background-dark rounded-2xl flex items-center justify-center">
                  <Play className="w-5 h-5 text-secondary fill-secondary/20" />
                </div>
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  VideoSense <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono font-bold">AI v1</span>
                </span>
                <span className="text-[11px] text-gray-400 font-mono block">Enterprise Multimodal Intelligence</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Understand <span className="bg-gradient-to-r from-cyan-400 via-primary to-purple-400 bg-clip-text text-transparent">Every Frame.</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-400 max-w-xl leading-relaxed">
              Unlock the hidden context within video footage. Detect objects, extract text & speech, track temporal scenes, and converse directly with your video archives.
            </p>
          </div>

          {/* Interactive Frame Detection Visual Card */}
          <div className="relative glass-panel p-4 border-white/10 rounded-2xl overflow-hidden shadow-2xl bg-black/40">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-gray-300 font-bold">LIVE FRAME SCANNER</span>
              </div>
              <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                Grounding DINO + YOLOv8
              </span>
            </div>

            <div className="relative mt-3 h-44 rounded-xl bg-gradient-to-br from-gray-900 via-black to-slate-900 border border-white/5 flex items-center justify-center overflow-hidden">
              {/* Scanline Animation */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse opacity-75 shadow-glow" />

              {/* Bounding Box Mock 1 */}
              <div className="absolute top-6 left-8 w-28 h-24 border-2 border-cyan-400/80 rounded bg-cyan-400/5">
                <span className="absolute -top-5 left-0 text-[9px] font-mono font-bold bg-cyan-500 text-black px-1.5 py-0.5 rounded">
                  person : 0.96
                </span>
              </div>

              {/* Bounding Box Mock 2 */}
              <div className="absolute bottom-4 right-10 w-36 h-20 border-2 border-purple-400/80 rounded bg-purple-400/5">
                <span className="absolute -top-5 left-0 text-[9px] font-mono font-bold bg-purple-500 text-white px-1.5 py-0.5 rounded">
                  vehicle : 0.94
                </span>
              </div>

              {/* OCR Text Box */}
              <div className="absolute top-4 right-8 px-2 py-1 rounded bg-black/70 border border-emerald-400/50 text-[10px] font-mono text-emerald-300">
                OCR: "TERMINAL A-4"
              </div>

              {/* Center status */}
              <div className="text-center space-y-1">
                <Cpu className="w-7 h-7 text-gray-500 mx-auto animate-spin" style={{ animationDuration: "12s" }} />
                <span className="text-[10px] font-mono text-gray-500">60 FPS Multimodal Pipeline Active</span>
              </div>
            </div>

            {/* Visual Specs */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5 text-center text-[10px] font-mono text-gray-400">
              <div>
                <span className="text-white font-bold block">142</span> Detections/sec
              </div>
              <div className="border-x border-white/5">
                <span className="text-emerald-400 font-bold block">600K</span> Hash Cycles
              </div>
              <div>
                <span className="text-cyan-400 font-bold block">99.8%</span> Uptime SLA
              </div>
            </div>
          </div>

          {/* 3 Core Value Propositions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <FeatureCard
              icon={<Cpu className="w-4 h-4 text-cyan-400" />}
              title="Intelligent Detection"
              desc="Open-vocabulary object localization with zero-shot precision."
            />
            <FeatureCard
              icon={<Layers className="w-4 h-4 text-purple-400" />}
              title="Contextual RAG"
              desc="Cross-modal sync between vision, transcript, and OCR audio."
            />
            <FeatureCard
              icon={<Sparkles className="w-4 h-4 text-pink-400" />}
              title="AI Summaries"
              desc="Instant topic dossiers and chapter markers generated on upload."
            />
          </div>

          {/* Security & Cryptography Assurance */}
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Secured with Argon2id cryptographic hashing, OTP verification & JWT sessions.</span>
          </div>
        </div>

        {/* ========================================== */}
        {/* RIGHT SECTION: Modern Authentication Card  */}
        {/* ========================================== */}
        <div className="lg:col-span-6">
          <div className="glass-panel p-6 sm:p-8 border-white/10 rounded-2xl shadow-2xl relative bg-black/50 backdrop-blur-xl">
            
            {/* Mode Titles */}
            <div className="mb-6">
              {mode === "login" && (
                <>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h2>
                  <p className="text-xs text-gray-400 mt-1">Sign in to access your VideoSense AI workspace</p>
                </>
              )}
              {mode === "register" && (
                <>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Create Your Account</h2>
                  <p className="text-xs text-gray-400 mt-1">Start analyzing and understanding videos with production AI</p>
                </>
              )}
              {mode === "verify_email" && (
                <>
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
                    <Mail className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Verify Your Email</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    We sent a 6-digit verification code to <span className="text-cyan-300 font-mono">{email}</span>
                  </p>
                </>
              )}
              {mode === "forgot_password" && (
                <>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
                    <KeyRound className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Reset Password</h2>
                  <p className="text-xs text-gray-400 mt-1">Enter your email and we'll dispatch a 6-digit recovery code</p>
                </>
              )}
              {mode === "reset_password" && (
                <>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Enter Reset Code</h2>
                  <p className="text-xs text-gray-400 mt-1">Provide the verification code and your new password</p>
                </>
              )}
            </div>

            {/* Error & Success Feedback Alerts */}
            {errorMessage && (
              <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                <span className="flex-1">{errorMessage}</span>
                <button onClick={() => setErrorMessage("")} className="text-rose-400 hover:text-white">✕</button>
              </div>
            )}

            {successMessage && (
              <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                <span className="flex-1">{successMessage}</span>
                <button onClick={() => setSuccessMessage("")} className="text-emerald-400 hover:text-white">✕</button>
              </div>
            )}

            {/* ========================================== */}
            {/* VIEW 1: SIGN IN FORM                       */}
            {/* ========================================== */}
            {mode === "login" && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-gray-400">Email or Username</label>
                  <div className="relative flex items-center bg-black/40 border border-white/10 focus-within:border-cyan-400 rounded-xl transition-all px-3 py-2.5">
                    <User className="w-4 h-4 text-gray-500 mr-2.5" />
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com or username"
                      className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-gray-400">Password</label>
                    <button
                      type="button"
                      onClick={() => switchMode("forgot_password")}
                      className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative flex items-center bg-black/40 border border-white/10 focus-within:border-cyan-400 rounded-xl transition-all px-3 py-2.5">
                    <Lock className="w-4 h-4 text-gray-500 mr-2.5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-medium font-mono"
                    />
                    <button
                      type="button"
                      aria-label="Toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-500 hover:text-gray-300 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-gray-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded bg-black/40 border-white/10 text-cyan-500 focus:ring-cyan-500/20"
                    />
                    <span>Remember me for 30 days</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gradient w-full py-3 justify-center text-xs font-bold uppercase tracking-wider mt-2 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Authenticating...
                    </>
                  ) : (
                    <>
                      Sign In to VideoSense <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-4 border-t border-white/5 text-center text-xs text-gray-400">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="text-cyan-400 font-bold hover:underline cursor-pointer"
                  >
                    Create Developer Account
                  </button>
                </div>
              </form>
            )}

            {/* ========================================== */}
            {/* VIEW 2: REGISTRATION FORM                  */}
            {/* ========================================== */}
            {mode === "register" && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gray-400">Full Name *</label>
                    <div className="relative flex items-center bg-black/40 border border-white/10 focus-within:border-cyan-400 rounded-xl px-3 py-2">
                      <User className="w-3.5 h-3.5 text-gray-500 mr-2" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Dr. Harish Kumar"
                        className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gray-400">Username *</label>
                    <div className="relative flex items-center bg-black/40 border border-white/10 focus-within:border-cyan-400 rounded-xl px-3 py-2">
                      <span className="text-gray-500 text-xs mr-1 font-mono">@</span>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                        placeholder="harish_ai"
                        className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-gray-400">Email Address *</label>
                  <div className="relative flex items-center bg-black/40 border border-white/10 focus-within:border-cyan-400 rounded-xl px-3 py-2">
                    <Mail className="w-3.5 h-3.5 text-gray-500 mr-2" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="developer@videosense.ai"
                      className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-medium"
                    />
                  </div>
                </div>

                {/* Password & Strength Meter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-gray-400">Password (min 12 characters) *</label>
                  <div className="relative flex items-center bg-black/40 border border-white/10 focus-within:border-cyan-400 rounded-xl px-3 py-2">
                    <Lock className="w-3.5 h-3.5 text-gray-500 mr-2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 12 characters"
                      className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-mono"
                    />
                    <button
                      type="button"
                      aria-label="Toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-500 hover:text-gray-300 p-1"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <PasswordStrengthMeter password={password} showRequirements={true} />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-gray-400">Confirm Password *</label>
                  <div className="relative flex items-center bg-black/40 border border-white/10 focus-within:border-cyan-400 rounded-xl px-3 py-2">
                    <Lock className="w-3.5 h-3.5 text-gray-500 mr-2" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-mono"
                    />
                    <button
                      type="button"
                      aria-label="Toggle confirm password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-gray-500 hover:text-gray-300 p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <span className="text-[10px] text-rose-400 font-mono">Passwords do not match.</span>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <Check className="w-3 h-3" /> Passwords match perfectly.
                    </span>
                  )}
                </div>

                {/* Terms of Service */}
                <div className="pt-1">
                  <label className="flex items-start gap-2 text-[11px] text-gray-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      required
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="w-3.5 h-3.5 rounded bg-black/40 border-white/10 text-cyan-500 mt-0.5"
                    />
                    <span>
                      I agree to the <span className="text-cyan-400 underline">Terms of Service</span> and{" "}
                      <span className="text-cyan-400 underline">Privacy Policy</span>.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gradient w-full py-3 justify-center text-xs font-bold uppercase tracking-wider mt-2 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Registering...
                    </>
                  ) : (
                    <>
                      Create Account & Verify <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-3 border-t border-white/5 text-center text-xs text-gray-400">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="text-cyan-400 font-bold hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            )}

            {/* ========================================== */}
            {/* VIEW 3: OTP VERIFICATION                   */}
            {/* ========================================== */}
            {mode === "verify_email" && (
              <form onSubmit={handleVerifyEmailSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-gray-300 block text-center">
                    Enter the 6-digit code sent to your email
                  </label>

                  {/* 6 Digit Input Boxes */}
                  <div className="flex justify-center gap-2 sm:gap-3 py-2" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-11 h-13 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-mono font-bold text-white bg-black/60 border border-white/10 rounded-xl focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all shadow-inner"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpDigits.join("").length !== 6}
                  className="btn-gradient w-full py-3 justify-center text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Access Workspace <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Resend OTP Cooldown */}
                <div className="flex items-center justify-between text-xs font-mono text-gray-400 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="flex items-center gap-1 hover:text-white cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </button>

                  {cooldown > 0 ? (
                    <span className="text-gray-500">
                      Resend in <span className="text-cyan-400 font-bold">{cooldown}s</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleResendOtp}
                      className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline cursor-pointer"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* ========================================== */}
            {/* VIEW 4: FORGOT PASSWORD REQUEST            */}
            {/* ========================================== */}
            {mode === "forgot_password" && (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-gray-400">Account Email Address</label>
                  <div className="relative flex items-center bg-black/40 border border-white/10 focus-within:border-cyan-400 rounded-xl px-3 py-2.5">
                    <Mail className="w-4 h-4 text-gray-500 mr-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gradient w-full py-3 justify-center text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Dispatching Code...
                    </>
                  ) : (
                    <>
                      Send Reset Code <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-3 border-t border-white/5 text-center text-xs">
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="text-gray-400 hover:text-white flex items-center justify-center gap-1 mx-auto"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Return to Login
                  </button>
                </div>
              </form>
            )}

            {/* ========================================== */}
            {/* VIEW 5: RESET PASSWORD VERIFICATION        */}
            {/* ========================================== */}
            {mode === "reset_password" && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-gray-300 block text-center">
                    Enter the 6-digit reset code
                  </label>
                  <div className="flex justify-center gap-2 sm:gap-3 py-1" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-10 h-12 text-center text-lg font-mono font-bold text-white bg-black/60 border border-white/10 rounded-xl focus:border-cyan-400 focus:outline-none"
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-gray-400">New Password (min 12 chars) *</label>
                  <div className="relative flex items-center bg-black/40 border border-white/10 focus-within:border-cyan-400 rounded-xl px-3 py-2">
                    <Lock className="w-3.5 h-3.5 text-gray-500 mr-2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="New strong password"
                      className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-mono"
                    />
                    <button
                      type="button"
                      aria-label="Toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-500 hover:text-gray-300 p-1"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <PasswordStrengthMeter password={password} showRequirements={false} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-gray-400">Confirm New Password *</label>
                  <div className="relative flex items-center bg-black/40 border border-white/10 focus-within:border-cyan-400 rounded-xl px-3 py-2">
                    <Lock className="w-3.5 h-3.5 text-gray-500 mr-2" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gradient w-full py-3 justify-center text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Updating Password...
                    </>
                  ) : (
                    <>
                      Reset Password & Login <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-2 text-center text-xs">
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="text-gray-400 hover:text-white flex items-center justify-center gap-1 mx-auto"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Cancel & Return to Login
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 hover:border-white/10 transition-all">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-xs font-bold text-white tracking-tight">{title}</h3>
      </div>
      <p className="text-[11px] text-gray-400 leading-snug">{desc}</p>
    </div>
  );
}
