// 倒數日：新增、列表、首頁小日曆（最近的／釘在首頁的／當天／隔天問要不要記下來）、每年重複、自動週年可以隱藏、另一半也能改、小鈴鐺文字、試用版存在手機
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
  const tile = () => p.evaluate(() => { const e = document.getElementById('cd-pill'); return e ? `${e.getAttribute('aria-label')}|${e.textContent.replace(/\s+/g, '')}` : ''; });
  const askRow = () => p.evaluate(() => { const e = document.getElementById('cd-ask-row'); return e ? e.textContent : ''; });
  const pinnedTitles = () => p.evaluate(() => JSON.parse(localStorage.getItem('mockServer')).countdowns.filter((c) => c.pinned).map((c) => c.title).join(','));
  const day = (n) => p.evaluate((k) => cdShift(today(), k), n);
  const add = async (title, date, opts = {}) => {
    await open('#/countdown/new');
    if (opts.kind) { await p.click(`[data-kind="${opts.kind}"]`); await p.waitForTimeout(200); }
    if (title !== null) await p.fill('#cd-title', title);
    if (opts.yearly && !(await p.isChecked('#cd-yearly'))) { await p.check('#cd-yearly'); await p.waitForTimeout(200); }
    if (opts.pin !== undefined && (await p.isChecked('#cd-pin')) !== opts.pin) await p.click('label[for="cd-pin"]');
    await p.fill('#cd-date', date); await p.dispatchEvent('#cd-date', 'change');
    await p.click('#cd-save'); await p.waitForTimeout(900);
  };

  // 試用（沒登入）：存在這支手機
  await p.goto(U + '#/'); await p.waitForTimeout(800);
  await add('去京都', await day(12));
  log('guest: saved locally', p.url().endsWith('#/countdowns') && (await text()).includes('去京都') && (await p.textContent('.cd-hero-num')).includes('12'));
  await open('#/');
  log('guest: home tile', (await tile()).includes('距離「去京都」還有 12 天|去京都12天後'), await tile());

  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  await p.click('#role-owner'); await p.waitForTimeout(600);
  const owner = await p.evaluate(() => sessionStorage.getItem('mockUid'));

  // 一起分頁：主題題庫下面多一列倒數日；還沒有就寫說明
  await open('#/together');
  const rows = await p.$$eval('.nav-row .nav-text .bold', (e) => e.map((x) => x.textContent));
  log('together row after topics', rows.indexOf('倒數日') === rows.indexOf('主題題庫') + 1, rows.join(','));
  log('row empty sub', (await p.textContent('#row-countdowns')).includes('還有幾天'));
  await p.click('#row-countdowns'); await p.waitForTimeout(800);
  log('empty list', (await text()).includes('還沒有倒數日'));

  // 新增：過去的日期擋掉；選「生日」自動勾每年重複，就能選以前的日期
  await open('#/countdown/new');
  await p.fill('#cd-title', '過去的'); await p.fill('#cd-date', await day(-3)); await p.dispatchEvent('#cd-date', 'change');
  log('past date warning', (await p.textContent('#cd-left')).includes('已經過了'));
  await p.click('#cd-save'); await p.waitForTimeout(500);
  log('past date blocked', p.url().includes('#/countdown/new'));
  await add('去京都', await day(12), { kind: 'trip' });
  await add(null, '1995-' + (await day(40)).slice(5), { kind: 'birthday' });
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('mockServer')).countdowns);
  log('birthday yearly + title from chip', st.length === 2 && st.some((c) => c.title === '生日' && c.yearly && c.kind === 'birthday') && st.some((c) => c.title === '去京都' && c.kind === 'trip' && !c.yearly));
  await open('#/countdowns');
  log('list: hero + next', (await p.textContent('.cd-hero')).includes('去京都') && (await text()).includes('接下來') && (await text()).includes('每年'));
  const bdayNum = await p.$$eval('.cd-row .cd-num b', (e) => e.map((x) => x.textContent));
  log('yearly counts to next birthday', bdayNum.includes('40'), bdayNum.join(','));

  // 在一起的日期：自動出現週年和第 N00 天，按一下可以隱藏、再顯示回來
  await p.evaluate(async (s) => { await DB.setSetting('names', { me: 'Jasmine', partner: '小明', since: s }); }, await day(-523 + 1));
  await open('#/countdowns');
  log('auto items', (await text()).includes('在一起第 600 天') && (await text()).includes('週年') && (await text()).includes('自動'));
  await p.click('[data-cd="auto-days"]'); await p.waitForTimeout(700);
  log('auto hidden', !(await text()).includes('在一起第 600 天') && await p.locator('#cd-unhide').count() === 1);
  await p.click('#cd-unhide'); await p.waitForTimeout(700);
  log('auto back', (await text()).includes('在一起第 600 天'));
  await p.screenshot({ path: SHOT('countdowns.png'), fullPage: true });

  // 首頁：標題右邊一張小日曆，顯示最近的；鈴鐺在它上面
  await open('#/');
  log('home tile nearest', (await tile()).includes('去京都12天後') && (await p.textContent('.home-head')).includes('在一起第 523 天') && await p.locator('.home-head.has-cd .bell-btn').count() === 1);
  const box = async (sel) => p.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, r: r.right, b: r.bottom }; });
  const [tb, bb, hb] = [await box('#cd-pill'), await box('.home-head .bell-btn'), await box('.home-head .title-xl')];
  log('greeting one line with tile', await p.$eval('.home-head .hello', (e) => Math.round(e.getBoundingClientRect().height / (parseFloat(getComputedStyle(e).lineHeight) || 21)) === 1));
  log('tile right of title, bell above', tb.x >= hb.r && bb.b <= tb.y + 2 && tb.r <= 390, JSON.stringify({ tb, bb, hb }));
  await p.screenshot({ path: SHOT('home-tile.png') });
  await p.click('#cd-pill'); await p.waitForTimeout(700);
  log('tile opens list', p.url().endsWith('#/countdowns'));

  // 放在首頁：釘了就固定顯示那一個；一次只能一個；取消就回到最近的
  await add('搬新家', await day(30), { kind: 'move', pin: true });
  await open('#/');
  log('pinned shows on home', (await tile()).includes('搬新家30天後'), await tile());
  await open('#/countdowns');
  log('list marks pinned', (await text()).includes('放在首頁'));
  const bday = await p.evaluate(() => JSON.parse(localStorage.getItem('mockServer')).countdowns.find((c) => c.title === '生日').id);
  await open(`#/countdown/${bday}`);
  log('form says it replaces', (await text()).includes('會取代「搬新家」'));
  await p.click('label[for="cd-pin"]'); await p.click('#cd-save'); await p.waitForTimeout(900);
  log('only one pinned', (await pinnedTitles()) === '生日', await pinnedTitles());
  await open(`#/countdown/${bday}`);
  await p.click('label[for="cd-pin"]'); await p.click('#cd-save'); await p.waitForTimeout(900);
  await open('#/');
  log('unpinned back to nearest', (await pinnedTitles()) === '' && (await tile()).includes('去京都12天後'));
  const move = await p.evaluate(() => JSON.parse(localStorage.getItem('mockServer')).countdowns.find((c) => c.title === '搬新家').id);
  await open(`#/countdown/${move}`); await p.click('#cd-del'); await p.waitForTimeout(900);

  // 另一半加入：看得到、也能改
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();
  await as(null); await p.goto(U + '#/join'); await p.waitForTimeout(600);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(1500);
  const pid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await as(owner); await p.click('[data-home-approve]'); await p.waitForTimeout(700);
  await as(pid);
  log('partner home tile', (await tile()).includes('去京都') && await p.locator('.home-head.has-cd').count() === 1);
  await open('#/countdowns');
  log('partner sees who added', (await text()).includes('Jasmine新增'));
  const kyoto = await p.evaluate(() => JSON.parse(localStorage.getItem('mockServer')).countdowns.find((c) => c.title === '去京都').id);
  await open(`#/countdown/${kyoto}`);
  log('partner can edit', (await p.textContent('#app')).includes('Jasmine新增的') && await p.locator('#cd-del').count() === 1);
  await p.fill('#cd-title', '去京都五天'); await p.click('#cd-save'); await p.waitForTimeout(900);
  await add('見面', await day(0), { kind: 'meet' });
  await as(owner);
  log('owner sees partner edit + today tile', (await tile()).includes('今天就是「見面」|見面今天就是今天') && await p.locator('#cd-pill.today').count() === 1, await tile());
  await open('#/countdowns');
  log('owner sees partner item', (await text()).includes('小明新增') && (await text()).includes('去京都五天'));

  // 刪掉今天的；放一個昨天的（每年重複），首頁問要不要記成美好時刻
  const meet = await p.evaluate(() => JSON.parse(localStorage.getItem('mockServer')).countdowns.find((c) => c.title === '見面').id);
  await open(`#/countdown/${meet}`); await p.click('#cd-del'); await p.waitForTimeout(900);
  log('deleted', !(await text()).includes('見面'));
  await add('第一次露營', '2020-' + (await day(-1)).slice(5), { yearly: true });
  await open('#/');
  log('yesterday ask', (await askRow()).includes('「第一次露營」') && await p.locator('#cd-ask').count() === 1 && (await tile()).includes('去京都五天'));
  await p.click('#cd-ask'); await p.waitForTimeout(900);
  log('record prefilled', p.url().includes('#/new/happy') && await p.inputValue('#f-title').catch(() => '') === '第一次露營');
  await open('#/');
  log('ask only once', (await askRow()) === '' && (await tile()).includes('去京都五天'));
  await p.evaluate(() => { const S = JSON.parse(localStorage.getItem('mockServer')); S.noCountdownPin = true; localStorage.setItem('mockServer', JSON.stringify(S)); });
  await open('#/countdown/new');
  await p.fill('#cd-title', '舊資料庫'); await p.fill('#cd-date', await day(5)); await p.dispatchEvent('#cd-date', 'change');
  await p.click('label[for="cd-pin"]'); await p.click('#cd-save'); await p.waitForTimeout(300);
  log('pin not ready: still saved', ((await p.textContent('#toast').catch(() => '')) || '').includes('要等一下') && (await pinnedTitles()) === '' && (await p.evaluate(() => JSON.parse(localStorage.getItem('mockServer')).countdowns.some((c) => c.title === '舊資料庫'))));

  // 小鈴鐺：倒數日通知的文字和連結
  await p.evaluate((uid) => { const S = JSON.parse(localStorage.getItem('mockServer')); S.notifs = [
    { id: 1, recipient: uid, actor_name: '', kind: 'countdown', extra: { id: 'x', title: '去京都五天', days: 3 }, created_at: new Date().toISOString(), read_at: null },
    { id: 2, recipient: uid, actor_name: '', kind: 'countdown', extra: { id: 'y', title: '生日', days: 0 }, created_at: new Date(Date.now() - 1000).toISOString(), read_at: null }];
    localStorage.setItem('mockServer', JSON.stringify(S)); }, owner);
  await open('#/notifications');
  log('bell text', (await text()).includes('再 3 天就是「去京都五天」了') && (await text()).includes('今天就是「生日」！'));

  // 資料庫還沒更新：列表說明、首頁不壞
  await p.evaluate(() => { const S = JSON.parse(localStorage.getItem('mockServer')); S.noCountdowns = true; localStorage.setItem('mockServer', JSON.stringify(S)); });
  await open('#/countdowns');
  log('not ready message', (await text()).includes('還在準備中') && await p.locator('#cd-new').count() === 0);
  await p.goto(U + '#/countdown/new'); await p.waitForTimeout(1200);
  log('not ready: form sends back', p.url().endsWith('#/countdowns'));
  const saveErr = await p.evaluate(async () => { try { await CloudDB.countdownSave({ title: 'x', on_date: today(), kind: 'custom' }); return ''; } catch (e) { return e.message; } });
  log('not ready: friendly save error', saveErr === '倒數日還在準備中，過一陣子再試試', saveErr);
  await open('#/');
  log('home ok when not ready', (await p.textContent('.home-head')).includes('在一起第 523 天'));
  await p.screenshot({ path: SHOT('home.png') });

  log('errors', JSON.stringify(errs));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
