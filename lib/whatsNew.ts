import { supabase } from "./supabase";

/**
 * The single most-recent release's notes — shown automatically ONCE per person (the first time they
 * open the app after the release), and reachable any time after that from the "מה חדש" menu item.
 * Only this latest release exists in the app, so someone who missed several updates only ever sees
 * the newest one. Update this object for every release and give it a `version` that sorts AFTER the
 * previous one ("YYYY-MM-DD", plus a letter for a second release on the same day: "2026-10-26b").
 * Written from the user's point of view, not the developer's — describe outcomes, not
 * screens/controls, since this is shown to every role including people who can't see some of the
 * features being described (e.g. a soldier and the super-admin-only org chart).
 */
export const LATEST_RELEASE = {
  version: "2026-10-26",
  label: "עדכון 4",
  date: "26.10.2026",
  items: [
    "תפריט מהיר בלחיצה ארוכה: לחיצה ארוכה על משימה פותחת תפריט עם פתיחת פרטים, שיוך לקטגוריה, שינוי דחיפות וסימון כהושלמה — בלי להיכנס למשימה",
    "צירוף קבצים כבר ביצירת משימה: אפשר לצרף עד 5 קבצים או תמונות כבר כשיוצרים משימה, ולא רק אחר כך מתוך המשימה. במשימה חוזרת הקבצים מצורפים לכל המופעים",
    "כרטיסים שקופים: המשימות והכרטיסים במסך הראשי שקופים למחצה, כך שרואים את הרקע האישי שלך מאחוריהם. את רמת השקיפות אפשר לבחור בהגדרות, ב\"שקיפות הכרטיסים\"",
    "צבעי האפליקציה לפי הרקע: אפשרות חדשה בהגדרות — הכפתורים והצבעים באפליקציה לוקחים את הצבע מהרקע שבחרת, ואפשר לבחור בין הצבעים שנמצאו בו. כברירת מחדל הצבעים נשארים כרגיל",
    "תנועה חלקה יותר: מעברים רכים בין מסכים, אנימציה כשמסיימים משימה, ומסך טעינה שמראה את מבנה העמוד במקום \"טוען...\"",
    "התנתקות מכבה את ההתראות במכשיר הזה, כדי שמי שמשתמש בו אחריך לא יקבל את ההתראות שלך",
    "תיקון באגים כללי",
  ],
};

// "Seen" is remembered per person: in the database (team_members.seen_release — so it holds on every
// device they use) and on this device per person (works even offline, or before that column exists).
// Versions only ever move forward: an app tab left open from before an update, still running the
// older notes, sees that something newer was already shown and stays quiet instead of showing them.
const LOCAL_PREFIX = "taskpwa_seen_release:";
const LEGACY_DEVICE_KEY = "taskpwa_seen_release"; // before this was per person: one value per device

function newest(...versions: (string | null | undefined)[]): string | null {
  return versions.reduce<string | null>((a, b) => (b && (!a || b > a) ? b : a), null);
}

function readLocal(userId: string): string | null {
  try {
    return newest(window.localStorage.getItem(LOCAL_PREFIX + userId), window.localStorage.getItem(LEGACY_DEVICE_KEY));
  } catch {
    return null;
  }
}

function writeLocal(userId: string, version: string) {
  try {
    window.localStorage.setItem(LOCAL_PREFIX + userId, version);
  } catch {
    // storage blocked — the database copy still counts
  }
}

/** The newest release this person was already shown, from the database; null if unknown/unavailable. */
async function readRemote(userId: string): Promise<string | null> {
  const { data, error } = await supabase.from("team_members").select("seen_release").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  return (data as { seen_release: string | null }).seen_release;
}

/** Should the latest notes pop up for this person now? Only if neither this device nor the database says
 *  they were already shown this release (or a newer one). Records nothing — see markLatestReleaseSeen. */
export async function shouldShowLatestRelease(userId: string): Promise<boolean> {
  const version = LATEST_RELEASE.version;
  const local = readLocal(userId);
  if (local && local >= version) return false;
  const seen = newest(local, await readRemote(userId));
  if (seen && seen >= version) {
    writeLocal(userId, seen);
    return false;
  }
  return true;
}

/** Records the latest release as shown to this person (this device + database). Called once it has
 *  actually been on screen for a moment, or when it is closed — so leaving the app without tapping
 *  "הבנתי" still counts, but a page that reloads right away doesn't swallow it unseen. */
export async function markLatestReleaseSeen(userId: string) {
  const version = LATEST_RELEASE.version;
  writeLocal(userId, version);
  // Never moves the stored value backwards. A failure (offline) is fine: this device already remembers it.
  await supabase
    .from("team_members")
    .update({ seen_release: version })
    .eq("id", userId)
    .or(`seen_release.is.null,seen_release.lt.${version}`);
}
