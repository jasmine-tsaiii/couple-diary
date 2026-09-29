// 設定頁的通知卡片：iPhone 寬度、深色模式，「開啟中」按鈕不會被擠成直排；通知卡一開始就在，不會晚一點才冒出來把下面擠亂
const { chromium } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 3, colorScheme: 'dark' });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1'); new MutationObserver(() => document.querySelectorAll('.tour-dlg').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(U + '#/login'); await p.waitForSelector('#email');
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn');
  await p.waitForSelector('#role-owner', { timeout: 15000 }); await p.click('#role-owner'); await p.waitForTimeout(500);
  await p.goto(U + '#/settings'); await p.waitForSelector('#notify-card');
  const early = await p.evaluate(() => !document.getElementById('notify-card').hidden);
  console.log('card there from the start', early);
  await p.waitForSelector('#notify-email:not([disabled])');
  const m = await p.evaluate(() => {
    const btn = document.getElementById('notify-email').getBoundingClientRect();
    const cs = getComputedStyle(document.getElementById('notify-email'));
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
    const cards = [...document.querySelectorAll('#app > .card')].map((c) => c.getBoundingClientRect()).filter((r) => r.height > 0);
    let overlap = false; for (let i = 1; i < cards.length; i++) if (cards[i].top < cards[i - 1].bottom - 1) overlap = true;
    const lo = document.getElementById('logout'); const lr = lo.getBoundingClientRect(); const card = lo.closest('.card').getBoundingClientRect();
    return { oneLine: btn.height < lh * 2 + 20, wide: btn.width > 60, overlap, logoutInside: lr.top >= card.top && lr.bottom <= card.bottom };
  });
  console.log('button one line', m.oneLine && m.wide);
  console.log('cards do not overlap', !m.overlap);
  console.log('logout inside its card', m.logoutInside);
  const y = await p.evaluate(() => document.getElementById('logout').closest('.card').getBoundingClientRect().top + scrollY - 20);
  await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(200);
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/settings-notify.png' });
  console.log('errors', errs); await b.close();
})();
