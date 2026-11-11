"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { BellRing, Share, X } from "lucide-react";
import { enablePushNotifications, isPushSubscribed, pushSupported } from "@/lib/push";
import { useToast } from "./ToastProvider";

// useLayoutEffect warns during server rendering; it only matters in the browser anyway.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Fired after notifications are switched on from here, so the header bell updates without a reload. */
export const PUSH_CHANGED_EVENT = "taskpwa:push-changed";

const DISMISS_KEY = "notif-banner-dismissed:";
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function isIPhoneOutsideHomeScreen(): boolean {
  const isIOS =
    /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  return isIOS && !standalone;
}

/**
 * One clear line asking to turn notifications on, for whoever hasn't yet — most people never found the
 * crossed-out bell, and without notifications they hear about new tasks and deadlines only by opening
 * the app. On an iPhone browser tab (where push can't work at all) it explains the home-screen step
 * instead. Not shown once on, when the browser blocked it (the bell explains that), or for a week
 * after "x".
 */
export default function EnableNotificationsBanner({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<"hidden" | "enable" | "install">("hidden");
  const [busy, setBusy] = useState(false);

  // Decided before the first paint whenever possible: appearing a moment later would push the whole page
  // down — and land a list that was just scrolled back into place (useScrollMemory) at the wrong spot.
  // Only "permission already granted" needs the async subscription check.
  useIsomorphicLayoutEffect(() => {
    let cancelled = false;
    try {
      const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY + userId));
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_FOR_MS) return;
    } catch {
      // storage blocked — just show it
    }
    if (!pushSupported()) {
      setMode(window.isSecureContext && isIPhoneOutsideHomeScreen() ? "install" : "hidden");
      return;
    }
    const permission = "Notification" in window ? Notification.permission : "default";
    if (permission === "denied") return;
    if (permission === "default") {
      setMode("enable"); // can't be subscribed without permission
      return;
    }
    isPushSubscribed().then((subscribed) => {
      if (!cancelled && !subscribed) setMode("enable");
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (mode === "hidden") return null;

  const dismiss = () => {
    setMode("hidden");
    try {
      window.localStorage.setItem(DISMISS_KEY + userId, String(Date.now()));
    } catch {
      // storage blocked — hidden for this visit only
    }
  };

  const enable = async () => {
    setBusy(true);
    const result = await enablePushNotifications(userId);
    setBusy(false);
    if (result.ok) {
      setMode("hidden");
      window.dispatchEvent(new Event(PUSH_CHANGED_EVENT));
      showToast("ההתראות הופעלו", "success");
    } else {
      showToast(result.reason ?? "לא ניתן היה להפעיל התראות", "error");
    }
  };

  return (
    <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-brand-100 dark:border-brand-500/20 bg-brand-50 dark:bg-brand-500/10 p-2.5 ps-3">
      {mode === "enable" ? (
        <BellRing size={18} className="shrink-0 text-brand-600 dark:text-brand-300" />
      ) : (
        <Share size={18} className="shrink-0 text-brand-600 dark:text-brand-300" />
      )}
      <p className="min-w-0 flex-1 text-xs font-semibold leading-snug text-ink dark:text-ink-dark">
        {mode === "enable"
          ? "הפעילו התראות כדי לדעת על משימה חדשה ועל דדליין שמתקרב"
          : "כדי לקבל התראות באייפון: שיתוף ← הוספה למסך הבית, ולפתוח משם"}
      </p>
      {mode === "enable" && (
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="press min-h-11 shrink-0 rounded-xl bg-brand-600 px-3.5 text-xs font-bold text-white disabled:opacity-60"
        >
          הפעלה
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="לא עכשיו"
        title="לא עכשיו"
        className="-m-1 flex h-11 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft dark:text-ink-dark-soft"
      >
        <X size={16} />
      </button>
    </div>
  );
}
