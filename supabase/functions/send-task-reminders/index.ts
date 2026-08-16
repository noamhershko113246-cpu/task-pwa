import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Runs on a schedule (via pg_cron, every 30 minutes — already configured; this
// is the finest granularity any of the settings below can achieve).
// Sends three kinds of reminders, each deduped per recipient:
//   - "due today" / "overdue" deadline reminders — see runDeadlineReminders().
//     Per-person opt-in working hours + repeat interval (team_members.working_hours_*,
//     .overdue_reminder_interval_minutes), tracked per (task, recipient) in
//     public.overdue_reminder_log since different assignees on the same task can
//     have different settings.
//   - "daily open-tasks summary" — opt-in per person, at a time of their own
//     choosing (team_members.daily_summary_enabled/_time/_scope) — see
//     runDailySummaries() below.

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } };
type SendResult = { context: string; userId: string; endpoint: string; ok: boolean; error?: string };

async function sendToUser(
  subsByUser: Map<string, PushSub[]>,
  userId: string,
  payload: string,
  context: string,
  sendResults: SendResult[]
) {
  const userSubs = subsByUser.get(userId) || [];
  for (const sub of userSubs) {
    try {
      await webpush.sendNotification(sub, payload);
      sendResults.push({ context, userId, endpoint: sub.endpoint, ok: true });
    } catch (e) {
      const err = e as { statusCode?: number; body?: string; message?: string };
      console.error(`push failed (${context}) for user ${userId}: status=${err.statusCode} body=${err.body} message=${err.message}`);
      sendResults.push({
        context,
        userId,
        endpoint: sub.endpoint,
        ok: false,
        error: `status=${err.statusCode} ${err.body ?? err.message ?? ""}`,
      });
    }
  }
}

const JERUSALEM_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Current wall-clock time in Asia/Jerusalem, as minutes-since-midnight plus weekday index (0=Sun..6=Sat). */
function jerusalemNow(now: Date): { hhmm: string; minutesSinceMidnight: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);
  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  const weekdayName = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  return {
    hhmm: `${hh}:${mm}`,
    minutesSinceMidnight: Number(hh) * 60 + Number(mm),
    weekday: JERUSALEM_WEEKDAYS.indexOf(weekdayName),
  };
}

function parseHHMM(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

type MemberSettings = {
  workingHoursEnabled: boolean;
  workingHoursStart: number | null; // minutes since midnight
  workingHoursEnd: number | null;
  intervalMinutes: number;
};

/**
 * Is `nowMinutes`/`weekday` inside this person's chosen working hours? Work
 * week is Sunday–Thursday (Israeli week); Friday/Saturday are always outside.
 * If the person hasn't opted into working-hours restriction at all, everything
 * is always "inside" — matches the old, unrestricted behavior.
 */
function withinWorkingHours(settings: MemberSettings, nowMinutes: number, weekday: number): boolean {
  if (!settings.workingHoursEnabled) return true;
  if (weekday === 5 || weekday === 6) return false; // Fri/Sat
  if (settings.workingHoursStart === null || settings.workingHoursEnd === null) return true; // misconfigured — fail open
  return nowMinutes >= settings.workingHoursStart && nowMinutes < settings.workingHoursEnd;
}

/**
 * Deadline reminders ("due today" / "overdue"), gated per-recipient by their
 * own working-hours window and repeat interval. A task held overnight (or over
 * the weekend) because a recipient is outside working hours isn't "missed" —
 * since we never touch overdue_reminder_log while holding, the elapsed-time
 * check naturally fires again as soon as their next working-hours window opens,
 * without any separate "resume next business day" logic needed.
 */
async function runDeadlineReminders(
  supabase: ReturnType<typeof createClient>,
  now: Date,
  nowMinutes: number,
  weekday: number,
  subsByUser: Map<string, PushSub[]>,
  sendResults: SendResult[]
) {
  const tomorrowBoundary = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
  ).toISOString();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, deadline, status, assignee_ids")
    .not("status", "in", "(done,cancelled)")
    .not("deadline", "is", null)
    .lt("deadline", tomorrowBoundary);
  if (error || !tasks || tasks.length === 0) return 0;

  const { data: members } = await supabase
    .from("team_members")
    .select("id, working_hours_enabled, working_hours_start, working_hours_end, overdue_reminder_interval_minutes");
  const settingsByUser = new Map<string, MemberSettings>();
  for (const m of members ?? []) {
    settingsByUser.set(m.id as string, {
      workingHoursEnabled: !!m.working_hours_enabled,
      workingHoursStart: m.working_hours_start ? parseHHMM(m.working_hours_start as string) : null,
      workingHoursEnd: m.working_hours_end ? parseHHMM(m.working_hours_end as string) : null,
      intervalMinutes: (m.overdue_reminder_interval_minutes as number) ?? 1440,
    });
  }

  const taskIds = tasks.map((t) => t.id as string);
  const { data: logRows } = await supabase
    .from("overdue_reminder_log")
    .select("task_id, user_id, last_sent_at")
    .in("task_id", taskIds);
  const lastSentByPair = new Map<string, number>(); // `${taskId}:${userId}` -> epoch ms
  for (const row of logRows ?? []) {
    lastSentByPair.set(`${row.task_id}:${row.user_id}`, new Date(row.last_sent_at as string).getTime());
  }

  let sent = 0;
  for (const task of tasks) {
    const overdue = new Date(task.deadline as string) < now;
    const title = overdue ? "משימה חורגת דד-ליין" : "משימה להיום";
    const body = `"${task.title}" ${overdue ? "חרגה מהדדליין" : "הדדליין היום"}`;
    const payload = JSON.stringify({ title, body, url: "/staff" });

    for (const userId of (task.assignee_ids as string[]) || []) {
      const settings = settingsByUser.get(userId);
      if (!settings) continue; // e.g. assignee no longer on the team
      if (!withinWorkingHours(settings, nowMinutes, weekday)) continue; // held — will re-check next run

      const key = `${task.id}:${userId}`;
      const lastSent = lastSentByPair.get(key);
      const dueForResend = lastSent === undefined || now.getTime() - lastSent >= settings.intervalMinutes * 60_000;
      if (!dueForResend) continue;

      await sendToUser(subsByUser, userId, payload, "deadline", sendResults);
      await supabase
        .from("overdue_reminder_log")
        .upsert({ task_id: task.id, user_id: userId, last_sent_at: now.toISOString() }, { onConflict: "task_id,user_id" });
      sent++;
    }
  }
  return sent;
}

/**
 * Opt-in per-person "you still have open tasks" reminder. Each person picks
 * their own time and scope (all open tasks, or only ones due today/overdue).
 * Runs every 30 minutes like the rest of this function, so a person's chosen
 * time is matched against the current 30-minute window, not an exact tick —
 * deduped per day via last_daily_summary_sent_at so it can never double-send.
 */
async function runDailySummaries(
  supabase: ReturnType<typeof createClient>,
  now: Date,
  todayKey: string,
  nowMinutes: number,
  subsByUser: Map<string, PushSub[]>,
  sendResults: SendResult[]
) {
  const { data: members, error } = await supabase
    .from("team_members")
    .select("id, name, daily_summary_enabled, daily_summary_time, daily_summary_scope, last_daily_summary_sent_at")
    .eq("daily_summary_enabled", true)
    .not("daily_summary_time", "is", null)
    .or(`last_daily_summary_sent_at.is.null,last_daily_summary_sent_at.neq.${todayKey}`);

  if (error || !members || members.length === 0) return 0;

  const due = members.filter((m) => {
    const target = parseHHMM(m.daily_summary_time as string);
    if (target === null) return false;
    // matches if their chosen time falls in this run's [now, now+30min) window
    return target >= nowMinutes && target < nowMinutes + 30;
  });
  if (due.length === 0) return 0;

  let sent = 0;
  for (const member of due) {
    const scope = (member.daily_summary_scope as "all" | "due_soon") ?? "all";
    let query = supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .not("status", "in", "(done,cancelled)")
      .contains("assignee_ids", [member.id]);
    if (scope === "due_soon") {
      const tomorrowBoundary = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
      ).toISOString();
      query = query.not("deadline", "is", null).lt("deadline", tomorrowBoundary);
    }
    const { count, error: countError } = await query;

    // Mark as handled for today regardless of outcome — the point is "once
    // per day at their chosen time", not "keep retrying until tasks appear".
    await supabase.from("team_members").update({ last_daily_summary_sent_at: todayKey }).eq("id", member.id);

    if (countError || !count || count === 0) continue;

    const body = scope === "due_soon" ? `יש לך ${count} משימות עם דדליין היום או שעבר` : `יש לך ${count} משימות פתוחות`;
    const payload = JSON.stringify({ title: "תזכורת יומית", body, url: "/staff" });
    await sendToUser(subsByUser, member.id as string, payload, "daily_summary", sendResults);
    sent++;
  }
  return sent;
}

Deno.serve(async () => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const { hhmm: nowHHMM, minutesSinceMidnight: nowMinutes, weekday } = jerusalemNow(now);

  const { data: subs } = await supabase.from("push_subscriptions").select("user_id, endpoint, p256dh, auth");

  // IMPORTANT: web-push requires the subscription in the standard PushSubscription
  // shape — p256dh/auth must be NESTED under `keys`, not flat top-level fields.
  // (This was the actual bug found via logs: a previous version passed a flat object.)
  const subsByUser = new Map<string, PushSub[]>();
  for (const s of subs ?? []) {
    const list = subsByUser.get(s.user_id as string) ?? [];
    list.push({ endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } });
    subsByUser.set(s.user_id as string, list);
  }

  const sendResults: SendResult[] = [];

  const deadlineRemindersSent = await runDeadlineReminders(supabase, now, nowMinutes, weekday, subsByUser, sendResults);
  const dailySummariesSent = await runDailySummaries(supabase, now, todayKey, nowMinutes, subsByUser, sendResults);

  const result = { window: nowHHMM, deadlineRemindersSent, dailySummariesSent, sendResults };
  console.log(JSON.stringify(result));
  return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
});
