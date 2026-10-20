/**
 * ARGONIA: Crown of the Spire — Service Worker
 * Offline-ready caching for app shell, Vite hashed bundles, and 27 3D GLB models.
 */

const CACHE_VERSION = 'argonia-pwa-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const CORE_RELATIVE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon.svg',
];

const MODEL_FILES = [
  'hero_arthuria.glb',
  'hero_kaelen.glb',
  'hero_sylvanis.glb',
  'hero_vespera.glb',
  'boss_kragasha.glb',
  'boss_borealis.glb',
  'boss_akhen_ra.glb',
  'boss_ignis_valkor.glb',
  'boss_malakor.glb',
  'bldg_citadel.glb',
  'bldg_gold_mine.glb',
  'bldg_windmill.glb',
  'bldg_argon_refinery.glb',
  'bldg_archer_tower.glb',
  'bldg_arcane_obelisk.glb',
  'bldg_flame_mortar.glb',
  'bldg_frost_spire.glb',
  'bldg_barracks.glb',
  'bldg_stone_wall.glb',
  'enemy_infantry.glb',
  'enemy_beast.glb',
  'enemy_golem.glb',
  'enemy_flier.glb',
  'troop_swordsman.glb',
  'troop_paladin.glb',
  'troop_valkyrie.glb',
  'prop_portal.glb',
];

function resolveScopeUrl(relPath) {
  const base = self.registration?.scope || self.location.href;
  return new URL(relPath, base).href;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const coreUrls = CORE_RELATIVE_URLS.map(resolveScopeUrl);
      await Promise.allSettled(
        coreUrls.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
        )
      );

      // Warm cache with 3D GLB models in background without blocking install if any fail
      const modelUrls = MODEL_FILES.map((file) => resolveScopeUrl(`./models/${file}`));
      await Promise.allSettled(
        modelUrls.map((url) => cache.add(url).catch(() => null))
      );

      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('argonia-pwa-') && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Ignore Vite HMR / dev websocket requests
  if (url.pathname.includes('/@vite') || url.pathname.includes('/__vite') || url.searchParams.has('t')) {
    return;
  }

  // 1. Navigation requests: Network-first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResp = await fetch(request);
          if (networkResp && networkResp.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(resolveScopeUrl('./index.html'), networkResp.clone());
          }
          return networkResp;
        } catch {
          const cachedIndex =
            (await caches.match(request)) ||
            (await caches.match(resolveScopeUrl('./index.html'))) ||
            (await caches.match(resolveScopeUrl('./')));
          if (cachedIndex) return cachedIndex;
          throw new Error('Offline and no cached index page available');
        }
      })()
    );
    return;
  }

  // 2. 3D Models (.glb), Icons (.png, .svg), and hashed build assets (/assets/*): Cache-first, fallback to network
  const isImmutableAsset =
    url.pathname.endsWith('.glb') ||
    url.pathname.includes('/assets/') ||
    url.pathname.includes('/icons/') ||
    url.pathname.endsWith('.woff2');

  if (isImmutableAsset) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const resp = await fetch(request);
          if (resp && resp.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, resp.clone());
          }
          return resp;
        } catch {
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // 3. Other GET requests (JS/CSS in dev, web fonts, manifest): Stale-While-Revalidate
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      const fetchPromise = fetch(request)
        .then(async (resp) => {
          if (resp && (resp.ok || resp.type === 'opaque')) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, resp.clone());
          }
          return resp;
        })
        .catch(() => null);

      return cached || (await fetchPromise) || Response.error();
    })()
  );
});
