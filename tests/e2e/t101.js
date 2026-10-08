// 手機推播開關（設定 → 通知）
// 1. Android／電腦：按「開啟」→ 問通知權限 → 這支手機的推播資料存上雲端；再按一次關掉、刪掉
// 2. iPhone 用 Safari 開（沒加到主畫面）：按鈕變「怎麼加」，打開加到主畫面的教學
// 3. 用分享碼加入的另一半（臨時帳號）也看得到手機通知，但沒有 Email 開關
const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
const fakePush = () => {
  localStorage.setItem('swTest', '1');
  const mk = () => ({ endpoint: 'https://push.example/abc', toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'P', auth: 'A' } }; }, async unsubscribe() { localStorage.removeItem('fakePush'); return true; } });
  if (window.PushManager) {
    PushManager.prototype.subscribe = async function () { localStorage.setItem('fakePush', '1'); return mk(); };
    PushManager.prototype.getSubscription = async function () { return localStorage.getItem('fakePush') ? mk() : null; };
  }
  if (window.Notification) Notification.requestPermission = async () => 'granted';
};
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const route = (ctx) => ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const init = () => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); localStorage.setItem('inviteCardHidden', '1'); new MutationObserver(() => document.querySelectorAll('.tour-dlg').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await route(ctx); await ctx.addInitScript(init); await ctx.addInitScript(fakePush);
  await ctx.grantPermissions(['notifications'], { origin: new URL(U).origin });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const as = async (uid, hash = '#/') => { await p.evaluate((u) => { if (u) sessionStorage.setItem('mockUid', u); else sessionStorage.removeItem('mockUid'); }, uid); await p.goto(U + hash); await p.reload(); await p.waitForTimeout(1000); };
  const pushes = () => p.evaluate(() => (JSON.parse(localStorage.mockServer).push || []).length);
  await p.goto(U + '#/signup'); await p.waitForTimeout(600);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  await p.click('#role-owner'); await p.waitForTimeout(600);
  const owner = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await as(owner, '#/settings/notify'); await p.waitForTimeout(800);
  log('push row shown', await p.isVisible('#notify-push') && await p.isEnabled('#notify-push') && (await p.textContent('#notify-push')).trim() === '開啟');
  log('email row still there', await p.isVisible('#notify-email'));
  await p.click('#notify-push'); await p.waitForTimeout(800);
  log('push on', (await p.getAttribute('#notify-push', 'aria-pressed')) === 'true' && await pushes() === 1);
  await as(owner, '#/settings/notify'); await p.waitForTimeout(800);
  log('push stays on after reload', (await p.getAttribute('#notify-push', 'aria-pressed')) === 'true');
  await p.click('#notify-push'); await p.waitForTimeout(800);
  log('push off saved', (await p.getAttribute('#notify-push', 'aria-pressed')) === 'false' && await pushes() === 0);
  // 另一半（分享碼加入）
  await as(owner, '#/settings'); await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();
  await as(null); await p.goto(U + '#/join/' + code); await p.waitForTimeout(700);
  await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(1500);
  const pid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await as(owner); await p.click('[data-home-approve]'); await p.waitForTimeout(800);
  await as(pid, '#/settings/notify'); await p.waitForTimeout(800);
  log('partner sees push row', await p.isVisible('#notify-push') && !(await p.isVisible('#notify-email')));
  await p.click('#notify-push'); await p.waitForTimeout(800);
  log('partner push on', await pushes() === 1);
  await ctx.close();
  // 打開 App 主動問（還沒決定過通知權限）：按「開啟通知」就存好；按過就不再問
  const and = await b.newContext({ viewport: { width: 390, height: 844 } });
  await route(and); await and.addInitScript(init); await and.addInitScript(fakePush);
  // 無頭瀏覽器的通知權限一開始是 denied；真的手機是 default（還沒問過）
  await and.addInitScript(() => { let perm = localStorage.getItem('fakePerm') || 'default'; Object.defineProperty(Notification, 'permission', { get: () => perm }); Notification.requestPermission = async () => { perm = 'granted'; localStorage.setItem('fakePerm', perm); return perm; }; });
  const r = await and.newPage(); r.on('pageerror', (e) => errs.push(e.message));
  await r.goto(U + '#/signup'); await r.waitForTimeout(600);
  await r.fill('#email', 'and@x.com'); await r.fill('#password', 'secret123'); await r.click('#login-btn'); await r.waitForTimeout(1200);
  await r.click('#role-owner'); await r.waitForTimeout(600);
  await r.goto(U + '#/'); await r.reload(); await r.waitForTimeout(2500);
  log('no ask before partner joins', !(await r.isVisible('.push-ask')));
  const ras = async (uid, hash = '#/') => { await r.evaluate((u) => { if (u) sessionStorage.setItem('mockUid', u); else sessionStorage.removeItem('mockUid'); }, uid); await r.goto(U + hash); await r.reload(); await r.waitForTimeout(1000); };
  const ow = await r.evaluate(() => sessionStorage.getItem('mockUid'));
  await ras(ow, '#/settings'); await r.fill('#s-name', 'Jasmine'); await r.fill('#s-pass', '123456'); await r.click('#s-create'); await r.waitForTimeout(800);
  const code2 = (await r.textContent('.share-code')).trim();
  await ras(null); await r.goto(U + '#/join/' + code2); await r.waitForTimeout(700);
  await r.fill('#j-pass', '123456'); await r.fill('#j-name', '小明'); await r.click('#join-btn'); await r.waitForTimeout(1500);
  await ras(ow); await r.click('[data-home-approve]'); await r.waitForTimeout(800);
  await r.reload(); await r.waitForTimeout(2500);
  log('asks on open', await r.isVisible('.push-ask') && (await r.textContent('.push-ask')).includes('晚上 11 點'));
  await r.screenshot({ path: (process.env.SHOT_DIR || '.') + '/push-ask.png' });
  await r.click('#push-ask-ok'); await r.waitForTimeout(800);
  log('ask turns push on', !(await r.isVisible('.push-ask')) && await r.evaluate(() => (JSON.parse(localStorage.mockServer).push || []).length) >= 1);
  await r.reload(); await r.waitForTimeout(2500);
  log('not asked again', !(await r.isVisible('.push-ask')));
  await and.close();
  // iPhone Safari（沒加到主畫面）
  const ios = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', hasTouch: true });
  await route(ios); await ios.addInitScript(init);
  const q = await ios.newPage(); q.on('pageerror', (e) => errs.push(e.message));
  await q.goto(U + '#/signup'); await q.waitForTimeout(600);
  await q.fill('#email', 'ios@x.com'); await q.fill('#password', 'secret123'); await q.click('#login-btn'); await q.waitForTimeout(1200);
  await q.click('#role-owner'); await q.waitForTimeout(600);
  await q.goto(U + '#/settings/notify'); await q.reload(); await q.waitForTimeout(1000);
  log('iphone not asked on open', !(await q.isVisible('.push-ask')));
  log('iphone asks to add to home', (await q.textContent('#notify-push')).trim() === '怎麼加' && (await q.textContent('#push-sub')).includes('主畫面'));
  await q.click('#notify-push'); await q.waitForTimeout(500);
  log('a2hs guide opens', await q.isVisible('.a2hs-dlg'));
  await q.screenshot({ path: (process.env.SHOT_DIR || '.') + '/push-ios.png' });
  log('errors', JSON.stringify(errs));
  await b.close();
})();
