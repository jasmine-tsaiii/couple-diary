const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg,.celebrate:not(.wish-dlg)").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => localStorage.setItem('mockAutoApprove', '1'));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const msgs = []; p.on('dialog', (d) => { msgs.push(d.message()); d.accept(); });
  const log = (...a) => console.log(...a);
  const as = async (pg, uid, hash) => { await pg.evaluate((u) => (u ? sessionStorage.setItem('mockUid', u) : sessionStorage.removeItem('mockUid')), uid); await pg.goto(U + '#/settings'); await pg.reload(); await pg.waitForTimeout(500); await pg.goto(U + hash); await pg.reload(); await pg.waitForTimeout(800); };
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(800); if (await p.locator('#role-owner').count()) { await p.click('#role-owner'); await p.waitForTimeout(600); }
  await p.evaluate(async () => { await DB.setSetting('names', { me: 'Jasmine', partner: '小明' }); });
  const oid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await p.goto(U + '#/new/fight'); await p.waitForTimeout(500);
  await p.fill('#f-title', '家事分配'); await p.click('#save'); await p.waitForTimeout(900);
  const rid = await p.evaluate(async () => (await DB.allRecords()).find((r) => r.type === 'fight').id);
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(600);
  const code = (await p.textContent('.share-code')).trim();
  await as(p, null, '#/login'); await p.click('text=我是另一半，用分享碼加入'); await p.waitForTimeout(300);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(900);
  const pid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await p.evaluate((id) => { const S = JSON.parse(localStorage.mockServer); S.users[id].is_anonymous = false; S.users[id].email = 'ming@x.com'; localStorage.mockServer = JSON.stringify(S); }, pid);
  // 主人打開編輯
  await as(p, oid, '#/edit/' + rid);
  log('owner editing', await p.inputValue('#f-title'));
  // 另一半在另一個分頁改了
  const q = await ctx.newPage(); q.on('pageerror', (e) => errs.push(e.message)); q.on('dialog', (d) => d.accept());
  await q.goto(U + '#/'); await as(q, pid, '#/edit/' + rid);
  await q.fill('#f-title', '家事分配（小明改）'); await q.click('#save'); await q.waitForTimeout(900);
  await p.fill('#f-title', '家事分配（主人改）'); await p.click('#save'); await p.waitForTimeout(900);
  log('conflict msg', msgs.find((m) => m.includes('改')) || msgs);
  log('names other', msgs.some((m) => m.startsWith('小明剛剛也改了這則')));
  await as(q, pid, '#/new/happy'); await q.fill('#f-title', '小明的美好'); await q.click('#save'); await q.waitForTimeout(900);
  await as(p, oid, '#/new/happy'); await p.fill('#f-title', '主人的美好'); await p.click('#save'); await p.waitForTimeout(900);
  await p.goto(U + '#/records/happy'); await p.waitForTimeout(900);
  log('owner split', await p.isVisible('[data-who="mine"]:has-text("我的 1")') && await p.isVisible('[data-who="other"]:has-text("小明的 1")'));
  await p.screenshot({ path: 'r17-split.png' });
  await as(q, pid, '#/records/happy'); log('partner split', await q.isVisible('[data-who="mine"]:has-text("我的 1")') && await q.isVisible('[data-who="other"]:has-text("Jasmine的 1")'));
  console.log('errors', errs); await b.close();
})();
