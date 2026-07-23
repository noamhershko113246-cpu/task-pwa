import { TeamMember, Task, STATUS_LABELS, PRIORITY_COLORS } from "./types";

/** Builds a CSV file from tasks (Excel-compatible) and triggers a browser download. */
export function exportTasksToCsv(tasks: Task[], team: TeamMember[], filename = "משימות.csv") {
  const findName = (id: string) => team.find((m) => m.id === id)?.name ?? id;
  const headers = ["שם המשימה", "תיאור", "אחראי/ת", "דדליין", "סטטוס", "דחיפות"];

  const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const rows = tasks.map((t) =>
    [
      t.title,
      t.description,
      t.assigneeIds.map(findName).join(", "),
      t.deadline,
      STATUS_LABELS[t.status],
      `${t.priority} - ${PRIORITY_COLORS[t.priority].label}`,
    ]
      .map(escapeCell)
      .join(",")
  );

  // BOM so Excel opens Hebrew UTF-8 correctly
  const csv = "\uFEFF" + [headers.map(escapeCell).join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function timeAgoHebrew(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "עכשיו";
  if (min < 60) return `לפני ${min} דקות`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `לפני ${hr} שעות`;
  const days = Math.floor(hr / 24);
  return `לפני ${days} ימים`;
}

export function isOverdue(deadline: string, status: string): boolean {
  if (status === "done" || status === "cancelled") return false;
  const d = new Date(deadline);
  const now = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime() < now.getTime();
}

export const WEEKDAY_LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"]; // index = Date.getDay()

/** Generates one ISO date per matching weekday between start and end (inclusive). Capped at 104 instances as a safety limit. */
export function generateRecurringDates(
  startIso: string,
  endIso: string,
  selectedDays: Set<number>
): string[] {
  const dates: string[] = [];
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || selectedDays.size === 0) return dates;

  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime() && dates.length < 104) {
    if (selectedDays.has(cursor.getDay())) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/** Groups a month's tasks by assignee (category = team member), in team order, dropping empty categories. */
export function groupTasksByMemberInMonth<T extends { deadline: string; assigneeIds: string[] }>(
  tasks: T[],
  monthDate: Date,
  team: TeamMember[]
): { member: TeamMember; items: T[] }[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const inMonth = tasks.filter((t) => {
    const d = new Date(t.deadline);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  return team
    .map((member) => ({
      member,
      items: inMonth
        .filter((t) => t.assigneeIds.includes(member.id))
        .sort((a, b) => (a.deadline < b.deadline ? 1 : -1)),
    }))
    .filter((group) => group.items.length > 0);
}

export function formatDeadline(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

export function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
}

export function monthLabel(date: Date): string {
  return date.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
}

/** Returns tasks whose deadline falls within the given month/year, grouped by day (desc). */
export function groupTasksByDayInMonth<T extends { deadline: string }>(
  tasks: T[],
  monthDate: Date
): { dateIso: string; items: T[] }[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const inMonth = tasks.filter((t) => {
    const d = new Date(t.deadline);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const groups = new Map<string, T[]>();
  for (const task of inMonth) {
    const key = task.deadline;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(task);
  }

  return Array.from(groups.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([dateIso, items]) => ({ dateIso, items }));
}
