const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/fonts|ERR_/.test(m.text())) errs.push(m.text()); });
  await p.goto((process.env.U || 'http://localhost:8770/') + '#/signup'); await p.waitForTimeout(700);
  console.log('signup legal', (await p.textContent('.legal-links')).includes('註冊就代表你同意'));
  await p.goto((process.env.U || 'http://localhost:8770/') + '#/settings'); await p.waitForTimeout(700);
  console.log('settings legal', await p.locator('.legal-card a[href="privacy.html"]').count() > 0);
  await p.goto((process.env.U || 'http://localhost:8770/') + 'privacy.html'); await p.waitForTimeout(500);
  console.log('privacy h1', await p.textContent('h1'));
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/privacy.png' });
  await p.goto((process.env.U || 'http://localhost:8770/') + 'terms.html'); await p.waitForTimeout(500);
  console.log('terms h1', await p.textContent('h1'));
  console.log('errors', errs); await b.close();
})();
