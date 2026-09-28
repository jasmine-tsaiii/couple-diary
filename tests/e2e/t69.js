// Google 官方登入按鈕（設定了 GOOGLE_CLIENT_ID 時）：登入頁、設定頁連結 Google 都改用官方按鈕，不用跳走
const { chromium } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
const FAKE_GSI = `window.google = { accounts: { id: {
  initialize(o) { window.__gsi = o; },
  renderButton(box, opt) { const b = document.createElement('button'); b.className = 'fake-gsi'; b.textContent = 'Google ' + opt.text; b.onclick = () => window.__gsi.callback({ credential: 'tok-' + window.__gsi.nonce.length }); box.appendChild(b); },
} } };`;
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); new MutationObserver(() => document.querySelectorAll('.tour-dlg').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.route('**/js/config.js', async (r) => { const res = await r.fetch(); const body = (await res.text()).replace(/GOOGLE_CLIENT_ID: '[^']*'/, "GOOGLE_CLIENT_ID: 'abc.apps.googleusercontent.com'"); r.fulfill({ contentType: 'text/javascript', body }); });
  await ctx.route('**/gsi/client*', (r) => r.fulfill({ contentType: 'text/javascript', body: FAKE_GSI }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); if (process.env.DBG) p.on('console', (m) => console.log('C', m.text()));
  await p.goto(U + '#/login');
  await p.waitForSelector('.fake-gsi', { timeout: 15000 });
  console.log('official button shown', await p.isVisible('.fake-gsi'));
  console.log('old button hidden', !(await p.isVisible('#google-btn')));
  console.log('nonce hashed', await p.evaluate(() => /^[0-9a-f]{64}$/.test(window.__gsi.nonce)));
  await p.click('.fake-gsi');
  await p.waitForSelector('#role-owner', { timeout: 15000 });
  console.log('signed in with google', true);
  await p.click('#role-owner'); await p.waitForTimeout(500);
  await p.goto(U + '#/settings'); await p.waitForSelector('.login-methods', { timeout: 15000 });
  console.log('google usable', await p.locator('.login-methods #link-google').count() === 0 && await p.locator('.login-methods .fake-gsi').count() === 0);
  // Email 帳號連結 Google
  await p.evaluate(() => { sessionStorage.clear(); location.hash = '#/login'; });
  await p.reload(); await p.waitForSelector('#email', { timeout: 15000 });
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn');
  await p.waitForSelector('#role-owner', { timeout: 15000 }); await p.click('#role-owner'); await p.waitForTimeout(500);
  await p.goto(U + '#/settings'); await p.waitForSelector('.login-methods .fake-gsi', { timeout: 15000 });
  console.log('link uses official button', !(await p.isVisible('#link-google')));
  await p.click('.login-methods .fake-gsi');
  await p.waitForFunction(() => document.body.textContent.includes('Google 帳號連結好了'), null, { timeout: 15000 });
  console.log('linked toast', true);
  console.log('errors', errs); await b.close();
})();
