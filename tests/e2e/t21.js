const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { new MutationObserver(() => document.querySelectorAll('.celebrate:not(:has(#pw-yes))').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const log = (...a) => console.log(...a);
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(800); if (await p.locator('#role-owner').count()) { await p.click('#role-owner'); await p.waitForTimeout(600); }
  await p.evaluate(() => { const S = JSON.parse(localStorage.mockServer); for (let i = 0; i < 29; i++) S.files[`owner-jas/old${i}.jpg`] = 'data:image/jpeg;base64,AAAA'; localStorage.mockServer = JSON.stringify(S); });
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  log('settings quota', await p.isVisible('text=雲端照片：29 / 30 張（免費帳號，兩個人共用）'));
  await p.goto(U + '#/new/happy'); await p.waitForTimeout(500);
  await p.fill('#f-title', '照片額度'); await p.setInputFiles('#f-photos', ['big.jpg', 'big.jpg']); await p.waitForTimeout(1000);
  log('only 1 added', await p.$$eval('[data-rm-photo]', (e) => e.length), await p.textContent('#toast'));
  await p.setInputFiles('#f-photos', ['big.jpg']); await p.waitForTimeout(700);
  log('paywall', await p.isVisible('text=放更多照片是付費功能'));
  await p.click('#pw-yes'); await p.waitForTimeout(400);
  log('interest', await p.evaluate(() => JSON.parse(localStorage.mockServer).interest));
  await p.click('#save'); await p.waitForTimeout(1000);
  log('saved with thumb', await p.evaluate(() => Object.keys(JSON.parse(localStorage.mockServer).files).filter((k) => k.includes('/t/')).length));
  log('direct upload over quota blocked', await p.evaluate(async () => { const c = document.createElement('canvas'); const bl = await new Promise((r) => c.toBlob(r, 'image/jpeg')); try { await CloudDB.putPhoto({ id: 'sneak', blob: bl }); return 'no!'; } catch (e) { return e.message; } }));
  log('orphan thumb blocked', await p.evaluate(async () => { const c = document.createElement('canvas'); const bl = await new Promise((r) => c.toBlob(r, 'image/jpeg')); try { await CloudDB.putThumb('ghost', bl); return 'no!'; } catch (e) { return e.message; } }));
  // plus
  await p.evaluate(() => { const S = JSON.parse(localStorage.mockServer); S.plans = { 'owner-jas': 'plus' }; localStorage.mockServer = JSON.stringify(S); });
  await p.goto(U + '#/settings'); await p.reload(); await p.waitForTimeout(700);
  log('plus', await p.isVisible('text=雲端照片：30 張（不限張數）'));
  console.log('errors', errs); await b.close();
})();
