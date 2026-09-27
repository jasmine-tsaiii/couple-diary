const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.celebrate:not(.danger-dlg):not(.wish-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  await p.click('#role-owner'); await p.waitForTimeout(600);
  // 一則有照片的紀錄
  await p.goto(U + '#/new/happy'); await p.waitForTimeout(700);
  await p.fill('#f-title', '有照片');
  await p.setInputFiles('#f-photos', 'big.jpg'); await p.waitForTimeout(1200);
  await p.click('#save'); await p.waitForTimeout(2000);
  // 放兩張沒人用的照片進雲端
  await p.evaluate(() => { const S = JSON.parse(localStorage.getItem('mockServer')); const u = sessionStorage.getItem('mockUid'); const any = Object.values(S.files)[0]; S.files[u + '/orphan1.jpg'] = any; S.files[u + '/t/orphan1.jpg'] = any; S.files[u + '/orphan2.jpg'] = any; localStorage.setItem('mockServer', JSON.stringify(S)); });
  const before = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('mockServer')).files));
  await p.goto(U + '#/settings'); await p.waitForTimeout(900);
  await p.click('#clean-photos'); await p.waitForTimeout(1200);
  console.log('confirm shows 2', (await p.textContent('.danger-dlg')).includes('2 張'));
  await p.click('#danger-ok'); await p.waitForTimeout(1200);
  const after = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('mockServer')).files));
  console.log('before', before.length, 'after', after.length, 'orphans gone', !after.some((k) => k.includes('orphan')), 'used kept', after.filter((k) => !k.includes('orphan')).length === before.filter((k) => !k.includes('orphan')).length);
  await p.goto(U + '#/'); await p.waitForTimeout(300); await p.goto(U + '#/settings'); await p.waitForTimeout(900);
  await p.click('#clean-photos'); await p.waitForTimeout(1200);
  console.log('nothing left', !(await p.isVisible('.danger-dlg')));
  console.log('errors', errs); await b.close();
})();
