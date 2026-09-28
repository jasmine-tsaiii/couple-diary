const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.route('**/js/config.js', async (r) => { const res = await r.fetch(); r.fulfill({ contentType: 'text/javascript', body: (await res.text()).replace(/GA_MEASUREMENT_ID: '[^']*'/, "GA_MEASUREMENT_ID: ''") }); });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('mockAutoApprove', '1'); new MutationObserver(() => document.querySelectorAll('.tour-dlg').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const join = async (code) => {
    await p.evaluate(() => sessionStorage.removeItem('mockUid')); await p.goto(U + '#/login'); await p.reload(); await p.waitForTimeout(600);
    await p.click('text=我是另一半，用分享碼加入'); await p.waitForTimeout(300);
    await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(1500);
    return p.evaluate(() => sessionStorage.getItem('mockUid'));
  };
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();
  // 另一半第一次加入並用 Google 綁定
  const p1 = await join(code);
  await p.goto(U + '#/bind'); await p.reload(); await p.waitForTimeout(800);
  await p.click('#b-google'); await p.waitForTimeout(1000);
  log('p1 bound', await p.isVisible('text=帳號建立好了'));
  // 換瀏覽器：又用分享碼加入，拿到新的臨時身分（主人同意後取代舊的）
  const p2 = await join(code);
  log('new anon id', p2 !== p1);
  // 主人同意新的身分時，舊的（已綁定的）會被取代
  await p.evaluate((u) => { const S = JSON.parse(localStorage.getItem('mockServer')); S.t.partners = S.t.partners.filter((x) => x.uid !== u); localStorage.setItem('mockServer', JSON.stringify(S)); }, p1);
  await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(900);
  log('asked to bind again', await p.isVisible('text=建立我的帳號，你也可以寫紀錄'));
  // 用 Google 綁定 → Google 說這個帳號已經有了
  await p.evaluate(() => sessionStorage.setItem('linkPending', '1'));
  await p.goto(U + '?error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked+to+another+user#/'); await p.waitForTimeout(1200);
  log('bind page explains', (await p.textContent('#bind-error')).includes('改用這個 Google 帳號登入'), 'login btn', await p.isVisible('#b-login-google'));
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/bind-already.png' });
  await p.click('#b-login-google'); await p.waitForTimeout(800);
  log('signed out anon', await p.evaluate(() => !sessionStorage.getItem('mockUid')), 'rejoin flag', await p.evaluate(() => sessionStorage.getItem('rejoinAfterLogin')));
  // Google 登入回來 = 原本的帳號 p1
  await p.evaluate((u) => sessionStorage.setItem('mockUid', u), p1);
  await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(1200);
  log('rejoin page', p.url().endsWith('#/join'), await p.isVisible('text=你已經用原本的帳號登入了'));
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(1500);
  await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(1000);
  log('back as bound partner', await p.evaluate(() => sessionStorage.getItem('mockUid')) === p1, 'no bind card', !(await p.isVisible('text=建立我的帳號，你也可以寫紀錄')), 'partner home', await p.isVisible('text=Jasmine和小明的紀錄'));
  // 已經是另一半的情況：Google 登入回來直接進首頁
  await p.evaluate(() => sessionStorage.setItem('rejoinAfterLogin', '1'));
  await p.reload(); await p.waitForTimeout(1000);
  log('already partner goes home', !p.url().includes('join'));
  console.log('errors', errs); await b.close();
})();
