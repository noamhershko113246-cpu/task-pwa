"use client";

import { useEffect, useState } from "react";

// Anything smaller is treated as browser-chrome jitter (iOS toolbar collapsing), not a keyboard.
const MIN_KEYBOARD_PX = 120;

/**
 * Height (px) of the on-screen keyboard while `active`, else 0.
 *
 * On iOS Safari the layout viewport does NOT shrink when the keyboard opens — it overlays the
 * page — so a `fixed bottom-0` bottom sheet ends up underneath it with the focused field hidden.
 * The visual viewport does shrink, so the difference is the keyboard; sheets lift themselves by
 * that amount (and cap their height) so the field being typed in stays visible. On Android
 * Chrome the layout viewport resizes itself, so this comes out ≈0 there and does nothing.
 */
export function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!active) {
      setInset(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const covered = Math.round(window.innerHeight - vv.height - vv.offsetTop);
      setInset(covered > MIN_KEYBOARD_PX ? covered : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setInset(0);
    };
  }, [active]);

  return inset;
}
