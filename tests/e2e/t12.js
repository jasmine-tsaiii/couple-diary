const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/gsi/client*', (r) => r.abort()); // 這個測試用原本的 Google 按鈕
  await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => localStorage.setItem('mockAutoApprove', '1'));
  await ctx.addInitScript(() => { window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.celebrate:not(.wish-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  let dialogs = []; let accept = true;
  p.on('dialog', (d) => { dialogs.push(d.message()); accept ? d.accept() : d.dismiss(); });
  const log = (...a) => console.log(...a);
  // 忘記密碼
  await p.goto(U + '#/login'); await p.waitForTimeout(600);
  await p.click('#forgot'); log('forgot needs email', (await p.textContent('#login-msg')).includes('先在上面填'));
  await p.fill('#email', 'jas@x.com'); await p.click('#forgot'); await p.waitForTimeout(300);
  log('reset mail', await p.evaluate(() => window.__resetMail && window.__resetMail.o.redirectTo));
  await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(600);
  log('role choice shown', await p.isVisible('#role-owner')); await p.click('#role-owner'); await p.waitForTimeout(500);
  log('owner home', !(await p.isVisible('#role-owner')));
  // 預設可見度
  await p.goto(U + '#/new/cloud'); await p.waitForTimeout(500);
  log('cloud default', await p.textContent('[data-vis].on'));
  await p.click('[data-type="happy"]'); await p.waitForTimeout(200);
  log('happy default', await p.textContent('[data-vis].on'));
  await p.click('[data-type="fight"]'); await p.waitForTimeout(200);
  log('fight always shared', await p.isVisible('text=吵架議題是兩個人的事'));
  await p.click('[data-type="cloud"]'); await p.fill('#f-title', '烏雲一'); await p.click('#save'); await p.waitForTimeout(700);
  const id = p.url().split('/').pop();
  let r = await p.evaluate((id) => DB.getRecord(id), id);
  log('saved', r.type, r.no, r.visibility, r.v);
  // 換類型
  await p.goto(U + '#/edit/' + id); await p.waitForTimeout(500);
  dialogs = []; await p.click('[data-type="happy"]'); await p.waitForTimeout(200);
  log('type confirm', dialogs[0]);
  await p.click('#save'); await p.waitForTimeout(700);
  r = await p.evaluate((id) => DB.getRecord(id), id);
  log('after type change', r.type, r.no, r.visibility);
  // 衝突檢查：取消 → 重新載入
  await p.goto(U + '#/edit/' + id); await p.waitForTimeout(500);
  await p.evaluate(async (id) => { const x = await DB.getRecord(id); x.title = '別台改的'; x.updatedAt = Date.now() + 5; await DB.putRecord(x); }, id);
  await p.fill('#f-title', '這台改的'); dialogs = []; accept = false;
  await p.click('#save'); await p.waitForTimeout(800);
  log('conflict dialog', dialogs[0], 'reloaded title', await p.inputValue('#f-title'));
  accept = true;
  await p.fill('#f-title', '這台改的'); await p.click('#save'); await p.waitForTimeout(700);
  r = await p.evaluate((id) => DB.getRecord(id), id); log('saved title', r.title);
  // 離開確認
  await p.goto(U + '#/edit/' + id); await p.waitForTimeout(500);
  await p.fill('#f-title', '還沒存'); dialogs = []; accept = false;
  await p.click('.topbar .icon-btn'); await p.waitForTimeout(300);
  log('leave confirm', dialogs[0], 'still form', p.url().includes('edit')); accept = true;
  // 可見度改變 → 解鎖重置
  await p.evaluate(async () => { await DB.putRecord({ id: 'rt', type: 'happy', title: 'T', date: '2026-09-01', visibility: 'task', task: { text: 'x', mode: 'confirm' }, photoIds: [], emojis: [], tags: [], createdAt: 1, updatedAt: 1 }); });
  await p.evaluate(() => { const S = JSON.parse(localStorage.mockServer); const r = S.t.records.find((x) => x.id === 'rt'); r.unlocked = true; r.data.unlocked = true; localStorage.mockServer = JSON.stringify(S); });
  await p.evaluate(async () => { const x = await DB.getRecord('rt'); x.visibility = 'shared'; await DB.putRecord(x); });
  log('unlocked after vis change', await p.evaluate(() => JSON.parse(localStorage.mockServer).t.records.find((x) => x.id === 'rt').unlocked));
  // 分享碼 + 只能一位伴侶
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); dialogs = [];
  await p.click('#s-create'); await p.waitForTimeout(600);
  log('share confirm', dialogs[0]);
  const code = (await p.textContent('.share-code')).trim();
  const join = async (name) => {
    await p.evaluate(() => sessionStorage.removeItem('mockUid')); await p.goto(U + '#/login'); await p.reload(); await p.waitForTimeout(500);
    await p.click('text=我是另一半，用分享碼加入'); await p.waitForTimeout(300);
    await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', name); await p.click('#join-btn'); await p.waitForTimeout(700);
  };
  await join('小明'); log('first partner in', await p.isVisible('text=嗨，小明'));
  // 重設密碼頁
  await p.evaluate(() => sessionStorage.setItem('mockUid', 'owner-jas'));
  await p.goto(U + '?reset=1#/'); await p.waitForTimeout(700);
  log('reset page', await p.isVisible('text=設定新密碼'));
  await p.fill('#new-pass', 'newpass123'); await p.click('#reset-btn'); await p.waitForTimeout(500);
  log('updated', await p.evaluate(() => window.__updatedUser && window.__updatedUser.password));
  // 內建瀏覽器提示
  const ctx2 = await b.newContext({ userAgent: 'Mozilla/5.0 (iPhone) Line/13.0' });
  await ctx2.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx2.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const p2 = await ctx2.newPage(); await p2.goto(U + '#/login'); await p2.waitForTimeout(600);
  log('in-app google hidden', await p2.isHidden('#google-btn'), 'notice', (await p2.textContent('body')).includes('Safari'));
  console.log('errors', errs); await b.close();
})();
