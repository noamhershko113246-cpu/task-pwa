"use client";

import { motion } from "framer-motion";

export default function ProgressRing({
  percent,
  size = 88,
  strokeWidth = 9,
  label,
  sublabel,
}: {
  percent: number; // 0–100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const color =
    percent >= 80 ? "#10b981" : percent >= 40 ? "#6366f1" : "#f43f5e";

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-zinc-100 dark:stroke-zinc-800"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-extrabold text-ink dark:text-ink-dark">{Math.round(percent)}%</span>
        {sublabel && <span className="text-[10px] text-ink-soft dark:text-ink-dark-soft">{sublabel}</span>}
      </div>
      {label && <span className="mt-1.5 text-xs font-medium text-ink-soft dark:text-ink-dark-soft">{label}</span>}
    </div>
  );
}
