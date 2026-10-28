/**
 * One-tap deadlines for the task sheets, so the common cases don't need the date picker.
 * Each is the END of that day (23:59, local time) — "due today" means by the end of today.
 * "סוף השבוע" is Thursday, the end of the Israeli work week (Fri/Sat → the coming Thursday).
 * Values are in the <input type="datetime-local"> format ("YYYY-MM-DDTHH:mm").
 */
function endOfDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function deadlineShortcuts(now = new Date()): { label: string; value: string }[] {
  const THURSDAY = 4;
  const daysToThursday = (THURSDAY - now.getDay() + 7) % 7; // 0 when today is Thursday
  return [
    { label: "היום", value: endOfDay(now) },
    { label: "מחר", value: endOfDay(addDays(now, 1)) },
    { label: "סוף השבוע", value: endOfDay(addDays(now, daysToThursday)) },
    { label: "בעוד שבוע", value: endOfDay(addDays(now, 7)) },
  ];
}
