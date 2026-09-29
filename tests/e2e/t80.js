// 加到主畫面的引導：iPhone Safari、Android Chrome、LINE、IG 各自的教法；存好紀錄後跳一次；首頁提示卡可以關；設定頁隨時能找到
const { chromium, devices } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
const IOS = devices['iPhone 13'].userAgent;
const AND = devices['Pixel 5'].userAgent;
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const errs = [];
  const SHOT = process.env.SHOT_DIR || '.';
  const mk = async (ua, dark) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, userAgent: ua, hasTouch: true, colorScheme: dark ? 'dark' : 'light' });
    await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('signupNudgeShown', '1'); new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate:not(.a2hs-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
    await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
    return { ctx, p };
  };
  const saveOne = async (p, title) => {
    await p.goto(U + '#/new/happy'); await p.waitForSelector('#f-title');
    await p.fill('#f-title', title); await p.click('#save'); await p.waitForSelector('#done', { timeout: 8000 });
  };
  // 每種手機：存好第一則就跳引導，步驟照平台
  const cases = [
    ['iphone', IOS, (t) => t.includes('加入主畫面') && t.includes('分享')],
    ['android', AND, (t) => t.includes('加到主畫面') && t.includes('三個點')],
    ['line', IOS.replace('Mobile/', 'Mobile/ Line/13.0.0 '), (t) => t.includes('用瀏覽器開啟')],
    ['instagram', AND + ' Instagram 300.0', (t) => t.includes('用瀏覽器開啟')],
  ];
  for (const [name, ua, ok] of cases) {
    const { ctx, p } = await mk(ua);
    await p.goto(U + '#/'); await p.waitForTimeout(500);
    await saveOne(p, `第一則 ${name}`);
    await p.waitForSelector('.a2hs-dlg', { timeout: 8000 }).catch(() => {});
    const txt = (await p.textContent('.a2hs-dlg').catch(() => '')) || '';
    console.log(name, 'guide after first save', ok(txt));
    if (name === 'line') console.log('line has open-in-browser button', (await p.textContent('#a2hs-browser')) === '用瀏覽器打開');
    if (name === 'instagram') console.log('ig android -> chrome button', (await p.textContent('#a2hs-browser')) === '用 Chrome 打開');
    await p.screenshot({ path: `${SHOT}/a2hs-${name}.png` });
    if (name === 'line') {
      await p.click('#a2hs-browser'); await p.waitForTimeout(800);
      console.log('line opens external browser', p.url().includes('openExternalBrowser=1'));
    } else {
      await p.click('#a2hs-ok'); await p.waitForTimeout(300);
      await saveOne(p, '第二則'); await p.waitForTimeout(1500);
      console.log(name, 'not again right away', !(await p.isVisible('.a2hs-dlg')));
    }
    await ctx.close();
  }
  // 登入的 iPhone 使用者：首頁有提示卡，按叉叉會收起來；設定頁隨時能打開教學
  {
    const { ctx, p } = await mk(IOS, true);
    await p.goto(U + '#/login'); await p.waitForSelector('#email');
    await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn');
    await p.waitForSelector('#role-owner', { timeout: 15000 }); await p.click('#role-owner'); await p.waitForTimeout(500);
    await p.evaluate(async () => { await DB.setSetting('names', { me: '👸', partner: '🥔' }); await DB.setSetting('backupSnoozeAt', Date.now()); localStorage.setItem('a2hsShown', JSON.stringify({ n: 3, at: Date.now() })); localStorage.setItem('inviteCardHidden', '1'); });
    await saveOne(p, '早餐');
    await p.goto(U + '#/'); await p.reload(); await p.waitForSelector('.home-head'); await p.waitForTimeout(600);
    console.log('home card shows', await p.isVisible('#a2hs-card'));
    await p.screenshot({ path: `${SHOT}/a2hs-home-card.png`, clip: { x: 0, y: 0, width: 390, height: 700 } });
    await p.click('#a2hs-card-go'); await p.waitForSelector('.a2hs-dlg');
    console.log('card opens guide', (await p.textContent('.a2hs-steps')).includes('加入主畫面'));
    await p.click('#a2hs-ok');
    await p.click('#a2hs-card-x'); await p.waitForTimeout(300);
    await p.reload(); await p.waitForSelector('.home-head'); await p.waitForTimeout(600);
    console.log('card hidden after x', !(await p.isVisible('#a2hs-card')));
    await p.goto(U + '#/settings'); await p.waitForSelector('#a2hs-settings');
    await p.click('#a2hs-settings'); await p.waitForSelector('.a2hs-dlg');
    console.log('settings opens guide', await p.isVisible('.a2hs-steps') && !(await p.locator('#a2hs-never').count()));
    await ctx.close();
  }
  // 桌機不出現
  {
    const ctx = await b.newContext({ viewport: { width: 1200, height: 800 } });
    await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); });
    const p = await ctx.newPage();
    await p.goto(U + '#/settings'); await p.waitForTimeout(800);
    console.log('desktop no settings entry', !(await p.locator('#a2hs-settings').count()));
    await ctx.close();
  }
  console.log('errors', errs); await b.close();
})();
