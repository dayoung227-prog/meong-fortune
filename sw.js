// 오늘의 멍운세 서비스워커: 한 번 열어본 뒤에는 인터넷 없이도 열리게 저장해둠
// 앱 파일을 바꿀 때 VERSION 숫자를 올리면 옛 저장분이 정리돼요.
const VERSION = "meong-v11";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./favicon-32.png",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./model/model.json",
  "./model/metadata.json",
  "./model/weights.bin"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 화면(HTML)은 항상 최신 먼저, 인터넷이 없으면 저장본
  if (req.mode === "navigate" || (url.origin === location.origin && url.pathname.endsWith(".html"))) {
    e.respondWith(
      fetch(req, { cache: "no-cache" }) // 브라우저 저장본(최대 10분)을 건너뛰고 서버에 최신본 확인
        .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // 나머지(모델·아이콘·글꼴·TensorFlow 라이브러리)는 저장본 먼저, 없으면 받아서 저장
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
