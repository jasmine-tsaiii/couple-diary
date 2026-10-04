// 秘密留言板：沒有另一半時的說明；手寫和打字送出；對方打開 App 整張跳出來一次；紅點；看過了；以前的紙條、刪掉自己的；通知文字
const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
const SHOT = (n) => (process.env.SHOT_DIR || '.') + '/' + n;
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); localStorage.setItem('inviteCardHidden', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate:not(.note-pop)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const as = async (uid) => { await p.evaluate((u) => { if (u) sessionStorage.setItem('mockUid', u); else sessionStorage.removeItem('mockUid'); }, uid); await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(1000); };
  const open = async (h) => { await p.goto(U + h); await p.reload(); await p.waitForSelector('.topbar, .home-head'); await p.waitForTimeout(800); };
  const text = () => p.textContent('#app');
  const server = () => p.evaluate(() => JSON.parse(localStorage.getItem('mockServer')));

  // 試用：入口說要註冊
  await open('#/notes');
  log('guest sees signup', (await text()).includes('註冊並邀請另一半加入之後'));

  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  await p.click('#role-owner'); await p.waitForTimeout(600);
  const owner = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await open('#/notes');
  log('no partner yet', (await text()).includes('另一半加入之後就能寫紙條給對方'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();
  await as(null); await p.goto(U + '#/join'); await p.waitForTimeout(600);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小安'); await p.click('#join-btn'); await p.waitForTimeout(1500);
  const pid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await as(owner); await p.click('[data-home-approve]'); await p.waitForTimeout(700);

  // 一起：第一列是秘密留言板
  await open('#/together');
  const rows = await p.$$eval('.nav-row .nav-text .bold', (e) => e.map((x) => x.textContent));
  log('together: notes first', rows[0] === '秘密留言板', rows.join(','));
  await p.click('#row-notes'); await p.waitForTimeout(900);
  log('empty board', (await text()).includes('小安還沒留紙條給你'));
  await p.screenshot({ path: SHOT('notes-empty.png') });

  // 手寫一張
  await p.click('#note-write'); await p.waitForSelector('#note-cv', { state: 'attached' });
  log('no tabbar while writing', await p.evaluate(() => document.getElementById('tabbar').hidden));
  await p.click('[data-mode="draw"]');
  await p.click('#note-send'); await p.waitForTimeout(400);
  log('empty draw refused', (await p.textContent('#toast')).includes('先在紙上寫點什麼'));
  const box = await p.locator('#note-cv').boundingBox();
  await p.click('[data-pen="red"]');
  await p.mouse.move(box.x + 60, box.y + 80); await p.mouse.down();
  for (let i = 0; i <= 20; i++) await p.mouse.move(box.x + 60 + i * 10, box.y + 80 + Math.sin(i / 2) * 30);
  await p.mouse.up();
  await p.screenshot({ path: SHOT('notes-draw.png') });
  await p.click('#note-send'); await p.waitForTimeout(1200);
  let S = await server();
  log('draw saved as png', S.notes.length === 1 && S.notes[0].kind === 'draw' && /^data:image\/png;base64,/.test(S.notes[0].image) && S.notes[0].image.length < 400000 && S.notes[0].recipient === pid, S.notes[0] && S.notes[0].image.length);
  log('back on board', p.url().endsWith('#/notes') && (await text()).includes('小安還沒看'));

  // 打字一張
  await p.goto(U + '#/notes/new'); await p.waitForSelector('#note-ta', { state: 'attached' });
  await p.click('[data-mode="text"]');
  await p.fill('#note-ta', '今天面試加油 <b>晚上請你吃拉麵</b>');
  log('counter', (await p.textContent('#note-count')).includes('/ 120'));
  await p.click('#note-send'); await p.waitForTimeout(1200);
  S = await server();
  log('text saved', S.notes.length === 2 && S.notes[1].kind === 'text' && S.notes[1].body.startsWith('今天面試加油'));

  // 另一半打開 App：最新那張整張跳出來
  await as(pid); await p.waitForTimeout(1500);
  log('pop shown', await p.locator('.note-pop').count() === 1);
  log('pop shows text, escaped', (await p.textContent('.note-pop')).includes('<b>晚上請你吃拉麵</b>') && await p.locator('.note-pop b').count() === 0);
  await p.screenshot({ path: SHOT('notes-pop.png') });
  await p.click('#note-pop-close'); await p.waitForTimeout(600);
  S = await server();
  log('seen after pop', S.notes.every((n) => n.seen_at));
  await p.reload(); await p.waitForTimeout(1800);
  log('pop only once', await p.locator('.note-pop').count() === 0);
  log('no dot after seen', await p.locator('#tabbar a.tab[data-tab="together"].has-new').count() === 0);

  // 另一半回一張手寫 → 主人：紅點、跳出來、留言板
  await open('#/notes/new');
  log('remembers last mode (per phone)', await p.isVisible('#note-cv') || await p.isVisible('#note-ta'));
  await p.click('[data-mode="draw"]');
  const b2 = await p.locator('#note-cv').boundingBox();
  await p.mouse.move(b2.x + 100, b2.y + 100); await p.mouse.down(); await p.mouse.move(b2.x + 200, b2.y + 160); await p.mouse.up();
  await p.click('#note-send'); await p.waitForTimeout(1200);
  await p.evaluate((o) => { const S = JSON.parse(localStorage.getItem('mockServer')); S.notifs = S.notifs || []; S.notifs.push({ id: 9001, recipient: o, actor_name: '小安', kind: 'note_new', created_at: new Date().toISOString(), read_at: null }); localStorage.setItem('mockServer', JSON.stringify(S)); }, owner);
  // 這支手機已經跳過這張了（模擬在別的地方看過跳出來）：不再跳，但紅點還在
  await p.evaluate(() => { const S = JSON.parse(localStorage.getItem('mockServer')); localStorage.setItem('notePopShown', String(S.noteSeq)); });
  await as(owner); await p.waitForTimeout(800);
  log('same note does not pop twice', await p.locator('.note-pop').count() === 0);
  await open('#/together');
  log('owner together dot', await p.locator('#tabbar a.tab[data-tab="together"].has-new').count() === 1);
  log('row says new note', (await p.textContent('#row-notes')).includes('新紙條'));
  await p.goto(U + '#/notifications'); await p.waitForTimeout(900);
  log('notification text', (await text()).includes('小安留了一張紙條給你'));
  await open('#/notes');
  log('board shows image', await p.locator('.note-main .note-paper img').count() === 1);
  log('my last note seen', (await text()).includes('小安看過了'));
  const minis = await p.locator('.note-mini').count();
  log('history has my two notes', minis === 2, minis);
  await p.screenshot({ path: SHOT('notes-board.png'), fullPage: true });
  S = await server();
  log('opening board marks seen', S.notes.filter((n) => n.recipient === owner).every((n) => n.seen_at));

  // 刪掉自己的一張（按兩下確認）
  await p.click('.note-mini.mine [data-del]'); await p.waitForTimeout(200);
  log('asks to confirm', (await p.textContent('.note-mini.mine [data-del]')).includes('確定'));
  await p.click('.note-mini.mine [data-del]'); await p.waitForTimeout(800);
  S = await server();
  log('deleted one', S.notes.length === 2 && await p.locator('.note-mini').count() === 1);
  // 對方寫的沒有刪除鈕
  log('cannot delete partner note', await p.locator('.note-mini:not(.mine) [data-del]').count() === 0);

  // 深色模式紙還是亮的
  await p.emulateMedia({ colorScheme: 'dark' }); await p.reload(); await p.waitForTimeout(1000);
  const bg = await p.evaluate(() => getComputedStyle(document.querySelector('.note-paper')).backgroundColor);
  log('paper stays light in dark mode', bg === 'rgb(255, 251, 242)', bg);
  await p.screenshot({ path: SHOT('notes-dark.png'), fullPage: true });
  log('no horizontal scroll', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));

  log('errors', JSON.stringify(errs));
  await b.close();
})();
