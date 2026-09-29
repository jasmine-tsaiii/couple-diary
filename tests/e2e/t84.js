// 另一半在自己的設定頁改名字：主人那邊的「伴侶的名字」也跟著改；主人改伴侶名字，另一半看到的也跟著改
const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const as = async (uid) => { await p.evaluate((u) => { if (u) sessionStorage.setItem('mockUid', u); else sessionStorage.removeItem('mockUid'); }, uid); await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(1000); };
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  await p.click('#role-owner'); await p.waitForTimeout(600);
  const owner = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();
  await as(null); await p.goto(U + '#/join'); await p.waitForTimeout(600);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(1500);
  const pid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await as(owner); await p.click('[data-home-approve]'); await p.waitForTimeout(700);
  // 另一半改名字
  await as(pid); await p.goto(U + '#/settings'); await p.waitForSelector('#p-name');
  log('partner name field', (await p.inputValue('#p-name')) === '小明');
  await p.fill('#p-name', '阿明'); await p.click('#p-save-name'); await p.waitForTimeout(700);
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/partner-rename.png' });
  await p.goto(U + '#/'); await p.waitForTimeout(700);
  log('partner home shows new name', (await p.textContent('#app')).includes('阿明'));
  const n1 = await p.evaluate((o) => { const S = JSON.parse(localStorage.getItem('mockServer')); const st = S.t.settings.find((x) => x.owner === o && x.key === 'names'); return st && st.value.partner; }, owner);
  log('owner partner name synced', n1 === '阿明');
  // 主人改伴侶的名字 → 另一半看到的也改
  await as(owner); await p.goto(U + '#/settings'); await p.waitForSelector('#set-partner');
  log('owner settings shows new name', (await p.inputValue('#set-partner')) === '阿明');
  await p.fill('#set-partner', '明明'); await p.click('#save-names'); await p.waitForTimeout(700);
  await as(pid); await p.goto(U + '#/settings'); await p.waitForSelector('#p-name');
  log('partner sees owner rename', (await p.inputValue('#p-name')) === '明明');
  log('errors', errs); await b.close();
})();
