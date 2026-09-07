"use client";

const SESSION_KEY = "taskpwa_session";
// A week of not opening the app at all — not a week since login — logs someone out.
// getSession() refreshes lastActive on every successful check, so anyone who opens the
// app at least once a week never sees this; it only catches genuinely stale sessions
// (e.g. a phone that left the team, or a shared/borrowed device).
const INACTIVITY_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export interface Session {
  userId: string;
}

interface StoredSession {
  userId: string;
  lastActive: number; // epoch ms
}

function readStored(): { value: StoredSession; remember: boolean } | null {
  try {
    const session = window.sessionStorage.getItem(SESSION_KEY);
    if (session) return { value: JSON.parse(session) as StoredSession, remember: false };
    const local = window.localStorage.getItem(SESSION_KEY);
    if (local) return { value: JSON.parse(local) as StoredSession, remember: true };
    return null;
  } catch {
    return null;
  }
}

function writeStored(value: StoredSession, remember: boolean) {
  const json = JSON.stringify(value);
  if (remember) {
    window.localStorage.setItem(SESSION_KEY, json);
    window.sessionStorage.removeItem(SESSION_KEY);
  } else {
    window.sessionStorage.setItem(SESSION_KEY, json);
    window.localStorage.removeItem(SESSION_KEY);
  }
}

/** Checks both storages — sessionStorage first (this-tab-only), then localStorage ("remember me").
 *  Also enforces the week-of-inactivity expiry above, and — as a side effect, when the session
 *  is still valid — refreshes its lastActive timestamp so that clock keeps resetting on use. */
export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const found = readStored();
    if (!found?.value?.userId) return null;
    const { value, remember } = found;
    // Sessions saved before this field existed have no lastActive — treat that as "active
    // right now" rather than instantly logging everyone out on the first deploy of this.
    const lastActive = value.lastActive ?? Date.now();
    if (Date.now() - lastActive > INACTIVITY_EXPIRY_MS) {
      clearSession();
      return null;
    }
    writeStored({ userId: value.userId, lastActive: Date.now() }, remember);
    return { userId: value.userId };
  } catch {
    return null;
  }
}

/** remember=true persists across browser restarts (localStorage); remember=false clears on tab close (sessionStorage). */
export function setSession(userId: string, remember: boolean) {
  writeStored({ userId, lastActive: Date.now() }, remember);
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
