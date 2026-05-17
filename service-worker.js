const CACHE_NAME = "loui-game-v4";

const PRECACHE = [
  "./index.html",
  "./apple_game.html",
  "./manifest.json",
  "./icon.png",
  "./clear-pop.png",
];

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

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // HTML은 네트워크 우선 — 배포 후 모바일에도 최신본이 보이도록
  if (isHtmlRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match("./apple_game.html"))
        )
    );
    return;
  }

  // 이미지·매니페스트 등은 캐시 우선
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
