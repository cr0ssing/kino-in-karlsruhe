/**
 * Copyright (C) 2024 Robin Lamberti.
 * 
 * This file is part of kino-in-karlsruhe.
 * 
 * kino-in-karlsruhe is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * kino-in-karlsruhe is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with kino-in-karlsruhe. If not, see <http://www.gnu.org/licenses/>.
 */

// Service worker template. pwa/build.ts fills in VERSION and PRECACHE after
// `next build` and writes the result to public/sw.js.
const VERSION = "__PWA_VERSION__";
const PRECACHE = "__PWA_PRECACHE__";
const PREFIX = "kino-in-karlsruhe-";
const CACHE = PREFIX + VERSION;
const PRECACHED = new Set(PRECACHE);

// Next.js names everything under /_next/static/ by its content or build ID,
// so a file an older version already cached can be copied instead of
// downloaded again.
function precache(cache, url) {
  const cached = url.startsWith("/_next/static/") ? caches.match(url) : Promise.resolve(undefined);
  return cached
    .then((hit) => hit ?? fetch(new Request(url, { cache: "reload" })).then((response) => {
      if (!response.ok) throw new Error(`Precaching ${url} failed: ${response.status}`);
      return response;
    }))
    .then((response) => cache.put(url, response));
}

// The first visit loads before the worker controls it, so the start page is
// cached up front for offline use. Failing to do so does not block the update.
function startPage(cache) {
  return fetch("/").then((response) => response.ok ? cache.put("/", response) : undefined).catch(() => undefined);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all([...PRECACHE.map((url) => precache(cache, url)), startPage(cache)]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  // Keep the previous version as well: a page loaded before this update may
  // still load its own chunks until it reloads.
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        const older = keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE);
        return Promise.all(older.slice(0, -1).map((key) => caches.delete(key)));
      })
      .then(() => self.clients.claim()),
  );
});

// Pages are rendered with the latest screenings, so they always come from the
// network. The last copy of each one is kept for when the device is offline.
function page(request) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone();
        void caches.open(CACHE).then((cache) => cache.put(request.url, copy));
      }
      return response;
    })
    .catch(() => caches.match(request.url, { cacheName: CACHE, ignoreVary: true })
      .then((hit) => hit ?? caches.match(request.url, { ignoreVary: true }))
      // Another week of the same page is better than nothing.
      .then((hit) => hit ?? caches.match(request.url, { ignoreSearch: true, ignoreVary: true }))
      .then((hit) => hit ?? Response.error()));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(page(request));
    return;
  }
  // The API and React Server Component payloads are live data: straight to
  // the network.
  if (!PRECACHED.has(url.pathname)) return;
  event.respondWith(caches.match(url.pathname, { ignoreVary: true }).then((hit) => hit ?? fetch(request)));
});
