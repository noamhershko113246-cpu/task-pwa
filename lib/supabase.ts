import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/*
  Live schema (verified against the connected Supabase project — keep this in sync
  when columns/tables are added, it's the only schema reference that lives in the repo):

  team_members(id uuid pk, name, initials, color_from, color_to, phone unique,
               login_keyword unique null — what login actually matches against,
               is_manager bool, is_super_manager bool, is_super_admin bool,
               manager_id uuid null -> team_members, can_add_members bool,
               department text (default 'משא"ן'), brigade text null, title text null,
               background_url text null, background_preset text null,
               working_hours_enabled bool, working_hours_start/end text null ("HH:MM"),
               daily_summary_enabled bool, daily_summary_time text null ("HH:MM"),
               daily_summary_scope text (all|due_soon), last_daily_summary_sent_at date null,
               overdue_reminder_interval_minutes int (default 1440), created_at)
  tasks(id uuid pk, title, description, assignee_ids uuid[] -> team_members,
        deadline timestamptz null, status check(todo|in_progress|stuck|done|cancelled),
        priority smallint check(1-5), recurrence_id uuid null — MUST be a real UUID
        (crypto.randomUUID()), previous_status text null — used for "undo complete",
        completed_at timestamptz null — set exactly when status becomes done,
        created_by uuid null -> team_members, last_reminder_sent_at date null, created_at)
  task_comments(id uuid pk, task_id -> tasks, user_id -> team_members, text, created_at)
  activity_log(id uuid pk, user_id uuid null -> team_members, task_id uuid null -> tasks,
               task_title, action, created_at)
  push_subscriptions(id uuid pk, user_id -> team_members, endpoint unique, p256dh, auth, created_at)
  overdue_reminder_log(task_id + user_id composite pk -> tasks/team_members, last_sent_at)

  Realtime is enabled on team_members/tasks/task_comments/activity_log (supabase_realtime
  publication), which is what lib/store.tsx subscribes to for live sync across devices.
  push_subscriptions and overdue_reminder_log are read/written directly (no realtime needed).

  ⚠️ Current RLS policies are permissive (any request with the anon key can
  read/write everything) — this matches the app's current login (typing your own
  name, matched against login_keyword — there's no password and it isn't wired to
  Supabase Auth sessions). The client-side role/department/rank checks are the only
  access control right now. To lock this down properly, migrate login to real
  Supabase Auth and rewrite these policies to check auth.uid() against
  assignee_ids / is_manager / department, instead of trusting the client.
*/
