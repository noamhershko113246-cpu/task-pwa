"use client";

import React, { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { ToastProvider } from "@/components/ToastProvider";
import { WhatsNewProvider } from "@/components/WhatsNewProvider";
import { TaskStoreProvider } from "@/lib/store";
import { applyTheme, getStoredTheme } from "@/lib/theme";
import AdaptiveColors from "@/components/AdaptiveColors";
import { applyCardOpacity, getCardOpacity } from "@/lib/cardOpacity";

export function Providers({ children }: { children: React.ReactNode }) {
  // Applied post-mount, like every other per-account preference (background image, avatar
  // color) — not via a pre-hydration inline <script>. That script raced against whatever the
  // host injects into <head> before React hydrates (Netlify does, unconditionally, on this
  // project's plan) and lost: the instant a hydration mismatch shows up anywhere in <head>,
  // React discards the whole pre-hydration DOM — including a class the script had just added —
  // and remounts clean, which is exactly why dark mode "worked" only until the next reload.
  // Applying it here instead means there's nothing for hydration to discard: this runs once
  // hydration has already finished, the same way the background image never had this problem
  // because it was never rendered before the store loaded to begin with. The one trade-off is
  // a brief flash of the light theme before this effect runs on a cold load — acceptable next
  // to an app that doesn't actually respect the choice at all.
  useEffect(() => {
    applyTheme(getStoredTheme());
    applyCardOpacity(getCardOpacity());
  }, []);

  // The CSS rule in globals.css only reaches CSS animations; framer-motion drives its own, so it has
  // to be told to follow the "reduce motion" setting too (it then keeps fades but drops movement).
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <TaskStoreProvider>
          <AdaptiveColors />
          <WhatsNewProvider>{children}</WhatsNewProvider>
        </TaskStoreProvider>
      </ToastProvider>
    </MotionConfig>
  );
}
