"use client";

import { supabase } from "./supabase";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes;
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export async function getNotificationPermission(): Promise<NotificationPermission | null> {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  return Notification.permission;
}

/** Whether THIS browser/device currently has an active push subscription (independent of the
 *  OS-level Notification permission, which can be "granted" while the user has turned the
 *  in-app toggle off — that state lives here, not in Notification.permission). */
export async function isPushSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/** Registers the service worker, requests permission, subscribes to push, and saves the subscription for this user. */
export async function enablePushNotifications(userId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: "הדפדפן הזה לא תומך בהתראות" };

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return { ok: false, reason: "המערכת לא הוגדרה עדיין להתראות" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "ההרשאה נדחתה" };

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: "אירעה שגיאה ביצירת המנוי" };
  }

  await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  return { ok: true };
}

/** Unsubscribes THIS browser/device from push and removes its row from push_subscriptions,
 *  so the server stops sending it notifications. The OS-level Notification permission itself
 *  can't be revoked from JS (only the user can do that from browser/system settings) — this
 *  is the in-app "turn notifications off" toggle, independent of that. Only this device's
 *  subscription (matched by endpoint) is removed, never other devices this user is signed
 *  into elsewhere. */
export async function disablePushNotifications(userId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: "הדפדפן הזה לא תומך בהתראות" };
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", userId);
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "לא ניתן היה לכבות את ההתראות" };
  }
}
