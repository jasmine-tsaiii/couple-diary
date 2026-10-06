const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const run = async (gaId, anyHost = true) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
    await ctx.route('**/js/config.js', async (r) => { const res = await r.fetch(); let body = await res.text(); body = body.replace(/GA_MEASUREMENT_ID: '[^']*'/, `GA_MEASUREMENT_ID: '${gaId}'${anyHost ? ', GA_ANY_HOST: true' : ''}`); r.fulfill({ contentType: 'text/javascript', body }); });
    const gtm = [];
    await ctx.route('https://www.googletagmanager.com/**', (r) => { gtm.push(r.request().url()); r.fulfill({ contentType: 'text/javascript', body: '' }); });
    await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); window.__noCelebrate = 1; });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
    p.on('console', (m) => { if (m.type() === 'error' && /Content Security/.test(m.text())) errs.push(m.text()); });
    return { ctx, p, gtm };
  };
  // 有 ID 但不是正式網址（測試、自動化瀏覽器）：不載入 Google，免得測試灌爆 GA 的使用者數
  let { ctx, p, gtm } = await run('G-TEST12345', false);
  await p.goto(U + '#/'); await p.waitForTimeout(800);
  log('test host: no gtm', gtm.length === 0, 'no dataLayer', await p.evaluate(() => !window.dataLayer));
  await ctx.close();
  // 沒有 ID：不載入 Google
  ({ ctx, p, gtm } = await run(''));
  await p.goto(U + '#/'); await p.waitForTimeout(800);
  log('no id: gtm loaded', gtm.length, 'dataLayer', await p.evaluate(() => !!window.dataLayer));
  await p.goto(U + '#/settings'); await p.waitForTimeout(500);
  log('no id: toggle hidden', !(await p.isVisible('#analytics-toggle')));
  await ctx.close();
  // 有 ID
  ({ ctx, p, gtm } = await run('G-TEST12345'));
  await p.goto(U + '?utm_source=instagram&code=SECRETCODE#/'); await p.waitForTimeout(800);
  // 網址帶 code 會被當成從確認信回來，先關掉提示
  if (await p.isVisible('#link-dlg-ok')) await p.click('#link-dlg-ok');
  log('gtm loaded', gtm.length, gtm[0]);
  await p.click('.quick-btn.theme-happy'); await p.waitForTimeout(400);
  await p.fill('#f-title', 'SECRET_TITLE 小明'); await p.click('#save'); await p.waitForTimeout(1200);
  const id = p.url().split('/').pop();
  await p.goto(U + '#/join/ABCDEFGH'); await p.waitForTimeout(500);
  await p.goto(U + '#/settings'); await p.waitForTimeout(500);
  const dl = await p.evaluate(() => JSON.stringify(window.dataLayer));
  log('events', await p.evaluate(() => window.dataLayer.filter((a) => a[0] === 'event').map((a) => a[1] + (a[2].page_path ? ':' + a[2].page_path : '') + (a[2].type ? ':' + a[2].type : '')).join(', ')));
  log('leak title?', dl.includes('SECRET_TITLE') || dl.includes('小明'), 'leak id?', dl.includes(id), 'leak code?', dl.includes('SECRETCODE') || dl.includes('ABCDEFGH'), 'utm kept', dl.includes('utm_source=instagram'));
  log('toggle visible', await p.isVisible('#analytics-toggle'), await p.textContent('#analytics-toggle'));
  await p.evaluate(() => document.querySelectorAll('.celebrate').forEach((e) => e.remove()));
  await p.click('#analytics-toggle'); await p.waitForTimeout(200);
  const n = await p.evaluate(() => window.dataLayer.length);
  await p.goto(U + '#/list/happy'); await p.waitForTimeout(500);
  log('off: no new events', (await p.evaluate(() => window.dataLayer.length)) === n, 'flag', await p.evaluate(() => localStorage.getItem('analyticsOff')));
  await p.reload(); await p.waitForTimeout(600);
  log('off after reload: gtag not loaded', await p.evaluate(() => !window.dataLayer));
  console.log('errors', errs); await b.close();
})();
