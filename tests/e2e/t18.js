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
  const as = async (uid, hash) => { await p.evaluate((u) => (u ? sessionStorage.setItem('mockUid', u) : sessionStorage.removeItem('mockUid')), uid); await p.goto(U + hash); await p.reload(); await p.waitForTimeout(800); };
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(800);
  await p.evaluate(async () => {
    const base = { emojis: [], tags: [], date: '2026-09-01', createdAt: 1, updatedAt: 1, photoIds: [] };
    await DB.putRecord({ ...base, id: 's1', no: 1, type: 'happy', title: '公開的', visibility: 'shared' });
    await DB.putRecord({ ...base, id: 'l1', no: 2, type: 'happy', title: '祕密美好', visibility: 'locked' });
    await DB.putRecord({ ...base, id: 'l2', no: 1, type: 'fight', title: '祕密吵架', visibility: 'locked' });
    await DB.putRecord({ ...base, id: 'tk', no: 3, type: 'happy', title: '任務', visibility: 'task', task: { text: '抱抱', mode: 'confirm' } });
  });
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(600);
  const code = (await p.textContent('.share-code')).trim();
  const join = async (name) => {
    await as(null, '#/login'); await p.click('text=我是另一半，用分享碼加入'); await p.waitForTimeout(300);
    await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', name); await p.click('#join-btn'); await p.waitForTimeout(900);
    return p.evaluate(() => sessionStorage.getItem('mockUid'));
  };
  const a1 = await join('小明');
  log('waiting screen', await p.isVisible('text=等 Jasmine 同意'));
  log('pending cannot read', await p.evaluate(async () => (await CloudDB.client.from('records').select('data')).data.length));
  await p.click('#w-check'); await p.waitForTimeout(500); log('still waiting', await p.isVisible('text=等 Jasmine 同意'));
  await as('owner-jas', '#/');
  log('owner home card', await p.isVisible('text=小明 想加入你們的日記'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  await p.click('[data-approve-partner]'); await p.waitForTimeout(500); if (await p.isVisible('.choice-dlg')) { await p.click('[data-choice="same"]'); } await p.waitForTimeout(800);
  log('joined list', await p.$$eval('[data-rm-partner]', (e) => e.map((x) => x.dataset.name)));
  await as(a1, '#/');
  log('partner in', await p.isVisible('text=Jasmine的紀錄'), 'locked hint', true);
  await p.goto(U + '#/list/happy'); await p.waitForTimeout(800);
  log('locked tiles', await p.$$eval('.tile-lock', (e) => e.length), 'leaks title?', (await p.textContent('#app')).includes('祕密'));
  await p.goto(U + '#/fights'); await p.waitForTimeout(600);
  log('locked fights', await p.isVisible('text=另外還有 1 則上鎖的吵架議題'));
  // 每天 5 次
  const tries = await p.evaluate(async () => { const out = []; for (let i = 0; i < 6; i++) { try { await CloudDB.submitTask('tk', 'x', null); out.push('ok'); } catch (e) { out.push(e.message); } const S = JSON.parse(localStorage.mockServer); S.t.task_submissions.forEach((t) => { if (t.status === 'pending') t.status = 'rejected'; }); localStorage.mockServer = JSON.stringify(S); } return out; });
  log('5/day', tries);
  // 換手機重新加入
  const a2 = await join('小明');
  log('new device waiting', await p.isVisible('text=等 Jasmine 同意'));
  await as(a1, '#/'); log('old still in before approve', await p.isVisible('text=Jasmine的紀錄'));
  await as('owner-jas', '#/settings');
  log('request shown', await p.isVisible('#join-requests'));
  await p.click('[data-approve-partner]'); await p.waitForTimeout(500); if (await p.isVisible('.choice-dlg')) { await p.click('[data-choice="same"]'); } await p.waitForTimeout(800);
  await as(a2, '#/'); log('new device in', await p.isVisible('text=Jasmine的紀錄'));
  await as(a1, '#/'); log('old device out', await p.isVisible('#join-form'));
  // 拒絕
  const a3 = await join('路人');
  await as('owner-jas', '#/settings'); await p.click('[data-pending]'); await p.waitForTimeout(700);
  log('rejected, partners', await p.evaluate(() => JSON.parse(localStorage.mockServer).t.partners.map((x) => x.name + ':' + x.approved)));
  await as(a3, '#/'); log('rejected sees join', await p.isVisible('#join-form'));
  console.log('errors', errs); await b.close();
})();
