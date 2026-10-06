// 註冊流程三項改善：
// 1. Email 註冊後和 Google 一樣先問身分（另一半自己按了註冊，才不會變成另一本空日記）
// 2. 用分享碼加入、還在等同意的另一半：等待頁請他先建立帳號；Email 確認好了要先設密碼
// 3. 從信裡的連結（確認信）回來，用瀏覽器打開時提示回 App 用 Email 和密碼登入
const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); localStorage.setItem('inviteCardHidden', '1'); new MutationObserver(() => document.querySelectorAll('.tour-dlg').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const as = async (uid, hash = '#/') => { await p.evaluate((u) => { if (u) sessionStorage.setItem('mockUid', u); else sessionStorage.removeItem('mockUid'); }, uid); await p.goto(U + hash); await p.reload(); await p.waitForTimeout(1000); };
  // 1. Email 註冊 → 問身分
  await p.goto(U + '#/signup'); await p.waitForTimeout(600);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  log('email signup asks role', await p.isVisible('#role-owner') && await p.isVisible('#role-partner'));
  await p.click('#role-owner'); await p.waitForTimeout(600);
  const owner = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();
  // 2. 另一半用分享碼加入，等同意
  await as(null); await p.goto(U + '#/join/' + code); await p.waitForTimeout(700);
  await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(1500);
  const pid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await as(pid);
  log('waiting page asks to create account', await p.isVisible('#w-bind') && await p.isVisible('#w-check'));
  await p.click('#w-bind'); await p.waitForTimeout(700);
  log('bind page opens while pending', await p.isVisible('#b-email'));
  await p.fill('#b-email', 'ming@x.com'); await p.click('#b-send'); await p.waitForTimeout(700);
  log('email sent', await p.evaluate(() => !!window.__updatedUser && window.__updatedUser.email === 'ming@x.com'));
  // 到信箱點了確認連結（用瀏覽器打開，網址帶 code）
  await p.evaluate((u) => { const S = JSON.parse(localStorage.mockServer); Object.assign(S.users[u], { is_anonymous: false, email: 'ming@x.com', identities: [{ provider: 'email' }] }); localStorage.mockServer = JSON.stringify(S); }, pid);
  await p.evaluate((u) => sessionStorage.setItem('mockUid', u), pid);
  await p.goto(U + '?code=abc#/'); await p.waitForTimeout(1200);
  log('link notice tells to go back to app', await p.isVisible('.link-dlg') && (await p.textContent('.link-dlg')).includes('ming@x.com'));
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/email-link-notice.png' });
  await p.click('#link-dlg-ok'); await p.waitForTimeout(300);
  log('pending + confirmed must set password', await p.isVisible('#must-pass'));
  await p.goto(U + '#/'); await p.waitForTimeout(700);
  log('still on password step', await p.isVisible('#must-pass'));
  await p.fill('#b-pass', 'newpass123'); await p.click('#b-pass-save'); await p.waitForTimeout(900);
  await as(pid);
  log('back to waiting page with account', await p.isVisible('#w-check') && !(await p.isVisible('#w-bind')) && (await p.textContent('#app')).includes('ming@x.com'));
  log('no notice without code', !(await p.isVisible('.link-dlg')));
  // 主人同意後，另一半正常使用
  await as(owner); await p.click('[data-home-approve]'); await p.waitForTimeout(800);
  await as(pid);
  log('approved partner uses app', !(await p.isVisible('#must-pass')) && !(await p.isVisible('#w-check')));
  // 確認信換不到登入狀態（App 和瀏覽器分開）也照樣提示
  await as(null); await p.goto(U + '?code=zzz#/'); await p.waitForTimeout(1200);
  log('notice even when not signed in here', await p.isVisible('.link-dlg') && (await p.textContent('.link-dlg')).includes('忘記密碼'));
  // Google 登入回來也帶 code：不提示
  await p.evaluate(() => sessionStorage.setItem('googlePending', '1'));
  await p.goto(U + '?code=g1#/'); await p.waitForTimeout(1200);
  log('no notice after google', !(await p.isVisible('.link-dlg')));
  log('errors', JSON.stringify(errs));
  await b.close();
})();
