// Àríyá service worker: shows app notifications and opens the right page when one is tapped.
//
// It caches exactly two surfaces — the checklist and the day-of run sheet — and nothing else. The
// exception exists because of the day itself: a host standing in a hall with no signal still needs
// the run sheet, and a page that only loads online is useless at the one moment it matters most.
//
// Everything else stays network-only on purpose. A cached shell shows yesterday's guest list with
// today's confidence, and for most of this app that is worse than an honest failure. The cached two
// are network-first, so even they are fresh whenever there is a signal.

const CACHE = "ariya-offline-v1";

/** The two routes this worker will ever store. Anything else is network-only. */
const OFFLINE_PATHS = [
  /^\/events\/[^/]+\/checklist\/?$/,
  /^\/events\/[^/]+\/day-of\/?$/,
];

function isOfflineRoute(url) {
  return (
    url.origin === self.location.origin &&
    OFFLINE_PATHS.some((re) => re.test(url.pathname))
  );
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      // Drop caches from an older version, so a renamed cache cannot linger for ever.
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n !== CACHE).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  )
);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Only a page a person navigated to. A prefetch or an XHR for the same path is not the thing
  // being protected here.
  if (request.mode !== "navigate" || !isOfflineRoute(url)) return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        // Only a real page is worth keeping: a redirect to sign-in, or an error, would be served
        // back later as though it were the host's checklist.
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          const cache = await caches.open(CACHE);
          await cache.put(request, copy);
        }
        return response;
      } catch {
        const cached = await caches.match(request, { cacheName: CACHE });
        if (cached) return cached;
        throw new Error("offline and not cached");
      }
    })()
  );
});

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
