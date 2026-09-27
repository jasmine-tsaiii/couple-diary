const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const log = (...a) => console.log(...a);
  await p.goto(U + '#/'); await p.waitForTimeout(700);
  log('names card', await p.isVisible('text=先認識一下你們'));
  await p.fill('#n-me', 'Jasmine'); await p.fill('#n-partner', '小明'); await p.click('#n-save'); await p.waitForTimeout(500);
  log('title', await p.textContent('h1'));
  await p.screenshot({ path: 'n1-home.png' });
  await p.goto(U + '#/new/fight'); await p.waitForTimeout(500);
  log('fight labels', await p.textContent('label[for=f-my]'), await p.textContent('label[for=f-their]'));
  log('maxlengths', await p.getAttribute('#f-title', 'maxlength'), await p.getAttribute('#f-reason', 'maxlength'));
  // 10 tags then 11th blocked
  for (let i = 0; i < 11; i++) { await p.fill('#f-tag', 't' + i); await p.press('#f-tag', 'Enter'); await p.waitForTimeout(80); }
  log('tags selected', await p.$$eval('[data-tag].on', (e) => e.length), 'toast', await p.textContent('#toast'));
  // photos: 10 files → only 9
  const img = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 20; c.height = 20; c.getContext('2d').fillRect(0, 0, 20, 20); return c.toDataURL('image/png'); });
  const files = []; for (let i = 0; i < 10; i++) { const f = `ph${i}.png`; fs.writeFileSync(f, Buffer.from(img.split(',')[1], 'base64')); files.push(f); }
  await p.setInputFiles('#f-photos', files); await p.waitForTimeout(1500);
  log('photos', await p.$$eval('.photo img', (e) => e.length));
  await p.fill('#f-title', '測試'); await p.fill('#f-my', 'A'); await p.click('#save'); await p.waitForTimeout(800);
  log('detail labels', await p.isVisible('text=Jasmine的想法'));
  // login → names migrated
  await p.goto(U + '#/login'); await p.waitForTimeout(400);
  await p.fill('#email', 'j@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1500);
  log('cloud names', await p.evaluate(() => JSON.parse(localStorage.getItem('mockServer')).t.settings.find((s) => s.key === 'names')?.value));
  log('cloud title', await p.textContent('h1'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  log('share name default', await p.inputValue('#s-name'));
  log('errors', errs); await b.close();
})();
