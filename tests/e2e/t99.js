// 加到主畫面引導（2026-10-04）：Threads 內建瀏覽器認得出來、iPhone 在 IG/Threads 指右上角、每一步有小圖、
// 另一半加入（對方同意後）提醒一次、第一次從主畫面打開說「放好了」
const { chromium, devices } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
const IOS = devices['iPhone 13'].userAgent;
const AND = devices['Pixel 5'].userAgent;
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const errs = [];
  const SHOT = process.env.SHOT_DIR || '.';
  const mk = async (ua, { dark = false, standalone = false, init = '' } = {}) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, userAgent: ua, hasTouch: true, colorScheme: dark ? 'dark' : 'light' });
    await ctx.addInitScript(({ standalone }) => {
      localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('signupNudgeShown', '1');
      if (standalone) { const mm = window.matchMedia.bind(window); window.matchMedia = (q) => (q.includes('standalone') ? { matches: true, addEventListener() {}, removeEventListener() {} } : mm(q)); }
      new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate:not(.a2hs-dlg):not(.a2hs-welcome)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true });
    }, { standalone });
    await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
    return { ctx, p };
  };
  const saveOne = async (p, title) => {
    await p.goto(U + '#/new/happy'); await p.waitForSelector('#f-title');
    await p.fill('#f-title', title); await p.click('#save'); await p.waitForSelector('#done', { timeout: 8000 });
  };
  const guideAfterSave = async (p) => { await saveOne(p, '第一則'); await p.waitForSelector('.a2hs-dlg', { timeout: 8000 }).catch(() => {}); return (await p.textContent('.a2hs-dlg').catch(() => '')) || ''; };

  // Threads（iPhone）：認得是 App 內建瀏覽器，指右上角，備用是複製網址
  {
    const { ctx, p } = await mk(IOS.replace('Mobile/', 'Mobile/ Barcelona 289.0.0.77.109 '));
    await p.goto(U + '#/'); await p.waitForTimeout(400);
    log('threads detected as in-app', await p.evaluate(() => IN_APP && inAppName() === 'Threads'));
    const t = await guideAfterSave(p);
    log('threads ios: switch to safari title', t.includes('先換到 Safari') && t.includes('Threads 裡面沒辦法'));
    log('threads ios: corner hint', await p.isVisible('.a2hs-corner'));
    log('threads ios: copy link fallback', (await p.textContent('#a2hs-browser')).includes('複製網址'));
    log('threads ios: 3 pictures', await p.locator('.a2hs-steps li svg.a2p').count() === 3);
    await p.screenshot({ path: `${SHOT}/a2hs-threads-ios.png` });
    await ctx.close();
  }
  // Threads（Android）：叫 Chrome 打開
  {
    const { ctx, p } = await mk(AND + ' Barcelona 289.0.0.77.109');
    await p.goto(U + '#/'); await p.waitForTimeout(400);
    await guideAfterSave(p);
    log('threads android -> chrome', (await p.textContent('#a2hs-browser')) === '用 Chrome 打開' && !(await p.isVisible('.a2hs-corner')));
    await ctx.close();
  }
  // iPhone Safari 與 Android：每一步都有小圖（淺色、深色都截一張看）
  for (const [name, ua, dark] of [['ios', IOS, false], ['ios-dark', IOS, true], ['android', AND, false]]) {
    const { ctx, p } = await mk(ua, { dark });
    await p.goto(U + '#/'); await p.waitForTimeout(400);
    await guideAfterSave(p);
    log(name, '3 pictures with numbers', await p.locator('.a2hs-steps li svg.a2p').count() === 3 && await p.locator('.a2hs-n').count() === 3);
    const fits = await p.evaluate(() => { const r = document.querySelector('.a2hs-dlg .celebrate-box').getBoundingClientRect(); return r.top >= 0 && r.left >= 0 && r.right <= innerWidth; });
    log(name, 'dialog fits screen', fits);
    await p.screenshot({ path: `${SHOT}/a2hs-${name}.png` });
    await ctx.close();
  }
  // 小手機（iPhone SE）也能捲到下面的按鈕
  {
    const ctx = await b.newContext({ viewport: { width: 320, height: 568 }, userAgent: IOS, hasTouch: true });
    await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('signupNudgeShown', '1'); });
    await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(U + '#/me'); await p.waitForSelector('#a2hs-settings'); await p.click('#a2hs-settings'); await p.waitForSelector('.a2hs-dlg');
    await p.locator('#a2hs-ok').scrollIntoViewIfNeeded();
    log('small phone: ok button reachable', await p.locator('#a2hs-ok').isVisible());
    await p.screenshot({ path: `${SHOT}/a2hs-se.png` });
    await ctx.close();
  }
  // 另一半（iPhone）：用分享碼加入、對方同意後第一次看到日記，提醒放到主畫面，並請他先建立帳號
  {
    const { ctx, p } = await mk(IOS);
    const as = async (uid) => { await p.evaluate((u) => { if (u) sessionStorage.setItem('mockUid', u); else sessionStorage.removeItem('mockUid'); }, uid); };
    await p.goto(U + '#/login'); await p.waitForSelector('#email');
    await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn');
    await p.waitForSelector('#role-owner', { timeout: 15000 }); await p.click('#role-owner'); await p.waitForTimeout(500);
    await p.evaluate(() => DB.setSetting('names', { me: 'Jasmine', partner: '' }));
    await p.goto(U + '#/settings'); await p.waitForTimeout(700);
    await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
    const code = (await p.textContent('.share-code')).trim();
    await p.evaluate(() => { localStorage.setItem('a2hsShown', JSON.stringify({ n: 0, at: 0 })); });
    await as(null); await p.goto(U + '?utm_source=invite#/join/' + code); await p.reload(); await p.waitForTimeout(1200);
    await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小馬'); await p.click('#join-btn'); await p.waitForTimeout(1500);
    log('partner: flag set on join', await p.evaluate(() => !!localStorage.getItem('a2hsPartnerJoin')));
    log('partner: no guide while waiting', !(await p.isVisible('.a2hs-dlg')));
    await p.evaluate(() => { const S = JSON.parse(localStorage.mockServer); S.t.partners.forEach((x) => { x.approved = true; }); localStorage.mockServer = JSON.stringify(S); });
    await p.goto(U + '#/'); await p.reload(); await p.waitForSelector('.a2hs-dlg', { timeout: 8000 }).catch(() => {});
    const t = (await p.textContent('.a2hs-dlg').catch(() => '')) || '';
    log('partner: guide after approved', t.includes('加入成功') && t.includes('Jasmine寫了什麼'));
    log('partner: anon iphone asked to create account first', (await p.getAttribute('#a2hs-login', 'href')) === '#/bind');
    await p.screenshot({ path: `${SHOT}/a2hs-partner.png` });
    await p.click('#a2hs-ok');
    await p.goto(U + '#/me'); await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(1500);
    log('partner: only once', !(await p.isVisible('.a2hs-dlg')));
    await ctx.close();
  }
  // 第一次從主畫面打開：說「放好了」，之後不再出現，也不再提醒放到主畫面
  {
    const { ctx, p } = await mk(IOS, { standalone: true });
    await p.goto(U + '#/'); await p.waitForSelector('.a2hs-welcome', { timeout: 8000 }).catch(() => {});
    log('standalone: welcome shown', (await p.textContent('.a2hs-welcome').catch(() => '')).includes('放好了'));
    await p.screenshot({ path: `${SHOT}/a2hs-welcome.png` });
    await p.click('#a2hs-welcome-ok');
    await p.reload(); await p.waitForTimeout(1500);
    log('standalone: welcome once', !(await p.isVisible('.a2hs-welcome')));
    await p.goto(U + '#/me'); await p.waitForTimeout(500);
    log('standalone: no me entry', !(await p.locator('#a2hs-settings').count()));
    await ctx.close();
  }
  console.log('errors', errs); await b.close();
  function log(...a) { console.log(...a); }
})();
