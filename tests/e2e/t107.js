// 每天一題晚上 9 點提醒（2026-10-12）：小鈴鐺的文字和連結。另一半寫了就說是誰，還沒人寫就說題目在等你
const { chromium } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'light' });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(U + '#/login'); await p.waitForSelector('#email');
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn');
  await p.waitForSelector('#role-owner', { timeout: 15000 }); await p.click('#role-owner'); await p.waitForTimeout(500);
  await p.goto(U + '#/'); await p.waitForSelector('.home-head'); await p.waitForTimeout(500);
  await p.evaluate(() => {
    const S = JSON.parse(localStorage.getItem('mockServer'));
    const uid = Object.keys(S.users).find((k) => S.users[k].email === 'jas@x.com');
    const t = (m) => new Date(Date.now() - m * 60000).toISOString();
    S.notifs = [
      { id: 21, recipient: uid, actor_name: '小明', kind: 'daily_remind', record_id: null, created_at: t(2), read_at: null },
      { id: 22, recipient: uid, actor_name: '', kind: 'daily_remind', record_id: null, created_at: t(60 * 26), read_at: null },
    ];
    localStorage.setItem('mockServer', JSON.stringify(S));
  });
  await p.reload(); await p.waitForTimeout(2500);
  console.log('bell 2', (await p.textContent('#bell .bell-dot')) === '2');
  await p.click('#bell'); await p.waitForSelector('.notify-item');
  const txt = await p.locator('.notify-item .notify-text').allTextContents();
  console.log('partner wrote text', txt.includes('小明寫好今天這一題了，還在等你'));
  console.log('nobody wrote text', txt.includes('今天的題目還在等你，寫好就能看到彼此的答案'));
  const href = async (id) => p.getAttribute(`[data-nid="${id}"]`, 'href');
  console.log('links to daily', (await href(21)) === '#/daily' && (await href(22)) === '#/daily');
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/daily-remind.png', fullPage: true });
  console.log('errors', errs); await b.close();
})();
