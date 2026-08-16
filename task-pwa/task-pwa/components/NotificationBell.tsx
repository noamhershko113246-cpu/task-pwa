"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, BellOff } from "lucide-react";
import { enablePushNotifications, getNotificationPermission, pushSupported } from "@/lib/push";

export default function NotificationBell({ userId }: { userId: string }) {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getNotificationPermission().then(setPermission);
  }, []);

  if (!pushSupported()) return null;

  const handleClick = async () => {
    if (permission === "granted" || busy) return;
    setBusy(true);
    setMessage(null);
    const result = await enablePushNotifications(userId);
    setBusy(false);
    if (result.ok) {
      setPermission("granted");
    } else {
      setMessage(result.reason ?? "לא ניתן היה להפעיל התראות");
    }
  };

  const Icon = permission === "granted" ? BellRing : permission === "denied" ? BellOff : Bell;

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={busy || permission === "granted"}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-surface-dark-card shadow-soft"
        aria-label="הפעלת התראות"
        title={permission === "granted" ? "התראות פעילות" : "הפעלת התראות"}
      >
        <Icon
          size={16}
          className={permission === "granted" ? "text-emerald-500" : "text-ink-soft"}
        />
      </button>
      {message && (
        <p className="absolute left-0 top-11 z-10 w-44 rounded-xl bg-zinc-900 dark:bg-zinc-800 px-3 py-2 text-[11px] text-white shadow-lg">
          {message}
        </p>
      )}
    </div>
  );
}
