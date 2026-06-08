const CACHE_NAME = 'sprint-planner-cloud-shell-v2';
// Base path is derived from the service-worker registration scope so the same source works on any
// deploy base (prod /sprint-planner/, staging /sprint-planner-staging/) without a hardcoded path.
const BASE_PATH = new URL(self.registration.scope).pathname;
const SHELL_URLS = [BASE_PATH, `${BASE_PATH}index.html`, `${BASE_PATH}manifest.webmanifest`, `${BASE_PATH}icon.svg`];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin || !requestUrl.pathname.startsWith(BASE_PATH)) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(`${BASE_PATH}index.html`)));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || event.request.method !== 'GET') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
