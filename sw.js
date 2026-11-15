/* The Hollow Veil — offline cache.
   Do not take over open pages during install: on iPhone a 19MB index can be mid-download
   or mid-parse, and claiming open pages leaves a black screen. The next launch gets
   the new worker. Never wipe the old cache until this cache actually holds index. */
const CACHE = 'hv-final4-74';
const ASSETS = [
  './',
  './index.html',
  './hv.js',
  './guide.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './splash.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()).catch(() => {
      /* leave the previous cache in charge if this version cannot be stored */
    })
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.match('./index.html')).then((hit) => {
      if (!hit) return;
      return caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))));
    })
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-store' }).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          const path = new URL(req.url).pathname;
          const key = path.indexOf('guide.html') >= 0 ? './guide.html' : './index.html';
          caches.open(CACHE).then((c) => c.put(key, copy));
        }
        return res;
      }).catch(() => {
        const path = new URL(req.url).pathname;
        const key = path.indexOf('guide') >= 0 ? './guide.html' : './index.html';
        return caches.match(key).then((h) => h || caches.match('./index.html') || caches.match('./'));
      })
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok && new URL(req.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
