const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => localStorage.setItem('mockAutoApprove', '1'));
  await ctx.addInitScript(() => { window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.celebrate:not(.wish-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => d.accept());
  const log = (...a) => console.log(...a);
  await p.goto(U + '#/login'); await p.waitForTimeout(600);
  log('login has join btn', await p.isVisible('text=我是另一半，用分享碼加入'));
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(600);
  // 建立三則紀錄
  await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 40; c.height = 40; c.getContext('2d').fillStyle = 'red'; c.getContext('2d').fillRect(0, 0, 40, 40);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg'));
    await DB.putPhoto({ id: 'ph1', blob }); await DB.putPhoto({ id: 'ph2', blob });
    const base = { emojis: ['😊'], tags: ['幸福'], description: '內容', date: '2026-09-20', createdAt: Date.now(), followUps: [] };
    await DB.putRecord({ ...base, id: 'r-shared', type: 'happy', title: '一起看海<img src=x onerror=window.__xss=1>', visibility: 'shared', photoIds: ['ph1'] });
    await DB.putRecord({ ...base, id: 'r-locked', type: 'cloud', title: '祕密烏雲', visibility: 'locked', photoIds: ['ph2'] });
    await DB.putRecord({ ...base, id: 'r-task', type: 'happy', title: '任務後的驚喜', visibility: 'task', photoIds: [], task: { text: '帶我去吃早午餐', mode: 'photo' } });
    await DB.putRecord({ ...base, id: 'r-fight', type: 'fight', title: '回訊息太慢', visibility: 'shared', photoIds: [], category: '溝通', status: 'progress', myView: 'A', theirView: 'B', followUps: [{ id: 'f1', date: '2026-09-21', text: '聊開了' }] });
  });
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(600);
  const code = (await p.textContent('.share-code')).trim();
  log('code', code);
  await p.screenshot({ path: 'p1-share.png', fullPage: true });
  // 對方加入
  await p.evaluate(() => sessionStorage.removeItem('mockUid'));
  await p.reload(); await p.waitForTimeout(600); await p.click('text=我是另一半，用分享碼加入'); await p.waitForTimeout(400);
  await p.fill('#j-code', code.toLowerCase()); await p.fill('#j-pass', '999999'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(500);
  log('wrong pass msg', await p.textContent('#join-msg'));
  await p.fill('#j-pass', '123456'); await p.click('#join-btn'); await p.waitForTimeout(800);
  await p.screenshot({ path: 'p2-partner-home.png', fullPage: true });
  log('partner home', await p.isVisible('text=Jasmine的紀錄'), await p.isVisible('text=嗨，小明'), await p.isVisible('text=有 1 個任務可以解鎖'));
  log('no add button', await p.$('.tab-add') === null);
  await p.goto(U + '#/list/happy'); await p.waitForTimeout(500);
  log('happy list titles', await p.$$eval('.tile .bold', (e) => e.map((x) => x.textContent)));
  await p.goto(U + '#/list/cloud'); await p.waitForTimeout(500);
  log('cloud list (should be empty)', await p.$$eval('.tile .bold', (e) => e.map((x) => x.textContent)));
  await p.goto(U + '#/view/r-shared'); await p.waitForTimeout(500);
  log('shared detail: edit?', await p.isVisible('text=編輯'), 'delete?', await p.isVisible('#delete'), 'img', await p.$$eval('.detail-photos img', (e) => e.length));
  await p.goto(U + '#/view/r-locked'); await p.waitForTimeout(500);
  log('locked detail hidden', await p.isVisible('text=找不到這則紀錄'));
  await p.goto(U + '#/view/r-fight'); await p.waitForTimeout(500);
  await p.screenshot({ path: 'p3-partner-fight.png', fullPage: true });
  log('fight: no status buttons', (await p.$$('[data-status]')).length === 0, 'no fu-add', !(await p.$('#fu-add')), 'label', await p.isVisible('text=Jasmine的想法'));
  await p.goto(U + '#/edit/r-shared'); await p.waitForTimeout(400);
  log('edit redirects', p.url());
  // 直接用 API 試著改紀錄（應該被擋）
  const hack = await p.evaluate(async () => { try { await DB.putRecord({ id: 'r-shared', type: 'happy', title: 'hacked', visibility: 'shared' }); return 'written'; } catch (e) { return 'blocked: ' + e.message; } });
  log('partner write attempt', hack);
  // 做任務
  await p.goto(U + '#/tasks'); await p.waitForTimeout(500);
  await p.screenshot({ path: 'p4-tasks.png', fullPage: true });
  await p.click('text=去完成'); await p.waitForTimeout(400);
  await p.click('#task-send'); await p.waitForTimeout(300);
  log('photo required toast', await p.textContent('#toast'));
  const img = await p.evaluate(async () => { const c = document.createElement('canvas'); c.width = 30; c.height = 30; c.getContext('2d').fillRect(0, 0, 30, 30); return c.toDataURL('image/png'); });
  fs.writeFileSync('task.png', Buffer.from(img.split(',')[1], 'base64'));
  await p.setInputFiles('#task-photo', 'task.png'); await p.waitForTimeout(500);
  await p.fill('#task-note', '早午餐超好吃'); await p.click('#task-send'); await p.waitForTimeout(700);
  log('after submit url', p.url(), await p.isVisible('text=等Jasmine確認'));
  // 主人審核
  await p.evaluate(() => sessionStorage.setItem('mockUid', 'owner-jas')); await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(700);
  log('owner pending card', await p.isVisible('text=有 1 個任務等你確認'));
  await p.click('text=有 1 個任務等你確認'); await p.waitForTimeout(700);
  await p.screenshot({ path: 'p5-owner-review.png', fullPage: true });
  log('task photo shown', await p.$$eval('img[alt="任務照片"]', (e) => e.length));
  await p.click('text=通過並解鎖'); await p.waitForTimeout(700);
  log('unlocked text', await p.isVisible('text=已經解鎖，對方看得到這則。'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  log('partner listed', await p.isVisible('text=小明'));
  // 對方看到解鎖的紀錄
  const anon = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('mockServer')).users).find((k) => k.startsWith('anon')));
  await p.evaluate((a) => sessionStorage.setItem('mockUid', a), anon); await p.goto(U + '#/list/happy'); await p.reload(); await p.waitForTimeout(700);
  log('partner happy after unlock', await p.$$eval('.tile .bold', (e) => e.map((x) => x.textContent)));
  // 主人移除對方
  await p.evaluate(() => sessionStorage.setItem('mockUid', 'owner-jas')); await p.goto(U + '#/settings'); await p.reload(); await p.waitForTimeout(700);
  await p.click('[data-rm-partner]'); await p.waitForTimeout(600);
  await p.evaluate((a) => sessionStorage.setItem('mockUid', a), anon); await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(700);
  log('removed partner sees join notice', await p.isVisible('text=這段分享已經結束了'));
  await p.screenshot({ path: 'p6-removed.png', fullPage: true });
  log('xss fired?', await p.evaluate(() => !!window.__xss));
  await p.evaluate(() => sessionStorage.setItem('mockUid', 'owner-jas')); await p.goto(U + '#/settings'); await p.reload(); await p.waitForTimeout(700);
  fs.writeFileSync('evil.json', JSON.stringify({ app: 'couple-diary', records: [{ id: 'x" onmouseover=alert(1)', type: 'happy', title: 't' }], photos: [] }));
  await p.setInputFiles('#import', 'evil.json'); await p.waitForTimeout(500); log('evil import toast', await p.textContent('#toast'));
  fs.writeFileSync('evil2.json', JSON.stringify({ app: 'couple-diary', records: [], photos: [{ id: 'a', data: 'https://evil.example/x' }] }));
  await p.setInputFiles('#import', 'evil2.json'); await p.waitForTimeout(500); log('evil url import toast', await p.textContent('#toast'));
  log('errors', errs);
  await b.close();
})();
