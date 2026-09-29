// 通知合併：同一個人新增好幾則美好時刻，列表合成一則；點一下全部變已讀
const { chromium } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(U + '#/login'); await p.waitForSelector('#email');
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn');
  await p.waitForSelector('#role-owner', { timeout: 15000 }); await p.click('#role-owner'); await p.waitForTimeout(500);
  await p.evaluate(() => {
    const S = JSON.parse(localStorage.getItem('mockServer'));
    const uid = Object.keys(S.users).find((k) => S.users[k].email === 'jas@x.com');
    const t = (m) => new Date(Date.now() - m * 60000).toISOString();
    S.notifs = [
      { id: 1, recipient: uid, actor_name: '小明', kind: 'new_happy', record_id: 'a', created_at: t(3), read_at: null },
      { id: 2, recipient: uid, actor_name: '小明', kind: 'new_happy', record_id: 'b', created_at: t(5), read_at: null },
      { id: 3, recipient: uid, actor_name: '小明', kind: 'new_task_record', record_id: 'c', created_at: t(8), read_at: null },
      { id: 4, recipient: uid, actor_name: '小明', kind: 'task_submitted', record_id: 'd', created_at: t(9), read_at: null },
    ];
    localStorage.setItem('mockServer', JSON.stringify(S));
  });
  await p.goto(U + '#/notifications'); await p.reload(); await p.waitForSelector('.notify-item');
  const txt = await p.locator('.notify-item .notify-text').allTextContents();
  console.log('grouped', txt.length === 2 && txt[0] === '小明新增了 3 則美好時刻（其中 1 則完成任務就能看）' && txt[1] === '小明完成了任務，等你確認', txt);
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/notify-grouped.png' });
  console.log('group links to records', (await p.getAttribute('.notify-item >> nth=0', 'href')) === '#/records/happy');
  await p.click('.notify-item >> nth=0'); await p.waitForTimeout(800);
  await p.goto(U + '#/notifications'); await p.waitForSelector('.notify-item');
  console.log('all three read', await p.locator('.notify-item.unread').count() === 1);
  console.log('errors', errs); await b.close();
})();
