// 等待畫面的「邀請對方來做」：分享連結直接打開那一頁；已登入就直接到，沒登入的登入完回到那一頁
const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
const SHOT = (n) => (process.env.SHOT_DIR || '.') + '/' + n;
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => {
    localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); localStorage.setItem('inviteCardHidden', '1'); window.__noCelebrate = 1;
    new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true });
    // 分享畫面換成記下內容
    navigator.share = async (d) => { sessionStorage.setItem('shared', d.text); };
  });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const as = async (uid) => { await p.evaluate((u) => { if (u) sessionStorage.setItem('mockUid', u); else sessionStorage.removeItem('mockUid'); }, uid); await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(1000); };
  const open = async (h) => { await p.goto(U + h); await p.reload(); await p.waitForSelector('.topbar, .home-head, #login-form'); await p.waitForTimeout(800); };
  const shared = () => p.evaluate(() => { const t = sessionStorage.getItem('shared'); sessionStorage.removeItem('shared'); return t || ''; });
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  await p.click('#role-owner'); await p.waitForTimeout(600);
  const owner = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();
  await as(null); await p.goto(U + '#/join'); await p.waitForTimeout(600);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(1500);
  await as(owner); await p.click('[data-home-approve]'); await p.waitForTimeout(700);

  // 價值觀地圖：做完、等對方
  await open('#/values');
  await p.click('#vm-start'); await p.waitForTimeout(300);
  for (let i = 0; i < 24; i++) { await p.click('.vm-pick[data-v="3"]'); await p.waitForTimeout(250); }
  await p.waitForTimeout(600);
  const btn = p.locator('[data-nudge="values"]');
  log('values button', await btn.count() === 1 && (await btn.textContent()).includes('邀請小明來做'));
  await p.screenshot({ path: SHOT('nudge-values.png'), fullPage: true });
  await btn.click(); await p.waitForTimeout(300);
  const t1 = await shared();
  log('values link', t1.includes('價值觀地圖') && /\?utm_source=nudge&utm_medium=share&utm_campaign=values#\/values$/.test(t1), t1);

  // 每天一題：寫好了、等對方
  await open('#/daily');
  log('daily no button before', await p.locator('[data-nudge]').count() === 0);
  await p.fill('#d-today', '想去海邊'); await p.click('#d-send'); await p.waitForTimeout(900);
  log('daily button', await p.locator('[data-nudge="daily"]').count() === 1);
  await p.click('[data-nudge="daily"]'); await p.waitForTimeout(300);
  log('daily link', (await shared()).endsWith('#/daily'));

  // 已登入的人點連結：直接到那一頁
  await open('#/values?x'.replace('?x', ''));
  log('signed in opens directly', (await p.textContent('#app')).includes('我的價值觀地圖'));

  // 登出後點連結：先登入，登入後回到價值觀地圖
  await p.evaluate(async () => { await CloudDB.signOut(); });
  await p.goto(U + '?utm_source=nudge#/values'); await p.reload(); await p.waitForSelector('#login-form'); await p.waitForTimeout(500);
  log('asks login', await p.locator('#login-form').count() === 1);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1500);
  log('back to values after login', p.url().endsWith('#/values') && (await p.textContent('#app')).includes('我的價值觀地圖'), p.url());
  // 平常登入不會被帶走
  await p.evaluate(async () => { await CloudDB.signOut(); });
  await p.goto(U + '#/login'); await p.reload(); await p.waitForSelector('#login-form'); await p.waitForTimeout(400);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1500);
  log('normal login goes home', /#\/$/.test(p.url()), p.url());

  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
