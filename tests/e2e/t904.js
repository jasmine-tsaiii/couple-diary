const pw = require('playwright');
const U = process.env.U;
(async () => {
  const b = await pw.chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ ...pw.devices['Pixel 7'] });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1'); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(U + '#/list/happy'); await p.waitForTimeout(800);
  await p.goto(U + '#/new/happy'); await p.waitForTimeout(800);
  await p.fill('#f-title', '第一則'); await p.click('#save'); await p.waitForTimeout(1500);
  console.log('after save url', p.url().split('#')[1], 'dialog', await p.$$eval('.celebrate', (e) => e.map((x) => x.className + ':' + (x.querySelector('h2') || {}).textContent)));
  await p.goBack(); await p.waitForTimeout(800);
  console.log('after back url', p.url().split('#')[1], 'dialog still', await p.$$eval('.celebrate', (e) => e.length));
  console.log('form title after back', await p.inputValue('#f-title').catch(() => 'none'));
  await p.screenshot({ path: `${process.env.SHOT}/qa4-back.png` });
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
