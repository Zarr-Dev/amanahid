const CACHE_PREFIX = "amanah-shell-";
const CACHE_NAME = "amanah-shell-v3";
const SHELL_FILES = [
    "/",
    "/index.html",
    "/style.css",
    "/landing-refresh.css",
    "/script.js",
    "/face-engine.js",
    "/manifest.webmanifest",
    "/assets/amanah-logo.svg",
    "/assets/amanah-favicon.svg",
    "/assets/amanah-favicon.png"
];

self.addEventListener("install", event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await Promise.allSettled(SHELL_FILES.map(path => cache.add(path)));
        await self.skipWaiting();
    })());
});

self.addEventListener("activate", event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map(key => caches.delete(key)));
        await self.clients.claim();
    })());
});

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    const isSameOrigin = url.origin === self.location.origin;
    const isPinnedFaceRuntime =
        (url.hostname === "cdn.jsdelivr.net" || url.hostname === "unpkg.com") &&
        url.pathname.includes("/onnxruntime-web@1.31.1/dist/") &&
        /\.(?:js|mjs|wasm)$/.test(url.pathname);
    if (!isSameOrigin && !isPinnedFaceRuntime) return;
    if (isSameOrigin && url.pathname.startsWith("/api/")) return;

    if (request.mode === "navigate") {
        event.respondWith((async () => {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    const cache = await caches.open(CACHE_NAME);
                    cache.put("/index.html", response.clone());
                }
                return response;
            } catch {
                return (await caches.match("/index.html")) ||
                    new Response("Amanah ID offline: buka kembali aplikasi ketika koneksi tersedia.", {
                        status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
                    });
            }
        })());
        return;
    }

    if (isPinnedFaceRuntime) {
        event.respondWith((async () => {
            const cache = await caches.open("amanah-face-runtime-v1");
            try {
                const response = await fetch(request);
                if (response.ok && (response.type === "cors" || response.type === "basic")) {
                    await cache.put(request, response.clone());
                    return response;
                }
                return (await cache.match(request)) || response;
            } catch {
                return (await cache.match(request)) || new Response("", { status: 503 });
            }
        })());
        return;
    }

    if (isSameOrigin && /\.(?:css|js|svg|png|webmanifest)$/.test(url.pathname)) {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.put(request, response.clone());
                    return response;
                }
                return (await cache.match(request)) || response;
            } catch {
                return (await cache.match(request)) || new Response("", { status: 503 });
            }
        })());
    }
});
