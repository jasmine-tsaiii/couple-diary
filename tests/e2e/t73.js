// 吵架議題：點橫向捲到最右邊的分類（例如「時間分配」），標籤列和整頁都不要跳回去
const { chromium } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1'); new MutationObserver(() => document.querySelectorAll('.tour-dlg').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(U + '#/fights'); await p.waitForSelector('.chips.scroll [data-cat]');
  const last = p.locator('.chips.scroll [data-cat]').last();
  const name = await last.textContent();
  await last.scrollIntoViewIfNeeded();
  const before = await p.evaluate(() => ({ left: document.querySelector('.chips.scroll').scrollLeft, y: window.scrollY }));
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/fights-before.png' });
  await last.tap(); await p.waitForTimeout(500);
  const after = await p.evaluate(() => {
    const row = document.querySelector('.chips.scroll'); const on = row.querySelector('.chip.on');
    const r = row.getBoundingClientRect(); const c = on.getBoundingClientRect();
    return { left: row.scrollLeft, y: window.scrollY, on: on.textContent, visible: c.left >= r.left - 1 && c.right <= r.right + 1 };
  });
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/fights-after.png' });
  console.log('row was scrolled', before.left > 0);
  console.log('picked last category', after.on === name, name);
  console.log('row kept its place', after.left > 0 && after.visible);
  console.log('page did not jump', Math.abs(after.y - before.y) < 2);
  // 再點「全部分類」：左邊的也看得到
  await p.locator('.chips.scroll [data-cat=""]').tap(); await p.waitForTimeout(500);
  console.log('all visible again', await p.evaluate(() => { const row = document.querySelector('.chips.scroll'); const on = row.querySelector('.chip.on'); return on.getBoundingClientRect().left >= row.getBoundingClientRect().left - 1; }));
  console.log('errors', errs); await b.close();
})();
