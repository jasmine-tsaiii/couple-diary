const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => localStorage.setItem('mockAutoApprove', '1'));
  await ctx.addInitScript(() => { window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.celebrate:not(.wish-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const log = (...a) => console.log(...a);
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(600);
  await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 20; c.height = 20; const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg'));
    await DB.putPhoto({ id: 'pa', blob }); await DB.putPhoto({ id: 'pb', blob });
    const base = { emojis: [], tags: [], date: '2026-09-01', createdAt: 1, updatedAt: 1 };
    await DB.putRecord({ ...base, id: 'a', no: 1, type: 'happy', title: '甲', visibility: 'shared', photoIds: ['pa'] });
    await DB.putRecord({ ...base, id: 'b', no: 2, type: 'happy', title: '乙', visibility: 'locked', photoIds: ['pb'] });
    await DB.putRecord({ ...base, id: 'old', no: 3, type: 'happy', title: '很久以前刪的', visibility: 'shared', photoIds: [], deletedAt: Date.now() - 31 * 86400000 });
  });
  // 重新整理 → 超過 30 天的被清掉
  await p.reload(); await p.waitForTimeout(800);
  log('old purged', await p.evaluate(async () => (await DB.allRecords()).map((r) => r.id)));
  // 分享碼 + 伴侶看得到甲
  await p.goto(U + '#/view/a'); await p.waitForTimeout(500);
  await p.click('#delete'); await p.waitForTimeout(700);
  log('list after delete', await p.$$eval('.tile-title, .card .bold', (e) => e.map((x) => x.textContent)).catch(() => []));
  await p.goto(U + '#/records/happy'); await p.waitForTimeout(500);
  log('records count', await p.textContent('.seg-btn[data-rec-seg="happy"] .seg-n'));
  await p.goto(U + '#/view/a'); await p.waitForTimeout(400);
  log('deleted detail', (await p.textContent('.empty')).includes('最近刪除'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  log('trash card', await p.isVisible('text=最近刪除（1）'));
  // 伴侶看不到刪除中的
  await p.evaluate(() => { const S = JSON.parse(localStorage.mockServer); S.t.partners.push({ uid: 'anon-x', owner: 'owner-jas', name: 'm' }); S.users['anon-x'] = { id: 'anon-x', is_anonymous: true }; localStorage.mockServer = JSON.stringify(S); });
  // 救回來
  await p.click('[data-restore="a"]'); await p.waitForTimeout(600);
  log('restored', await p.evaluate(async () => { const r = await DB.getRecord('a'); return [r.deletedAt, r.no]; }), 'trash gone', !(await p.isVisible('text=最近刪除（')));
  // 刪除 → 重新編號 → 救回：號碼衝突要拿新號碼
  await p.evaluate(async () => { const r = await DB.getRecord('a'); r.deletedAt = Date.now(); await DB.putRecord(r); });
  await p.goto(U + '#/settings'); await p.reload(); await p.waitForTimeout(700);
  await p.click('#renumber'); await p.waitForTimeout(600);
  await p.click('[data-restore="a"]'); await p.waitForTimeout(600);
  log('after renumber+restore', await p.evaluate(async () => (await DB.allRecords()).map((r) => r.title + '#' + r.no).sort()));
  // 閱讀版只匯出給對方看的
  await p.check('#read-shared-only');
  await p.click('#export-read'); await p.waitForTimeout(1200);
  const html = await p.evaluate(() => document.querySelector('.read-body').shadowRoot.innerHTML); await p.click('#read-close');
  log('read shared-only has 甲', html.includes('甲'), 'has 乙', html.includes('乙'), 'img count', (html.match(/data:image/g) || []).length);
  // 永久刪除
  await p.evaluate(async () => { const r = await DB.getRecord('b'); r.deletedAt = Date.now(); await DB.putRecord(r); });
  await p.goto(U + '#/settings'); await p.reload(); await p.waitForTimeout(700);
  await p.click('[data-purge="b"]'); await p.waitForTimeout(600);
  log('purged b', await p.evaluate(async () => [!!(await DB.getRecord('b')), Object.keys(JSON.parse(localStorage.mockServer).files)]));
  // 伴侶模式看不到刪除中的紀錄
  await p.evaluate(async () => { const r = await DB.getRecord('a'); r.deletedAt = Date.now(); await DB.putRecord(r); });
  await p.evaluate(() => sessionStorage.setItem('mockUid', 'anon-x')); await p.goto(U + '#/list/happy'); await p.reload(); await p.waitForTimeout(700);
  log('partner sees', await p.$$eval('.tile', (e) => e.length));
  console.log('errors', errs); await b.close();
})();
