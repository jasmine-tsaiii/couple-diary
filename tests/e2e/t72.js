// #27 iPhone Safari 試用寫第 1 則就提醒；#28 LINE 裡小卡改長按存、備份先說存不了；#29 設密碼框有 input 樣式
const { chromium } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const LINE = IPHONE.replace('Safari/604.1', 'Safari Line/14.10.0');
async function page(b, ua) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: ua });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1'); new MutationObserver(() => document.querySelectorAll('.tour-dlg').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const p = await ctx.newPage();
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
  p.dialogs = []; p.on('dialog', (d) => { p.dialogs.push(d.message()); d.accept(); });
  return p;
}
async function addOne(p, title) {
  await p.goto(U + '#/new/happy'); await p.waitForSelector('#f-title');
  await p.fill('#f-title', title); await p.click('#save'); await p.waitForTimeout(900);
  await p.evaluate(() => document.querySelectorAll('.celebrate:not(.signup-dlg)').forEach((e) => e.remove()));
}
(async () => {
  const b = await chromium.launch(require('./_launch'));
  // #27
  const s = await page(b, IPHONE);
  await s.goto(U + '#/'); await s.waitForTimeout(600);
  await addOne(s, '第一則');
  await s.waitForSelector('.signup-dlg', { timeout: 8000 }).catch(() => {});
  console.log('iphone nudge after 1st', ((await s.textContent('body')) || '').includes('超過 7 天沒打開'));
  await s.evaluate(() => document.querySelectorAll('.signup-dlg').forEach((e) => e.remove()));
  await s.goto(U + '#/'); await s.waitForTimeout(600);
  console.log('iphone home note', ((await s.textContent('body')) || '').includes('超過 7 天沒打開'));
  // #28
  const l = await page(b, LINE);
  await l.goto(U + '#/'); await l.waitForTimeout(600);
  await addOne(l, '小卡這則');
  const id = await l.evaluate(() => location.hash.split('/')[2]);
  let downloads = 0; l.on('download', () => { downloads++; });
  await l.goto(U + `#/card/record/${id}`); await l.waitForSelector('#card-img[src]', { timeout: 10000 });
  console.log('in-app notice on card page', ((await l.textContent('body')) || '').includes('請改用 Safari 或 Chrome 打開'));
  await l.click('#card-share'); await l.waitForSelector('.longpress-save img', { timeout: 8000 });
  console.log('long-press overlay, no download', downloads === 0 && !((await l.textContent('body')) || '').includes('已下載圖片'));
  await l.click('#longpress-close');
  await l.goto(U + '#/settings'); await l.waitForSelector('#export');
  await l.click('#export'); await l.waitForTimeout(500);
  console.log('export blocked with message', downloads === 0 && l.dialogs.some((m) => m.includes('沒辦法存備份檔')));
  // #29
  const g = await page(b, IPHONE);
  await g.goto(U + '#/login'); await g.waitForSelector('#email');
  await g.evaluate(() => localStorage.setItem('mockGoogleOnly', '1'));
  console.log('set-password has input class', fs.readFileSync(require('path').join(__dirname, '../../js/app/settings.js'), 'utf8').includes('<input type="password" class="input" autocomplete="new-password" placeholder="設定一組密碼'));
  console.log('errors', [...s.errs, ...l.errs, ...g.errs]); await b.close();
})();
