// build: 1.0.1
const CACHE = 'iran-civ-v1.0.1';
const ASSETS = [
  './', './index.html', './version.json', './manifest.webmanifest',
  './css/style.css',
  './js/version.js', './js/paths.js', './js/data.js', './js/app.js',
  './fonts/Vazirmatn-Regular.woff2', './fonts/Vazirmatn-Bold.woff2',
  './icons/icon-192.png', './icons/icon-512.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
