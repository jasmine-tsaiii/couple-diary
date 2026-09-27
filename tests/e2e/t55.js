const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('mockAutoApprove', '1'); new MutationObserver(() => document.querySelectorAll('.tour-dlg').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); let dialogs = 0; p.on('dialog', (d) => { dialogs++; d.accept(); });
  // Email 註冊的新帳號：不問身分
  await p.goto(U + '#/signup'); await p.waitForTimeout(600);
  await p.fill('#email', 'new@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  log('signup no role choice', !(await p.isVisible('#role-owner')));
  // 登入（非註冊）的空帳號：問身分
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  await p.evaluate(() => { localStorage.removeItem('newOwnerEmail'); sessionStorage.clear(); });
  await p.goto(U + '#/login'); await p.reload(); await p.waitForTimeout(600);
  await p.fill('#email', 'other@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  log('login shows role choice', await p.isVisible('#role-owner'));
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/role-choice.png' });
  await p.goto(U + '#/new/happy'); await p.waitForTimeout(600);
  log('blocked other pages', await p.isVisible('#role-partner'));
  await p.click('#role-partner'); await p.waitForTimeout(600);
  log('partner -> join', p.url().endsWith('#/join'), await p.isVisible('#j-code'));
  await p.goto(U + '#/'); await p.waitForTimeout(600);
  await p.click('#role-owner'); await p.waitForTimeout(800);
  log('owner -> home', !(await p.isVisible('#role-owner')));
  await p.reload(); await p.waitForTimeout(900);
  log('remembered', !(await p.isVisible('#role-owner')));
  // 刪除帳號：確認視窗，不用打字
  await p.goto(U + '#/settings'); await p.waitForTimeout(800);
  await p.click('#delete-account'); await p.waitForTimeout(500);
  log('danger dialog', await p.isVisible('#danger-ok'), 'no prompt', dialogs === 0);
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/delete-confirm.png' });
  await p.click('#danger-cancel'); await p.waitForTimeout(300);
  log('cancel keeps', !(await p.isVisible('#danger-ok')) && p.url().includes('settings'));
  await p.click('#delete-account'); await p.waitForTimeout(400); await p.click('#danger-ok'); await p.waitForTimeout(1500);
  log('deleted -> out', !p.url().includes('settings'));
  console.log('errors', errs); await b.close();
})();
