import React, { useMemo } from "react";
import { Check, X, ShieldAlert, ShieldCheck } from "lucide-react";

export const evaluatePassword = (password = "") => {
  if (!password) {
    return {
      score: 0,
      label: "Enter a password",
      color: "bg-gray-700",
      textColor: "text-gray-400",
      requirements: {
        length: false,
        lowercase: false,
        uppercase: false,
        number: false,
        special: false,
        noRepeats: true,
      },
      isValid: false,
    };
  }

  const length = password.length >= 12;
  const lowercase = /[a-z]/.test(password);
  const uppercase = /[A-Z]/.test(password);
  const number = /[0-9]/.test(password);
  const special = /[^a-zA-Z0-9]/.test(password);

  // Check for repeated sequences (e.g. "aaa", "111")
  const hasRepeats = /(.)\1{2,}/.test(password);
  // Common weak passwords
  const commonWeak = ["password", "12345678", "admin123", "videosense123", "qwertyuiop"];
  const isCommon = commonWeak.some((w) => password.toLowerCase().includes(w));

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (lowercase && uppercase) score += 1;
  if (number) score += 1;
  if (special) score += 1;

  if (hasRepeats || isCommon) {
    score = Math.max(0, score - 2);
  }

  // Normalize to 0-4 scale
  const normalizedScore = Math.min(4, Math.max(0, Math.floor(score * 0.8)));

  const levels = [
    { label: "Very Weak", color: "bg-rose-500", textColor: "text-rose-400" },
    { label: "Weak", color: "bg-orange-500", textColor: "text-orange-400" },
    { label: "Fair", color: "bg-amber-400", textColor: "text-amber-300" },
    { label: "Strong", color: "bg-cyan-400", textColor: "text-cyan-300" },
    { label: "Very Strong", color: "bg-emerald-400", textColor: "text-emerald-300" },
  ];

  const level = levels[normalizedScore];
  const isValid = length && normalizedScore >= 2 && !isCommon;

  return {
    score: normalizedScore,
    label: level.label,
    color: level.color,
    textColor: level.textColor,
    requirements: {
      length,
      lowercase,
      uppercase,
      number,
      special,
      noRepeats: !hasRepeats && !isCommon,
    },
    isValid,
    isCommon,
  };
};

export default function PasswordStrengthMeter({ password = "", showRequirements = true }) {
  const result = useMemo(() => evaluatePassword(password), [password]);

  if (!password && !showRequirements) return null;

  return (
    <div className="space-y-2.5 mt-2 select-none">
      {/* 5-segment progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-gray-400">Password Strength:</span>
          <span className={`font-bold ${result.textColor}`}>
            {password ? result.label : "Required (min 12 chars)"}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1.5 h-1.5">
          {[0, 1, 2, 3, 4].map((index) => {
            const isActive = password && index <= result.score;
            return (
              <div
                key={index}
                className={`h-full rounded-full transition-all duration-300 ${
                  isActive ? result.color : "bg-white/10"
                }`}
              />
            );
          })}
        </div>
      </div>

      {result.isCommon && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg">
          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
          <span>This password is too common or easily guessed.</span>
        </div>
      )}

      {/* Requirements checklist */}
      {showRequirements && (
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 border-t border-white/5 text-[10px] font-mono">
          <RequirementItem
            met={result.requirements.length}
            text="12+ Characters"
          />
          <RequirementItem
            met={result.requirements.uppercase && result.requirements.lowercase}
            text="Upper & lowercase"
          />
          <RequirementItem
            met={result.requirements.number}
            text="At least 1 number"
          />
          <RequirementItem
            met={result.requirements.special}
            text="At least 1 symbol (!@#$)"
          />
        </div>
      )}
    </div>
  );
}

function RequirementItem({ met, text }) {
  return (
    <div
      className={`flex items-center gap-1.5 transition-colors ${
        met ? "text-emerald-400" : "text-gray-500"
      }`}
    >
      {met ? (
        <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
      ) : (
        <div className="w-3 h-3 rounded-full border border-gray-600 flex items-center justify-center flex-shrink-0">
          <span className="w-1 h-1 rounded-full bg-gray-600" />
        </div>
      )}
      <span>{text}</span>
    </div>
  );
}

