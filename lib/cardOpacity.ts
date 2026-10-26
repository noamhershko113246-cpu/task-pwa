"use client";

/**
 * How see-through the cards and buttons are over a personal background (the `.glass` class in
 * globals.css reads --glass-alpha). Picked in Settings from a fixed scale; per device, like light/dark.
 */

const STORAGE_KEY = "card-opacity";

export const CARD_OPACITY_OPTIONS: { value: number; label: string }[] = [
  { value: 0.35, label: "הכי שקוף" },
  { value: 0.45, label: "שקוף" },
  { value: 0.55, label: "רגיל" },
  { value: 0.7, label: "פחות שקוף" },
  { value: 1, label: "אטום" },
];

export const DEFAULT_CARD_OPACITY = 0.55;

export function getCardOpacity(): number {
  if (typeof window === "undefined") return DEFAULT_CARD_OPACITY;
  try {
    const v = Number(window.localStorage.getItem(STORAGE_KEY));
    return CARD_OPACITY_OPTIONS.some((o) => o.value === v) ? v : DEFAULT_CARD_OPACITY;
  } catch {
    return DEFAULT_CARD_OPACITY;
  }
}

export function applyCardOpacity(value: number) {
  if (typeof document === "undefined") return;
  if (value === DEFAULT_CARD_OPACITY) document.documentElement.style.removeProperty("--glass-alpha");
  else document.documentElement.style.setProperty("--glass-alpha", String(value));
}

export function setCardOpacity(value: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // storage blocked — applies for this visit only
  }
  applyCardOpacity(value);
}
