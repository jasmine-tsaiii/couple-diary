const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => localStorage.setItem('mockAutoApprove', '1'));
  await ctx.addInitScript(() => { new MutationObserver(() => document.querySelectorAll('.celebrate:not(.wish-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const log = (...a) => console.log(...a);
  const as = async (uid, hash) => { await p.evaluate((u) => (u ? sessionStorage.setItem('mockUid', u) : sessionStorage.removeItem('mockUid')), uid); await p.goto(U + hash); await p.reload(); await p.waitForTimeout(800); };
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(800); if (await p.locator('#role-owner').count()) { await p.click('#role-owner'); await p.waitForTimeout(600); }
  await p.evaluate(async () => {
    await DB.setSetting('names', { me: 'Jasmine', partner: '小明' });
    const base = { emojis: [], tags: [], date: '2026-09-01', createdAt: 1, updatedAt: 1, photoIds: [], status: 'open', followUps: [] };
    await DB.putRecord({ ...base, id: 'f1', no: 1, type: 'fight', title: '家事', category: '生活', visibility: 'shared' });
    await DB.putRecord({ ...base, id: 'f2', no: 2, type: 'fight', title: '舊的上鎖議題', category: '生活', visibility: 'locked' });
  });
  // 主人新增吵架：沒有「誰可以看」，存成分享
  await p.goto(U + '#/new/fight'); await p.waitForTimeout(600);
  log('O form no vis', !(await p.isVisible('[data-vis]')), await p.isVisible('text=吵架議題是兩個人的事'));
  await p.fill('#f-title', '主人新議題'); await p.click('#save'); await p.waitForTimeout(800);
  log('O new fight shared', await p.evaluate(async () => (await DB.allRecords()).find((r) => r.title === '主人新議題').visibility));
  await p.goto(U + '#/edit/f2'); await p.waitForTimeout(600);
  log('O old locked shows vis', await p.isVisible('[data-vis]'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(600);
  const code = (await p.textContent('.share-code')).trim();
  await as(null, '#/login'); await p.click('text=我是另一半，用分享碼加入'); await p.waitForTimeout(300);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(900);
  log('P home bind card', await p.isVisible('text=綁定帳號，你也可以寫紀錄'));
  await p.goto(U + '#/fights'); await p.waitForTimeout(600);
  log('P add goes bind', await p.getAttribute('a.btn:has-text("新增議題")', 'href'));
  await p.goto(U + '#/view/f1'); await p.waitForTimeout(600);
  log('P unbound: no status btn', !(await p.isVisible('[data-status]')), 'bind hint', await p.isVisible('text=想一起更新狀態、寫後續？'), 'note box', await p.isVisible('#pn-text'));
  log('P unbound save blocked', await p.evaluate(async () => { try { await DB.putRecord({ id: 'x', type: 'fight', title: 'x' }); return 'no!'; } catch (e) { return e.message; } }));
  await p.goto(U + '#/bind'); await p.waitForTimeout(500);
  await p.fill('#b-email', 'ming@x.com'); await p.click('#b-send'); await p.waitForTimeout(600);
  log('P mail sent', await p.isVisible('text=確認信已經寄到 ming@x.com'));
  await p.screenshot({ path: 'b1-bind.png', fullPage: true });
  await p.click('#b-check'); await p.waitForTimeout(600);
  log('P not yet', await p.isVisible('#b-check'));
  const pid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await p.evaluate((id) => { const S = JSON.parse(localStorage.mockServer); S.users[id].is_anonymous = false; S.users[id].email = 'ming@x.com'; localStorage.mockServer = JSON.stringify(S); }, pid);
  await p.click('#b-check'); await p.waitForTimeout(700);
  log('P bound', await p.isVisible('text=已經綁定 ming@x.com'));
  // 另一半新增議題
  await p.goto(U + '#/new/fight'); await p.waitForTimeout(600);
  log('P form: type seg', await p.isVisible('[data-type]'), 'no photos', !(await p.isVisible('#f-photos')), 'labels', await p.textContent('label[for=f-their]'));
  await p.fill('#f-title', '回訊息太慢'); await p.click('[data-cat="溝通"]').catch(() => {}); await p.fill('#f-their', '我那天在開會'); await p.click('#save'); await p.waitForTimeout(900);
  const nid = p.url().split('/view/')[1];
  log('P saved', !!nid, await p.isVisible('text=你新增的'), 'delete btn', await p.isVisible('#delete'));
  log('P new no', await p.evaluate(async (id) => (await DB.getRecord(id)).no, nid));
  await p.screenshot({ path: 'b2-partner-fight.png', fullPage: true });
  // 另一半改主人的議題
  await p.goto(U + '#/view/f1'); await p.waitForTimeout(600);
  log('P f1: edit link', await p.isVisible('a:has-text("編輯")'), 'no delete', !(await p.isVisible('#delete')));
  await p.fill('#fu-text', '週末談過了'); await p.click('#fu-add'); await p.waitForTimeout(700);
  await p.click('[data-status="resolved"]'); await p.waitForTimeout(700);
  log('P f1 status', await p.evaluate(async () => { const r = await DB.getRecord('f1'); return [r.status, r.followUps.map((f) => f.by + ':' + f.text)]; }));
  await p.goto(U + '#/edit/f1'); await p.waitForTimeout(600);
  await p.fill('#f-title', '家事分工'); await p.click('#save'); await p.waitForTimeout(800);
  log('P edit title', await p.evaluate(async () => (await DB.getRecord('f1')).title));
  await p.goto(U + '#/edit/f2'); await p.waitForTimeout(600);
  log('P locked edit redirected', p.url());
  // 主人那邊
  await as('owner-jas', '#/fights');
  log('O list shows partner', await p.isVisible('text=小明新增'));
  await p.goto(U + '#/view/' + nid); await p.waitForTimeout(700);
  log('O partner fight: no delete', !(await p.isVisible('#delete')), await p.isVisible('text=只有小明能刪除'), 'can edit status', await p.isVisible('[data-status]'));
  await p.goto(U + '#/view/f1'); await p.waitForTimeout(700);
  log('O sees follow-up by', await p.isVisible('text=・小明'), await p.textContent('h1'));
  await p.screenshot({ path: 'b3-owner-fight.png', fullPage: true });
  // 另一半刪自己的
  await as(pid, '#/view/' + nid);
  await p.click('#delete'); await p.waitForTimeout(800);
  log('P deleted', await p.evaluate(async (id) => !!(await DB.getRecord(id)).deletedAt, nid), 'gone from list', await (async () => { await p.goto(U + '#/fights'); await p.waitForTimeout(500); return !(await p.isVisible('text=回訊息太慢')); })());
  await p.goto(U + '#/settings'); await p.waitForTimeout(500);
  log('P settings bound', await p.isVisible('text=已綁定 ming@x.com'), 'logout', await p.isVisible('#logout'));
  console.log('errors', errs); await b.close();
})();
