// 設定頁「登入方式」：只用 Google 登入的帳號，深色模式、iPhone 寬度下狀態字靠右對齊、密碼提示不被截斷
const { chromium } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, colorScheme: 'dark' });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1'); new MutationObserver(() => document.querySelectorAll('.tour-dlg').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(U + '#/login'); await p.waitForSelector('#email');
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn');
  await p.waitForSelector('#role-owner', { timeout: 15000 }); await p.click('#role-owner'); await p.waitForTimeout(500);
  // 改成只用 Google 登入的帳號
  await p.evaluate(() => { const S = JSON.parse(localStorage.getItem('mockServer')); for (const u of Object.values(S.users)) if (u.email === 'jas@x.com') u.identities = [{ provider: 'google' }]; localStorage.setItem('mockServer', JSON.stringify(S)); });
  await p.goto(U + '#/settings'); await p.reload(); await p.waitForSelector('#set-password', { timeout: 15000 });
  const m = await p.evaluate(() => {
    const rows = [...document.querySelectorAll('.login-method-row')].map((r) => { const [a, s] = r.children; const rr = r.getBoundingClientRect(); const sr = s.getBoundingClientRect(); return { gap: sr.left - a.getBoundingClientRect().right, rightAligned: Math.abs(sr.right - rr.right) < 2 }; });
    const inp = document.querySelector('#set-password input');
    const cs = getComputedStyle(inp);
    const c = document.createElement('canvas').getContext('2d'); c.font = `${cs.fontSize} ${cs.fontFamily}`;
    const need = c.measureText(inp.placeholder).width + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    return { rows, fits: need <= inp.clientWidth + 1, fontSize: parseFloat(cs.fontSize) };
  });
  console.log('status right aligned', m.rows.length === 2 && m.rows.every((r) => r.rightAligned && r.gap > 8));
  console.log('placeholder fits', m.fits);
  console.log('input 16px (no iPhone zoom)', m.fontSize >= 16);
  await p.locator('.login-methods').scrollIntoViewIfNeeded();
  await p.locator('.login-methods').screenshot({ path: (process.env.SHOT_DIR || '.') + '/login-methods-dark.png' });
  console.log('errors', errs); await b.close();
})();
