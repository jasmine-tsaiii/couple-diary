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
  'js/app/quiz.js',
  'js/app/daily.js',
  'js/app/notes.js',
  'js/app/plus.js',
  'js/app/tabs.js',
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
      // no-cache：每次都跟網站確認有沒有新版（沒變就不重新下載），不會拿到瀏覽器存了 10 分鐘的舊檔
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok && res.type === 'basic') c.put(key, res.clone());
      return res;
    } catch (e) {
      const hit = (await c.match(key, { ignoreSearch: true })) || (req.mode === 'navigate' ? await c.match('index.html') : null);
      if (hit) return hit;
      throw e;
    }
  })());
});

// 手機推播：另一半有新動態時跳通知（內容由 supabase/functions/send-push 決定）
self.addEventListener('push', (ev) => {
  let d = {};
  try { d = ev.data ? ev.data.json() : {}; } catch (e) { d = { body: ev.data ? ev.data.text() : '' }; }
  ev.waitUntil(self.registration.showNotification(d.title || '啾啾日記', {
    body: typeof d.body === 'string' ? d.body : '另一半有新的動態',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: d.tag || 'jiujiu',
    renotify: true,
    data: { url: d.url || './' },
  }));
});

// 點通知：App 已經開著就切過去那一頁，沒開就打開
self.addEventListener('notificationclick', (ev) => {
  ev.notification.close();
  const url = new URL((ev.notification.data && ev.notification.data.url) || './', self.location.href).href;
  ev.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const w = wins.find((c) => new URL(c.url).origin === self.location.origin);
    if (w) { await w.focus(); try { await w.navigate(url); } catch (e) { w.postMessage({ type: 'go', url }); } return; }
    await self.clients.openWindow(url);
  })());
});
