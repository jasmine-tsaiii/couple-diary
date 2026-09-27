// 設定頁（主人、訪客）有「隱私與條款」卡片，連到隱私權政策和使用條款
const { chromium } = require('playwright');
const U = process.env.U || 'http://localhost:8770/';
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(U + '#/settings'); await p.waitForSelector('.legal-card', { timeout: 15000 });
  console.log('privacy link', await p.locator('.legal-card a[href="privacy.html"]').count() === 1);
  console.log('terms link', await p.locator('.legal-card a[href="terms.html"]').count() === 1);
  await p.locator('.legal-card').scrollIntoViewIfNeeded();
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/settings-legal.png' });
  console.log('errors', errs); await b.close();
})();
