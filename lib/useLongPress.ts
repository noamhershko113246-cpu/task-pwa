"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";

const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 8;
// The "pressed" look only starts after a beat, so an ordinary tap or the start of a swipe never flashes it.
const PRESS_FEEDBACK_DELAY_MS = 150;

const INTERACTIVE = "button,a,input,select,textarea,label";

/**
 * Long-press (and right-click / the keyboard's menu key) on an element, without getting in the way of
 * the gestures it already has:
 *  - moving the finger more than a few pixels cancels it, so scrolling and swiping a card sideways
 *    (swipe-to-complete) never open anything;
 *  - presses that start on a button / link / field are ignored, so e.g. the checkbox keeps working;
 *  - once it has fired, the click that follows the finger lifting is swallowed, otherwise releasing
 *    would also open whatever a plain tap opens.
 * Spread `handlers` onto the element. `pressing` is true while the press is being held, for visual feedback.
 */
export function useLongPress(onLongPress: () => void, { enabled = true }: { enabled?: boolean } = {}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const onLongPressRef = useRef(onLongPress);
  onLongPressRef.current = onLongPress;
  const [pressing, setPressing] = useState(false);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    timer.current = null;
    feedbackTimer.current = null;
    start.current = null;
    setPressing(false);
  }, []);

  // Never leave a timer running after the element goes away.
  useEffect(() => clear, [clear]);

  const fire = useCallback(() => {
    fired.current = true;
    // A short buzz where the device supports it (not iPhone Safari) — confirms the press registered.
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(12);
    onLongPressRef.current();
  }, []);

  const onPointerDown = (e: PointerEvent) => {
    if (!enabled) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
    fired.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    feedbackTimer.current = setTimeout(() => setPressing(true), PRESS_FEEDBACK_DELAY_MS);
    timer.current = setTimeout(() => {
      timer.current = null;
      setPressing(false);
      fire();
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!start.current) return;
    if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > MOVE_TOLERANCE_PX) clear();
  };

  const onContextMenu = (e: MouseEvent) => {
    if (!enabled) return;
    if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
    // Right-click, the menu key, and Android's own long-press event all land here. Block the browser's
    // menu in every case; open ours unless the timer already did (Android sends both).
    e.preventDefault();
    clear();
    if (!fired.current) fire();
  };

  // Capture phase, so it runs before the card's own onClick (which would open the details).
  const onClickCapture = (e: MouseEvent) => {
    if (!fired.current) return;
    fired.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  return {
    pressing,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: clear,
      onPointerCancel: clear,
      onPointerLeave: clear,
      onContextMenu,
      onClickCapture,
    },
  };
}
