"use client";

import { useEffect, useId, useState } from "react";
import { BellRing, BellOff, AlertTriangle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { DURATION, EASE } from "@/lib/motion";
import {
  enablePushNotifications,
  disablePushNotifications,
  getNotificationPermission,
  isPushSubscribed,
  pushSupported,
  pushUnsupportedReason,
} from "@/lib/push";
import { useToast } from "./ToastProvider";
import { useDialog } from "@/lib/useDialog";

export default function NotificationBell({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  // Bumped each time notifications are switched ON, so the bell rings once (the key restarts the animation).
  const [ringKey, setRingKey] = useState(0);
  // Turning notifications off is exactly the kind of accidental tap (fat-finger on a small
  // header icon) that quietly costs someone a missed task later — confirm before it takes
  // effect, the same way deleting a task or removing a team member already do.
  const [confirmingOff, setConfirmingOff] = useState(false);
  const dialogRef = useDialog<HTMLDivElement>(confirmingOff, () => setConfirmingOff(false));
  const titleId = useId();

  useEffect(() => {
    getNotificationPermission().then(setPermission);
    isPushSubscribed().then(setSubscribed);
  }, []);

  // Used to render nothing here, which made the notification option silently vanish on any device
  // that can't do push (plain-HTTP address, iPhone Safari outside the home-screen app). Keep the
  // button so people can find it, and say why it can't be used.
  if (!pushSupported()) {
    return (
      <button
        onClick={() => showToast(pushUnsupportedReason(), "error")}
        className="flex h-11 w-11 items-center justify-center press rounded-full glass shadow-soft"
        aria-label="התראות לא זמינות במכשיר הזה"
        title="התראות לא זמינות במכשיר הזה"
      >
        <BellOff size={16} className="text-ink-soft opacity-50" />
      </button>
    );
  }

  // "on": actively subscribed. "off": user turned it off (or never turned it on) but could.
  // "blocked": the browser itself denied notification permission — can't be toggled from
  // here at all, only from the browser/device's own settings.
  const state: "on" | "off" | "blocked" = subscribed ? "on" : permission === "denied" ? "blocked" : "off";

  const handleClick = async () => {
    if (busy) return;
    if (state === "blocked") {
      showToast("ההתראות חסומות ברמת הדפדפן/המכשיר — יש לאפשר אותן משם ידנית", "error");
      return;
    }
    if (state === "on") {
      setConfirmingOff(true);
      return;
    }
    setBusy(true);
    const result = await enablePushNotifications(userId);
    setBusy(false);
    if (result.ok) {
      setPermission("granted");
      setSubscribed(true);
      setRingKey((k) => k + 1);
    } else {
      showToast(result.reason ?? "לא ניתן היה להפעיל התראות", "error");
    }
  };

  const confirmDisable = async () => {
    setConfirmingOff(false);
    setBusy(true);
    const result = await disablePushNotifications(userId);
    setBusy(false);
    if (result.ok) setSubscribed(false);
    else showToast(result.reason ?? "לא ניתן היה לכבות את ההתראות", "error");
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
        className="flex h-11 w-11 items-center justify-center press rounded-full glass shadow-soft disabled:opacity-60"
        aria-label={title}
        aria-pressed={state === "on"}
        title={title}
      >
        <span key={ringKey} className={ringKey > 0 ? "inline-flex origin-top animate-bell-ring" : "inline-flex"}>
          <Icon size={16} className={iconClass} />
        </span>
      </button>

      {/* A centered, viewport-clamped dialog — NOT a panel anchored to the bell. The bell sits in
          the middle of the header's icon row, and an `absolute left-0` panel (physical, doesn't
          flip in RTL) grew off the right edge of the screen on every phone width, cutting off the
          confirm button. inset-x-4 + max-w keeps it inside the viewport at any width. */}
      <AnimatePresence>
      {confirmingOff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.base, ease: EASE }}
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmingOff(false)}
          />
          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: DURATION.base, ease: EASE }}
            className="relative w-full max-w-xs rounded-2xl bg-zinc-900 dark:bg-zinc-800 p-4 text-white shadow-2xl"
          >
            <p id={titleId} className="mb-4 flex items-start gap-2 text-sm leading-snug">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
              לכבות התראות? יש סיכוי שתפספס עדכונים על משימות שהוקצו לך או שחורגות מהדדליין.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmDisable}
                className="min-h-11 flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold active:scale-95 transition-transform"
              >
                כן, כבה
              </button>
              <button
                onClick={() => setConfirmingOff(false)}
                className="min-h-11 flex-1 rounded-xl bg-white/15 py-2.5 text-sm font-bold active:scale-95 transition-transform"
              >
                ביטול
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}
