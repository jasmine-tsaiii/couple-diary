// 數據看板：管理員在設定頁看到入口、看板有數字和 30 天折線圖；一般帳號看不到入口，直接開網址也被擋
const { chromium } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const errs = [];
  async function login(scheme, admin) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
    await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1'); });
    await ctx.route('**/gsi/client*', (r) => r.abort());
    await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(U + '#/login'); await p.waitForSelector('#email');
    await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn');
    await p.waitForSelector('#role-owner', { timeout: 15000 }); await p.click('#role-owner'); await p.waitForTimeout(500);
    if (admin) await p.evaluate(() => { const S = JSON.parse(localStorage.getItem('mockServer')); S.admins = Object.keys(S.users); localStorage.setItem('mockServer', JSON.stringify(S)); });
    return p;
  }
  const n = await login('light', false);
  await n.goto(U + '#/settings'); await n.waitForTimeout(1200);
  console.log('normal user no entry', await n.locator('#admin-card:not([hidden])').count() === 0);
  await n.goto(U + '#/stats'); await n.waitForTimeout(800);
  console.log('normal user blocked', ((await n.textContent('#app')) || '').includes('只有管理員看得到'));
  const p = await login('dark', true);
  await p.goto(U + '#/settings'); await p.waitForSelector('#admin-card:not([hidden])', { timeout: 8000 });
  console.log('admin sees entry', true);
  await p.click('#admin-card'); await p.waitForSelector('.stat-tile.hero');
  console.log('hero number', (await p.textContent('.stat-tile.hero .stat-num')) === '5');
  console.log('eight charts', await p.locator('.stat-chart').count() === 8);
  console.log('deletions tile', (await p.textContent('.stat-grid')).includes('刪帳號總數'));
  console.log('weekly rows', await p.locator('.stat-table tbody tr').count() === 12);
  const box = await p.locator('.stat-chart svg').first().boundingBox();
  await p.mouse.move(box.x + box.width - 3, box.y + box.height / 2); await p.waitForTimeout(200);
  console.log('hover tip', /\d+\/\d+：\d+/.test((await p.textContent('.stat-chart .stat-tip')) || ''));
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/stats-dark.png', fullPage: true });
  console.log('errors', errs); await b.close();
})();
