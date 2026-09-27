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
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(800); if (await p.locator('#role-owner').count()) { await p.click('#role-owner'); await p.waitForTimeout(600); }
  // 草稿
  await p.goto(U + '#/new/fight'); await p.waitForTimeout(500);
  await p.fill('#f-title', '家事分配'); await p.waitForTimeout(1200);
  await p.goto(U + '#/'); await p.waitForTimeout(400);
  log('draft stored', await p.evaluate(() => !!localStorage.getItem('couple-diary-draft')));
  answers = [true]; await p.goto(U + '#/new/happy'); await p.waitForTimeout(600);
  log('draft prompt', msgs.pop());
  log('resumed', await p.inputValue('#f-title'), await p.textContent('[data-type].on'));
  // 儲存按鈕文字
  // 吵架議題一律分享，不用選
  log('save label', await p.textContent('#save'));
  await p.click('#save'); await p.waitForTimeout(800);
  log('draft cleared', await p.evaluate(() => !localStorage.getItem('couple-diary-draft')));
  // 返回時放棄 → 清掉草稿
  await p.goto(U + '#/new/cloud'); await p.waitForTimeout(500);
  await p.fill('#f-title', '放棄的'); await p.waitForTimeout(1200);
  answers = [true]; await p.click('.topbar .icon-btn'); await p.waitForTimeout(400);
  log('draft cleared on leave', await p.evaluate(() => !localStorage.getItem('couple-diary-draft')));
  // 一年前的今天
  await p.evaluate(async () => { const d = new Date(); const t = `${d.getFullYear() - 2}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await DB.putRecord({ id: 'mem', no: 50, type: 'happy', title: '第一次約會', date: t, visibility: 'shared', photoIds: [], emojis: [], tags: [], createdAt: 1, updatedAt: 1 }); });
  await p.goto(U + '#/list/happy'); await p.goto(U + '#/'); await p.waitForTimeout(600);
  log('memory card', await p.isVisible('text=2 年前的今天'), await p.isVisible('text=第一次約會'));
  // 退回任務刪照片
  await p.evaluate(async () => { await DB.putRecord({ id: 'tk', no: 60, type: 'happy', title: '任務', date: '2026-09-02', visibility: 'task', task: { text: '拍照', mode: 'photo' }, photoIds: [], emojis: [], tags: [], createdAt: 1, updatedAt: 1 }); });
  await p.evaluate(() => { const S = JSON.parse(localStorage.mockServer); S.users['anon-z'] = { id: 'anon-z', is_anonymous: true }; S.t.shares.push({ owner: 'owner-jas', code: 'ZZZZZZ', pass: 'x', owner_name: 'J', failed: 0 }); S.t.partners.push({ uid: 'anon-z', owner: 'owner-jas', name: '小明' });
    S.files['anon-z/task-1.jpg'] = S.files[Object.keys(S.files)[0]] || 'data:image/jpeg;base64,AAAA';
    S.t.task_submissions.push({ id: 'sub1', owner: 'owner-jas', record_id: 'tk', partner: 'anon-z', partner_name: '小明', note: '', photo_path: 'anon-z/task-1.jpg', status: 'pending', created_at: new Date().toISOString() }); localStorage.mockServer = JSON.stringify(S); });
  await p.goto(U + '#/view/tk'); await p.waitForTimeout(800);
  answers = [true]; await p.click('[data-reject]'); await p.waitForTimeout(800);
  log('task photo removed?', await p.evaluate(() => !('anon-z/task-1.jpg' in JSON.parse(localStorage.mockServer).files)));
  // 上傳進度文字
  await p.goto(U + '#/new/happy'); await p.waitForTimeout(500);
  await p.fill('#f-title', '多張'); await p.setInputFiles('#f-photos', ['big.jpg', 'big.jpg']); await p.waitForTimeout(1000);
  const labels = [];
  await p.exposeFunction('__lab', (t) => labels.push(t));
  await p.evaluate(() => { const b = document.getElementById('save'); new MutationObserver(() => window.__lab(b.textContent)).observe(b, { childList: true, characterData: true, subtree: true }); });
  await p.click('#save'); await p.waitForTimeout(1200);
  log('progress labels', [...new Set(labels)].filter((x) => x.includes('上傳')));
  // 錯誤文字
  log('err text', await p.evaluate(() => cloudErrorText(new TypeError('Failed to fetch'))));
  console.log('errors', errs); await b.close();
})();
