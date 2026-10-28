// Minimal service worker: only handles push notifications (no offline caching yet).

// Quick buttons shown when a notification is long-pressed / expanded (where the phone supports them —
// Android and desktop browsers do; iPhone currently shows the notification without buttons).
// "assignee": the task is yours and still open. "watcher": you follow it (e.g. a comment on a soldier's task).
const ACTIONS = {
  assignee: [
    { action: "complete", title: "✓ סימון כהושלמה" },
    { action: "snooze", title: "דחייה למחר" },
  ],
  watcher: [{ action: "open", title: "פתיחת המשימה" }],
};

self.addEventListener("push", (event) => {
  let data = { title: "משימות המשרד", body: "יש עדכון חדש", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // ignore malformed payloads
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/", taskId: data.taskId || null },
      actions: (data.taskId && ACTIONS[data.actions]) || [],
      dir: "rtl",
      lang: "he",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const base = event.notification.data?.url || "/";
  // A quick button opens the app on that task with what to do; the app carries it out (logged in as
  // the person) and shows a message with "ביטול". A plain tap just opens the task.
  const target = new URL(base, self.location.origin);
  if (event.notification.data?.taskId && (event.action === "complete" || event.action === "snooze")) {
    target.searchParams.set("do", event.action);
  }
  const url = target.pathname + target.search;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
