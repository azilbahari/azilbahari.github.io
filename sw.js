// Service worker: network-first for HTML (fresh pages, cached copy offline), cache-first for static assets.
var V = 'azil-20261027190512';
var CORE = ['offline.html'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function put(req, res) {
  if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) { var copy = res.clone(); caches.open(V).then(function (c) { c.put(req, copy); }); }
  return res;
}
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  if (r.mode === 'navigate' || (r.headers.get('accept') || '').indexOf('text/html') > -1) {
    e.respondWith(fetch(r).then(function (res) { return put(r, res); }).catch(function () {
      return caches.match(r).then(function (hit) { return hit || caches.match('offline.html'); });
    }));
    return;
  }
  var u = new URL(r.url);
  // shortcut: only same-origin and Google Fonts assets are cached; other third-party requests go straight to network
  if (u.origin !== location.origin && !/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) return;
  e.respondWith(caches.match(r).then(function (hit) { return hit || fetch(r).then(function (res) { return put(r, res); }); }));
});
