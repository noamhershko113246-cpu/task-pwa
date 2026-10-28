import type { FocusEvent } from "react";

/**
 * For a sheet's onFocusCapture: once the on-screen keyboard has opened (and the sheet has shrunk above
 * it — see useKeyboardInset), scroll the field being typed into to the middle of what's still visible,
 * so it's never hidden behind the keyboard.
 */
export function keepFocusedFieldVisible(e: FocusEvent<HTMLElement>) {
  const target = e.target as HTMLElement;
  if (!target.matches("input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select")) return;
  // The keyboard animates in for ~250ms on iOS; measuring before that would use the old, taller sheet.
  window.setTimeout(() => {
    if (document.activeElement === target) target.scrollIntoView({ block: "center", behavior: "smooth" });
  }, 320);
}
