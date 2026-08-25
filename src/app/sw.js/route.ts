/**
 * The service worker, served from a route rather than from `public/`.
 *
 * This project has no `public/` directory on purpose: the icons live in
 * `src/app` as Next file conventions, and the Dockerfile's runner stage says
 * so in as many words, because a `COPY` of a directory that does not exist
 * fails a build outright. Adding one for a single file would mean changing the
 * deployment to ship push, which is a lot of blast radius for four kilobytes.
 *
 * A worker's default scope is the path it is served from, so this has to sit at
 * the origin root to control the whole app, which is exactly where a route
 * named `sw.js` puts it.
 *
 * The body is a string rather than a real module because a service worker runs
 * in its own global scope with no bundler, no imports and no React. Writing it
 * as a `.ts` file elsewhere would mean compiling it separately and keeping the
 * output in the repository, which is worse than one honest template literal.
 */

const WORKER = `
/*
 * Bunchy's service worker.
 *
 * Deliberately does nothing but notifications. There is no offline cache and
 * no fetch handler here: a stale cache of a page about who is free tonight is
 * worse than no page, and a fetch handler that gets caching wrong is the
 * classic way to serve somebody a version of an app they cannot update out of.
 */

self.addEventListener("install", () => {
  // Take over without waiting for every old tab to close. There is no cached
  // asset that an old worker and a new one could disagree about.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Bunchy", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Bunchy", {
      body: payload.body || "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      // The same key that collapses repeats in the database collapses them
      // here, so five messages in one conversation is one banner.
      tag: payload.tag || undefined,
      data: { linkPath: payload.linkPath || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const linkPath = (event.notification.data && event.notification.data.linkPath) || "/";
  const target = new URL(linkPath, self.location.origin).href;

  /*
   * Focus a tab that is already here rather than opening a fourth one.
   *
   * Somebody who taps three notifications should not end up with three copies
   * of the app. An existing client is navigated to the right page instead,
   * which is also faster than a cold start.
   */
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
`;

export function GET() {
  return new Response(WORKER, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      // A worker is checked for updates on every navigation anyway, and a
      // stale one is the hardest kind of stale to clear. An hour is long
      // enough to matter for traffic and short enough to fix a mistake.
      "cache-control": "public, max-age=0, must-revalidate",
      "service-worker-allowed": "/",
    },
  });
}
