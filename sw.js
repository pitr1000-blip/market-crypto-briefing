// 캐시 전략: HTML(내비게이션)은 반드시 네트워크 우선 — 캐시 우선으로 만들면
// 데이터가 매일 갱신돼도 어제 화면이 그대로 보이는 문제가 생긴다.
// 아이콘 등 실제로 안 변하는 정적 자산만 캐시 우선으로 서빙한다.
const STATIC_CACHE = "static-v1";
const STATIC_ASSETS = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // HTML 페이지(navigate 요청): 네트워크 우선, 실패 시에만 캐시 폴백
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/index.html")))
    );
    return;
  }

  // 정적 자산(아이콘 등): 캐시 우선, 없으면 네트워크
  if (STATIC_ASSETS.some((asset) => req.url.endsWith(asset))) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
    return;
  }

  // 그 외 요청은 그대로 네트워크로
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
