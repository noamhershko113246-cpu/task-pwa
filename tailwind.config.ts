import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // user-controlled via Settings (see lib/theme.ts) — "dark" class on <html>, defaults to system preference
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  // Avatar gradient colors come from the database at runtime (team_members.color_from/color_to),
  // so Tailwind can never "see" them in scanned source — without this safelist those classes
  // get silently dropped and avatars render as empty/invisible circles.
  safelist: [
    { pattern: /^(from|to)-(sky|rose|amber|emerald|violet|cyan|fuchsia|lime|brand)-(400|600)$/ },
    "from-unit-red",
    "to-unit-tan",
  ],
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
          soft: "#63636b",
          dark: "#f4f4f5",
          "dark-soft": "#a1a1aa",
        },
        // accent — CSS variables (indigo by default, see globals.css) so the "colors follow the
        // background" option (lib/adaptiveColors.ts) can swap the whole accent at runtime.
        brand: {
          50: "rgb(var(--brand-50) / <alpha-value>)",
          100: "rgb(var(--brand-100) / <alpha-value>)",
          300: "rgb(var(--brand-300) / <alpha-value>)",
          400: "rgb(var(--brand-400) / <alpha-value>)",
          500: "rgb(var(--brand-500) / <alpha-value>)",
          600: "rgb(var(--brand-600) / <alpha-value>)",
          700: "rgb(var(--brand-700) / <alpha-value>)",
        },
        // unit-crest derived accents — used sparingly, as a ribbon/badge motif
        unit: {
          green: "#1f5c46",
          "green-light": "#2f7a5f",
          tan: "#c9a06b",
          "tan-deep": "#7f5b22",
          "red-light": "#e8a0a0",
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
        "route-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "bell-ring": {
          "0%": { transform: "rotate(0deg)" },
          "20%": { transform: "rotate(14deg)" },
          "40%": { transform: "rotate(-12deg)" },
          "60%": { transform: "rotate(8deg)" },
          "80%": { transform: "rotate(-4deg)" },
          "100%": { transform: "rotate(0deg)" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 2.2s ease-in-out infinite",
        "pop-in": "pop-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "route-in": "route-in 0.18s cubic-bezier(0.2, 0, 0, 1)",
        "bell-ring": "bell-ring 0.5s ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
