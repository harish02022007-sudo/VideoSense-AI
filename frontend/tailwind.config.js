/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: {
          dark: "#020206",
          card: "rgba(10, 11, 20, 0.45)",
          glass: "rgba(255, 255, 255, 0.02)",
          mesh: "#060312"
        },
        primary: {
          DEFAULT: "#0052FF", // Electric Blue
          glow: "rgba(0, 82, 255, 0.25)",
        },
        secondary: {
          DEFAULT: "#00F0FF", // Cyan
          glow: "rgba(0, 240, 255, 0.25)",
        },
        accent: {
          purple: "#7C3AED", // Violet
          indigo: "#4F46E5", // Indigo
          pink: "#DB2777", // Pink
          orange: "#EA580C", // Orange
          gold: "#D97706", // Gold
          teal: "#0D9488", // Teal
          neon: "#10B981"  // Neon Green
        },
        status: {
          success: "#10B981",    // Emerald
          warning: "#F59E0B",    // Amber
          processing: "#3B82F6", // Blue
          offline: "#EF4444"     // Red
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 30px rgba(0, 82, 255, 0.2)",
        "glow-cyan": "0 0 30px rgba(0, 240, 255, 0.25)",
        "glow-purple": "0 0 30px rgba(124, 58, 237, 0.2)",
        "glow-green": "0 0 20px rgba(16, 185, 129, 0.15)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.5)",
        "glass-inset": "inset 0 1px 1px 0 rgba(255, 255, 255, 0.05)",
      },
      backdropBlur: {
        glass: "16px",
      },
      animation: {
        'mesh-spin': 'mesh-spin 25s linear infinite',
        'aurora-flow': 'aurora-flow 15s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 4s ease-in-out infinite',
      },
      keyframes: {
        'mesh-spin': {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(180deg) scale(1.15)' },
          '100%': { transform: 'rotate(360deg) scale(1)' }
        },
        'aurora-flow': {
          '0%': { transform: 'translate(0%, 0%) scale(1)' },
          '50%': { transform: 'translate(10%, -5%) scale(1.08)' },
          '100%': { transform: 'translate(-5%, 8%) scale(0.95)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'pulse-slow': {
          '0%, 100%': { opacity: 0.3 },
          '50%': { opacity: 0.6 }
        }
      }
    },
  },
  plugins: [],
}
