const { chromium } = require('playwright');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1'); new MutationObserver(() => document.querySelectorAll('.celebrate').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(U); await p.waitForTimeout(500);
  await p.evaluate(async () => { for (let i = 0; i < 25; i++) await DB.putRecord({ id: 'r' + i, type: 'happy', no: i + 1, title: '第 ' + i, date: '2026-09-' + String(1 + (i % 27)).padStart(2, '0'), visibility: 'shared', emojis: [], tags: [], photoIds: [], description: '', createdAt: i, updatedAt: i }); });
  await p.goto(U + '#/list/happy'); await p.reload(); await p.waitForTimeout(900);
  log('hidden at top', !(await p.isVisible('.to-top')));
  await p.evaluate(() => window.scrollTo(0, 2000)); await p.waitForTimeout(300);
  log('shown after scroll', await p.isVisible('.to-top'), await p.evaluate(() => scrollY));
  await p.screenshot({ path: 'r21-to-top.png' });
  await p.click('.to-top'); await p.waitForTimeout(900);
  log('at top', await p.evaluate(() => scrollY));
  await p.goto(U + '#/view/r3'); await p.waitForTimeout(700);
  const hasBack = await p.isVisible('.topbar .icon-btn[aria-label="返回"]');
  await p.evaluate(() => {
    const mk = (type, x) => { const t = new Touch({ identifier: 1, target: document.body, clientX: x, clientY: 400 }); document.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true })); };
    mk('touchstart', 10); mk('touchend', 200);
  });
  await p.waitForTimeout(700);
  log('swipe back from view', hasBack, p.url());
  console.log('errors', errs); await b.close();
})();
