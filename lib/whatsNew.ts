/**
 * The single most-recent release's notes — shown once per device via WhatsNewSheet, and
 * reachable any time after that from the "מה חדש" header button. Update this object (and bump
 * `version`) for every future release; only the latest one is ever shown or stored as "seen".
 * Written from the user's point of view, not the developer's — describe outcomes, not
 * screens/controls, since this is shown to every role including people who can't see some of the
 * features being described (e.g. a soldier and the super-admin-only org chart).
 */
export const LATEST_RELEASE = {
  version: "2026-09-25",
  date: "25.9.2026",
  items: [
    "העץ הארגוני שוכלל ושופר",
    "נוצרה אופציה ליצור משימה חדשה גם ממסך היסטוריית המשימות, בנוסף ללוח הראשי",
    "כמה שיפורי באגים ותיקונים כלליים",
  ],
};

const STORAGE_KEY = "taskpwa_seen_release";

/** This device only — same pattern as the theme preference (lib/theme.ts). */
export function hasSeenLatestRelease(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) === LATEST_RELEASE.version;
}

export function markReleaseSeen() {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, LATEST_RELEASE.version);
}
