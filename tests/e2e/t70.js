// 通知小鈴鐺：未讀數字、通知頁、點開後變已讀；設定頁 Email 通知開關會記住
const { chromium } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/gsi/client*', (r) => r.abort());
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); new MutationObserver(() => document.querySelectorAll('.tour-dlg').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(U + '#/login'); await p.waitForSelector('#email');
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn');
  await p.waitForSelector('#role-owner', { timeout: 15000 }); await p.click('#role-owner'); await p.waitForTimeout(500);
  await p.waitForSelector('#bell:not([hidden])', { timeout: 10000 });
  console.log('bell no dot when empty', await p.locator('#bell .bell-dot:not([hidden])').count() === 0);
  await p.evaluate(() => {
    const S = JSON.parse(localStorage.getItem('mockServer'));
    const uid = Object.keys(S.users).find((k) => S.users[k].email === 'jas@x.com');
    const t = (m) => new Date(Date.now() - m * 60000).toISOString();
    S.notifs = [
      { id: 1, recipient: uid, actor_name: '小明', kind: 'new_happy', record_id: 'r1', created_at: t(5), read_at: null },
      { id: 2, recipient: uid, actor_name: '小明', kind: 'task_submitted', record_id: 'r2', created_at: t(90), read_at: null },
      { id: 3, recipient: 'someone-else', actor_name: 'X', kind: 'new_happy', record_id: 'r3', created_at: t(1), read_at: null },
    ];
    localStorage.setItem('mockServer', JSON.stringify(S));
  });
  await p.reload(); await p.waitForSelector('#bell .bell-dot:not([hidden])', { timeout: 10000 });
  console.log('dot shows 2', (await p.textContent('#bell .bell-dot')) === '2');
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/bell-home.png' });
  await p.click('#bell'); await p.waitForSelector('.notify-item');
  const items = await p.locator('.notify-item').allTextContents();
  console.log('two items, newest first', items.length === 2 && items[0].includes('小明新增了一則美好時刻') && items[1].includes('完成了任務，等你確認'));
  console.log('time text', items[0].includes('分鐘前') && items[1].includes('小時前'));
  console.log('links', (await p.getAttribute('.notify-item >> nth=0', 'href')) === '#/view/r1' && (await p.getAttribute('.notify-item >> nth=1', 'href')) === '#/tasks');
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/notifications.png' });
  await p.waitForTimeout(500);
  await p.goto(U + '#/'); await p.waitForSelector('#bell .bell-dot:not([hidden])');
  console.log('just looking keeps count', (await p.textContent('#bell .bell-dot')) === '2');
  await p.click('#bell'); await p.waitForSelector('#notify-all-read'); await p.click('#notify-all-read'); await p.waitForTimeout(400);
  console.log('all read clears highlight', await p.locator('.notify-item.unread').count() === 0);
  await p.goto(U + '#/'); await p.waitForSelector('#bell:not([hidden])'); await p.waitForTimeout(300);
  console.log('dot gone after reading', await p.locator('#bell .bell-dot:not([hidden])').count() === 0);
  // 設定頁 Email 開關
  await p.goto(U + '#/settings'); await p.waitForSelector('#notify-card:not([hidden])', { timeout: 10000 });
  console.log('email on by default', (await p.getAttribute('#notify-email', 'aria-pressed')) === 'true');
  await p.click('#notify-email'); await p.waitForTimeout(400);
  await p.reload(); await p.waitForSelector('#notify-card:not([hidden])', { timeout: 10000 });
  console.log('email off remembered', (await p.getAttribute('#notify-email', 'aria-pressed')) === 'false' && (await p.textContent('#notify-email')) === '已關閉');
  console.log('errors', errs); await b.close();
})();
