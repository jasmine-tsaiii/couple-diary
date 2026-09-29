// 點進烏雲時刻：一開始就是烏雲的顏色，不會先閃一下粉紅色（雲端讀資料比較慢時也一樣）
const { chromium } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1');
    window.__log = [];
    const tick = () => { const a = document.getElementById('app'); if (a) { const s = `${a.className}|${((a.querySelector('h1') || {}).textContent || '').slice(0, 8)}`; if (window.__log[window.__log.length - 1] !== s) window.__log.push(s); } requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(U + '#/login'); await p.waitForSelector('#email');
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn');
  await p.waitForSelector('#role-owner', { timeout: 15000 }); await p.click('#role-owner'); await p.waitForTimeout(500);
  await p.goto(U + '#/new/cloud'); await p.waitForSelector('#f-title'); await p.fill('#f-title', '遲到'); await p.click('#save'); await p.waitForSelector('#done', { timeout: 8000 });
  await p.goto(U + '#/'); await p.waitForTimeout(800);
  // 模擬雲端慢：讀「對方上鎖的紀錄」延遲 800ms
  await p.evaluate(() => { const o = CloudDB.othersLocked; CloudDB.othersLocked = async (...a) => { await new Promise((r) => setTimeout(r, 800)); return o.apply(CloudDB, a); }; });
  const run = async (sel) => {
    await p.evaluate(() => { window.__log = []; });
    await p.click(sel); await p.waitForSelector('#app a[href^="#/view/"]', { timeout: 8000 }); await p.waitForTimeout(300);
    const l = await p.evaluate(() => window.__log);
    return l.slice(1); // 第一格是點之前的首頁
  };
  const log1 = await run('.tab[href="#/list/cloud"]');
  console.log('tab: cloud color from the first frame', log1.length > 0 && log1.every((x) => x.startsWith('theme-cloud')), JSON.stringify(log1));
  console.log('shows cloud title while loading', log1.some((x) => x === 'theme-cloud|烏雲時刻'));
  await p.goto(U + '#/'); await p.waitForSelector('.home-head'); await p.waitForTimeout(800);
  await p.evaluate(() => { const o = CloudDB.othersLocked; CloudDB.othersLocked = async (...a) => { await new Promise((r) => setTimeout(r, 800)); return o.apply(CloudDB, a); }; });
  const log2 = await run('#app a.ftile[href="#/list/cloud"], #app a[href="#/list/cloud"]');
  console.log('home tile: cloud color from the first frame', log2.every((x) => x.startsWith('theme-cloud')), JSON.stringify(log2));
  // 列表 → 那則紀錄：也是一開始就是烏雲色
  await p.evaluate(() => { window.__log = []; });
  await p.locator('#app a[href^="#/view/"]').first().click({ timeout: 8000 }); await p.waitForTimeout(800);
  const log3 = await p.evaluate(() => window.__log);
  console.log('record page keeps cloud color', log3.every((x) => x.startsWith('theme-cloud')), JSON.stringify(log3));
  console.log('errors', errs); await b.close();
})();
