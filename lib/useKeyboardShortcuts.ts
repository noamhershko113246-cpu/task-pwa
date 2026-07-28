"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface ShortcutConfig {
  onNew?: () => void;
  onSearch?: () => void;
  onEscape?: () => void;
  /** enables g→b (board) / g→c (calendar) / g→h (history), Linear-style "go to" chords */
  navBase?: "manager" | null;
}

export function useKeyboardShortcuts(config: ShortcutConfig) {
  const router = useRouter();
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    let lastKey = "";
    let lastKeyTime = 0;

    function isTypingTarget(el: Element | null): boolean {
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return; // never hijack browser/OS shortcuts

      if (e.key === "Escape") {
        configRef.current.onEscape?.();
        return;
      }

      if (isTypingTarget(document.activeElement)) return; // typing normally — don't intercept

      const now = Date.now();
      if (lastKey === "g" && now - lastKeyTime < 600 && configRef.current.navBase) {
        const base = configRef.current.navBase;
        if (e.key === "b") router.push(`/${base}/board`);
        else if (e.key === "c") router.push(`/${base}/calendar`);
        else if (e.key === "h") router.push(`/${base}/history`);
        lastKey = "";
        return;
      }

      if (e.key === "g") {
        lastKey = "g";
        lastKeyTime = now;
        return;
      }
      lastKey = "";

      if (e.key === "n") {
        e.preventDefault();
        configRef.current.onNew?.();
      } else if (e.key === "/") {
        e.preventDefault();
        configRef.current.onSearch?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);
}
