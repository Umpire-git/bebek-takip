// Çevrimdışı çalışma: uygulama kabuğunu önbelleğe alır. Sürüm değişince CACHE adını artırın.
const CACHE = 'pitir-v2';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'js/app.js', 'js/store.js', 'js/util.js', 'js/ui.js', 'js/types.js', 'js/calc.js', 'js/insights.js', 'js/ai.js', 'js/entry.js', 'js/sound.js', 'js/icons.js', 'js/predict.js',
  'js/data/health.js', 'js/data/development.js', 'js/data/nutrition.js',
  'js/views/home.js', 'js/views/log.js', 'js/views/hub.js', 'js/views/stats.js', 'js/views/assistant.js', 'js/views/settings.js', 'js/views/mod-health.js', 'js/views/mod-dev.js', 'js/views/mod-food.js'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
// Önce ağ (güncel sürüm), ağ yoksa önbellek
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
});
