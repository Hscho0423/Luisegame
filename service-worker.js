/** 배포할 때마다 숫자를 올리세요 (apple_game.html의 APP_BUILD와 맞추면 좋음) */
const SW_BUILD = "6";

const CACHE_NAME = "loui-game-assets-" + SW_BUILD;

/** HTML은 캐시하지 않음 — 오프라인용 정적 파일만 */
const PRECACHE = ["./icon.png", "./clear-pop.png", "./manifest.json"];

function isHtmlRequest(request) {
  if (request.mode === "navigate") return true;
  try {
    const path = new URL(request.url).pathname;
    return path.endsWith(".html") || path.endsWith("/");
  } catch (_) {
    return false;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // HTML·내비게이션은 SW가 건드리지 않음 → 항상 네트워크 최신본
  if (isHtmlRequest(event.request)) return;

  // service-worker.js 본인은 항상 네트워크에서
  try {
    if (new URL(event.request.url).pathname.endsWith("service-worker.js")) return;
  } catch (_) {
    /* ignore */
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
