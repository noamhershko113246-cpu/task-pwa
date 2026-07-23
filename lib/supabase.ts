import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/*
  Live schema (already applied to the connected Supabase project):

  team_members(id uuid pk, name, initials, color_from, color_to, is_manager bool, phone unique, created_at)
  tasks(id uuid pk, title, description, assignee_ids uuid[] -> team_members, deadline date,
        status check(todo|in_progress|stuck|done), priority smallint check(1-5),
        recurrence_id uuid null, previous_status text null, created_at)
  task_comments(id uuid pk, task_id -> tasks, user_id -> team_members, text, created_at)
  activity_log(id uuid pk, user_id -> team_members, task_id -> tasks, task_title, action, created_at)

  Realtime is enabled on all four tables (supabase_realtime publication),
  which is what lib/store.tsx subscribes to for live sync across devices.

  ⚠️ Current RLS policies are permissive (any request with the anon key can
  read/write everything) — this matches the app's current custom phone-login,
  which is NOT wired to Supabase Auth sessions yet. The client-side role
  checks (staff vs. manager) are the only access control right now. To lock
  this down properly, migrate the login flow to real Supabase Auth (phone
  OTP) and rewrite these policies to check auth.uid() against assignee_ids /
  is_manager, the way the original draft policies below sketched out.
*/
