"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff, AlertTriangle } from "lucide-react";
import {
  enablePushNotifications,
  disablePushNotifications,
  getNotificationPermission,
  isPushSubscribed,
  pushSupported,
} from "@/lib/push";

export default function NotificationBell({ userId }: { userId: string }) {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Turning notifications off is exactly the kind of accidental tap (fat-finger on a small
  // header icon) that quietly costs someone a missed task later — confirm before it takes
  // effect, the same way deleting a task or removing a team member already do.
  const [confirmingOff, setConfirmingOff] = useState(false);

  useEffect(() => {
    getNotificationPermission().then(setPermission);
    isPushSubscribed().then(setSubscribed);
  }, []);

  if (!pushSupported()) return null;

  // "on": actively subscribed. "off": user turned it off (or never turned it on) but could.
  // "blocked": the browser itself denied notification permission — can't be toggled from
  // here at all, only from the browser/device's own settings.
  const state: "on" | "off" | "blocked" = subscribed ? "on" : permission === "denied" ? "blocked" : "off";

  const handleClick = async () => {
    if (busy) return;
    if (state === "blocked") {
      setMessage("ההתראות חסומות ברמת הדפדפן/המכשיר — יש לאפשר אותן משם ידנית");
      return;
    }
    if (state === "on") {
      setMessage(null);
      setConfirmingOff(true);
      return;
    }
    setBusy(true);
    setMessage(null);
    const result = await enablePushNotifications(userId);
    setBusy(false);
    if (result.ok) {
      setPermission("granted");
      setSubscribed(true);
    } else {
      setMessage(result.reason ?? "לא ניתן היה להפעיל התראות");
    }
  };

  const confirmDisable = async () => {
    setConfirmingOff(false);
    setBusy(true);
    const result = await disablePushNotifications(userId);
    setBusy(false);
    if (result.ok) setSubscribed(false);
    else setMessage(result.reason ?? "לא ניתן היה לכבות את ההתראות");
  };

  const Icon = state === "on" ? BellRing : BellOff;
  const iconClass = state === "on" ? "text-emerald-500" : state === "blocked" ? "text-rose-400" : "text-ink-soft";
  const title =
    state === "on" ? "התראות פעילות — הקשה תכבה" : state === "blocked" ? "התראות חסומות בדפדפן" : "התראות כבויות — הקשה תפעיל";

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={busy}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-surface-dark-card shadow-soft disabled:opacity-60"
        aria-label={title}
        aria-pressed={state === "on"}
        title={title}
      >
        <Icon size={16} className={iconClass} />
      </button>

      {confirmingOff && (
        <div className="absolute left-0 top-11 z-10 w-56 rounded-2xl bg-zinc-900 dark:bg-zinc-800 p-3.5 text-white shadow-lg">
          <p className="mb-2.5 flex items-start gap-1.5 text-[11px] leading-snug">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" />
            לכבות התראות? יש סיכוי שתפספס עדכונים על משימות שהוקצו לך או שחורגות מהדדליין.
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmDisable}
              className="flex-1 rounded-lg bg-rose-600 py-1.5 text-[11px] font-bold active:scale-95 transition-transform"
            >
              כן, כבה
            </button>
            <button
              onClick={() => setConfirmingOff(false)}
              className="flex-1 rounded-lg bg-white/15 py-1.5 text-[11px] font-bold active:scale-95 transition-transform"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className="absolute left-0 top-11 z-10 w-44 rounded-xl bg-zinc-900 dark:bg-zinc-800 px-3 py-2 text-[11px] text-white shadow-lg">
          {message}
        </p>
      )}
    </div>
  );
}
