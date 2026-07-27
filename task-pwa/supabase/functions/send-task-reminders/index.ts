import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Runs on a schedule (via pg_cron, every 30 minutes — already configured).
// Sends two kinds of reminders, once per task per day (deduped via tasks.last_reminder_sent_at):
//   - "due today": deadline is today and status isn't done/cancelled
//   - "overdue": deadline is before now and status isn't done/cancelled

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

Deno.serve(async () => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const tomorrowBoundary = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
  ).toISOString();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, deadline, status, assignee_ids, last_reminder_sent_at")
    .not("status", "in", "(done,cancelled)")
    .not("deadline", "is", null)
    .lt("deadline", tomorrowBoundary)
    .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.neq.${todayKey}`);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!tasks || tasks.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");

  // IMPORTANT: web-push requires the subscription in the standard PushSubscription
  // shape — p256dh/auth must be NESTED under `keys`, not flat top-level fields.
  // (This was the actual bug found via logs: a previous version passed a flat object.)
  const subsByUser = new Map<string, { endpoint: string; keys: { p256dh: string; auth: string } }[]>();
  for (const s of subs ?? []) {
    const list = subsByUser.get(s.user_id) ?? [];
    list.push({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } });
    subsByUser.set(s.user_id, list);
  }

  let processed = 0;
  const sendResults: { taskId: string; userId: string; endpoint: string; ok: boolean; error?: string }[] = [];

  for (const task of tasks) {
    const overdue = new Date(task.deadline) < now;
    const title = overdue ? "משימה חורגת דד-ליין" : "משימה להיום";
    const body = `"${task.title}" ${overdue ? "חרגה מהדדליין" : "הדדליין היום"}`;
    const payload = JSON.stringify({ title, body, url: "/staff" });

    for (const userId of (task.assignee_ids as string[]) || []) {
      const userSubs = subsByUser.get(userId) || [];
      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(sub, payload);
          sendResults.push({ taskId: task.id, userId, endpoint: sub.endpoint, ok: true });
        } catch (e) {
          const err = e as { statusCode?: number; body?: string; message?: string };
          console.error(
            `push failed for user ${userId} task ${task.id}: status=${err.statusCode} body=${err.body} message=${err.message}`
          );
          sendResults.push({
            taskId: task.id,
            userId,
            endpoint: sub.endpoint,
            ok: false,
            error: `status=${err.statusCode} ${err.body ?? err.message ?? ""}`,
          });
        }
      }
    }

    await supabase.from("tasks").update({ last_reminder_sent_at: todayKey }).eq("id", task.id);
    processed++;
  }

  console.log(JSON.stringify({ processed, sendResults }));
  return new Response(JSON.stringify({ processed, sendResults }), { status: 200, headers: { "Content-Type": "application/json" } });
});
