import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "media", // follows the phone's system setting automatically
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-rubik)", "system-ui", "sans-serif"],
      },
      colors: {
        // neutral base — soft slate/zinc, never stark white/black
        surface: {
          DEFAULT: "#fafafa",
          card: "#ffffff",
          dark: "#18181b",
          "dark-card": "#232327",
        },
        ink: {
          DEFAULT: "#27272a",
          soft: "#71717a",
          dark: "#f4f4f5",
          "dark-soft": "#a1a1aa",
        },
        // accent
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          300: "#a5b4fc",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
        // unit-crest derived accents — used sparingly, as a ribbon/badge motif
        unit: {
          green: "#1f5c46",
          "green-light": "#2f7a5f",
          tan: "#c9a06b",
          red: "#7a1f1f",
        },
        // pastel status colors
        status: {
          todo: "#e4e4e7",
          "todo-fg": "#52525b",
          progress: "#c7d2fe",
          "progress-fg": "#4338ca",
          stuck: "#fecdd3",
          "stuck-fg": "#be123c",
          done: "#bbf7d0",
          "done-fg": "#15803d",
        },
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 2px 14px -4px rgb(0 0 0 / 0.08)",
        card: "0 1px 3px rgb(0 0 0 / 0.06), 0 8px 24px -12px rgb(0 0 0 / 0.10)",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 2.2s ease-in-out infinite",
        "pop-in": "pop-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
