const CACHE_NAME = 'sonamu-pwa-v105';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './dashboard-charts.js',
  './manifest.json',
  './src/js/01_kakao_optimization.js',
  './src/js/02_env_version.js',
  './src/js/03_init_utils.js',
  './src/js/04_scope_adjust.js',
  './src/js/05_mileage_engine.js',
  './src/js/06_common_ui_utils.js',
  './src/js/07_firebase_init.js',
  './src/js/08_auth_logic.js',
  './src/js/09_navigation_sync.js',
  './src/js/10_dashboard_logic.js',
  './src/js/11_vote_logic.js',
  './src/js/12_team_mgmt.js',
  './src/js/13_finance_logic.js',
  './src/js/14_member_mgmt.js',
  './src/js/15_board_logic.js',
  './src/js/16_gallery_report.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Network First strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache the latest version if successful
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch((err) => {
        // Fallback to cache if offline
        return caches.match(event.request);
      })
  );
});
