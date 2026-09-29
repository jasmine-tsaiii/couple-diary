// 改名字：舊紀錄的「誰寫的」、願望清單「誰加的」都跟著新名字；改「你的名字」會同步到分享給對方看的名字
// 放到主畫面：這個帳號從主畫面打開過，在瀏覽器就不再跳提醒
const { chromium, devices } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: devices['iPhone 13'].userAgent });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('signupNudgeShown', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate:not(.a2hs-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(U + '#/login'); await p.waitForSelector('#email');
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn');
  await p.waitForSelector('#role-owner', { timeout: 15000 }); await p.click('#role-owner'); await p.waitForTimeout(500);
  // 這個帳號從主畫面打開過（記在帳號上）
  await p.evaluate(async () => { await DB.setSetting('usesHomeApp', Date.now()); await DB.setSetting('names', { me: '公主', partner: '馬鈴薯' }); await DB.setSetting('backupSnoozeAt', Date.now()); });
  await p.reload(); await p.waitForTimeout(800);
  await p.goto(U + '#/new/happy'); await p.waitForSelector('#f-title'); await p.fill('#f-title', '早餐'); await p.click('#save'); await p.waitForSelector('#done', { timeout: 8000 });
  await p.waitForTimeout(2000);
  console.log('no a2hs popup after using home app', !(await p.isVisible('.a2hs-dlg')));
  const rid = await p.evaluate(() => location.hash.split('/')[2]);
  await p.goto(U + '#/'); await p.waitForSelector('.home-head'); await p.waitForTimeout(500);
  console.log('no a2hs home card', !(await p.locator('#a2hs-card').count()));
  // 把這則改成對方寫的（舊名字存在紀錄上）
  await p.evaluate((rid) => { const S = JSON.parse(localStorage.getItem('mockServer')); const r = S.t.records.find((x) => x.id === rid); r.author = 'pp'; r.data.author = 'pp'; r.data.authorName = '舊名字'; localStorage.setItem('mockServer', JSON.stringify(S)); }, rid);
  // 設定頁改伴侶的名字、自己的名字
  await p.goto(U + '#/settings'); await p.reload(); await p.waitForSelector('#set-partner');
  await p.fill('#set-partner', '小薯'); await p.fill('#set-me', '女王'); await p.click('#save-names'); await p.waitForTimeout(600);
  await p.goto(U + `#/view/${rid}`); await p.reload(); await p.waitForSelector('.topbar'); await p.waitForTimeout(500);
  const txt = await p.textContent('#app');
  console.log('record shows new partner name', txt.includes('小薯') && !txt.includes('舊名字'));
  const share = await p.evaluate(() => { const S = JSON.parse(localStorage.getItem('mockServer')); return (S.t.shares || []).map((x) => x.owner_name); });
  console.log('share name synced (if shared)', share.length === 0 || share.every((n) => n === '女王'));
  // 以前存的 true（沒有時間）或 30 天以上沒從主畫面打開 → 恢復提醒
  await p.evaluate(async () => { await DB.setSetting('usesHomeApp', true); localStorage.removeItem('a2hsShown'); localStorage.removeItem('a2hsCardHiddenAt'); });
  await p.goto(U + '#/new/happy'); await p.reload(); await p.waitForSelector('#f-title'); await p.fill('#f-title', '晚餐'); await p.click('#save'); await p.waitForSelector('#done', { timeout: 8000 });
  await p.waitForSelector('.a2hs-dlg', { timeout: 6000 }).catch(() => {});
  console.log('old flag no longer blocks popup', await p.isVisible('.a2hs-dlg'));
  console.log('errors', errs); await b.close();
})();
