"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps a list screen where it was: the scroll position is remembered (for this browser tab) while
 * scrolling, and put back the next time the screen is shown — e.g. after opening someone's page or the
 * history and coming back, instead of jumping to the top every time.
 *
 * `ready`: the content has rendered (data loaded), so the page is tall enough to scroll back into place.
 */
export function useScrollMemory(key: string, ready: boolean) {
  const storageKey = `taskpwa_scroll:${key}`;
  const restored = useRef(false);

  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    let y = 0;
    try {
      y = Number(window.sessionStorage.getItem(storageKey)) || 0;
    } catch {
      return;
    }
    if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
  }, [ready, storageKey]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          window.sessionStorage.setItem(storageKey, String(Math.round(window.scrollY)));
        } catch {
          // storage blocked — the screen just opens at the top, as before
        }
      }, 150);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [storageKey]);
}
