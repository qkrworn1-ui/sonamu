const CACHE_NAME = 'sonamu-pwa-v161';
const ASSETS = [
  './',
  './index.html?v=161',
  './style.css?v=161',
  './dashboard-charts.js?v=161',
  './firebase-config.js?v=161',
  './manifest.json',
  './assets/images/hero_login.jpg',
  './src/js/01_kakao_optimization.js?v=161',
  './src/js/02_env_version.js?v=161',
  './src/js/03_init_utils.js?v=161',
  './src/js/04_scope_adjust.js?v=161',
  './src/js/05_mileage_engine.js?v=161',
  './src/js/06_common_ui_utils.js?v=161',
  './src/js/07_firebase_init.js?v=161',
  './src/js/08_auth_logic.js?v=161',
  './src/js/09_navigation_sync.js?v=161',
  './src/js/10_dashboard_logic.js?v=161',
  './src/js/11_vote_logic.js?v=161',
  './src/js/12_team_mgmt.js?v=161',
  './src/js/13_finance_logic.js?v=161',
  './src/js/14_member_mgmt.js?v=161',
  './src/js/15_board_logic.js?v=161',
  './src/js/16_gallery_report.js?v=161',
  './src/js/17_calendar_logic.js?v=161',
  './src/js/18_member_positions.js?v=161'
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

// [네트워크 우선 전략 (Network-First)]
// 온라인 상태일 때는 항상 서버에서 최신 코드를 즉각 받아와 즉시 화면에 반영합니다.
// 오프라인 상태일 때만 캐시된 파일로 안전하게 폴백합니다.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 외부 API나 Firebase 통신(firestore, googleapis 등)은 Service Worker가 간섭하지 않음
  if (url.origin !== self.location.origin) {
    return;
  }

  // HTML 페이지 탐색 요청은 절대로 브라우저 디스크 캐시를 타지 않고 항상 최신 상태를 네트워크에서 가져옴
  if (event.request.mode === 'navigate' || event.request.destination === 'document' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' }).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request) || caches.match('./') || caches.match('./index.html?v=161');
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});
