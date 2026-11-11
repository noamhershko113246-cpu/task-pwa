/**
 * The app's motion language — one set of values for the whole app, so every animation feels like it
 * belongs to the same product. Short on purpose: this is a tool people open many times a day with many
 * tasks, so motion explains what happened and gets out of the way. Never decoration.
 *
 *   What                                  How long          Feel
 *   ─────────────────────────────────────  ────────────────  ─────────────────────────────────────────
 *   Response to a touch (button, card)     ~0.1s             instant — shrinks slightly (.press class)
 *   A row/item appearing or leaving        DURATION.base     soft, no bounce
 *   A sheet/dialog opening or closing      SHEET_SPRING      gentle spring; closes by swiping down
 *   A sheet growing from the tapped card   DURATION.slow     EASE
 *   Progress (rings, upload bar)           0.5–0.9s          continuous, slows at the end
 *
 * Rules: everything can be interrupted (a tap mid-animation works immediately); people with "reduce
 * motion" turned on get fades only (MotionConfig in app/providers.tsx + the CSS rule in globals.css);
 * only position/scale/opacity are animated, so it stays smooth on older phones.
 */
import type { DragControls, PanInfo } from "framer-motion";

export const DURATION ={ fast: 0.15, base: 0.2, slow: 0.3 } as const;

/** Material's "standard" curve: starts quickly, lands softly. */
export const EASE = [0.2, 0, 0, 1] as const;

/** The spring every bottom sheet uses — kept in one place. */
export const SHEET_SPRING = { type: "spring", damping: 32, stiffness: 320 } as const;

/**
 * Where a flick would come to rest, in px past the point the finger let go (Apple's momentum
 * projection — the same decay scrolling uses). Judging a gesture by where it is *heading* means a
 * quick short flick counts, and a long drag the finger pulls back on doesn't.
 */
export function projectMomentum(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

const SHEET_DISMISS_DISTANCE = 120;

/**
 * Drag-down-to-close for a bottom sheet, started only from its handle (so scrolling the sheet's content
 * never drags it). Spread onto the sheet's motion.div; give the handle `onPointerDown={(e) => controls.start(e)}`
 * and `touch-none select-none` (with a mouse, a drag would otherwise select text, and the next press on
 * the handle would drag that selection instead of the sheet). Released short of closing, the sheet springs
 * back from where it is, keeping the finger's speed.
 */
export function sheetDrag(controls: DragControls, onClose: () => void) {
  return {
    drag: "y" as const,
    dragListener: false,
    dragControls: controls,
    dragConstraints: { top: 0, bottom: 0 },
    dragElastic: { top: 0, bottom: 0.4 },
    onDragEnd: (_: unknown, info: PanInfo) => {
      if (info.offset.y + projectMomentum(info.velocity.y) > SHEET_DISMISS_DISTANCE) onClose();
    },
  };
}

// Where the screen was last touched, so a sheet opened by that touch (a task's details) can grow out
// of the card that was tapped. Recorded for every touch, read once by whoever opens.
let lastTap = { y: 0, at: 0 };
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    (e) => {
      lastTap = { y: e.clientY, at: Date.now() };
    },
    { capture: true, passive: true }
  );
}

/** The vertical position of a touch in the last moment, or null (e.g. opened from a notification). */
export function takeRecentTapY(): number | null {
  if (Date.now() - lastTap.at > 1200) return null;
  lastTap.at = 0;
  return lastTap.y;
}
