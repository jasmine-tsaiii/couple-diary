const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto((process.env.U || 'http://localhost:8770/') + '#/new/happy'); await p.waitForTimeout(900);
  await p.fill('#f-date', '2025-02-14'); await p.waitForTimeout(200);
  const r = await p.evaluate(() => { const a = document.getElementById('f-date').getBoundingClientRect(), t = document.getElementById('f-title').getBoundingClientRect(); return [a.width, a.height, t.width, t.height]; });
  console.log('date vs title', r, 'same', r[0] === r[2] && r[1] === r[3], 'body scroll', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await p.locator('#f-date').scrollIntoViewIfNeeded(); await p.screenshot({ path: '/tmp/claude-0/-home-claude/14e9371e-a65b-5ec6-890a-1d116d5adbfe/scratchpad/date.png' });
  console.log('errors', errs); await b.close();
})();
