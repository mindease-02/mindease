/* MindEase service worker: shows unprompted messages as notifications when the tab is closed. */
self.addEventListener("push", (event) => {
  let data = { title: "Ori", body: "Something to read when you have a moment.", url: "/chat" };
  try { data = { ...data, ...event.data.json() }; } catch { /* keep defaults */ }
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, tag: "mindease-checkin", renotify: false, silent: true,
    data: { url: data.url }, icon: "/icon.png",
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/chat";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) { if (c.url.includes("/chat") && "focus" in c) return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
