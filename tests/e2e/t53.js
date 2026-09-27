const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('tourDone:p:x', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('mockAutoApprove', '1'); new MutationObserver(() => document.querySelectorAll('.tour-dlg').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();
  await p.evaluate(() => sessionStorage.removeItem('mockUid')); await p.goto(U + '#/login'); await p.reload(); await p.waitForTimeout(600);
  await p.click('text=我是另一半，用分享碼加入'); await p.waitForTimeout(300);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(1500);
  await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(900);
  log('partner home', await p.isVisible('text=綁定帳號，你也可以寫紀錄'));
  // 1) Google 回來帶錯誤：這個帳號已經被用過
  await p.evaluate(() => sessionStorage.setItem('linkPending', '1'));
  await p.goto(U + '?error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked+to+another+user#/'); await p.waitForTimeout(1200);
  log('1 back on bind', p.url().endsWith('#/bind'), 'url cleaned', !p.url().includes('error'), 'msg', (await p.textContent('#bind-error')).includes('已經有啾啾日記的帳號'));
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/bind-error.png' });
  // 2) 回來沒有錯誤但還是沒綁定（網址設定問題）
  await p.evaluate(() => sessionStorage.setItem('linkPending', '1'));
  await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(1200);
  log('2 back on bind', p.url().endsWith('#/bind'), 'msg', (await p.textContent('#bind-error')).includes('Redirect URLs'));
  // 3) Manual linking 沒開：按下去就顯示在頁面上
  await p.evaluate(() => localStorage.setItem('mockLinkErr', '1'));
  await p.click('#b-google'); await p.waitForTimeout(800);
  log('3 msg', (await p.textContent('#bind-error')).includes('Allow manual linking'), 'no pending left', await p.evaluate(() => !sessionStorage.getItem('linkPending')));
  // 4) 成功
  await p.evaluate(() => localStorage.removeItem('mockLinkErr'));
  await p.click('#b-google'); await p.waitForTimeout(1000);
  log('4 bound', await p.isVisible('text=已經綁定'), 'error gone', !(await p.isVisible('#bind-error')));
  console.log('errors', errs); await b.close();
})();
