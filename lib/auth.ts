"use client";

const SESSION_KEY = "taskpwa_session";

export interface Session {
  userId: string;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(userId: string) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

/** Normalizes a phone number for comparison — strips spaces, dashes, and a leading +972. */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("972")) digits = "0" + digits.slice(3);
  return digits;
}
