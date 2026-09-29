// 重新認識你：開始一回 → 各自作答（自動存草稿）→ 一方交卷等待 → 兩人都交卷揭曉 → 猜中 → 7 天後封存 → 下一回並排「上次｜這次」
const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
const SHOT = (n) => (process.env.SHOT_DIR || '.') + '/' + n;
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const as = async (uid) => { await p.evaluate((u) => { if (u) sessionStorage.setItem('mockUid', u); else sessionStorage.removeItem('mockUid'); }, uid); await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(1000); };
  const openQuiz = async () => { await p.goto(U + '#/quiz'); await p.reload(); await p.waitForSelector('.topbar'); await p.waitForTimeout(700); };
  const mutate = (fn) => p.evaluate((f) => { const S = JSON.parse(localStorage.getItem('mockServer')); new Function('S', f)(S); localStorage.setItem('mockServer', JSON.stringify(S)); }, fn);
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  await p.click('#role-owner'); await p.waitForTimeout(600);
  const owner = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  // 還沒有另一半
  await openQuiz();
  log('no partner yet message', (await p.textContent('#app')).includes('另一半加入之後就能一起玩'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();
  await as(null); await p.goto(U + '#/join'); await p.waitForTimeout(600);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(1500);
  const pid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await as(owner); await p.click('[data-home-approve]'); await p.waitForTimeout(700);

  // 主人開始第一回
  await openQuiz();
  await p.screenshot({ path: SHOT('quiz-start.png') });
  await p.click('#q-start'); await p.waitForSelector('[data-qa]');
  const n = await p.locator('[data-qa]').count();
  log('14 questions', n === 14);
  await p.screenshot({ path: SHOT('quiz-form.png') });
  // 寫一題就離開：草稿有存
  await p.fill('[data-qa="c1"]', '一起吃早餐'); await p.fill('[data-qg="c1"]', '打電動'); await p.waitForTimeout(1800);
  await p.goto(U + '#/'); await p.waitForTimeout(500); await openQuiz();
  log('draft kept', (await p.inputValue('[data-qa="c1"]')) === '一起吃早餐' && (await p.inputValue('[data-qg="c1"]')) === '打電動');
  // 沒寫完不能交卷
  await p.click('#q-submit'); await p.waitForTimeout(400);
  log('still on form when incomplete', await p.locator('[data-qa]').count() === 14);
  for (const el of await p.locator('[data-qa]').all()) { if (!(await el.inputValue())) await el.fill('主人的答案' + (await el.getAttribute('data-qa'))); }
  await p.click('#q-submit'); await p.waitForTimeout(900);
  log('owner waiting', (await p.textContent('#app')).includes('等小明交卷後'));
  await p.screenshot({ path: SHOT('quiz-waiting.png') });

  // 另一半：看得到「寫好了」，看不到內容
  await as(pid); await openQuiz();
  const ptxt = await p.textContent('#app');
  log('partner sees owner done, not content', ptxt.includes('已經寫好了') && !ptxt.includes('主人的答案'));
  for (const el of await p.locator('[data-qa]').all()) await el.fill('小明的答案' + (await el.getAttribute('data-qa')));
  await p.fill('[data-qg="c1"]', '一起吃早餐吧');
  await p.click('#q-submit'); await p.waitForTimeout(900);
  log('revealed', (await p.textContent('#app')).includes('揭曉') && (await p.textContent('#app')).includes('主人的答案c2'));
  // 主人猜的「打電動」出現在小明那一題，小明判定：沒猜中；小明猜的「一起吃早餐吧」出現在主人那一題
  await as(owner); await openQuiz();
  await p.click('[data-qhit="c1"]'); await p.waitForTimeout(700);
  log('hit marked', (await p.textContent('[data-qhit="c1"]')).includes('猜中了 📮') && (await p.textContent('#app')).includes('小明猜中 1 題'));
  await p.screenshot({ path: SHOT('quiz-reveal.png'), fullPage: true });
  // 記成美好時刻
  await p.click('[data-qrec="c1"]'); await p.waitForSelector('#f-title');
  log('prefill record', (await p.inputValue('#f-title')).startsWith('重新認識你：'));
  await p.goto(U + '#/'); await p.waitForTimeout(400);

  // 8 天後：封存
  await mutate("S.quiz.rounds.forEach(r => { r.started_at = new Date(Date.now() - 30*864e5).toISOString(); r.revealed_at = new Date(Date.now() - 8*864e5).toISOString(); });");
  await openQuiz();
  const sealed = await p.textContent('#app');
  log('sealed', sealed.includes('封存成時光膠囊') && !sealed.includes('主人的答案') && !(await p.locator('#q-start').count()));
  await p.screenshot({ path: SHOT('quiz-sealed.png') });
  // 100 天後：第二回，作答時看不到上一回
  await mutate("S.quiz.rounds.forEach(r => { r.started_at = new Date(Date.now() - 100*864e5).toISOString(); r.revealed_at = new Date(Date.now() - 95*864e5).toISOString(); });");
  await openQuiz(); await p.click('#q-start'); await p.waitForSelector('[data-qa]');
  log('round 2 form has no old answers', !(await p.textContent('#app')).includes('主人的答案'));
  const newQs = await p.evaluate(() => [...document.querySelectorAll('[data-qa]')].map((e) => e.dataset.qa).filter((x) => x.startsWith('p')));
  const oldQs = await p.evaluate(() => JSON.parse(localStorage.getItem('mockServer')).quiz.rounds[0].questions.map((q) => q.id).filter((x) => x.startsWith('p')));
  log('new questions not repeated', newQs.length === 4 && newQs.every((q) => !oldQs.includes(q)));
  for (const el of await p.locator('[data-qa]').all()) { const id = await el.getAttribute('data-qa'); await el.fill(id === 'c2' ? '主人的答案c2' : '主人新答案' + id); }
  await p.click('#q-submit'); await p.waitForTimeout(800);
  await as(pid); await openQuiz();
  for (const el of await p.locator('[data-qa]').all()) await el.fill('小明新答案' + (await el.getAttribute('data-qa')));
  await p.click('#q-submit'); await p.waitForTimeout(900);
  const r2 = await p.textContent('#app');
  log('round 2 shows last time', r2.includes('第 2 回揭曉') && r2.includes('上次') && r2.includes('主人的答案c1') && r2.includes('沒變') && r2.includes('變了'));
  await p.screenshot({ path: SHOT('quiz-reveal-2.png'), fullPage: true });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  log('no horizontal overflow', !overflow);
  log('errors', errs); await b.close();
})();
