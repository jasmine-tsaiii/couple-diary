// 解鎖任務「要回答問題」：出題 → 對方空白送不出、寫了能送 → 出題的人看到回答 → 通過後解鎖
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
  // 另一半出一個「要回答問題」的任務
  await as(pid, '#/new/happy');
  await p.fill('#f-title', '小明的美好'); await p.click('[data-vis="task"]'); await p.waitForTimeout(200);
  await p.click('[data-taskmode="answer"]'); await p.waitForTimeout(200);
  log('label changes to question', (await p.textContent('label[for="f-task"]')).includes('想問') && (await p.getAttribute('#f-task', 'placeholder')).includes('為什麼'));
  await p.fill('#f-task', '你覺得那天我為什麼開心？');
  await p.screenshot({ path: SHOT('task-answer-form.png'), fullPage: true });
  await p.click('#save'); await p.waitForTimeout(900);
  const rid = await p.evaluate(async () => (await DB.allRecords()).find((r) => r.title === '小明的美好').id);
  log('saved answer mode', await p.evaluate(async (id) => (await DB.getRecord(id)).task.mode, rid) === 'answer');
  // 主人：任務列表寫「要回答問題」，空白送不出
  await as('owner-jas', '#/tasks');
  log('list says answer', (await p.textContent('#app')).includes('要回答問題'));
  await p.click('a:has-text("去完成")'); await p.waitForTimeout(500);
  log('answer required label', (await p.textContent('label[for="task-note"]')).includes('你的回答（必填）') && (await p.textContent('#task-send')).includes('送出回答給小明'));
  await p.screenshot({ path: SHOT('task-answer-send.png'), fullPage: true });
  await p.click('#task-send'); await p.waitForTimeout(500);
  log('blank not sent', p.url().includes('#/task/'));
  await p.fill('#task-note', '因為我們去看了海'); await p.click('#task-send'); await p.waitForTimeout(800);
  log('sent', p.url().endsWith('#/tasks'));
  // 另一半在紀錄頁看到回答，通過
  await as(pid, '#/view/' + rid);
  log('owner of record sees answer', (await p.textContent('#app')).includes('Jasmine的回答') && (await p.textContent('#app')).includes('因為我們去看了海'));
  await p.screenshot({ path: SHOT('task-answer-review.png'), fullPage: true });
  await p.click('[data-approve]'); await p.waitForTimeout(800);
  await as('owner-jas', '#/view/' + rid);
  log('unlocked', (await p.textContent('#app')).includes('你完成任務解鎖了這則'));
  // 伺服器也擋空白回答
  const blocked = await p.evaluate(async () => { try { await CloudDB.submitTask('nope', '', null); return 'no'; } catch (e) { return e.message; } });
  log('server rejects missing task', !!blocked);
  log('errors', errs); await b.close();
})();
