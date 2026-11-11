import { getDefaultDeadlineTime } from "./deadlineTime";

/**
 * One-tap deadlines for the task sheets, so the common cases don't need the date picker.
 * Each lands on the default deadline time (Settings, 09:00 unless changed) of that day. "היום" once
 * that time has already passed is the end of today instead — never a deadline that is already late.
 * "סוף השבוע" is Thursday, the end of the Israeli work week (Fri/Sat → the coming Thursday).
 * Values are in the <input type="datetime-local"> format ("YYYY-MM-DDTHH:mm").
 */
function atTime(d: Date, time: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}`;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function deadlineShortcuts(now = new Date(), time = getDefaultDeadlineTime()): { label: string; value: string }[] {
  const THURSDAY = 4;
  const daysToThursday = (THURSDAY - now.getDay() + 7) % 7; // 0 when today is Thursday
  const [h, m] = time.split(":").map(Number);
  const todayTimePassed = now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
  return [
    { label: "היום", value: atTime(now, todayTimePassed ? "23:59" : time) },
    { label: "מחר", value: atTime(addDays(now, 1), time) },
    { label: "סוף השבוע", value: atTime(addDays(now, daysToThursday), daysToThursday === 0 && todayTimePassed ? "23:59" : time) },
    { label: "בעוד שבוע", value: atTime(addDays(now, 7), time) },
  ];
}
