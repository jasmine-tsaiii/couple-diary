// 設定頁「登入方式」：Email 帳號可以連結 Google，連結完顯示兩種都能用；功能沒開時有中文說明
const { chromium } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); new MutationObserver(() => document.querySelectorAll('.tour-dlg').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(U + '#/login'); await p.waitForSelector('#email');
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn');
  await p.waitForSelector('#role-owner', { timeout: 15000 }); await p.click('#role-owner'); await p.waitForTimeout(500);
  await p.goto(U + '#/settings'); await p.waitForSelector('.login-methods', { timeout: 15000 });
  const txt = () => p.textContent('.login-methods');
  console.log('email usable', (await txt()).includes('jas@x.com'));
  console.log('link button', await p.locator('#link-google').count() === 1);
  console.log('no password form for email user', await p.locator('#set-password').count() === 0);
  // 功能沒開：中文說明
  await p.evaluate(() => localStorage.setItem('mockLinkErr', '1'));
  await p.click('#link-google'); await p.waitForTimeout(500);
  console.log('disabled msg', ((await p.textContent('body')) || '').includes('Google 連結功能還沒開好'));
  await p.evaluate(() => localStorage.removeItem('mockLinkErr'));
  // 連結成功（假的 Google 不會跳轉，重新整理代表從 Google 回來）
  await p.click('#link-google'); await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(1200);
  console.log('linked toast', ((await p.textContent('body')) || '').includes('Google 帳號連結好了'));
  await p.goto(U + '#/settings'); await p.waitForSelector('.login-methods');
  console.log('no link button after', await p.locator('#link-google').count() === 0);
  await p.locator('.login-methods').scrollIntoViewIfNeeded();
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/login-methods.png' });
  console.log('errors', errs); await b.close();
})();
