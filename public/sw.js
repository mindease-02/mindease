/* MindEase service worker.
 *  1. Push: shows unprompted messages as notifications when the tab is closed.
 *  2. Offline: keeps /offline-help.html (a self-contained page with the verified
 *     helplines) cached, and serves it whenever a page cannot be reached. Nothing
 *     else is cached; API calls and assets are never intercepted.
 */
const CACHE = "mindease-offline-v1";
const OFFLINE = "/offline-help.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(new Request(OFFLINE, { cache: "reload" }))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate") return;
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      // A visit to the help page is a good moment to refresh the offline copy.
      if (new URL(req.url).pathname === "/help") {
        event.waitUntil(fetch(OFFLINE, { cache: "reload" }).then((r) => r.ok && caches.open(CACHE).then((c) => c.put(OFFLINE, r))).catch(() => {}));
      }
      return res;
    } catch {
      const cached = await caches.match(OFFLINE);
      return cached || new Response("You are offline. Call 14416 (Tele-MANAS) or 112.", { status: 503, headers: { "content-type": "text/plain" } });
    }
  })());
});

self.addEventListener("push", (event) => {
  let data = { title: "MindEase", body: "Something to read when you have a moment.", url: "/chat" };
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
