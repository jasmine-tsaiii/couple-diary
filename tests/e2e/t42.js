const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto((process.env.U || 'http://localhost:8770/') + '#/login'); await p.waitForTimeout(900);
  console.log('title', await p.title(), 'h1', await p.textContent('h1'), 'mascot', await p.isVisible('.mascot'));
  await p.screenshot({ path: 'r18-login.png' });
  console.log('errors', errs); await b.close();
})();
