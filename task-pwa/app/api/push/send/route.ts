import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { supabase } from "@/lib/supabase";

const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
}

export async function POST(req: NextRequest) {
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }

  const { userIds, title, body, url } = (await req.json()) as {
    userIds: string[];
    title: string;
    body: string;
    url?: string;
  };

  if (!userIds?.length || !title || !body) {
    return NextResponse.json({ error: "Missing userIds, title, or body" }, { status: 400 });
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const payload = JSON.stringify({ title, body, url: url || "/" });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  // Clean up subscriptions the browser has revoked (410 Gone / 404 Not Found)
  const toRemove: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const statusCode = (r.reason as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) toRemove.push(subs[i].id);
    }
  });
  if (toRemove.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", toRemove);
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ sent, failed: results.length - sent });
}
