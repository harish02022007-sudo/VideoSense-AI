import React, { useState } from "react";
import {
  User,
  ShieldCheck,
  Cpu,
  HardDrive,
  Award,
  Key,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Calendar,
  Mail,
  Phone,
  ShieldAlert,
  Server
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import PasswordStrengthMeter, { evaluatePassword } from "../auth/PasswordStrengthMeter";

export default function ProfilePanel() {
  const { user, changePassword, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New password confirmation does not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage("New password cannot be identical to your current password.");
      return;
    }

    const strength = evaluatePassword(newPassword);
    if (!strength.isValid) {
      setErrorMessage("New password must meet security criteria (min 12 characters, uppercase, lowercase, numbers, symbols).");
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(currentPassword, newPassword, confirmPassword);
      setSuccessMessage(res.message || "Password successfully changed!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
      setErrorMessage(detail || "Failed to update password. Please check your current password.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "N/A";
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 select-none">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          User Profile & Security
        </h2>
        <p className="text-gray-400 mt-2 text-sm">
          Inspect your authenticated identity, update security credentials, and review encryption telemetry.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 flex flex-col items-center text-center space-y-4 border-white/[0.04]">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-cyan-400 via-primary to-purple-500 p-[1px] shadow-glow">
              <div className="w-full h-full bg-background-dark rounded-2xl flex items-center justify-center text-2xl font-bold font-mono text-white">
                {getInitials(user?.full_name)}
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-white leading-snug">
                {user?.full_name || "Harish"}
              </h3>
              <span className="text-xs text-cyan-400 font-mono block">
                @{user?.username || "harish_dev"}
              </span>
              <span className="inline-block mt-2 text-[9px] px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono uppercase font-bold">
                {user?.role || "WORKSPACE ADMINISTRATOR"}
              </span>
            </div>

            <div className="w-full pt-4 border-t border-white/5 space-y-2.5 text-xs text-left">
              <div className="flex items-center justify-between text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-500" /> Email
                </span>
                <span className="text-white font-mono truncate max-w-[150px]">
                  {user?.email || "harish@videosense.ai"}
                </span>
              </div>

              <div className="flex items-center justify-between text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" /> Member Since
                </span>
                <span className="text-white font-mono">
                  {formatDate(user?.created_at)}
                </span>
              </div>

              <div className="flex items-center justify-between text-gray-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Email Status
                </span>
                <span className="text-emerald-400 font-bold font-mono">
                  {user?.is_email_verified ? "Verified" : "Pending"}
                </span>
              </div>
            </div>

            <div className="w-full pt-2">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-mono font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out of Account</span>
              </button>
            </div>
          </div>

          {/* Achievement Metrics */}
          <div className="glass-panel p-6 border-white/[0.04] space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-400" /> Production Usage
            </h3>
            <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
              <div className="p-3 bg-black/30 border border-white/5 rounded-xl">
                <span className="text-gray-500 block uppercase text-[8px]">Session Type</span>
                <span className="text-emerald-400 font-bold text-xs">JWT Bearer</span>
              </div>
              <div className="p-3 bg-black/30 border border-white/5 rounded-xl">
                <span className="text-gray-500 block uppercase text-[8px]">Auth Scheme</span>
                <span className="text-cyan-400 font-bold text-xs">Argon2id</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Change Password & Security Config */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Change Password Form */}
          <div className="glass-panel p-6 sm:p-8 border-white/[0.04] space-y-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" /> Change Password
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Update your account password. Requires your current password and conforms to the 12+ character security policy.
              </p>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="flex-1">{errorMessage}</span>
                <button onClick={() => setErrorMessage("")} className="text-rose-400">✕</button>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="flex-1">{successMessage}</span>
                <button onClick={() => setSuccessMessage("")} className="text-emerald-400">✕</button>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-gray-400">Current Password</label>
                <div className="relative flex items-center bg-black/40 border border-white/10 focus-within:border-cyan-400 rounded-xl px-3 py-2.5">
                  <Lock className="w-4 h-4 text-gray-500 mr-2.5" />
                  <input
                    type={showCurrent ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="text-gray-500 hover:text-gray-300"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-gray-400">New Password (min 12 characters)</label>
                <div className="relative flex items-center bg-black/40 border border-white/10 focus-within:border-cyan-400 rounded-xl px-3 py-2.5">
                  <Lock className="w-4 h-4 text-gray-500 mr-2.5" />
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter strong new password"
                    className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="text-gray-500 hover:text-gray-300"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrengthMeter password={newPassword} showRequirements={true} />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-gray-400">Confirm New Password</label>
                <div className="relative flex items-center bg-black/40 border border-white/10 focus-within:border-cyan-400 rounded-xl px-3 py-2.5">
                  <Lock className="w-4 h-4 text-gray-500 mr-2.5" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="text-gray-500 hover:text-gray-300"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-gradient px-6 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Updating Credentials...
                  </>
                ) : (
                  <>
                    Save New Password
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Security Architecture Telemetry */}
          <div className="glass-panel p-6 border-white/[0.04] space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-400" /> Active Security Controls
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                <span className="text-gray-400 block font-bold">Argon2id Hash Pipeline</span>
                <p className="text-[11px] text-gray-500 leading-snug">
                  Passwords salted with 32-byte cryptographic salt and hashed with memory-hard resistance.
                </p>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                <span className="text-gray-400 block font-bold">Peppered OTP Verification</span>
                <p className="text-[11px] text-gray-500 leading-snug">
                  OTPs are never stored in plaintext. Verified against SHA-256 HMAC peppers with 10-minute expiry.
                </p>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                <span className="text-gray-400 block font-bold">Lockout Shield</span>
                <p className="text-[11px] text-gray-500 leading-snug">
                  5 consecutive failed attempts trigger an automated 15-minute account lockout.
                </p>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                <span className="text-gray-400 block font-bold">Anti-Enumeration Handlers</span>
                <p className="text-[11px] text-gray-500 leading-snug">
                  Password reset and OTP resend requests return generic responses to prevent user probing.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
