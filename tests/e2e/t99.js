// 用分享碼加入、再用 Email 建立帳號的另一半：沒設密碼要明顯提醒（不然登出、換手機後登不回來）；
// 設好就不再提醒；登入時密碼不對要提示可以按「忘記密碼？」設一組
const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); localStorage.setItem('inviteCardHidden', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const as = async (uid) => { await p.evaluate((u) => { if (u) sessionStorage.setItem('mockUid', u); else sessionStorage.removeItem('mockUid'); }, uid); await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(1000); };
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  await p.click('#role-owner'); await p.waitForTimeout(600);
  const owner = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  log('owner signed in with password has no reminder', await p.evaluate(() => !CloudDB.needsPassword()));
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();
  await as(null); await p.goto(U + '#/join/' + code); await p.waitForTimeout(700);
  await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(1500);
  const pid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await as(owner); await p.click('[data-home-approve]'); await p.waitForTimeout(800);
  // 另一半用 Email 建立帳號
  await as(pid); await p.goto(U + '#/bind'); await p.waitForTimeout(700);
  log('bind form says password needed after confirm', (await p.textContent('#b-form')).includes('設一組登入密碼'));
  await p.fill('#b-email', 'ming@x.com'); await p.click('#b-send'); await p.waitForTimeout(700);
  // 到信箱點了確認連結
  await p.evaluate((u) => { const S = JSON.parse(localStorage.mockServer); Object.assign(S.users[u], { is_anonymous: false, email: 'ming@x.com', identities: [{ provider: 'email' }] }); localStorage.mockServer = JSON.stringify(S); }, pid);
  await as(pid);
  log('home reminds to set password', await p.isVisible('#need-pass-card'));
  await p.click('#need-pass-card'); await p.waitForTimeout(700);
  log('bind page asks for password', (await p.textContent('#pw-form')).includes('還差一步'));
  await p.fill('#b-pass', 'newpass123'); await p.click('#b-pass-save'); await p.waitForTimeout(800);
  log('password sent with flag', await p.evaluate(() => window.__updatedUser && window.__updatedUser.password === 'newpass123' && window.__updatedUser.data.has_password === true));
  await as(pid);
  log('reminder gone after setting', !(await p.isVisible('#need-pass-card')));
  // 登入時密碼不對：提示忘記密碼
  await as(null); await p.goto(U + '#/login'); await p.reload(); await p.waitForTimeout(600);
  await p.fill('#email', 'ming@x.com'); await p.fill('#password', 'wrongpass1'); await p.click('#login-btn'); await p.waitForTimeout(800);
  log('wrong password hints forgot', (await p.textContent('#app')).includes('按「忘記密碼？」設一組'));
  log('errors', JSON.stringify(errs));
  await b.close();
})();
