const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => localStorage.setItem('mockAutoApprove', '1'));
  await ctx.addInitScript(() => { window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.celebrate:not(.wish-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  let answers = []; const msgs = [];
  p.on('dialog', (d) => { msgs.push(d.message()); const a = answers.shift(); if (a === false) d.dismiss(); else d.accept(typeof a === 'string' ? a : undefined); });
  const log = (...a) => console.log(...a);
  // 試用模式：上鎖只是標記的說明
  await p.goto(U + '#/'); await p.waitForTimeout(600);
  await p.goto(U + '#/new/happy'); await p.waitForTimeout(500);
  log('local lock note', (await p.textContent('#app')).includes('上鎖」只是標記'));
  // 自訂表情檢查
  await p.click('#add-emoji'); await p.fill('#emoji-input', '哈'); await p.click('#emoji-ok'); await p.waitForTimeout(200);
  log('emoji reject', await p.textContent('#toast'));
  await p.fill('#emoji-input', '🦄'); await p.click('#emoji-ok'); await p.waitForTimeout(200);
  log('emoji ok', await p.isVisible('[data-emoji="🦄"]'));
  // 登入
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(800); if (await p.locator('#role-owner').count()) { await p.click('#role-owner'); await p.waitForTimeout(600); }
  await p.evaluate(async () => {
    const base = { emojis: [], date: '2026-09-01', createdAt: 1, updatedAt: 1, photoIds: [], visibility: 'shared' };
    await DB.putRecord({ ...base, id: 'x1', no: 1, type: 'happy', title: 'A', tags: ['開新', '幸福'] });
    await DB.putRecord({ ...base, id: 'x2', no: 2, type: 'happy', title: 'B', tags: ['開新'] });
  });
  // 在一起日期
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  await p.fill('#set-me', 'Jasmine'); await p.fill('#set-since', '2026-09-20'); await p.click('#save-names'); await p.waitForTimeout(400);
  await p.goto(U + '#/'); await p.waitForTimeout(500);
  log('together', await p.textContent('.title-xl + .small'));
  // 標籤改名
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  answers = ['開心']; await p.click('[data-edit-tag="開新"]'); await p.waitForTimeout(800);
  log('renamed', await p.evaluate(async () => (await DB.allRecords()).map((r) => r.tags.join(','))));
  answers = ['', true]; await p.click('[data-edit-tag="幸福"]'); await p.waitForTimeout(800);
  log('deleted tag', await p.evaluate(async () => (await DB.allRecords()).map((r) => r.tags.join(','))));
  // 分享 + 伴侶 + 改密碼時移除
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); answers = [true]; await p.click('#s-create'); await p.waitForTimeout(600);
  const code = (await p.textContent('.share-code')).trim();
  await p.evaluate(() => sessionStorage.removeItem('mockUid')); await p.goto(U + '#/login'); await p.reload(); await p.waitForTimeout(500);
  await p.click('text=我是另一半，用分享碼加入'); await p.waitForTimeout(300);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(700);
  await p.evaluate(() => sessionStorage.setItem('mockUid', 'owner-jas')); await p.goto(U + '#/settings'); await p.reload(); await p.waitForTimeout(800);
  log('partner listed', await p.isVisible('[data-rm-partner]'));
  await p.fill('#s-pass', '654321'); answers = [true]; await p.click('#s-save-pass'); await p.waitForTimeout(900);
  log('partner removed after pw change', !(await p.isVisible('[data-rm-partner]')), await p.evaluate(() => JSON.parse(localStorage.mockServer).t.partners.length));
  // 刪除帳號
  answers = ['不要']; await p.click('#delete-account'); await p.waitForTimeout(300);
  log('not deleted on wrong word', await p.evaluate(() => !!JSON.parse(localStorage.mockServer).users['owner-jas']));
  answers = ['刪除']; await p.click('#delete-account'); await p.waitForTimeout(1200);
  log('deleted', await p.evaluate(() => [!!JSON.parse(localStorage.mockServer).users['owner-jas'], JSON.parse(localStorage.mockServer).t.records.length, location.hash]));
  log('login shown', await p.isVisible('#login-btn'));
  console.log('errors', errs); await b.close();
})();
