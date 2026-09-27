const { chromium, devices } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: devices['iPhone 13'].userAgent });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1'); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept()); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  await p.fill('#s-name', 'Jasmine'); await p.click('#s-pass'); await p.keyboard.type('123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();
  await p.screenshot({ path: 'r22-share-owner.png', fullPage: true });
  // 另一半：新的分頁、沒登入，點邀請連結
  await p.evaluate(async () => { sessionStorage.removeItem('mockUid'); await LocalDB.setSetting('hasAccount', false); });
  await p.goto(U + '#/settings'); await p.reload(); await p.waitForTimeout(500);
  await p.goto(U + '#/join/' + code); await p.reload(); await p.waitForTimeout(900);
  log('url', p.url(), (await p.textContent('#app')).slice(0, 80));
  log('join page', await p.isVisible('#join-form'), 'code prefilled', await p.inputValue('#j-code'));
  await p.click('#j-pass'); await p.keyboard.type('123456'); await p.fill('#j-name', '小明');
  await p.screenshot({ path: 'r23-join.png' });
  await p.click('#join-btn'); await p.waitForTimeout(1500);
  log('after join url', p.url(), 'msg', await p.textContent('#join-msg').catch(() => '(no msg el)'));
  log('body', (await p.textContent('#app')).slice(0, 120));
  console.log('errors', errs); await b.close();
})();
