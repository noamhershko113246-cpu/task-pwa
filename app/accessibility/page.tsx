import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "הצהרת נגישות",
  description: "הצהרת הנגישות של אפליקציית משימות המשרד",
};

// TODO(owner): fill in the coordinator's details and the date before publishing — the statement
// is only valid once it names a real contact person (ת"י 5568 / תקנות שוויון זכויות לאנשים עם מוגבלות).
const COORDINATOR_NAME = "________";
const COORDINATOR_PHONE = "________";
const COORDINATOR_EMAIL = "________";
const LAST_UPDATED = "________";

export default function AccessibilityStatementPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <Link href="/" className="text-sm font-medium text-brand-700 underline dark:text-brand-300">
        חזרה לאפליקציה
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold text-ink dark:text-ink-dark">הצהרת נגישות</h1>
      <p className="mt-2 text-sm text-ink-soft dark:text-ink-dark-soft">עודכן לאחרונה: {LAST_UPDATED}</p>

      <div className="mt-6 space-y-6 text-base leading-relaxed text-ink dark:text-ink-dark">
        <section aria-labelledby="a11y-commit">
          <h2 id="a11y-commit" className="text-lg font-bold">המחויבות שלנו</h2>
          <p className="mt-2">
            אנחנו רוצים שכל אחד ואחת מהצוות יוכלו להשתמש באפליקציית המשימות בצורה עצמאית ונוחה, כולל אנשים
            עם מוגבלות. האפליקציה מותאמת לדרישות תקן ישראלי ת&quot;י 5568, המבוסס על הנחיות WCAG 2.1 ברמה AA.
          </p>
        </section>

        <section aria-labelledby="a11y-done">
          <h2 id="a11y-done" className="text-lg font-bold">מה כבר מותאם</h2>
          <ul className="mt-2 list-disc space-y-1 pe-5 ps-5">
            <li>ניווט מלא במקלדת, עם סימון ברור של האלמנט הפעיל, וחלונות שנסגרים ב־Escape.</li>
            <li>תוויות לכל שדות הטפסים ולכל הכפתורים, כולל כפתורים שמוצגים כאייקון בלבד.</li>
            <li>הודעות מערכת (הצלחה, שגיאה, טעינה) מוקראות על ידי קורא מסך.</li>
            <li>ניגודיות צבעים של לפחות 4.5:1 לטקסט, במצב בהיר ובמצב כהה.</li>
            <li>כותרת נפרדת לכל מסך, ומבנה כותרות הגיוני.</li>
            <li>התאמה לתצוגה בטלפון, להגדלת טקסט ולכיווניות מימין לשמאל.</li>
            <li>גרירת משימות ואנשים אפשרית גם במקלדת (רווח להרמה, חצים להזזה, רווח להנחה).</li>
          </ul>
        </section>

        <section aria-labelledby="a11y-limits">
          <h2 id="a11y-limits" className="text-lg font-bold">מגבלות ידועות</h2>
          <p className="mt-2">
            ייתכן שחלק מהמסכים עדיין אינם נגישים במלואם. אם נתקלת בקושי, נשמח שתעדכן אותנו כדי שנוכל לתקן.
          </p>
        </section>

        <section aria-labelledby="a11y-contact">
          <h2 id="a11y-contact" className="text-lg font-bold">פנייה בנושא נגישות</h2>
          <p className="mt-2">נתקלת בבעיה או יש לך הצעה לשיפור? אפשר לפנות לרכז/ת הנגישות:</p>
          <ul className="mt-2 space-y-1">
            <li>שם: {COORDINATOR_NAME}</li>
            <li>טלפון: {COORDINATOR_PHONE}</li>
            <li>דוא&quot;ל: {COORDINATOR_EMAIL}</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
