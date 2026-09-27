const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const log = (...a) => console.log(...a);
  const fb = () => p.evaluate(() => (JSON.parse(localStorage.getItem('mockState') || localStorage.getItem('mock2') || '{}').t || {}).feedback);
  // 訪客
  await p.goto(U + '#/'); await p.waitForTimeout(500);
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  log('settings card', await p.isVisible('a[href="#/feedback"]'));
  await p.click('a[href="#/feedback"]'); await p.waitForTimeout(400);
  await p.click('[data-fbkind="建議"]'); await p.fill('#fb-msg', '希望可以換主題顏色');
  await p.screenshot({ path: 'fb1.png' });
  await p.goto(U + '#/'); await p.goto(U + '#/feedback'); await p.waitForTimeout(400);
  log('draft kept', await p.inputValue('#fb-msg'));
  await p.click('[data-fbkind="建議"]'); await p.fill('#fb-contact', 'ig: jas'); await p.click('#fb-send'); await p.waitForTimeout(700);
  log('thanks', await p.isVisible('text=謝謝你！已經收到了'));
  log('stored', JSON.stringify(await p.evaluate(() => JSON.parse(localStorage.mockServer).t.feedback)), 'draft cleared', await p.evaluate(() => localStorage.getItem('fbDraft')));
  console.log('errors', errs); await b.close();
})();
