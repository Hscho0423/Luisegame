/** 캐시 방식을 바꿀 때만 올리세요. 게임 수정은 네트워크에서 바로 받습니다. */
const SW_BUILD = "11";

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

function shouldSkipCache(request) {
  try {
    const url = new URL(request.url);
    if (url.pathname.endsWith("service-worker.js")) return true;
    if (url.searchParams.has("t") || url.searchParams.has("v")) return true;
  } catch (_) {
    /* ignore */
  }
  return false;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (shouldSkipCache(event.request)) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(event.request, { cache: "no-store" });
      if (response && response.ok && !isHtmlRequest(event.request)) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
      }
      return response;
    } catch (_) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      throw _;
    }
  })());
});
