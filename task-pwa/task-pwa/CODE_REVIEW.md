# ביקורת קוד ומוצר מקיפה — Task PWA (משימות המשרד)

**תחום:** ניהול משימות לצוות קטן (Task Management)
**השראה מ:** Notion (תצוגות מרובות + עורך תוכן), Linear (מהירות, מקלדת-קודם, Cycles), Todoist (Quick-add, שפה טבעית, הרגלים)
**בוצע על:** הקוד בפועל של הפרויקט (Next.js 14 + Supabase + Tailwind), לא קוד היפותטי

---

## תקציר מנהלים

הבסיס ארכיטקטונית **חזק מאוד** ביחס לגודל הפרויקט: React Context מרכזי, סנכרון Realtime אמיתי, PWA עם Push Notifications, RLS, ותצוגות מרובות (רשימה/Kanban/לוח שנה) — זה כבר תואם לדפוס העבודה של Notion (מסד נתונים אחד, כמה "תצוגות" עליו). הבעיות שמצאתי הן לא "שבור", אלא **חובות טכניים טיפוסיים** שמצטברים כשבונים מהר: כמה דפוסי ביצועים לא-אופטימליים, כמה מקומות שחווית המשתמש "עובדת" אבל לא "מרגישה" ברמה של אפליקציה מסחרית, ופער אבטחה אחד ידוע וכבר מתועד.

---

## חלק 1: בעיות קריטיות

### 1.1 — RLS פתוח לגמרי (אבטחה, לא ביצועים)
זו כבר תועדה בקוד עצמו (`lib/supabase.ts`), אבל שווה לחזור עליה כי היא הכי חשובה: כל מדיניות ההרשאות ב-Postgres מוגדרת `using (true)` — כלומר כל מי שמחזיק את ה-anon key (שגלוי ממילא בצד הלקוח) יכול לקרוא ולכתוב לכל הטבלאות. ההפרדה "חייל רואה רק את שלו" קיימת **רק בממשק**. לשימוש פנימי בצוות סומך זה סביר; זה לא סביר אם אי פעם התוכן יהיה רגיש יותר.

### 1.2 — N+1 בפעולות Bulk (משימה חוזרת)
כשיוצרים משימה חוזרת (למשל כל יום שני למשך 3 חודשים = ~13 מופעים), `createTasks` עושה insert אחד יעיל לכל המשימות — יופי. אבל מיד אחריו:

```ts
// lib/store.tsx — המצב הנוכחי
for (const row of data as TaskRow[]) {
  const names = row.assignee_ids.map((id) => findMember(id)?.name ?? "").filter(Boolean).join(", ");
  const creator = row.created_by ? findMember(row.created_by) : undefined;
  await logActivity({ userId: ..., taskId: row.id, taskTitle: row.title, action: `...` }); // await בתוך לולאה!
  // ואז גם שתי קריאות sendPush נפרדות, לכל משימה בנפרד
}
```

זה `await` בתוך לולאה — 13 בקשות רשת **סדרתיות** ל-`activity_log`, ועוד עד 26 קריאות HTTP נפרדות ל-`/api/push/send` (אחת-אחת, לא batched). המשתמש מחכה, והשרת שלכם (Netlify Function) מקבל עומס מיותר. זה בדיוק סוג הדבר ש-Linear (שידוע במהירות שלו) לעולם לא היה משחרר.

**תיקון:** ראו סעיף 2.1 למטה — Before/After מלא.

### 1.3 — פונקציות ה-Store לא עטופות ב-`useCallback`
כל הפונקציות (`createTasks`, `updateTask`, `addComment` וכו') מוגדרות מחדש בכל רינדור של `TaskStoreProvider`. זה עובד היום כי ה-`value` עצמו עטוף ב-`useMemo`, אבל זה שביר: כל מי שיוסיף תלות חדשה ל-deps array בעתיד בלי לשים לב, יגרום לכל צרכן של `useTaskStore()` בכל האפליקציה להתרנדר-מחדש בכל שינוי. בפרויקט בגודל הזה (5-10 אנשים, עשרות משימות) זה לא מורגש. אם זה יגדל ל-50+ משימות עם התעדכנויות תכופות — יורגש.

### 1.4 — אין אינדיקציה כשה-Realtime מתנתק
`supabase.channel(...).subscribe()` נרשם פעם אחת ולא בודק מצב חיבור. אם ה-WebSocket מתנתק (למשל מעבר בין WiFi לסלולרי), האפליקציה **ממשיכה להיראות תקינה** אבל לא מקבלת יותר עדכונים חיים — עד לרענון ידני. Slack ו-Notion שניהם מציגים "Reconnecting..." קטן בדיוק לתרחיש הזה.

---

## חלק 2: שכתוב קוד — לפני / אחרי

### 2.1 — Batch את הפעולות אחרי יצירת Bulk

**לפני** (סדרתי, איטי, לולאת `await`):
```ts
for (const row of data as TaskRow[]) {
  await logActivity({ userId: ..., taskId: row.id, taskTitle: row.title, action: `...` });
  if (selfAssignedIds.length > 0) sendPush(selfAssignedIds, "...", row.title, "...");
  if (givenByOthersIds.length > 0) sendPush(givenByOthersIds, "...", row.title, "...");
}
```

**אחרי** (insert אחד ל-activity_log, push מקובץ אחד לכל נמען):
```ts
// שלב 1: לבנות את כל שורות היומן מראש, ולהכניס בבת אחת
const activityRows = (data as TaskRow[]).map((row) => {
  const names = row.assignee_ids.map((id) => findMember(id)?.name ?? "").filter(Boolean).join(", ");
  const creator = row.created_by ? findMember(row.created_by) : undefined;
  return {
    user_id: row.created_by ?? row.assignee_ids[0] ?? null,
    task_id: row.id,
    task_title: row.title,
    action: `${creator?.isManager ? "יצרה" : "יצר/ה"} משימה עבור ${names}`,
  };
});
await supabase.from("activity_log").insert(activityRows); // בקשת רשת אחת, לא 13

// שלב 2: לקבץ push לפי (נמען, סוג הודעה) כדי לא לשלוח 13 פעמים לאותו אדם
const pushByRecipient = new Map<string, { title: string; count: number }>();
for (const row of data as TaskRow[]) {
  for (const id of row.assignee_ids) {
    const isSelf = id === row.created_by;
    const key = `${id}:${isSelf}`;
    const existing = pushByRecipient.get(key);
    pushByRecipient.set(key, { title: isSelf ? "נוספו לך משימות" : `קיבלת משימות מ${creatorName}`, count: (existing?.count ?? 0) + 1 });
  }
}
for (const [key, info] of pushByRecipient) {
  const [userId] = key.split(":");
  sendPush([userId], info.title, `${info.count} משימות חדשות`, `/staff?user=${userId}`);
}
```

**התוצאה:** 13 בקשות `activity_log` → 1. עד 26 קריאות push → מקסימום 2 (אחת לכל נמען ייחודי), במקום התראה נפרדת לכל מופע חוזר (שגם ככה הייתה חוויה גרועה — מי רוצה 13 פושים ברצף?).

### 2.2 — `useCallback` על פונקציות ה-Store

**לפני:**
```ts
export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const [rawTasks, setRawTasks] = useState<Omit<Task, "comments">[]>([]);
  // ...
  const updateTask: TaskStoreValue["updateTask"] = (id, patch) => { /* ... */ };
  // מוגדר מחדש בכל רינדור
```

**אחרי:**
```ts
import { useCallback } from "react";

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const [rawTasks, setRawTasks] = useState<Omit<Task, "comments">[]>([]);

  const updateTask = useCallback<TaskStoreValue["updateTask"]>((id, patch) => {
    (async () => { /* ...אותו קוד... */ })();
  }, [rawTasks, showToast]); // תלויות מפורשות, ברורות לקורא הבא
```

זה נראה כמו "עוד boilerplate", אבל זה ההבדל בין קוד שסומך על מזל (ה-deps של ה-value memo "יתפסו" הכל נכון) לקוד שמצהיר במפורש על מה הוא תלוי.

### 2.3 — `React.memo` על כרטיסי רשימה

**לפני** (`TaskCard.tsx`):
```tsx
export default function TaskCard({ task, creatorName, onComplete, onOpenDetail }: {...}) {
  // ...
}
```

**אחרי:**
```tsx
import { memo } from "react";

function TaskCardImpl({ task, creatorName, onComplete, onOpenDetail }: {...}) {
  // ...אותו קוד...
}

export default memo(TaskCardImpl, (prev, next) =>
  prev.task === next.task && prev.creatorName === next.creatorName
);
```

היום, כשגוררים משימה בלוח Kanban או משנים סינון, **כל** הכרטיסים ברשימה מתרנדרים-מחדש, גם אלה שלא השתנו. עם 10-20 משימות זה לא מורגש. Linear, לשם ההשוואה, בנוי כך שרינדור-מחדש של פריט ברשימה הוא **חריג**, לא ברירת מחדל.

---

## חלק 3: חיכוך בחוויית המשתמש (UX Flow)

### 3.1 — יצירת משימה דורשת יותר מדי קליקים ל"רק תזכיר לי"
כרגע כל משימה חדשה = פתיחת Bottom Sheet מלא (שם, תיאור, שיוך, דד-ליין, דחיפות, חוזרת/לא). זה נהדר כשבאמת רוצים לתכנן משימה — אבל גרוע כשרוצים רק "לזרוק" רעיון מהיר לפני שהוא נשכח.

**בהשראת Todoist (ה-Quick Add שלהם הוא אולי התכונה הכי מחקה בתעשייה):** שורת "הוספה מהירה" קבועה למעלה ברשימה — מקלידים כותרת, Enter, זהו. נוצרת משימה עם ברירות מחדל (דחיפות 3, בלי דד-ליין, משויכת לעצמך), ואפשר לערוך פרטים אחר כך. ה-Sheet המלא נשאר זמין ללחיצה על "+" בשביל יצירה מפורטת.

### 3.2 — אין קיצורי מקלדת, למרות שיש עכשיו תצוגת מחשב
אחרי שבנינו את ה-frame הממורכז למחשב, זה בדיוק הרגע להוסיף קיצורים — כי במחשב יש מקלדת אמיתית, לא רק אצבע. **בהשראת Linear** (שהמקלדת שם היא ממש שפת האפליקציה):
- `n` — משימה חדשה
- `/` — פוקוס על החיפוש
- `Esc` — סגירת חלונית פתוחה
- `g` ואז `b`/`c`/`h` — קפיצה ל-Board / Calendar / History (כמו "go to" של Gmail/Linear)

זו תוספת קטנה יחסית (event listener אחד גלובלי) עם השפעה גדולה על תחושת "מקצועיות" למשתמשי מחשב.

### 3.3 — ה-Undo Toast נעלם בלי אזהרה חזותית
כרגע יש 6 שניות לבטל השלמת משימה, אבל שום דבר לא מראה כמה זמן נשאר — המשתמש פשוט "מקווה" שהוא מספיק מהר. **בהשראת Gmail** (אבטיפוס ה-Undo המקורי): פס התקדמות דק שמתכווץ על פני 6 השניות בתוך ה-Toast עצמו. שינוי CSS קטן, תחושה גדולה של שליטה.

### 3.4 — אין "בית" אחד לחיפוש-על-הכל
יש חיפוש בתוך כל מסך בנפרד (משימות שלי / כל המשרד / היסטוריה) — אבל אין נקודת כניסה אחת. **בהשראת Notion/Linear/Slack** (כולם עם Cmd+K): omnisearch שקופץ מכל מקום, מחפש גם משימות וגם אנשים, עם ניווט מהיר בלי לצאת מהמסך הנוכחי. זו תכונה שאפתנית יותר — לא הייתי מתחיל בה, אבל שווה לשים ב-Roadmap.

---

## חלק 4: השראה קונקרטית ממובילי השוק

### מ-Notion: תצוגות מרובות על אותם נתונים — **כבר יש לכם את זה**
רשימה / Kanban / לוח שנה על אותה טבלת `tasks` זה בדיוק הפילוסופיה של "Database + Views" של Notion. **הצעד הבא הטבעי:** לתת למשתמש **לשמור פילטר** (למשל "רק P1+P2, רק שלי, ממוינות לפי דד-ליין") כ"תצוגה" בשם משלה, בדיוק כמו שב-Notion שומרים "Views" מותאמות על מסד נתונים.

### מ-Linear: Cycles (ספרינטים קלים)
Linear מארגן עבודה ב"Cycles" שבועיים עם סיכום אוטומטי בסוף. עבור משרד קטן: "סיכום שבועי" אוטומטי (אולי אפילו כהודעת Push ביום חמישי) — "השבוע הושלמו 14/18 משימות, 2 חורגות" — הופך את "יומן הפעילות" הקיים מרשימה גולמית לתובנה שימושית, בלי לבנות תשתית ספרינטים מלאה.

### מ-Todoist: פענוח שפה טבעית לתאריכים
כרגע שדה הדד-ליין הוא `datetime-local` נקי — תקין, אבל דורש כמה הקשות. Todoist מפורסם ביכולת להקליד "מחר ב-3" או "יום ראשון הבא" ישירות בשדה הכותרת, וזה ממיר אוטומטית לתאריך. עבור עברית זה מורכב יותר (אין ספרייה בשלה כמו ל-אנגלית), אבל גרסה פשוטה ("מחר", "היום", "עוד שבוע") כפתורי קיצור ליד שדה התאריך — ניתנת ליישום מהיר וכבר תרגיש הרבה יותר "חכמה".

### מ-Todoist: Streaks עדינים
כבר יש לכם קונפטי בהשלמת משימה (מעולה, זה בדיוק כיוון ה-micro-interaction הנכון). הצעד הבא בהשראת Todoist Karma: "רצף" שבועי קטן ("5 ימים ברצף עם כל המשימות מושלמות") — לא חייב נקודות/גיימיפיקציה כבדה, אפילו שורה אחת עדינה בדשבורד האישי.

---

## המלצת סדר עבודה

| עדיפות | מה | למה קודם |
|---|---|---|
| 1 | תיקון ה-N+1 בסעיף 2.1 | ביצועים אמיתיים, קל ליישום, בלי סיכון |
| 2 | Quick Add (3.1) | הכי מורגש למשתמשי יום-יום, השראה מוכחת מ-Todoist |
| 3 | קיצורי מקלדת בסיסיים (3.2) | זול, מרים תחושת "מוצר רציני" במחשב |
| 4 | `useCallback` + `memo` (2.2, 2.3) | לא דחוף בגודל הנוכחי, אבל זול לתקן עכשיו לפני שהצוות גדל |
| 5 | RLS אמיתי (1.1) | קריטי אם אי פעם המידע יהיה רגיש יותר, אבל דורש Supabase Auth מלא — פרויקט נפרד |

רוצים שאתחיל לממש משהו מהרשימה? הכי משתלם לפי סדר: תיקון ה-N+1 (מהיר, אפס סיכון), ואז Quick Add.
