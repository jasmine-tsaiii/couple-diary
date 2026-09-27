const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.celebrate:not(.wish-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const log = (...a) => console.log(...a);
  await p.goto(U + '#/'); await p.waitForTimeout(600);
  // 舊紀錄（沒有號碼）
  await p.evaluate(async () => { await LocalDB.putRecord({ id: 'old1', type: 'happy', title: '舊的', date: '2026-01-01', createdAt: 1, photoIds: [], emojis: [], tags: [] }); });
  await p.reload(); await p.waitForTimeout(600);
  const nos = () => p.evaluate(async () => (await LocalDB.allRecords()).filter((r) => r.type === 'happy').sort((a, b) => a.no - b.no).map((r) => `${r.title}#${r.no}`));
  log('backfilled', await nos());
  const add = async (t, d) => { await p.goto(U + '#/new/happy'); await p.waitForTimeout(300); await p.fill('#f-title', t); await p.fill('#f-date', d); await p.click('#save'); await p.waitForTimeout(500); };
  await add('A', '2026-05-01'); await add('B', '2026-03-01');
  log('after adds', await nos());
  // 刪掉 A（#2）
  const aId = await p.evaluate(async () => (await LocalDB.allRecords()).find((r) => r.title === 'A').id);
  await p.goto(U + '#/view/' + aId); await p.waitForTimeout(400); await p.click('#delete'); await p.waitForTimeout(500);
  await add('C', '2026-02-01');
  log('after delete A + add C', await nos());
  const bId = await p.evaluate(async () => (await LocalDB.allRecords()).find((r) => r.title === 'B').id);
  await p.goto(U + '#/edit/' + bId); await p.waitForTimeout(300); await p.fill('#f-date', '2025-01-01'); await p.click('#save'); await p.waitForTimeout(500);
  log('after B date edit', await nos());
  await p.goto(U + '#/view/' + bId); await p.waitForTimeout(400);
  log('detail shows', await p.textContent('.detail-default .no'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(500); await p.click('#renumber'); await p.waitForTimeout(600);
  log('after renumber', await nos());
  await p.goto(U + '#/new/happy'); await p.waitForTimeout(300); await p.fill('#f-title', 'D'); await p.click('#save'); await p.waitForTimeout(500);
  log('after add D', await nos());
  log('errors', errs); await b.close();
})();
