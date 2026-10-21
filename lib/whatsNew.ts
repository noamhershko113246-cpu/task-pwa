/**
 * The single most-recent release's notes — shown once per device via WhatsNewSheet, and
 * reachable any time after that from the "מה חדש" header button. Update this object (and bump
 * `version`) for every future release; only the latest one is ever shown or stored as "seen".
 * Written from the user's point of view, not the developer's — describe outcomes, not
 * screens/controls, since this is shown to every role including people who can't see some of the
 * features being described (e.g. a soldier and the super-admin-only org chart).
 */
export const LATEST_RELEASE = {
  version: "2026-10-21-2",
  label: "עדכון 2",
  date: "21.10.2026",
  items: [
    "קטגוריות אישיות: בהגדרות אפשר ליצור קטגוריות משלך, בכל צבע, ולסנן לפיהן את המשימות — כל אחד רואה רק את שלו, גם במשימות משותפות",
    "אפשר לשייך משימה לקטגוריה כבר ביצירה, או אחר כך מתוך המשימה",
    "שלבים: אפשר לחלק משימה לשלבים שמתבצעים לפי הסדר — כל שלב נפתח רק אחרי שהקודם הושלם",
    "על כרטיס המשימה רואים את ההתקדמות בשלבים ואת השלב הנוכחי, והמשימה עוברת ל\"בביצוע\" כשמתחילים את השלב הראשון",
    "על כל משימה מופיע התאריך והשעה שבהם היא נפתחה",
    "תיקון באגים כללי",
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
