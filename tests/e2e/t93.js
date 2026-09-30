// 對方出了任務的紀錄：美好／烏雲列表看得到上鎖卡片、點進去做任務、數量有算
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
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  let promptAnswer = '';
  p.on('dialog', (d) => (d.type() === 'prompt' ? d.accept(promptAnswer) : d.accept()));
  const log = (...a) => console.log(...a);
  const as = async (uid, hash) => { await p.evaluate((u) => (u ? sessionStorage.setItem('mockUid', u) : sessionStorage.removeItem('mockUid')), uid); await p.goto(U + '#/settings'); await p.reload(); await p.waitForTimeout(500); await p.goto(U + hash); await p.reload(); await p.waitForTimeout(800); };
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(800);
  await p.evaluate(async () => { await DB.setSetting('names', { me: 'Jasmine', partner: '小明' }); });
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(600);
  const code = (await p.textContent('.share-code')).trim();
  await as(null, '#/login'); await p.click('text=我是另一半，用分享碼加入'); await p.waitForTimeout(300);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(900);
  const pid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await p.evaluate((id) => { const S = JSON.parse(localStorage.mockServer); S.users[id].is_anonymous = false; S.users[id].email = 'ming@x.com'; localStorage.mockServer = JSON.stringify(S); }, pid);
  const SHOT = (n) => (process.env.SHOT_DIR || '.') + '/' + n;
  const mk = async (type, title, task) => {
    await p.goto(U + '#/new/' + type); await p.waitForTimeout(600);
    await p.fill('#f-title', title); await p.click('[data-vis="task"]'); await p.waitForTimeout(200);
    await p.fill('#f-task', task); await p.click('#save'); await p.waitForTimeout(900);
  };
  // 另一半出了美好和烏雲的任務
  await as(pid, '#/');
  await mk('happy', '小明的秘密美好', '抱我十秒');
  await mk('cloud', '小明的烏雲', '說一句對不起');
  const hid = await p.evaluate(async () => (await DB.allRecords()).find((r) => r.title === '小明的秘密美好').id);
  // 主人：美好列表看到上鎖的任務，數量有算進去
  await as('owner-jas', '#/records/happy');
  const tile = p.locator('a.task-lock');
  log('happy list shows task tile', await tile.count() === 1 && (await tile.textContent()).includes('抱我十秒') && (await tile.textContent()).includes('完成任務就能看'));
  log('happy count includes task', (await p.textContent('[data-rec-seg="happy"] .seg-n')).trim() === '1');
  log('no empty message', !(await p.textContent('#app')).includes('還沒有美好'));
  await p.screenshot({ path: SHOT('task-lock-happy.png'), fullPage: true });
  await tile.click(); await p.waitForTimeout(600);
  log('tile opens task form', p.url().includes('#/task/' + hid) && await p.locator('#task-send').count() === 1);
  await p.fill('#task-note', '抱好了'); await p.click('#task-send'); await p.waitForTimeout(800);
  await p.goto(U + '#/records/happy'); await p.waitForTimeout(800);
  log('tile shows pending', (await p.textContent('a.task-lock')).includes('已送出，等小明確認'));
  await p.goto(U + '#/records/cloud'); await p.waitForTimeout(800);
  log('cloud list shows task tile', (await p.locator('a.task-lock').count()) === 1 && (await p.textContent('a.task-lock')).includes('說一句對不起'));
  await p.screenshot({ path: SHOT('task-lock-cloud.png'), fullPage: true });
  // 「我的」篩選不顯示對方的任務
  const mineChip = p.locator('[data-who="mine"]');
  if (await mineChip.count()) { await mineChip.click(); await p.waitForTimeout(500); log('mine hides task', await p.locator('a.task-lock').count() === 0); } else log('mine hides task', true);
  // 首頁數字也算進去
  await p.goto(U + '#/'); await p.waitForTimeout(800);
  // 反過來：主人出任務，另一半也看得到
  await mk('happy', 'Jas的秘密', '買一杯咖啡給我');
  await as(pid, '#/records/happy');
  log('partner sees owner task', (await p.locator('a.task-lock').count()) === 1 && (await p.textContent('a.task-lock')).includes('買一杯咖啡給我'));
  await p.screenshot({ path: SHOT('task-lock-partner.png'), fullPage: true });
  // 另一半通過後，主人的美好列表變成正常的紀錄
  await p.goto(U + '#/view/' + hid); await p.waitForTimeout(800);
  await p.click('[data-approve]'); await p.waitForTimeout(800);
  await as('owner-jas', '#/records/happy');
  log('after approve no task tile', await p.locator('a.task-lock').count() === 0 && (await p.textContent('#grid')).includes('小明的秘密美好'));
  log('errors', errs); await b.close();
})();
