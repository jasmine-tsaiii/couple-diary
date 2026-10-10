// 價值觀地圖：一次一題點五格；做到一半會存；做完先看自己的地圖；兩人都做完才揭曉；揭曉後不能改；差最多的面向接到主題題庫；小鈴鐺通知
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
  const pick = async (v) => { await p.click(`.vm-pick[data-v="${v}"]`); await p.waitForTimeout(350); };
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  await p.click('#role-owner'); await p.waitForTimeout(600);
  const owner = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await open('#/values');
  log('no partner: preview only', (await text()).includes('另一半加入之後就能一起做') && (await text()).includes('吵架方式') && await p.locator('.vm-pick').count() === 0);
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();
  await as(null); await p.goto(U + '#/join'); await p.waitForTimeout(600);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(1500);
  const pid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await as(owner); await p.click('[data-home-approve]'); await p.waitForTimeout(700);

  await open('#/together');
  const rows = await p.$$eval('.nav-row .nav-text .bold', (e) => e.map((x) => x.textContent));
  log('row after topics', rows.indexOf('價值觀地圖') === rows.indexOf('主題題庫') + 1, rows.join(','));
  await p.click('#row-values'); await p.waitForTimeout(800);
  await p.click('#vm-start'); await p.waitForTimeout(400);
  log('q1 shown', (await text()).includes('第 1 / 24 題') && (await text()).includes('年終多了 5 萬'));
  await p.screenshot({ path: SHOT('values-q.png'), fullPage: true });
  // 主人：金錢都偏存錢(1)、吵架都當下講(1)，其他 3
  const mine = [1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 3, 3, 3, 3];
  for (let i = 0; i < 10; i++) await pick(mine[i]);
  log('auto next', (await text()).includes('第 11 / 24 題'));
  await p.click('#vm-prev'); await p.waitForTimeout(300);
  log('prev keeps answer', (await text()).includes('第 10 / 24 題') && await p.locator('.vm-pick.on[data-v="3"]').count() === 1);
  // 做到一半離開，回來接著做
  await open('#/values');
  log('resume', (await text()).includes('第 11 / 24 題'));
  for (let i = 10; i < 24; i++) await pick(mine[i]);
  await p.waitForTimeout(600);
  const tw = await text();
  log('waiting map', tw.includes('我的價值觀地圖') && tw.includes('小明還沒做完') && await p.locator('.vm-dot.you').count() === 0);
  await p.screenshot({ path: SHOT('values-wait.png'), fullPage: true });

  // 另一半：看到「對方做完了」、通知；看不到主人答案
  await as(pid); await open('#/together');
  log('partner badge', (await p.textContent('#row-values')).includes('對方做完了'));
  const notes = await p.evaluate(async () => (await CloudDB.notifications()).map((n) => n.kind));
  log('partner notified', notes.includes('values_partner_done'));
  const peek = await p.evaluate(async () => (await CloudDB.valuesState()).other);
  log('cannot peek', peek === null || peek === undefined);
  await open('#/values');
  log('partner told', (await text()).includes('Jasmine已經做完了'));
  await p.click('#vm-start'); await p.waitForTimeout(400);
  // 另一半：金錢偏享受(5)、吵架偏冷靜(5)、工作 4，其他 3
  const theirs = [5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 3, 3, 3, 3];
  for (let i = 0; i < 24; i++) await pick(theirs[i]);
  await p.waitForTimeout(700);
  const tr = await text();
  log('revealed', tr.includes('我們的價值觀地圖') && await p.locator('.vm-dot.you').count() >= 6);
  log('levels', (await p.textContent('[data-dim="money"] .vm-tag')) === '差很多' && (await p.textContent('[data-dim="work"] .vm-tag')) === '有點不一樣' && (await p.textContent('[data-dim="family"] .vm-tag')) === '很像');
  log('summary', tr.includes('你們在家人、相處距離、未來規劃上很合拍'));
  log('talk links', await p.locator('a.vm-talk[href="#/topics/money"]').count() === 1 && await p.locator('details[data-talk="fight"]').count() === 1);
  await p.screenshot({ path: SHOT('values-reveal.png'), fullPage: true });
  await p.click('details[data-talk="fight"] summary'); await p.waitForTimeout(200);
  log('fight questions', (await text()).includes('暫停'));
  const locked = await p.evaluate(async () => { try { await CloudDB.valuesSave(new Array(24).fill(2)); return false; } catch (e) { return /已經揭曉/.test(e.message); } });
  log('no edit after reveal', locked);
  await p.click('a.vm-talk[href="#/topics/money"]'); await p.waitForTimeout(800);
  log('talk opens topic', p.url().endsWith('#/topics/money'));
  // 主人也看到揭曉、有通知
  await as(owner); await open('#/values');
  log('owner sees reveal', (await text()).includes('我們的價值觀地圖'));
  const n2 = await p.evaluate(async () => (await CloudDB.notifications()).map((n) => n.kind));
  log('owner notified', n2.includes('values_revealed'));
  // 存成圖片做得出來
  const blobOk = await p.evaluate(async () => { const st = await CloudDB.valuesState(); const b = await valuesImage(valuesCompare(st.mine, st.other), '小明'); window.__img = b ? await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); }) : null; return !!b && b.size > 10000; });
  if (process.env.KEEP) { const d = await p.evaluate(() => window.__img); if (d) fs.writeFileSync(SHOT('values-image.png'), Buffer.from(d.split(',')[1], 'base64')); }
  log('image', blobOk);

  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
