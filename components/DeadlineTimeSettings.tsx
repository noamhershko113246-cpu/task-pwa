"use client";

import { useEffect, useState } from "react";
import { DEFAULT_DEADLINE_TIME, getDefaultDeadlineTime, setDefaultDeadlineTime } from "@/lib/deadlineTime";

/** Settings → the time the quick deadline buttons (היום · מחר · סוף השבוע · בעוד שבוע) set. */
export default function DeadlineTimeSettings() {
  const [time, setTime] = useState(DEFAULT_DEADLINE_TIME);
  useEffect(() => setTime(getDefaultDeadlineTime()), []);

  return (
    <section>
      <label htmlFor="st-deadline-time" className="mb-1 block text-sm font-bold text-ink dark:text-ink-dark">
        שעת דדליין קבועה
      </label>
      <p className="mb-2 text-[11px] leading-snug text-ink-soft dark:text-ink-dark-soft">
        הכפתורים &quot;מחר&quot;, &quot;סוף השבוע&quot; ו&quot;בעוד שבוע&quot; קובעים את הדדליין לשעה הזאת. במכשיר הזה בלבד.
      </p>
      <input
        id="st-deadline-time"
        type="time"
        value={time}
        onChange={(e) => {
          if (!e.target.value) return;
          setTime(e.target.value);
          setDefaultDeadlineTime(e.target.value);
        }}
        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-1.5 text-sm text-ink dark:text-ink-dark"
      />
    </section>
  );
}
