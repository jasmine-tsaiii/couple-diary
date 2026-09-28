const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(U + '#/'); await p.waitForTimeout(800);
  log('home first', await p.isVisible('.quick-rec'), 'no login', !(await p.isVisible('#login-btn')));
  await p.click('#tile-share'); await p.waitForTimeout(500);
  log('share tile sheet', await p.textContent('.signup-dlg h2'), 'still home', p.url().endsWith('#/'));
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/share-signup-sheet.png' });
  await p.click('#nudge-later'); await p.waitForTimeout(300);
  log('sheet closed', !(await p.isVisible('.signup-dlg')));
  // iPhone 的 Safari 寫第 1 則就提醒（#27），其他寫到第 3 則
  const n = (await p.evaluate(() => IOS_SAFARI_TAB)) ? 1 : 3;
  for (let i = 1; i <= n; i++) {
    await p.click('.quick-btn.theme-happy'); await p.waitForTimeout(400);
    await p.fill('#f-title', '第' + i + '則'); await p.click('#save'); await p.waitForTimeout(900);
    const c = await p.$$('.celebrate:not(.signup-dlg) .btn'); for (const x of c) { try { await x.click(); } catch (e) {} }
    await p.waitForTimeout(900);
    log('after', i, 'nudge', await p.isVisible('.signup-dlg'));
    if (i < n) await p.goto(U + '#/');
  }
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/signup-nudge.png' });
  await p.click('#nudge-signup'); await p.waitForTimeout(700);
  log('signup page', await p.textContent('#login-btn'), await p.isVisible('.benefits-card'));
  await p.goto(U + '#/'); await p.waitForTimeout(700);
  log('guest home stays home', await p.isVisible('.quick-rec'));
  await p.reload(); await p.waitForTimeout(700);
  log('no nudge again', !(await p.isVisible('.signup-dlg')));
  console.log('errors', errs); await b.close();
})();
