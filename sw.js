const CACHE_NAME = 'sonamu-pwa-v107';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './dashboard-charts.js',
  './firebase-config.js',
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
  './src/js/16_gallery_report.js',
  './src/js/17_calendar_logic.js',
  './src/js/18_member_positions.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(err => console.warn('Cache addAll warning:', err)))
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

// [초고속 전략: Stale-While-Revalidate]
// 캐시가 있으면 0.001초 만에 즉시 화면을 띄우고, 백그라운드에서 최신 버전으로 조용히 업데이트
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 외부 API나 Firebase 통신(firestore, googleapis 등)은 Service Worker가 간섭하지 않음
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      // 캐시가 있으면 캐시를 즉시 반환, 없으면 네트워크 응답 반환
      return cachedResponse || fetchPromise;
    })
  );
});
