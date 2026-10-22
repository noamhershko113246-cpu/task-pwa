/**
 * The single most-recent release's notes — shown once per device via WhatsNewSheet, and
 * reachable any time after that from the "מה חדש" header button. Update this object (and bump
 * `version`) for every future release; only the latest one is ever shown or stored as "seen".
 * Written from the user's point of view, not the developer's — describe outcomes, not
 * screens/controls, since this is shown to every role including people who can't see some of the
 * features being described (e.g. a soldier and the super-admin-only org chart).
 */
export const LATEST_RELEASE = {
  version: "2026-10-22",
  label: "עדכון 3",
  date: "22.10.2026",
  items: [
    "התאמה מלאה לטלפונים: כל המסכים, החלונות והכפתורים מותאמים עכשיו לגדלי מסך שונים, כולל אייפון, ולא נחתכים בקצה",
    "תפריט שלוש נקודות חדש בראש המסך: כל הפעולות שהיו פזורות כסמלים בשורה אחת נאספו למקום אחד, כל פעולה עם שם ברור לצד הסמל שלה, וכך קל יותר למצוא כל דבר",
    "בתפריט נמצאים: מה חדש, הגדרות, טריאז׳ חכם, ניהול משרד, עץ מבנה ארגוני (למנהל הראשי), הוספת איש/אשת צוות (למי שמורשה), הצהרת נגישות והתנתקות",
    "התפריט נפתח מתחתית המסך, נסגר בלחיצה בחוץ או ב־Esc, והכפתורים בו גדולים ונוחים ללחיצה באצבע",
    "בזכות התפריט הכותרת וההתראות נשארים תמיד במקומם, גם במסכים הקטנים ביותר",
    "תיקון חלון ההתראות: ההודעה על הפעלת התראות כבר לא נחתכת מהמסך",
    "נגישות: האפליקציה הותאמה לתקן הנגישות הישראלי — ניגודיות צבעים משופרת, תמיכה בקורא מסך ובניווט מהמקלדת, גרירת משימות בלוח באמצעות המקלדת, והגדלת טקסט עד 200%",
    "נוספה הצהרת נגישות, שאפשר למצוא בתפריט ובמסך הכניסה",
    "כניסה מאובטחת למנהל הראשי: בהזנת השם שלו מופיע מסך סיסמה, ורק מי שמכיר אותה נכנס",
    "שיתוף קישור לאפליקציה מציג עכשיו תצוגה מקדימה יפה עם תמונה, כותרת ותיאור, והאתר מוכן יותר לחיפוש בגוגל",
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
