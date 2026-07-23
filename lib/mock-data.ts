import { ActivityEvent, Task, TeamMember } from "./types";

// מספרי הטלפון האמיתיים של הצוות — כל אחד מתחבר רק עם המספר שלו/שלה.
export const TEAM: TeamMember[] = [
  { id: "tair", name: "תאיר", initials: "תא", colorFrom: "from-brand-400", colorTo: "to-brand-600", isManager: true, phone: "0552235800" },
  { id: "noam", name: "נועם", initials: "נע", colorFrom: "from-sky-400", colorTo: "to-sky-600", phone: "0545210123" },
  { id: "hallel", name: "הלל", initials: "הל", colorFrom: "from-rose-400", colorTo: "to-rose-600", phone: "0508437801" },
  { id: "shachar", name: "שחר", initials: "שח", colorFrom: "from-amber-400", colorTo: "to-amber-600", phone: "0545678086" },
  { id: "raz", name: "רז", initials: "רז", colorFrom: "from-emerald-400", colorTo: "to-emerald-600", phone: "0549837730" },
  { id: "hodaya", name: "הודיה", initials: "הו", colorFrom: "from-violet-400", colorTo: "to-violet-600", phone: "0532314133" },
];

const today = new Date();
const iso = (daysOffset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
};

export const TASKS: Task[] = [
  { id: "t1", title: "דו״ח שבועי", description: "לרכז נתוני מכירות ולשלוח לתאיר", assigneeId: "noam", deadline: iso(1), status: "in_progress", createdAt: iso(-3), priority: 2,
    comments: [
      { id: "c1", userId: "noam", text: "חסרים לי נתוני מחלקת הדרום, מחכה לקובץ", timestamp: new Date(Date.now() - 3 * 3600000).toISOString() },
    ] },
  { id: "t2", title: "עדכון אתר הבית", description: "להחליף באנר ראשי לקמפיין הקיץ", assigneeId: "hallel", deadline: iso(-1), status: "todo", createdAt: iso(-4), priority: 3 },
  { id: "t3", title: "תיאום פגישת ספקים", description: "לקבוע שעה עם 3 ספקים חדשים", assigneeId: "shachar", deadline: iso(2), status: "stuck", createdAt: iso(-2), priority: 1 },
  { id: "t4", title: "בדיקת חשבוניות יולי", description: "התאמה מול הנהלת חשבונות", assigneeId: "raz", deadline: iso(0), status: "todo", createdAt: iso(-1), priority: 2 },
  { id: "t5", title: "עדכון מצגת לקוח", description: "לשלב את הנתונים החדשים ממחלקת המכירות", assigneeId: "noam", deadline: iso(-2), status: "todo", createdAt: iso(-5), priority: 1 },
  { id: "t6", title: "סידור ארכיון מסמכים", description: "סריקת מסמכים ישנים והעלאה לדרייב", assigneeId: "hallel", deadline: iso(5), status: "done", createdAt: iso(-6), priority: 4 },
  { id: "t7", title: "תיאום כיבוד למשרד", description: "הזמנת כיבוד לישיבת הצוות השבועית", assigneeId: "hodaya", deadline: iso(3), status: "todo", createdAt: iso(-1), priority: 5 },

  // משימות היסטוריות — לצורך תצוגת "היסטוריה" לפי חודשים
  { id: "t8", title: "סיכום רבעוני", description: "ריכוז נתוני הרבעון והצגה בישיבת סיכום", assigneeId: "noam", deadline: iso(-18), status: "done", createdAt: iso(-25), priority: 2 },
  { id: "t9", title: "רענון ציוד משרדי", description: "בדיקת מלאי והזמנת ציוד חסר", assigneeId: "shachar", deadline: iso(-22), status: "done", createdAt: iso(-28), priority: 4 },
  { id: "t10", title: "עדכון נהלי עבודה", description: "כתיבת נוהל מעודכן לקליטת עובד חדש", assigneeId: "hallel", deadline: iso(-35), status: "done", createdAt: iso(-40), priority: 3 },
  { id: "t11", title: "ביקורת בטיחות", description: "סיור בטיחות תקופתי במשרד", assigneeId: "raz", deadline: iso(-33), status: "done", createdAt: iso(-38), priority: 1 },
  { id: "t12", title: "ארגון אירוע צוות", description: "תיאום מקום ותפריט לערב גיבוש", assigneeId: "hodaya", deadline: iso(-40), status: "done", createdAt: iso(-45), priority: 5 },
  { id: "t13", title: "עדכון מאגר לקוחות", description: "ניקוי כפילויות והשלמת פרטים חסרים", assigneeId: "noam", deadline: iso(-50), status: "done", createdAt: iso(-55), priority: 3 },
  { id: "t14", title: "הכנת תקציב חודשי", description: "בניית תחזית הוצאות לחודש הבא", assigneeId: "shachar", deadline: iso(-60), status: "stuck", createdAt: iso(-63), priority: 2 },

  // המשימות האישיות של המפקדת עצמה
  { id: "t15", title: "ישיבת סיכום עם ההנהלה", description: "הכנת מצגת סיכום רבעון להנהלה הבכירה", assigneeId: "tair", deadline: iso(2), status: "in_progress", createdAt: iso(-2), priority: 1 },
  { id: "t16", title: "אישור תקציב לרכש ציוד", description: "לחתום ולהעביר לחשבים עד סוף השבוע", assigneeId: "tair", deadline: iso(-1), status: "todo", createdAt: iso(-4), priority: 2 },
  { id: "t17", title: "פגישת הערכה אישית עם הצוות", description: "לתאם ולקיים שיחות אישיות עם כל אחד מהצוות", assigneeId: "tair", deadline: iso(6), status: "todo", createdAt: iso(-1), priority: 3 },
  { id: "t18", title: "בדיקת דוח הוצאות רבעוני", description: "אישור סופי לפני שליחה להנהלת חשבונות", assigneeId: "tair", deadline: iso(-15), status: "done", createdAt: iso(-20), priority: 3 },
];

export const ACTIVITY: ActivityEvent[] = [
  { id: "a1", userId: "noam", taskId: "t1", taskTitle: "דו״ח שבועי", action: "העביר את המשימה לביצוע", timestamp: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: "a2", userId: "hallel", taskId: "t6", taskTitle: "סידור ארכיון מסמכים", action: "סימן את המשימה כהושלמה", timestamp: new Date(Date.now() - 40 * 60000).toISOString() },
  { id: "a3", userId: "shachar", taskId: "t3", taskTitle: "תיאום פגישת ספקים", action: "סימן את המשימה כתקועה", timestamp: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: "a4", userId: "hodaya", taskId: "t7", taskTitle: "תיאום כיבוד למשרד", action: "יצרה את המשימה", timestamp: new Date(Date.now() - 20 * 3600000).toISOString() },
  { id: "a5", userId: "raz", taskId: "t4", taskTitle: "בדיקת חשבוניות יולי", action: "יצר את המשימה", timestamp: new Date(Date.now() - 26 * 3600000).toISOString() },
  { id: "a6", userId: "tair", taskId: "t18", taskTitle: "בדיקת דוח הוצאות רבעוני", action: "סימנה את המשימה כהושלמה", timestamp: new Date(Date.now() - 15 * 24 * 3600000).toISOString() },
];
