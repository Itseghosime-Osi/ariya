// Àríyá service worker: shows app notifications and opens the right page when one is tapped.
// It caches nothing, so the app always loads fresh.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim())
);

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title =
    typeof data.title === "string" && data.title ? data.title : "Àríyá";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === "string" ? data.body : "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: typeof data.tag === "string" ? data.tag : undefined,
      renotify: Boolean(data.tag),
      data: { url: typeof data.url === "string" ? data.url : "/events" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Only ever open a page of this app.
  let target;
  try {
    target = new URL(
      event.notification.data?.url || "/events",
      self.location.origin
    );
  } catch {
    target = new URL("/events", self.location.origin);
  }
  if (target.origin !== self.location.origin)
    target = new URL("/events", self.location.origin);

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const win of windows) {
        if (new URL(win.url).origin === target.origin && "focus" in win) {
          await win.focus();
          if ("navigate" in win) await win.navigate(target.href);
          return;
        }
      }
      await self.clients.openWindow(target.href);
    })()
  );
});
