const { chromium } = require('playwright');
const fs = require('fs');
const U = process.argv[2];
(async () => {
  const b = await chromium.launch(require('/home/claude/couple-diary/tests/e2e/_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1');
    window.__log = []; const tick = () => { const a = document.getElementById('app'); if (a) { const h = (a.querySelector('h1') || {}).textContent || ''; const s = a.className + '|' + h.slice(0, 12) + '|' + getComputedStyle(a).getPropertyValue('--accent').trim(); if (window.__log[window.__log.length - 1] !== s) window.__log.push(s); } requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  const p = await ctx.newPage();
  for (const [from, sel] of [['#/', 'a.ftile[href="#/list/cloud"], a[href="#/list/cloud"]'], ['#/', '.tab[href="#/list/cloud"]'], ['#/list/cloud', null]]) {
    await p.goto(U + from); await p.waitForTimeout(1200);
    await p.evaluate(() => { window.__log = []; });
    if (sel) await p.click(sel); else await p.goto(U + '#/new/cloud');
    await p.waitForTimeout(1200);
    console.log(from, sel, JSON.stringify(await p.evaluate(() => window.__log)));
  }
  await b.close();
})();
