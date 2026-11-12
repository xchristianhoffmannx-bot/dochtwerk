// Cache-first, alles läuft offline.
// WICHTIG: Bei JEDER Änderung an ausgelieferten Dateien die Version hochzählen, hier UND
// APP_VERSION in js/texts.js (derselbe Wert; ein Test prüft das), sonst zeigen installierte
// Kopien die alte Version. Neue Dateien auch in FILES eintragen.
const CACHE_VERSION = 'dochtwerk-1.8.1';

const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'css/tokens.css', 'css/base.css', 'css/components.css', 'fonts/gelasio-latin.woff',
  'icons/sprite.svg', 'icons/app-192.png', 'icons/app-512.png', 'icons/app-maskable-512.png',
  'js/main.js', 'js/router.js', 'js/texts.js', 'js/store.js', 'js/materials.js',
  'js/calc-forms.js', 'js/candles.js', 'js/photos.js', 'js/core/candle.js',
  'js/core/units.js', 'js/core/pricing.js', 'js/core/glass-volume.js', 'js/core/defaults.js', 'js/core/state.js',
  'js/core/calc-cost.js', 'js/core/calc-plan.js',
  'js/ui/components.js', 'js/ui/icons.js', 'js/ui/calc-parts.js', 'js/ui/sheets.js',
  'js/ui/screens/start.js', 'js/ui/screens/export.js', 'js/ui/screens/data.js', 'js/core/backup.js', 'js/core/legacy-import.js', 'js/core/slug.js', 'js/core/export-text.js', 'js/core/zip.js', 'js/core/crc32.js','js/ui/screens/material-list.js', 'js/ui/screens/material-detail.js',
  'js/ui/screens/cost.js', 'js/ui/screens/cost-result.js', 'js/ui/screens/plan.js',
  'js/ui/screens/gallery.js', 'js/ui/screens/slideshow.js', 'js/ui/screens/candle-detail.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(// cache:'reload' umgeht den HTTP-Cache (GitHub Pages: 10 min), sonst landen beim Update alte Dateien im neuen Cache
  caches.open(CACHE_VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

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
