// 獎勵存錢筒（2026-10-15）：規則、記一筆＋備註、目標進度 %、存滿、買了、帳本、另一半按愛心／寫鼓勵／加碼、暫停分享、試用版
const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 360, height: 780 } });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (r) => r.abort());
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); new MutationObserver(() => document.querySelectorAll('.tour-dlg').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => localStorage.setItem('mockAutoApprove', '1'));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  let promptAnswer = '';
  p.on('dialog', (d) => (d.type() === 'prompt' ? d.accept(promptAnswer) : d.accept()));
  const log = (...a) => console.log(...a);
  const shot = async (name) => { if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/${name}.png`, fullPage: true }); };
  const noOverflow = () => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const as = async (uid, hash) => { await p.evaluate((u) => (u ? sessionStorage.setItem('mockUid', u) : sessionStorage.removeItem('mockUid')), uid); await p.goto(U + '#/settings'); await p.reload(); await p.waitForTimeout(500); await p.goto(U + hash); await p.reload(); await p.waitForTimeout(800); };
  // 試用版（沒登入）：存在這支手機
  await p.goto(U + '#/piggy'); await p.waitForTimeout(900);
  log('local seeded rules', (await p.$$('.pg-rule')).length === 3);
  log('local no partner tab', !(await p.isVisible('.pg-seg')));
  await p.click('.pg-rule >> nth=0'); await p.waitForTimeout(300);
  log('local prefilled', (await p.inputValue('#pg-amount')) === '50');
  await p.fill('#pg-note', '試用版也能存'); await p.click('#pg-save'); await p.waitForTimeout(500);
  log('local entry', (await p.textContent('.pg-list')).includes('試用版也能存'));
  // 登入、建立分享碼、另一半加入並綁定
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
  // 主人：一起分頁有這一列
  await as('owner-jas', '#/together');
  log('together row', await p.isVisible('#row-piggy'));
  await p.click('#row-piggy'); await p.waitForTimeout(800);
  log('cloud seeded rules', (await p.$$('.pg-rule')).length === 3);
  log('has partner tab', (await p.textContent('.pg-seg')).includes('小明的'));
  // 設目標
  await p.click('#pg-goal-new'); await p.waitForTimeout(300);
  await p.fill('#pg-g-title', '新耳機'); await p.click('[data-gemo="🎧"]'); await p.fill('#pg-g-target', '3000'); await p.click('#pg-g-save'); await p.waitForTimeout(700);
  log('goal 0%', (await p.textContent('#pg-pct')).trim() === '0%');
  // 點規則存一筆＋備註
  await p.click('.pg-rule >> nth=0'); await p.waitForTimeout(300);
  await p.fill('#pg-note', '河堤跑了 5 公里，累但很爽'); await p.click('#pg-save'); await p.waitForTimeout(700);
  log('entry with note', (await p.textContent('.pg-list')).includes('河堤跑了 5 公里'));
  log('pct 1%', (await p.textContent('#pg-pct')).trim() === '1%');
  // 自己填：瘦 1 公斤 1000
  await p.click('#pg-add'); await p.waitForTimeout(300);
  await p.fill('#pg-title', '瘦 1 公斤'); await p.click('[data-emo="⚖️"]'); await p.fill('#pg-amount', '1000'); await p.fill('#pg-note', '終於破 5 字頭'); await p.click('#pg-save'); await p.waitForTimeout(700);
  log('pct 35%', (await p.textContent('#pg-pct')).trim() === '35%');
  await shot('piggy-main');
  log('no overflow main', await noOverflow());
  // 改一筆：金額改成 2000，再存一筆讓它存滿
  await p.click('.pg-ent-main >> text=瘦 1 公斤'); await p.waitForTimeout(300);
  log('edit dialog', (await p.inputValue('#pg-amount')) === '1000');
  await p.fill('#pg-amount', '2000'); await p.click('#pg-save'); await p.waitForTimeout(700);
  log('pct 68%', (await p.textContent('#pg-pct')).trim() === '68%');
  await p.click('#pg-add'); await p.waitForTimeout(300);
  await p.fill('#pg-title', '月底獎金'); await p.fill('#pg-amount', '1000'); await p.click('#pg-save'); await p.waitForTimeout(800);
  log('celebrate', await p.isVisible('.pg-done'));
  await shot('piggy-full');
  if (await p.isVisible('#pg-done-ok')) await p.click('#pg-done-ok');
  log('pct 100%', (await p.textContent('#pg-pct')).trim() === '100%');
  log('buy button', await p.isVisible('#pg-buy'));
  // 規則：新增花掉的規則、往上移
  await p.click('.pg-rules-btn'); await p.waitForTimeout(700);
  await p.click('#pg-r-new'); await p.waitForTimeout(300);
  await p.click('[data-rdir="out"]'); await p.click('[data-remo="🧋"]'); await p.fill('#pg-r-title', '喝一杯手搖'); await p.fill('#pg-r-amount', '60'); await p.click('#pg-r-save'); await p.waitForTimeout(700);
  log('rule added', (await p.$$('.pg-rule-row')).length === 4);
  await p.click('[data-up="3"]'); await p.waitForTimeout(700);
  log('rule moved', (await p.textContent('.pg-rule-row >> nth=2')).includes('喝一杯手搖'));
  await shot('piggy-rules');
  // 另一半：看、按愛心、寫鼓勵、加碼
  await as(pid, '#/piggy/partner');
  log('partner sees goal', (await p.textContent('.pg-goal')).includes('新耳機'));
  log('partner no edit', !(await p.isVisible('#pg-buy')) && !(await p.isVisible('.pg-rules-btn')));
  const target = p.locator('.pg-ent', { hasText: '河堤跑了' });
  await target.locator('[data-heart]').click(); await p.waitForTimeout(700);
  log('heart on', (await p.locator('.pg-ent', { hasText: '河堤跑了' }).locator('[data-heart]').textContent()).includes('已按'));
  promptAnswer = '5 公里也太強，週末陪你跑';
  await p.locator('.pg-ent', { hasText: '河堤跑了' }).locator('[data-cheer]').click(); await p.waitForTimeout(700);
  log('cheer shown', (await p.locator('.pg-ent', { hasText: '河堤跑了' }).textContent()).includes('週末陪你跑'));
  await p.click('#pg-boost'); await p.waitForTimeout(300);
  await p.fill('#pg-b-amount', '200'); await p.fill('#pg-b-note', '看你這麼努力'); await p.click('#pg-b-save'); await p.waitForTimeout(700);
  log('boost listed', (await p.textContent('.pg-list')).includes('看你這麼努力'));
  await shot('piggy-partner');
  // 另一半自己的存錢筒
  await p.click('.pg-seg a >> nth=0'); await p.waitForTimeout(800);
  log('partner own seeded', (await p.$$('.pg-rule')).length === 3);
  // 主人看到愛心、鼓勵、加碼；通知
  await as('owner-jas', '#/piggy');
  const run = p.locator('.pg-ent', { hasText: '河堤跑了' });
  log('owner sees heart', (await run.textContent()).includes('♥ 小明'));
  log('owner sees cheer', (await run.textContent()).includes('小明：5 公里也太強'));
  log('owner no heart btn', (await run.locator('[data-heart]').count()) === 0);
  log('balance with boost', (await p.textContent('.pg-goal')).includes('NT$3,250'));
  await p.goto(U + '#/notifications'); await p.waitForTimeout(800);
  const nt = await p.textContent('#app');
  log('notif heart', nt.includes('按了愛心'));
  log('notif cheer', nt.includes('寫了鼓勵'));
  log('notif boost', nt.includes('加碼了 NT$200'));
  // 買了
  await p.goto(U + '#/piggy'); await p.waitForTimeout(800);
  await p.click('#pg-buy'); await p.waitForTimeout(900);
  if (await p.isVisible('#pg-done-ok')) await p.click('#pg-done-ok');
  log('after buy no goal', await p.isVisible('#pg-goal-new'));
  log('done goals', (await p.textContent('#app')).includes('完成過的目標'));
  log('balance 250', (await p.textContent('.pg-goal')).includes('NT$250'));
  // 帳本
  await p.click('#pg-ledger'); await p.waitForTimeout(800);
  const sum = await p.textContent('.pg-sum');
  log('ledger in', sum.includes('+3,250'));
  log('ledger out', sum.includes('−3,000'));
  log('ledger notes', (await p.textContent('#app')).includes('終於破 5 字頭'));
  log('no overflow ledger', await noOverflow());
  await shot('piggy-ledger');
  // 另一半收到存滿通知
  await as(pid, '#/notifications');
  log('partner full notif', (await p.textContent('#app')).includes('存滿了「新耳機」'));
  // 暫停分享：另一半看不到
  await p.evaluate(() => { const S = JSON.parse(localStorage.mockServer); S.t.settings.push({ owner: 'owner-jas', key: 'sharePaused', value: true }); localStorage.mockServer = JSON.stringify(S); });
  await as(pid, '#/piggy/partner');
  log('paused hidden', (await p.textContent('#app')).includes('暫停分享中'));
  // 深色模式不跑版
  await p.emulateMedia({ colorScheme: 'dark' });
  await as('owner-jas', '#/piggy');
  log('dark no overflow', await noOverflow());
  await shot('piggy-dark');
  console.log('errors', errs); await b.close();
})();
