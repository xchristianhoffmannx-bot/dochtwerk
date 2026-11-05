// Cache-first, alles läuft offline.
// WICHTIG: CACHE_VERSION bei JEDER Änderung an ausgelieferten Dateien hochzählen,
// sonst zeigen installierte Kopien die alte Version. Neue Dateien auch in FILES eintragen.
const CACHE_VERSION = 'dochtwerk-1';

const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'css/tokens.css', 'css/base.css', 'css/components.css',
  'icons/sprite.svg', 'icons/app-192.png', 'icons/app-512.png', 'icons/app-maskable-512.png',
  'js/main.js', 'js/router.js', 'js/texts.js',
  'js/ui/components.js', 'js/ui/icons.js', 'js/ui/screens/start.js', 'js/ui/screens/stub.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(FILES)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).catch(() =>
      e.request.mode === 'navigate' ? caches.match('index.html') : Response.error())),
  );
});
