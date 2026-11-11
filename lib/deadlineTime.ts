"use client";

/**
 * The time of day a quick deadline lands on ("מחר" → tomorrow at this time), and what a snoozed task
 * without a deadline gets. Picked in Settings; per device, like the other look-and-feel choices.
 * 09:00 by default — a deadline set for "tomorrow" means tomorrow morning, not the last minute of it.
 */

const STORAGE_KEY = "default-deadline-time";

export const DEFAULT_DEADLINE_TIME = "09:00";

const isTime = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

export function getDefaultDeadlineTime(): string {
  if (typeof window === "undefined") return DEFAULT_DEADLINE_TIME;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return isTime(v) ? v : DEFAULT_DEADLINE_TIME;
  } catch {
    return DEFAULT_DEADLINE_TIME;
  }
}

export function setDefaultDeadlineTime(value: string) {
  if (!isTime(value)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // storage blocked — the default keeps applying
  }
}

/** Hours and minutes of the chosen default time. */
export function defaultDeadlineHM(): [number, number] {
  const [h, m] = getDefaultDeadlineTime().split(":").map(Number);
  return [h, m];
}
