"use client";

const SESSION_KEY = "taskpwa_session";

export interface Session {
  userId: string;
}

/** Checks both storages — sessionStorage first (this-tab-only), then localStorage ("remember me"). */
export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY) ?? window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

/** remember=true persists across browser restarts (localStorage); remember=false clears on tab close (sessionStorage). */
export function setSession(userId: string, remember: boolean) {
  const value = JSON.stringify({ userId });
  if (remember) {
    window.localStorage.setItem(SESSION_KEY, value);
    window.sessionStorage.removeItem(SESSION_KEY);
  } else {
    window.sessionStorage.setItem(SESSION_KEY, value);
    window.localStorage.removeItem(SESSION_KEY);
  }
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
}

/** Normalizes a phone number for comparison — strips spaces, dashes, and a leading +972. */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("972")) digits = "0" + digits.slice(3);
  return digits;
}
