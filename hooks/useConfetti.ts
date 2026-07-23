"use client";

import confetti from "canvas-confetti";
import { useCallback } from "react";

export function useConfetti() {
  return useCallback((originYRatio = 0.7) => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    // A small, tasteful burst — not a full-screen takeover
    confetti({
      particleCount: 60,
      spread: 65,
      startVelocity: 32,
      gravity: 1.1,
      scalar: 0.8,
      origin: { x: 0.5, y: originYRatio },
      colors: ["#6366f1", "#a5b4fc", "#34d399", "#fbbf24"],
      disableForReducedMotion: true,
    });
  }, []);
}
