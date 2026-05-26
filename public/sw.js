// AutoDNA — service worker
// Estratégia: stale-while-revalidate para assets estáticos do bundle (/_expo/static/*)
// e network-first para HTML (pra não servir tela antiga após deploy).
//
// Versionar BUST_KEY quando quiser invalidar o cache de todos os usuários.

const CACHE_NAME = 'autodna-v1';
const STATIC_PREFIXES = ['/_expo/static/', '/icons/', '/assets/'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  const u = new URL(url);
  if (u.origin !== self.location.origin) return false;
  return STATIC_PREFIXES.some((p) => u.pathname.startsWith(p)) ||
    /\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|eot)$/i.test(u.pathname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (isStaticAsset(req.url)) {
    // stale-while-revalidate
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        const networkPromise = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || networkPromise;
      }),
    );
    return;
  }

  // HTML: network-first, fallback cache
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req)),
    );
  }
});
