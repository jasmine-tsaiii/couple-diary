// 啾啾日記的 service worker：沒網路時也能打開 App。
// 網頁本身（HTML、CSS、JS、圖示）一律「先上網拿最新的，拿不到才用手機裡存的」，
// 所以有網路時永遠是最新版，不會卡在舊版本。
// 改了快取的規則才需要把 VERSION 加一，舊的快取會在新版啟用時清掉。
const VERSION = 'v2';
const SHELL = `shell-${VERSION}`;
const FONTS = `fonts-${VERSION}`;
const PRECACHE = [
  './',
  'index.html',
  'css/style.css',
  'js/config.js',
  'js/analytics.js',
  'js/db-local.js',
  'js/db-cloud.js',
  'js/google.js',
  'js/mascot.js',
  'js/cards.js',
  'js/app/core.js',
  'js/app/extras.js',
  'js/app/home.js',
  'js/app/record.js',
  'js/app/settings.js',
  'js/app/partner.js',
  'js/app/auth.js',
  'js/app/stats.js',
  'js/app/main.js',
  'vendor/supabase-2.117.2.js',
  'manifest.json',
  'icons/icon.svg',
  'icons/icon-180.png',
  'icons/icon-192.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== FONTS).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Google 字型：先用存的，背景再更新（字型檔不會變）
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    ev.respondWith(caches.open(FONTS).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // 其他網站（雲端資料庫、分析）不經過這裡；行銷圖片資料夾 m/ 也不存
  if (url.origin !== self.location.origin || url.pathname.includes('/m/')) return;
  // 首頁不管網址後面帶什麼（?code=、#/...）都存成同一份 index.html
  const isHome = req.mode === 'navigate' && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));
  const key = isHome ? 'index.html' : req;
  ev.respondWith((async () => {
    const c = await caches.open(SHELL);
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') c.put(key, res.clone());
      return res;
    } catch (e) {
      const hit = (await c.match(key, { ignoreSearch: true })) || (req.mode === 'navigate' ? await c.match('index.html') : null);
      if (hit) return hit;
      throw e;
    }
  })());
});
