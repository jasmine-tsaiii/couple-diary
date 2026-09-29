// 新增紀錄存好後：紀錄頁底部有「完成」回到列表；按返回不會回到剛剛的表單；小卡返回回到這則紀錄
const { chromium } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(U + '#/'); await p.waitForTimeout(600);
  await p.click('.quick-btn.theme-happy'); await p.waitForSelector('#f-title');
  await p.fill('#f-title', '我寶送我搭接駁車'); await p.fill('#f-desc', '原本以為寶貝要開車走了').catch(() => {});
  await p.click('#save'); await p.waitForSelector('#done', { timeout: 8000 });
  const id = await p.evaluate(() => location.hash.split('/')[2]);
  console.log('done button after new save', await p.isVisible('#done'));
  await p.waitForTimeout(2600); await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/after-save.png' });
  // 手機返回：回到首頁，不是空白表單
  await p.goBack(); await p.waitForTimeout(600);
  console.log('back goes home not form', !(await p.locator('#f-title').count()) && /#\/?$/.test(p.url()));
  // 再進同一則：不是剛存好，就沒有完成
  await p.goto(U + `#/view/${id}`); await p.waitForTimeout(600);
  console.log('no done on normal visit', !(await p.locator('#done').count()));
  // 編輯存好 → 完成 → 美好時刻列表
  await p.goto(U + `#/edit/${id}`); await p.waitForSelector('#f-title'); await p.fill('#f-title', '我寶送我搭接駁車！');
  await p.click('#save'); await p.waitForSelector('#done', { timeout: 8000 });
  await p.click('#done'); await p.waitForTimeout(600);
  console.log('done goes back to previous page', /#\/?$/.test(p.url()));
  // 小卡的返回回到這則紀錄
  await p.goto(U + `#/card/record/${id}`); await p.waitForSelector('.topbar .icon-btn');
  console.log('card back to record', (await p.getAttribute('.topbar .icon-btn', 'href')) === `#/view/${id}`);
  console.log('errors', errs); await b.close();
})();
