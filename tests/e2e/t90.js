// 防跑版：文字變長、狀態改變（編輯過、放晴了、開啟中）、名字有 emoji 或很長時，
// 短短的字不能被擠成直排、畫面不能左右捲、按鈕不能被擠扁（320 / 390 寬，淺色 / 深色）
const { chromium } = require('playwright');
const fs = require('fs');
const scan = require('./_layoutscan');
const U = process.env.U || 'http://localhost:8770/';
// 這些地方本來就是窄格子，長字自然換行是正常的（兩欄的紀錄方塊、首頁功能方塊、誰可以看的選項、首頁大標題、很長的名字）（題目大字也是）
const NATURAL = '.tile *, .ftile *, .opt, .home-head .title-xl, .card .grow > .bold, .share-sec .row > .grow, .quiz-qtext';
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); localStorage.setItem('mockAutoApprove', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate:not(.danger-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.route('**/gsi/client*', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const as = async (uid, hash) => { await p.evaluate((u) => (u ? sessionStorage.setItem('mockUid', u) : sessionStorage.removeItem('mockUid')), uid); await p.goto(U + hash); await p.reload(); await p.waitForTimeout(700); };
  // 主人註冊、開分享碼，另一半用很長又有 emoji 的名字加入
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(800);
  if (await p.locator('#role-owner').count()) { await p.click('#role-owner'); await p.waitForTimeout(600); }
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  await p.fill('#s-name', '🥔'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(600);
  const code = (await p.textContent('.share-code')).trim();
  await as(null, '#/login'); await p.click('text=我是另一半，用分享碼加入'); await p.waitForTimeout(300);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '超級可愛的小明寶貝🐻'); await p.click('#join-btn'); await p.waitForTimeout(900);
  const pid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await as('owner-jas', '#/');
  await p.evaluate(async (pid) => {
    await DB.setSetting('names', { me: '🥔', partner: '超級可愛的小明寶貝🐻' });
    const now = Date.now();
    const base = { emojis: ['😤'], tags: ['不被尊重'], date: '2026-09-29', createdAt: now, updatedAt: now, photoIds: [], status: 'open', followUps: [], visibility: 'shared' };
    // 截圖那一則：另一半寫的、編輯過、已放晴、有反思
    await DB.putRecord({ ...base, id: 'c1', no: 2, type: 'cloud', title: '不是公主是麻糬', editedAt: now, clearedAt: now, reflections: [{ id: 'r1', date: '2026-09-29', text: '後來想想我寶貝還是很可愛🥰就算了' }] });
    await DB.putRecord({ ...base, id: 'h1', no: 1, type: 'happy', title: '一起看夕陽', emojis: ['🥰', '✨', '😂'], tags: ['被照顧', '感動', '驚喜'], editedAt: now, visibility: 'task', task: { text: '幫我按摩十分鐘', mode: 'photo' } });
    await DB.putRecord({ ...base, id: 'f1', no: 1, type: 'fight', title: '家事分工', category: '生活習慣與家務分配', status: 'talking', editedAt: now });
    const S = JSON.parse(localStorage.mockServer);
    for (const r of S.t.records) if (r.id === 'c1' || r.id === 'f1') { r.author = pid; r.data.author = pid; }
    localStorage.mockServer = JSON.stringify(S);
  }, pid);
  await p.reload(); await p.waitForTimeout(700);
  const check = async (who, routes) => {
    for (const [w, sc] of [[320, 'light'], [390, 'light'], [320, 'dark']]) {
      await p.emulateMedia({ colorScheme: sc }); await p.setViewportSize({ width: w, height: 844 });
      for (const r of routes) {
        await p.goto(U + r); await p.waitForTimeout(450);
        const issues = await p.evaluate(scan, NATURAL);
        console.log(`${who} ${w} ${sc} ${r} no layout issues`, !issues.length, issues.length ? JSON.stringify(issues) : '');
      }
    }
    await p.emulateMedia({ colorScheme: 'light' }); await p.setViewportSize({ width: 390, height: 844 });
  };
  // 那一行：每一段各自在一行裡，放不下的整段換到下一行
  await p.goto(U + '#/view/c1'); await p.waitForTimeout(500);
  console.log('author shown', await p.isVisible('.meta-row >> text=新增的'), 'edited shown', await p.isVisible('.meta-row >> text=編輯過'));
  for (const w of [320, 390]) {
    await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(200);
    console.log(`meta pieces one line each ${w}`, await p.evaluate(() => [...document.querySelectorAll('.meta-row > span')].every((s) => s.getBoundingClientRect().height < parseFloat(getComputedStyle(s).fontSize) * 2.2)));
    await p.screenshot({ path: (process.env.SHOT_DIR || '.') + `/meta-${w}.png` });
  }
  // 前後對照用的截圖（KEEP=1 時留在暫存資料夾）
  const shot = async (hash, sel, name) => { await p.goto(U + hash); await p.waitForTimeout(450); const el = p.locator(sel).first(); if (await el.count()) await el.screenshot({ path: (process.env.SHOT_DIR || '.') + `/${name}.png` }).catch(() => {}); };
  await p.setViewportSize({ width: 320, height: 844 });
  await shot('#/view/f1', '.field', 'fight-meta-320');
  await shot('#/', '.home-head', 'home-head-320');
  await shot('#/list/happy', '.tile', 'tile-320');
  await shot('#/settings', '.share-sec:has(.row)', 'partner-row-320');
  await p.setViewportSize({ width: 390, height: 844 });
  await check('owner', ['#/', '#/list/happy', '#/list/cloud', '#/fights', '#/view/c1', '#/view/h1', '#/view/f1', '#/new/cloud', '#/settings', '#/wishes', '#/notifications', '#/together', '#/me', '#/daily', '#/quiz']);
  await as(pid, '#/');
  await check('partner', ['#/', '#/view/c1', '#/view/f1', '#/settings', '#/daily', '#/together']);
  console.log('errors', errs); await b.close();
})();
