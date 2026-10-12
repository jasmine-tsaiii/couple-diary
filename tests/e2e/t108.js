// 每天一題補寫：寫好的人看到「等對方補寫」；最近 7 天兩人都沒寫的「錯過的題目」誰都能補，一樣兩人寫完才揭曉；超過 7 天不能補
const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
const SHOT = (n) => (process.env.SHOT_DIR || '.') + '/' + n;
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); localStorage.setItem('inviteCardHidden', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const as = async (uid) => { await p.evaluate((u) => { if (u) sessionStorage.setItem('mockUid', u); else sessionStorage.removeItem('mockUid'); }, uid); await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(1000); };
  const open = async (h) => { await p.goto(U + h); await p.reload(); await p.waitForSelector('.topbar, .home-head'); await p.waitForTimeout(800); };
  const mutate = (fn) => p.evaluate((f) => { const S = JSON.parse(localStorage.getItem('mockServer')); new Function('S', f)(S); localStorage.setItem('mockServer', JSON.stringify(S)); }, fn);
  const text = () => p.textContent('#app');
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  await p.click('#role-owner'); await p.waitForTimeout(600);
  const owner = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  // 還沒有另一半
  await open('#/daily');
  log('no partner yet', (await text()).includes('另一半加入之後就能一起寫'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();
  await as(null); await p.goto(U + '#/join'); await p.waitForTimeout(600);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(1500);
  const pid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await as(owner); await p.click('[data-home-approve]'); await p.waitForTimeout(700);
  const day = (k) => new Date(Date.now() + 8 * 3600e3 + k * 864e5).toISOString().slice(0, 10);
  // 第 0 天開始配對；主人第 0 天寫了，另一半沒寫；第 1、2 天兩人都沒寫；第 10 天回來看
  await open('#/daily');
  await p.fill('#d-today', '主人第一天'); await p.click('#d-send'); await p.waitForTimeout(800);
  await mutate(`S.dailyToday = '${day(3)}';`);
  await open('#/daily');
  let t = await text();
  log('owner sees waiting section', t.includes('等小明補寫') && await p.locator(`[data-waiting-card="${day(0)}"]`).count() === 1);
  await p.click(`[data-waiting-card="${day(0)}"] summary`); await p.waitForTimeout(200);
  log('owner sees own answer in waiting', (await p.textContent(`[data-waiting-card="${day(0)}"]`)).includes('主人第一天'));
  log('waiting nudge button', await p.locator('[data-nudge="daily_late"]').count() === 1);
  log('missed days 1 and 2', await p.locator(`[data-missed-card="${day(1)}"]`).count() === 1 && await p.locator(`[data-missed-card="${day(2)}"]`).count() === 1 && await p.locator(`[data-missed-card="${day(0)}"]`).count() === 0);
  await p.screenshot({ path: SHOT('daily-catchup-owner.png'), fullPage: true });
  // 主人補寫第 1 天
  await p.click(`[data-missed-card="${day(1)}"] summary`); await p.waitForTimeout(200);
  const q1 = await p.getAttribute(`[data-missed-card="${day(1)}"] [data-late]`, 'data-q');
  await p.fill(`#d-late-${day(1)}`, '主人補第二天'); await p.click(`[data-missed-card="${day(1)}"] [data-late]`); await p.waitForTimeout(900);
  log('missed day moves to waiting', await p.locator(`[data-missed-card="${day(1)}"]`).count() === 0 && await p.locator(`[data-waiting-card="${day(1)}"]`).count() === 1);
  // 另一半：第 0、1 天在「等你寫」，第 2 天在「錯過的題目」，題目一樣
  await as(pid); await open('#/daily');
  t = await text();
  log('partner pending has day0 and day1', await p.locator(`[data-late-card="${day(0)}"]`).count() === 1 && await p.locator(`[data-late-card="${day(1)}"]`).count() === 1);
  log('same question on catch-up day', (await p.getAttribute(`[data-late="${day(1)}"]`, 'data-q')) === q1);
  log('partner missed day2 only', await p.locator(`[data-missed-card="${day(2)}"]`).count() === 1 && await p.locator(`[data-missed-card="${day(1)}"]`).count() === 0);
  log('partner cannot see owner answer', !t.includes('主人補第二天'));
  await p.screenshot({ path: SHOT('daily-catchup-partner.png'), fullPage: true });
  await p.fill(`#d-late-${day(1)}`, '小明補第二天'); await p.click(`[data-late="${day(1)}"]`); await p.waitForTimeout(900);
  t = await text();
  log('revealed in history', t.includes('以前的題目') && await p.locator(`[data-late-card="${day(1)}"]`).count() === 0);
  await p.click('.daily-past:not(.daily-missed):not(.daily-waiting) summary'); await p.waitForTimeout(200);
  log('history shows both answers', (await text()).includes('主人補第二天') && (await text()).includes('小明補第二天'));
  // 超過 7 天：第 2 天不再出現，伺服器也擋
  await mutate(`S.dailyToday = '${day(10)}';`);
  await open('#/daily');
  log('older than 7 days not shown', await p.locator(`[data-missed-card="${day(2)}"]`).count() === 0 && await p.locator(`[data-missed-card="${day(3)}"]`).count() === 1);
  const blocked = await p.evaluate(async (d) => { try { await CloudDB.dailySave(d, 'd001', 'x'); return ''; } catch (e) { return e.message; } }, day(2));
  log('server blocks >7 days', blocked.includes('7 天'));
  log('errors', errs); await b.close();
})();
