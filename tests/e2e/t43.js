const { chromium, devices } = require('playwright');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a);
  const errs = [];
  for (const [name, ua] of [['ios', devices['iPhone 13'].userAgent], ['android', devices['Pixel 5'].userAgent], ['desktop', null]]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, ...(ua ? { userAgent: ua } : {}) });
    await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('signupNudgeShown', '1'); });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
    await p.goto(U + '#/new/happy'); await p.waitForTimeout(700);
    await p.fill('#f-title', '第一個'); await p.click('#save'); await p.waitForTimeout(1200);
    log(name, 'stamp first', await p.isVisible('.celebrate:not(.a2hs-dlg)'), 'a2hs hidden meanwhile', !(await p.isVisible('.a2hs-dlg')));
    await p.click('#cel-ok').catch(() => {}); await p.waitForTimeout(1000);
    log(name, 'a2hs', await p.isVisible('.a2hs-dlg'), (await p.textContent('.a2hs-steps').catch(() => '')).slice(0, 40));
    if (name === 'ios') await p.screenshot({ path: 'r19-a2hs-ios.png' });
    if (await p.isVisible('.a2hs-dlg')) { await p.click('#a2hs-ok'); }
    await p.goto(U + '#/new/happy'); await p.waitForTimeout(600);
    await p.fill('#f-title', '第二個'); await p.click('#save'); await p.waitForTimeout(1800);
    log(name, 'not again soon', !(await p.isVisible('.a2hs-dlg')));
    await ctx.close();
  }
  console.log('errors', errs); await b.close();
})();
