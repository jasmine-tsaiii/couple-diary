// 首頁標題列在 iPhone 寬度：問候那行不會把「（二）」擠到第二行、標題和通知/設定按鈕同一行對齊；備份提醒可以按叉叉關掉，7 天內不再出現
const { chromium } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, colorScheme: 'dark' });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(U + '#/login'); await p.waitForSelector('#email');
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn');
  await p.waitForSelector('#role-owner', { timeout: 15000 }); await p.click('#role-owner'); await p.waitForTimeout(500);
  await p.evaluate(async () => { await DB.setSetting('names', { me: '👸', partner: '🥔', since: '2026-08-11' }); });
  await p.goto(U + '#/new/happy'); await p.waitForSelector('#f-title'); await p.fill('#f-title', '一起吃早餐');
  await p.click('#save'); await p.waitForSelector('#done', { timeout: 8000 });
  await p.goto(U + '#/'); await p.reload(); await p.waitForSelector('.home-head'); await p.waitForSelector('#bell:not([hidden])', { timeout: 8000 });
  const m = await p.evaluate(() => {
    const hello = document.querySelector('.home-head .hello'); const lh = parseFloat(getComputedStyle(hello).lineHeight) || 21;
    const t = document.querySelector('.home-head .title-xl').getBoundingClientRect();
    const bell = document.querySelector('#bell').getBoundingClientRect();
    const gear = document.querySelector('.home-head .gear-btn:not(#bell)').getBoundingClientRect();
    return { helloLines: Math.round(hello.getBoundingClientRect().height / lh), titleMid: t.top + t.height / 2, bellMid: bell.top + bell.height / 2, gearMid: gear.top + gear.height / 2, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  console.log('greeting one line', m.helloLines === 1, m.helloLines);
  console.log('icons aligned with title', Math.abs(m.titleMid - m.bellMid) < 8 && Math.abs(m.bellMid - m.gearMid) < 2, m.titleMid, m.bellMid);
  console.log('no sideways scroll', !m.overflow);
  console.log('backup card shown', await p.isVisible('#backup-card'));
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/home-head.png', clip: { x: 0, y: 0, width: 390, height: 560 } });
  await p.click('#backup-snooze'); await p.waitForTimeout(400);
  console.log('x closes card, stays on home', !(await p.locator('#backup-card').count()) && /#\/?$/.test(p.url()));
  await p.reload(); await p.waitForSelector('.home-head'); await p.waitForTimeout(500);
  console.log('still hidden after reload', !(await p.locator('#backup-card').count()));
  // 8 天後再出現
  await p.evaluate(async () => { await DB.setSetting('backupSnoozeAt', Date.now() - 8 * 86400000); });
  await p.reload(); await p.waitForSelector('.home-head'); await p.waitForTimeout(500);
  console.log('back after 7 days', await p.isVisible('#backup-card'));
  console.log('errors', errs); await b.close();
})();
