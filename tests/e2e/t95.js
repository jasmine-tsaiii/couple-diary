// 時光膠囊（雙人）：打開前對方只看到日期、免費 1 個、第 2 個出現 Plus 說明、「我有興趣」每人只算一次、打開後首頁提示；任務範本
const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => localStorage.setItem('mockAutoApprove', '1'));
  // 印章、加到主畫面之類的慶祝畫面先拿掉，留下付費說明和範本視窗
  await ctx.addInitScript(() => { new MutationObserver(() => document.querySelectorAll('.celebrate:not(.plus-dlg):not(.tpl-dlg):not(.qpack-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => d.accept());
  const log = (...a) => console.log(...a);
  const SHOT = (n) => (process.env.SHOT_DIR || '.') + '/' + n;
  const as = async (uid, hash) => { await p.evaluate((u) => (u ? sessionStorage.setItem('mockUid', u) : sessionStorage.removeItem('mockUid')), uid); await p.goto(U + '#/settings'); await p.reload(); await p.waitForTimeout(500); await p.goto(U + hash); await p.reload(); await p.waitForTimeout(900); };
  const server = () => p.evaluate(() => JSON.parse(localStorage.mockServer));
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(800);
  await p.evaluate(async () => { await DB.setSetting('names', { me: 'Jasmine', partner: '小明' }); });
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(600);
  const code = (await p.textContent('.share-code')).trim();
  const oid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await as(null, '#/login'); await p.click('text=我是另一半，用分享碼加入'); await p.waitForTimeout(300);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(900);
  const pid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await p.evaluate((id) => { const S = JSON.parse(localStorage.mockServer); S.users[id].is_anonymous = false; S.users[id].email = 'ming@x.com'; localStorage.mockServer = JSON.stringify(S); }, pid);
  const openDay = await p.evaluate(() => new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10));

  // 主人：一起分頁有時光膠囊，寫一個
  await as(oid, '#/together');
  log('together has capsule row', (await p.textContent('#app')).includes('時光膠囊'));
  log('together has preview rows', await p.locator('#row-mission').count() === 1 && await p.locator('#row-qpack').count() === 1);
  await p.screenshot({ path: SHOT('together.png'), fullPage: true });
  await p.click('a[href="#/capsules"]'); await p.waitForTimeout(800);
  await p.click('#cap-new'); await p.waitForTimeout(600);
  log('form shown', await p.locator('#cap-body').count() === 1);
  await p.click('[data-occ="custom"]'); await p.waitForTimeout(200);
  await p.fill('#cap-date', openDay); await p.dispatchEvent('#cap-date', 'change'); await p.waitForTimeout(300);
  await p.fill('#cap-body', '一年後的我們，還是要一起吃早午餐。');
  await p.screenshot({ path: SHOT('capsule-form.png'), fullPage: true });
  await p.click('#cap-save'); await p.waitForTimeout(1000);
  log('back to list', p.url().endsWith('#/capsules') && (await p.textContent('#app')).includes('寫給小明'));
  await p.screenshot({ path: SHOT('capsule-list-owner.png'), fullPage: true });
  // 第 2 個：Plus 說明
  await p.click('#cap-new'); await p.waitForTimeout(600);
  log('limit shows plus sheet', await p.locator('.plus-dlg').count() === 1 && (await p.textContent('.plus-dlg')).includes('NT$690'));
  await p.screenshot({ path: SHOT('plus-capsule.png') });
  await p.click('#plus-yes'); await p.waitForTimeout(600);
  log('button says registered', (await p.textContent('#plus-yes')).includes('已登記，推出時通知你') && await p.locator('#plus-yes').isDisabled());
  await p.click('#plus-no'); await p.waitForTimeout(300);
  await p.click('#cap-new'); await p.waitForTimeout(600);
  const price = await p.evaluate(() => yearPrice());
  const sheet = await p.textContent('.plus-dlg');
  log('ladder shows plans', sheet.includes(`每月 NT$${Math.round(price / 12)}`) && sheet.includes('首發早鳥：前 20 組') && sheet.includes('NT$490') && !sheet.includes('NT$590') && sheet.includes('一人付，兩人用') && sheet.includes('不會自動續約'));
  log('real group count', sheet.includes('已有 1 組情侶登記'));
  log('price stable', await p.evaluate(() => yearPrice() === yearPrice()) && [690, 790].includes(price));
  log('second open already registered', await p.locator('#plus-yes').isDisabled() && (await p.textContent('#plus-yes')).includes('已登記'));
  await p.screenshot({ path: SHOT('plus-registered.png') });
  await p.click('#plus-no'); await p.waitForTimeout(300);
  // 直接再叫幾次也只會有一列
  await p.evaluate(async () => { await CloudDB.noteInterest('capsule'); await registerInterest('capsule'); });
  let S = await server();
  log('price recorded', S.interestPrice[oid + ':capsule'] === price);
  log('one interest row per person', Object.keys(S.interests).filter((k) => k.endsWith(':capsule')).length === 1);
  log('paywall_view remembered', await p.evaluate((u) => !!localStorage.getItem(`pwview:${u}:capsule`), oid));

  // 另一半：只看到日期，拿不到內容
  await as(pid, '#/capsules');
  const txt = await p.textContent('#app');
  log('partner sees sealed', txt.includes('寫給你的時光膠囊') && !txt.includes('早午餐'));
  const raw = await p.evaluate(async () => JSON.stringify(await CloudDB.capsuleList()));
  log('partner data has no body', !raw.includes('早午餐') && raw.includes('"sealed":true'));
  await p.screenshot({ path: SHOT('capsule-partner-sealed.png'), fullPage: true });
  const capId = JSON.parse(raw)[0].id;
  await p.goto(U + '#/capsule/' + capId); await p.waitForTimeout(800);
  log('sealed url bounces', p.url().endsWith('#/capsules'));

  // 另一半也登記：同一對情侶還是只算 1 組
  await p.evaluate(() => registerInterest('theme'));
  log('couple counts once', await p.evaluate(() => CloudDB.interestGroups()) === 1);
  // 到了打開日期：另一半首頁提示，點進去看得到
  await p.evaluate((d) => { const S = JSON.parse(localStorage.mockServer); S.capToday = d; localStorage.mockServer = JSON.stringify(S); }, openDay);
  await as(pid, '#/');
  log('home tip', await p.locator('#capsule-tip').count() === 1 && (await p.textContent('#capsule-tip')).includes('時光膠囊打開了'));
  await p.screenshot({ path: SHOT('capsule-home-tip.png') });
  await p.click('#capsule-tip'); await p.waitForTimeout(900);
  log('opened shows body', (await p.textContent('#app')).includes('早午餐'));
  await p.screenshot({ path: SHOT('capsule-opened.png'), fullPage: true });
  await p.goto(U + '#/'); await p.waitForTimeout(900);
  log('tip gone after reading', await p.locator('#capsule-tip').count() === 0);
  // 主人：已打開的不能再改
  await as(oid, '#/capsule/' + capId);
  log('owner opened is read-only', await p.locator('#cap-save').count() === 0 && (await p.textContent('#app')).includes('早午餐'));

  // 任務範本（任務包假門）
  await p.goto(U + '#/new/happy'); await p.waitForTimeout(700);
  await p.fill('#f-title', '測試'); await p.click('[data-vis="task"]'); await p.waitForTimeout(300);
  await p.click('#task-tpl'); await p.waitForTimeout(400);
  log('template sheet', await p.locator('.tpl-dlg [data-tpl]').count() === 10);
  await p.screenshot({ path: SHOT('task-templates.png') });
  await p.click('[data-tpl="3"]'); await p.waitForTimeout(400);
  log('template fills task', (await p.inputValue('#f-task')) === '拍一張你現在的自拍給我' && await p.locator('[data-taskmode="photo"].on').count() === 1);
  await p.click('#task-tpl'); await p.waitForTimeout(400);
  await p.click('[data-pack="1"]'); await p.waitForTimeout(300);
  log('pack preview', (await p.textContent('#tpl-pack-view')).includes('撒嬌包'));
  await p.screenshot({ path: SHOT('task-pack-preview.png') });
  await p.click('#pack-want'); await p.waitForTimeout(500);
  log('task pack plus sheet', await p.locator('.plus-dlg').count() === 1);
  await p.click('#plus-yes'); await p.waitForTimeout(500);
  S = await server();
  log('task_pack recorded', S.interests[oid + ':task_pack'] === 1);
  log('errors', errs); await b.close();
})();
