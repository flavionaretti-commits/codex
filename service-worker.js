const CACHE = "codex-v0.13.0-history";
const CORE = [
  "./",
  "./index.html",
  "./styles.css?v=120",
  "./runtime-fix.js?v=058-pigpen",
  "./app.js?v=058-pigpen",
  "./history.js?v=130",
  "./playfair.js?v=120",
  "./scytale.js?v=110",
  "./polybius.js?v=100",
  "./qrcode.js?v=090",
  "./enigma.js?v=080",
  "./ean13.js?v=070",
  "./caesar-wheel.js?v=061",
  "./pigpen-fix.js?v=060-dots",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const req = event.request;
  const url = new URL(req.url);
  const isCode =
    req.mode === "navigate" ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/runtime-fix.js") ||
    url.pathname.endsWith("/styles.css");

  if (isCode) {
    // Network first: CODEX! updates must not remain stuck on an old cached app.js.
    event.respondWith(
      fetch(req).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
        return response;
      }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(req, copy));
      return response;
    }))
  );
});
