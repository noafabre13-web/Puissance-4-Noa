/* Hors ligne : on essaie toujours le réseau d'abord (pour avoir la dernière version),
   et on se rabat sur la copie enregistrée si l'appareil n'a pas de connexion. */
const CACHE = "p4noa-v1";
const FILES = ["./", "index.html", "css/style.css", "manifest.webmanifest", "icon.svg",
  ...["config", "engine", "ai", "daily", "catalog", "progress", "payments", "ui", "game", "app"].map(f => `js/${f}.js`)];

self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
