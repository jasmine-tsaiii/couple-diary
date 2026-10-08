// 主題題庫：每個主題開前 5 題；兩人都寫完才揭曉；揭曉前看不到對方、可以改；揭曉後不能改；第 6 題伺服器擋掉；「一起」那一列顯示等你寫的題數
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
  const text = () => p.textContent('#app');
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  await p.click('#role-owner'); await p.waitForTimeout(600);
  const owner = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  // 還沒有另一半：看得到題目，不能寫
  await open('#/topics');
  log('no partner: browse only', (await text()).includes('另一半加入之後就能一起寫') && await p.locator('[data-send]').count() === 0 && (await text()).includes('你是存錢派還是花錢派'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();
  await as(null); await p.goto(U + '#/join'); await p.waitForTimeout(600);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(1500);
  const pid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await as(owner); await p.click('[data-home-approve]'); await p.waitForTimeout(700);

  // 一起分頁：主題題庫在每天一題下面，搶先看裡沒有舊的假門
  await open('#/together');
  const rows = await p.$$eval('.nav-row .nav-text .bold', (e) => e.map((x) => x.textContent));
  log('together row after daily', rows.indexOf('主題題庫') === rows.indexOf('每天一題') + 1 && rows.filter((x) => x === '主題題庫').length === 1, rows.join(','));
  await p.click('#row-topics'); await p.waitForTimeout(800);
  log('5 questions + locked card', await p.locator('[data-send]').count() === 5 && (await text()).includes('還有 25 題'));
  await p.screenshot({ path: SHOT('topics.png'), fullPage: true });
  await p.fill('#tq-money01', '存錢派，但旅行會大方'); await p.click('[data-send="money01"]'); await p.waitForTimeout(900);
  log('owner waiting', (await text()).includes('等小明寫完就一起揭曉') && await p.inputValue('#tq-money01') === '存錢派，但旅行會大方');
  await p.fill('#tq-money01', '存錢派，旅行例外'); await p.click('[data-send="money01"]'); await p.waitForTimeout(900);
  log('can edit before reveal', await p.inputValue('#tq-money01') === '存錢派，旅行例外');
  // 換主題
  await p.click('[data-topic="memory"]'); await p.waitForTimeout(600);
  log('switch topic', p.url().endsWith('#/topics/memory') && (await text()).includes('你對我的第一印象是什麼'));
  await p.fill('#tq-memory02', '你一直笑'); await p.click('[data-send="memory02"]'); await p.waitForTimeout(900);
  // 第 6 題伺服器擋掉
  const blocked = await p.evaluate(async () => { try { await CloudDB.topicSave('money06', 'x'); return false; } catch (e) { return /還沒開放/.test(e.message); } });
  log('q6 blocked', blocked);

  // 另一半：「一起」顯示 2 題等你；看不到主人寫什麼
  await as(pid); await open('#/together');
  log('partner badge', (await p.textContent('#row-topics')).includes('2 題等你'));
  await open('#/topics/money');
  log('partner cannot see', !(await text()).includes('旅行例外') && (await text()).includes('Jasmine寫好了，換你'));
  log('chip dot', (await p.textContent('[data-topic="memory"]')).includes('1'));
  await p.fill('#tq-money01', '花錢派'); await p.click('[data-send="money01"]'); await p.waitForTimeout(900);
  const t1 = await text();
  log('revealed both', t1.includes('存錢派，旅行例外') && t1.includes('花錢派') && !(await p.locator('#tq-money01').count()));
  log('progress 1/5', t1.includes('一起聊完 1 / 5 題'));
  await p.screenshot({ path: SHOT('topics-revealed.png'), fullPage: true });
  // 主人也看到揭曉，不能改
  await as(owner); await open('#/topics/money');
  log('owner sees reveal, no edit', (await text()).includes('花錢派') && !(await p.locator('#tq-money01').count()));
  const locked = await p.evaluate(async () => { try { await CloudDB.topicSave('money01', '改'); return false; } catch (e) { return /已經揭曉/.test(e.message); } });
  log('no edit after reveal', locked);
  // 我有興趣
  await p.click('#tp-yes'); await p.waitForTimeout(500);
  log('interest registered', (await p.textContent('#tp-yes')).includes('已登記'));

  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
