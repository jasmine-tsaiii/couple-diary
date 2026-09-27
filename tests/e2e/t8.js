const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => localStorage.setItem('mockAutoApprove', '1'));
  await ctx.addInitScript(() => { window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.celebrate:not(.wish-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const log = (...a) => console.log(...a);
  await p.goto(U + '#/'); await p.waitForTimeout(700);
  log('guest home', await p.isVisible('text=免費註冊，保存你們的紀錄'), 'add btn', !!(await p.$('.tab-add')));
  await p.screenshot({ path: 'g2-guest-home.png' });
  // 用畫面新增一則
  await p.click('.tab-add'); await p.waitForTimeout(400);
  await p.fill('#f-title', '試用的第一則'); await p.click('#save'); await p.waitForTimeout(600);
  log('saved url', p.url());
  await p.goto(U + '#/'); await p.waitForTimeout(500);
  log('guest banner w/ count', await p.isVisible('text=目前 1 則紀錄只存在這支手機。', { exact: false }));
  await p.goto(U + '#/settings'); await p.waitForTimeout(500);
  log('settings signup card', await p.isVisible('text=註冊／登入'), 'no share card', !(await p.isVisible('#share-card')));
  await p.click('text=註冊／登入'); await p.waitForTimeout(400);
  log('login has try-first', await p.isVisible('#try-first'));
  await p.fill('#email', 'amy@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  const cloud = await p.evaluate(() => JSON.parse(localStorage.getItem('mockServer')).t.records.map((r) => r.data.title));
  log('migrated to cloud', cloud);
  await p.goto(U + '#/list/happy'); await p.waitForTimeout(500);
  log('cloud list', await p.$$eval('.tile .bold', (e) => e.map((x) => x.textContent)));
  // 產生分享碼、複製連結
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  await p.fill('#s-name', 'Amy'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(600);
  const code = (await p.textContent('.share-code')).trim();
  // 登出 → 回登入畫面，而不是試用
  await p.click('#logout'); await p.waitForTimeout(700);
  log('after logout login page', await p.isVisible('#login-btn'), 'try-first hidden', !(await p.isVisible('#try-first')));
  await p.goto(U + '#/'); await p.waitForTimeout(500);
  log('home still login', await p.isVisible('#login-btn'));
  // 另一半用新瀏覽器打開連結
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx2.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx2.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const server = await p.evaluate(() => localStorage.getItem('mockServer'));
  await ctx2.addInitScript(() => localStorage.setItem('mockAutoApprove', '1'));
  await ctx2.addInitScript(() => { new MutationObserver(() => document.querySelectorAll('.celebrate:not(.wish-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const q = await ctx2.newPage(); q.on('pageerror', (e) => errs.push('p2 ' + e.message));
  await q.goto(U + 'index.html'); await q.evaluate((s) => localStorage.setItem('mockServer', s), server);
  await q.goto(U + '#/join/' + code); await q.reload(); await q.waitForTimeout(700);
  log('join prefilled', await q.inputValue('#j-code') === code);
  await q.fill('#j-pass', '123456'); await q.fill('#j-name', 'Ben'); await q.click('#join-btn'); await q.waitForTimeout(900);
  log('partner in', await q.isVisible('text=Amy的紀錄'));
  // 日期被塞 HTML：不會顯示
  log('longDate bad', await q.evaluate(() => longDate('<b>x</b>-01-01') === '' && longDate('2026-09-26').startsWith('2026')));
  log('errors', errs); await b.close();
})();
