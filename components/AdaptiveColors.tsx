"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTaskStore } from "@/lib/store";
import { getSession } from "@/lib/auth";
import { presetByKey } from "@/lib/backgroundPresets";
import {
  ADAPTIVE_COLORS_EVENT,
  applyPalette,
  buildPalette,
  getAdaptiveColorsEnabled,
  lastCachedSource,
  resolveSeed,
  swatchesForBackground,
} from "@/lib/adaptiveColors";

/** The logged-in person's background, as the adaptive-colors source. Shared with the Settings picker. */
export function useOwnBackgroundSource() {
  const { team } = useTaskStore();
  const pathname = usePathname();
  // Re-read on navigation: logging in or out happens by moving between pages.
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    setUserId(getSession()?.userId ?? null);
  }, [pathname]);
  const me = team.find((m) => m.id === userId);
  const url = me?.backgroundUrl ?? null;
  const gradientCss = url ? null : presetByKey(me?.backgroundPreset)?.css ?? null;
  return { userId, loaded: Boolean(me), url, gradientCss };
}

/**
 * Applies "colors follow the background" app-wide: when the option is on, the accent color comes from
 * the LOGGED-IN person's own background (not whoever's page is being viewed), on every screen.
 * Renders nothing.
 */
export default function AdaptiveColors() {
  const { userId, loaded, url, gradientCss } = useOwnBackgroundSource();

  // Bumped whenever the option or the picked color changes (in Settings), to re-apply.
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const onChange = () => setVersion((v) => v + 1);
    window.addEventListener(ADAPTIVE_COLORS_EVENT, onChange);
    // Startup: show the last known colors right away instead of indigo-then-switch.
    if (getAdaptiveColorsEnabled()) {
      const last = lastCachedSource();
      if (last) {
        const source = last.key.startsWith("url(") || last.key.startsWith("http") ? { url: last.key } : { gradientCss: last.key };
        const seed = resolveSeed(source, last.swatches);
        if (seed) applyPalette(buildPalette(seed));
      }
    }
    return () => window.removeEventListener(ADAPTIVE_COLORS_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!getAdaptiveColorsEnabled()) {
      applyPalette(null);
      return;
    }
    // Still loading who is logged in — keep whatever is showing.
    if (!loaded) {
      if (!userId) applyPalette(null);
      return;
    }
    if (!url && !gradientCss) {
      applyPalette(null);
      return;
    }
    let cancelled = false;
    const source = { url, gradientCss };
    swatchesForBackground(source).then((swatches) => {
      if (cancelled) return;
      const seed = resolveSeed(source, swatches);
      applyPalette(seed ? buildPalette(seed) : null);
    });
    return () => {
      cancelled = true;
    };
  }, [version, loaded, userId, url, gradientCss]);

  return null;
}
