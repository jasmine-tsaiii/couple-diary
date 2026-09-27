const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => localStorage.setItem('mockAutoApprove', '1'));
  await ctx.addInitScript(() => { window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.celebrate:not(.wish-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const log = (...a) => console.log(...a);
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  log('manifest', await p.evaluate(async () => (await (await fetch(document.querySelector('link[rel=manifest]').href)).json()).icons.length));
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(600);
  if (await p.isVisible('#role-owner')) { await p.click('#role-owner'); await p.waitForTimeout(500); }
  // 新增有照片的紀錄
  const big = await p.evaluate(async () => { const c = document.createElement('canvas'); c.width = 1600; c.height = 1200; const g = c.getContext('2d'); g.fillStyle = 'teal'; g.fillRect(0, 0, 1600, 1200); return c.toDataURL('image/jpeg'); });
  fs.writeFileSync('big.jpg', Buffer.from(big.split(',')[1], 'base64'));
  await p.goto(U + '#/new/happy'); await p.waitForTimeout(500);
  await p.fill('#f-title', '有照片'); await p.setInputFiles('#f-photos', 'big.jpg'); await p.waitForTimeout(800);
  await p.click('#save'); await p.waitForTimeout(1000);
  const id = p.url().split('/').pop();
  const files = await p.evaluate(() => Object.entries(JSON.parse(localStorage.mockServer).files).map(([k, v]) => [k, v.length]));
  log('files', files);
  log('no edited label yet', !(await p.isVisible('text=編輯過')));
  await p.goto(U + '#/edit/' + id); await p.waitForTimeout(500); await p.click('#save'); await p.waitForTimeout(700);
  log('save without change -> no label', !(await p.isVisible('text=編輯過')));
  await p.goto(U + '#/edit/' + id); await p.waitForTimeout(500); await p.fill('#f-title', '有照片（改）'); await p.click('#save'); await p.waitForTimeout(700);
  log('edited label', await p.isVisible('text=編輯過'));
  // 刪掉小圖 → 列表會補
  await p.evaluate(() => { const S = JSON.parse(localStorage.mockServer); for (const k of Object.keys(S.files)) if (k.includes('/t/')) delete S.files[k]; localStorage.mockServer = JSON.stringify(S); });
  await p.goto(U + '#/list/happy'); await p.reload(); await p.waitForTimeout(1200);
  log('thumb backfilled', await p.evaluate(() => Object.keys(JSON.parse(localStorage.mockServer).files).some((k) => k.includes('/t/'))));
  // 任務紀錄 + 伴侶 + 通過 → 剛解鎖
  await p.evaluate(async () => { await DB.putRecord({ id: 'tk', no: 9, type: 'happy', title: '任務', date: '2026-09-02', visibility: 'task', task: { text: '抱抱', mode: 'confirm' }, photoIds: [], emojis: [], tags: [], createdAt: 1, updatedAt: 1 }); });
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(600);
  const code = (await p.textContent('.share-code')).trim();
  await p.evaluate(() => sessionStorage.removeItem('mockUid')); await p.goto(U + '#/login'); await p.reload(); await p.waitForTimeout(500);
  await p.click('text=我是另一半，用分享碼加入'); await p.waitForTimeout(300);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(700);
  const anon = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await p.goto(U + '#/list/happy'); await p.waitForTimeout(900);
  log('partner tile img', await p.$$eval('.tile-img', (e) => e.length));
  await p.goto(U + '#/tasks'); await p.waitForTimeout(600);
  await p.evaluate(async () => { await CloudDB.submitTask('tk', '好', null); });
  await p.evaluate(() => sessionStorage.setItem('mockUid', 'owner-jas')); await p.goto(U + '#/view/tk'); await p.reload(); await p.waitForTimeout(800);
  await p.click('[data-approve]'); await p.waitForTimeout(700);
  await p.evaluate((a) => sessionStorage.setItem('mockUid', a), anon); await p.goto(U + '#/list/happy'); await p.reload(); await p.waitForTimeout(900);
  log('just unlocked', await p.isVisible('text=剛解鎖！'));
  await p.goto(U + '#/view/' + id); await p.waitForTimeout(600);
  log('partner sees edited', await p.isVisible('text=編輯過'));
  await p.screenshot({ path: 'j1.png', fullPage: true });
  console.log('errors', errs); await b.close();
})();
