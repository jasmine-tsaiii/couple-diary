const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); new MutationObserver(() => document.querySelectorAll('.tour-dlg').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const as = async (uid) => { await p.evaluate((u) => { if (u) sessionStorage.setItem('mockUid', u); else sessionStorage.removeItem('mockUid'); }, uid); await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(1000); };
  const join = async (code, name) => {
    await as(null); await p.goto(U + '#/join'); await p.waitForTimeout(600);
    await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', name); await p.click('#join-btn'); await p.waitForTimeout(1500);
    return p.evaluate(() => sessionStorage.getItem('mockUid'));
  };
  const ownerApprove = async () => { await as('owner-jas'); await p.click('[data-home-approve]'); await p.waitForTimeout(700); };
  // 主人註冊、產生分享碼
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  await p.click('#role-owner'); await p.waitForTimeout(600);
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();
  // 另一半第一次加入：主人同意（沒有紀錄時不用選）
  const p1 = await join(code, '小明');
  await ownerApprove();
  // 另一半綁定 Google、寫一則議題
  await as(p1); await p.goto(U + '#/bind'); await p.waitForTimeout(600); await p.click('#b-google'); await p.waitForTimeout(1000);
  await p.goto(U + '#/new/fight'); await p.waitForTimeout(700); await p.fill('#f-title', '小明寫的'); await p.click('#save'); await p.waitForTimeout(1200);
  // 換瀏覽器用臨時身分加入：等待頁提醒
  const p2 = await join(code, '小明');
  log('waiting hint', await p.isVisible('#bound-hint'), (await p.textContent('#bound-hint')).includes('小明'));
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/bound-hint.png' });
  // 主人按同意：預設建議拒絕
  await ownerApprove();
  log('owner warned', await p.isVisible('text=換了手機或瀏覽器'));
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/approve-bound-warning.png' });
  await p.click('[data-choice="reject"]'); await p.waitForTimeout(900);
  const S1 = await p.evaluate(() => JSON.parse(localStorage.getItem('mockServer')).t.partners.map((x) => x.uid + ':' + x.approved));
  log('p1 kept, p2 rejected', S1.includes(p1 + ':true') && !S1.some((x) => x.startsWith(p2)));
  // 臨時身分按「我是小明，改用原本帳號登入」
  const p3 = await join(code, '小明');
  await p.click('#w-use-account'); await p.waitForTimeout(900);
  const S2 = await p.evaluate(() => JSON.parse(localStorage.getItem('mockServer')).t.partners.map((x) => x.uid));
  log('use-account -> login, pending removed', p.url().includes('#/login'), !S2.includes(p3));
  // 舊的已被擠掉的情況：p1 不在 partners 裡，用 Google 登入回來 → 選我是另一半 → 主人看到「回來了」
  await p.evaluate((u) => { const S = JSON.parse(localStorage.getItem('mockServer')); S.t.partners = S.t.partners.filter((x) => x.uid !== u); localStorage.setItem('mockServer', JSON.stringify(S)); }, p1);
  await as(p1);
  log('p1 role choice', await p.isVisible('#role-partner'));
  await p.click('#role-partner'); await p.waitForTimeout(600);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(1500);
  log('no hint for real account', !(await p.isVisible('#bound-hint')));
  await ownerApprove();
  log('returning dialog', await p.isVisible('text=小明 回來了'));
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/approve-returning.png' });
  await p.click('[data-choice="ok"]'); await p.waitForTimeout(900);
  await as(p1);
  log('p1 back home', await p.isVisible('text=Jasmine和小明的紀錄'), 'sees own fight', (await p.textContent('body')).includes('小明寫的') || 'check-list');
  console.log('errors', errs); await b.close();
})();
