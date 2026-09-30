// 每天一題：兩人都寫完才揭曉；揭曉前看不到對方；揭曉後不能改；換日後對方寫了你沒寫的會出現在「等你寫」；以前的題目；重新認識你在頁面底部
const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
const SHOT = (n) => (process.env.SHOT_DIR || '.') + '/' + n;
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); localStorage.setItem('inviteCardHidden', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const as = async (uid) => { await p.evaluate((u) => { if (u) sessionStorage.setItem('mockUid', u); else sessionStorage.removeItem('mockUid'); }, uid); await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(1000); };
  const open = async (h) => { await p.goto(U + h); await p.reload(); await p.waitForSelector('.topbar, .home-head'); await p.waitForTimeout(800); };
  const mutate = (fn) => p.evaluate((f) => { const S = JSON.parse(localStorage.getItem('mockServer')); new Function('S', f)(S); localStorage.setItem('mockServer', JSON.stringify(S)); }, fn);
  const text = () => p.textContent('#app');
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  await p.click('#role-owner'); await p.waitForTimeout(600);
  const owner = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  // 還沒有另一半
  await open('#/daily');
  log('no partner yet', (await text()).includes('另一半加入之後就能一起寫'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();
  await as(null); await p.goto(U + '#/join'); await p.waitForTimeout(600);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(1500);
  const pid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await as(owner); await p.click('[data-home-approve]'); await p.waitForTimeout(700);

  // 一起分頁：每天一題在第一列，重新認識你不在這裡
  await open('#/together');
  const rows = await p.$$eval('.nav-row .nav-text .bold', (e) => e.map((x) => x.textContent));
  log('together: daily first, no quiz row', rows[0] === '每天一題' && !rows.includes('重新認識你'), rows.join(','));
  log('together badge not written', (await p.textContent('#row-daily')).includes('還沒寫'));
  await p.screenshot({ path: SHOT('together.png') });

  // 主人先寫
  await open('#/daily');
  const q1 = await p.getAttribute('#d-send', 'data-q');
  log('quiz row at bottom', await p.locator('#row-quiz').count() === 1);
  await p.screenshot({ path: SHOT('daily-today.png') });
  await p.fill('#d-today', '想去海邊'); await p.click('#d-send'); await p.waitForTimeout(900);
  log('owner waiting', (await text()).includes('等小明寫完就一起揭曉') && await p.inputValue('#d-today') === '想去海邊');
  await p.screenshot({ path: SHOT('daily-waiting.png') });
  // 揭曉前可以改
  await p.fill('#d-today', '想去海邊看日出'); await p.click('#d-send'); await p.waitForTimeout(900);
  log('can edit before reveal', await p.inputValue('#d-today') === '想去海邊看日出');

  // 另一半：同一題，看不到主人寫什麼；今天頁有提示卡
  await as(pid);
  const tipsBefore = await p.$$eval('#app > .card, #app > a.card', (e) => e.map((x) => x.id || x.getAttribute('href') || x.className));
  log('partner home: one tip only', tipsBefore.length <= 1, JSON.stringify(tipsBefore));
  await open('#/daily');
  log('same question for both', (await p.getAttribute('#d-send', 'data-q')) === q1);
  log('partner cannot see owner answer', !(await text()).includes('海邊') && (await text()).includes('Jasmine寫好了，換你'));
  await p.fill('#d-today', '想去山上'); await p.click('#d-send'); await p.waitForTimeout(900);
  const t1 = await text();
  log('revealed both', t1.includes('想去海邊看日出') && t1.includes('想去山上') && !(await p.locator('#d-today').count()));
  log('month count 1', t1.includes('這個月一起寫了 1 天'));
  await p.screenshot({ path: SHOT('daily-revealed.png'), fullPage: true });
  await as(pid); log('partner home tip gone after writing', !(await p.isVisible('#daily-tip')));
  // 主人也看到揭曉，不能改
  await as(owner); await open('#/daily');
  log('owner sees reveal, no edit', (await text()).includes('想去山上') && !(await p.locator('#d-send').count()));

  // 換日：主人寫了，另一半沒寫；再換日，另一半在「等你寫」補寫
  const day = (k) => new Date(Date.now() + 8 * 3600e3 + k * 864e5).toISOString().slice(0, 10);
  await mutate(`S.dailyToday = '${day(1)}';`);
  // 今天頁：沒有別的提示卡時，出現今天這一題；按叉叉今天不再出現
  await p.evaluate(async () => { await DB.setSetting('names', { me: 'Jasmine', partner: '小明' }); await DB.setSetting('backupSnoozeAt', Date.now()); localStorage.setItem('quizTipHiddenAt', String(Date.now())); localStorage.setItem('a2hsShown', JSON.stringify({ n: 3, at: Date.now() })); });
  await open('#/');
  log('owner home daily tip', await p.isVisible('#daily-tip'));
  await p.screenshot({ path: SHOT('home-daily-tip.png'), clip: { x: 0, y: 0, width: 390, height: 700 } });
  await p.click('#daily-tip-x'); await p.waitForTimeout(200); await open('#/');
  log('tip hidden for today after x', !(await p.isVisible('#daily-tip')));
  await open('#/daily');
  const q2 = await p.getAttribute('#d-send', 'data-q');
  log('new day new question', q2 && q2 !== q1);
  await p.fill('#d-today', '今天好累'); await p.click('#d-send'); await p.waitForTimeout(900);
  await mutate(`S.dailyToday = '${day(2)}';`);
  await as(pid); await open('#/daily');
  log('pending shows yesterday', await p.locator(`[data-late="${day(1)}"]`).count() === 1);
  await p.screenshot({ path: SHOT('daily-pending.png'), fullPage: true });
  await p.fill(`#d-late-${day(1)}`, '抱抱你'); await p.click(`[data-late="${day(1)}"]`); await p.waitForTimeout(900);
  log('late answer revealed into history', await p.locator(`[data-late="${day(1)}"]`).count() === 0 && await p.locator('.daily-past').count() === 2);
  await p.locator('.daily-past summary').first().click(); await p.waitForTimeout(200);
  log('history shows both answers', (await p.textContent('.daily-past')).includes('今天好累') && (await p.textContent('.daily-past')).includes('抱抱你'));
  await p.screenshot({ path: SHOT('daily-history.png'), fullPage: true });
  // 主人那邊：沒有「等你寫」
  await as(owner); await open('#/daily');
  log('owner has no pending', await p.locator('[data-late]').count() === 0);
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  log('no horizontal overflow', !overflow);
  log('errors', errs); await b.close();
})();
