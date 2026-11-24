/* 암기 처방전 복습 알림: 인터넷 없이도 열리게 하는 서비스 워커
 * 앱 화면은 먼저 인터넷에서 새로 받아 보고(2.5초 안에), 안 되면 저장해 둔 것을 연다.
 * 달력 파일(.ics)은 건드리지 않는다.
 */
var CACHE = 'amgirx-802d431978';
var ASSETS = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-192.png", "icons/maskable-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png", "icons/favicon-64.png"];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('amgirx-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function fromCache(req) {
  return caches.open(CACHE).then(function (c) {
    return c.match(req, { ignoreSearch: true }).then(function (hit) { return hit || c.match('index.html'); });
  });
}
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/\.ics$/i.test(url.pathname)) return;
  if (req.mode === 'navigate') {
    e.respondWith(new Promise(function (resolve) {
      var done = false;
      function finish(res) { if (!done && res) { done = true; resolve(res); } }
      var timer = setTimeout(function () { fromCache(req).then(function (hit) { if (hit) finish(hit); }); }, 2500);
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put('index.html', copy); });
        }
        clearTimeout(timer);
        if (res && res.ok) finish(res);
        else fromCache(req).then(function (hit) { finish(hit || res); });
      }, function () {
        clearTimeout(timer);
        fromCache(req).then(function (hit) { finish(hit || Response.error()); });
      });
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') c.put(req, res.clone());
        return res;
      });
      return hit || net;
    });
  }));
});
