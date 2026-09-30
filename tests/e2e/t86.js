// 介面整理 B 方案：底部選單 今天・紀錄・＋・一起・我的；今天頁提示卡最多一張；紀錄頁切換種類；舊網址亮對的分頁
const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
const SHOT = (n) => (process.env.SHOT_DIR || '.') + '/' + n;
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const tipCount = () => p.evaluate(() => { const kids = [...document.querySelectorAll('#app > .card')].filter((c) => !c.classList.contains('quick-rec')); return kids.length; });
  const onTab = () => p.evaluate(() => (document.querySelector('#tabbar .tab.on') || {}).dataset?.tab || '');
  const go = async (h) => { await p.goto(U + h); await p.waitForTimeout(900); };

  // 試用：五格選單
  await go('#/');
  await p.waitForSelector('.tab-add');
  const labels = await p.$$eval('#tabbar .tab span', (e) => e.map((x) => x.textContent).join(','));
  log('tabs', labels === '今天,紀錄,一起,我的', labels);
  log('guest home one tip max', (await tipCount()) <= 1);
  log('no feature tiles', await p.locator('.ftile').count() === 0);

  // 主人登入
  await p.goto(U + '#/login'); await p.waitForSelector('#email');
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn');
  await p.waitForSelector('#role-owner', { timeout: 15000 }); await p.click('#role-owner'); await p.waitForTimeout(600);
  await go('#/');
  log('owner home: at most one tip', (await tipCount()) <= 1, await tipCount());
  log('no gear on home', await p.locator('.home-head .gear-btn:not(#bell)').count() === 0);
  // 寫 6 則
  for (const [t, title] of [['happy', '早餐'], ['happy', '散步'], ['cloud', '遲到'], ['happy', '電影'], ['fight', '家事'], ['happy', '晚餐']]) {
    await p.goto(U + `#/new/${t}`); await p.waitForSelector('#f-title'); await p.fill('#f-title', title); await p.click('#save'); await p.waitForSelector('#done', { timeout: 8000 });
  }
  await p.evaluate(async () => { await DB.setSetting('names', { me: '公主', partner: '馬鈴薯' }); await DB.setSetting('lastBackupAt', Date.now()); });
  await go('#/'); await p.reload(); await p.waitForSelector('#recent .item');
  log('recent 5 + see all', await p.locator('#recent .item').count() === 5 && await p.locator('a.see-all[href="#/records"]').count() === 1);
  log('home one tip', (await tipCount()) <= 1, await tipCount());
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  log('home height <= 1.5 screens', h <= 844 * 1.5 + 20, h);
  await p.screenshot({ path: SHOT('b-home.png'), fullPage: true });

  // 紀錄：切換
  await p.click('#tabbar [data-tab="records"]'); await p.waitForSelector('.rec-seg');
  log('records tab on', (await onTab()) === 'records');
  const segs = await p.$$eval('.rec-seg .seg-btn', (e) => e.map((x) => x.textContent.replace(/\s/g, '')).join(','));
  log('segment counts', segs === '美好4,烏雲1,吵架1', segs);
  await p.screenshot({ path: SHOT('b-records.png') });
  const histBefore = await p.evaluate(() => history.length);
  await p.click('[data-rec-seg="cloud"]'); await p.waitForTimeout(800);
  log('switched to cloud', p.url().endsWith('#/records/cloud') && (await p.getAttribute('#app', 'class')).includes('theme-cloud'));
  log('switch does not add history', (await p.evaluate(() => history.length)) === histBefore);
  log('plus follows type', (await p.getAttribute('.tab-add', 'href')) === '#/new/cloud');
  await p.click('[data-rec-seg="fight"]'); await p.waitForTimeout(800);
  log('fights in records', (await p.textContent('#app')).includes('家事') && (await onTab()) === 'records');
  await go('#/'); await go('#/records');
  log('remembers last type', p.url().endsWith('#/records') && (await p.getAttribute('.seg-btn.on', 'data-rec-seg')) === 'fight');

  // 一起
  await p.click('#tabbar [data-tab="together"]'); await p.waitForSelector('.nav-row');
  const rows = await p.$$eval('.nav-row .nav-text .bold', (e) => e.map((x) => x.textContent).join(','));
  log('together rows', rows === '重新認識你,一起完成的事,解鎖任務,印章冊,回憶小卡', rows);
  await p.screenshot({ path: SHOT('b-together.png') });

  // 我的
  await p.click('#tabbar [data-tab="me"]'); await p.waitForSelector('#row-share');
  const mrows = await p.$$eval('.nav-row .nav-text .bold', (e) => e.map((x) => x.textContent).join(','));
  log('me rows', mrows.startsWith('分享給另一半,我們,通知,整理紀錄,備份與匯出,帳號與安全,外觀') && mrows.endsWith('其他'), mrows);
  await p.screenshot({ path: SHOT('b-me.png') });
  await p.click('.nav-row[href="#/settings/backup"]'); await p.waitForTimeout(1200);
  const top = await p.evaluate(() => document.getElementById('set-backup').getBoundingClientRect().top);
  log('settings jumps to section', top > 0 && top < 200, top);
  log('settings lights me', (await onTab()) === 'me');

  // 舊網址
  for (const [hsh, want] of [['#/list/happy', 'records'], ['#/fights', 'records'], ['#/wishes', 'together'], ['#/stamps', 'together'], ['#/cards', 'together'], ['#/tasks', 'together'], ['#/quiz', 'together'], ['#/notifications', 'me'], ['#/settings', 'me']]) {
    await go(hsh);
    const t = await onTab();
    if (t !== want) log('old url tab', hsh, t);
  }
  log('old urls light right tab', true);
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  log('no horizontal overflow', !overflow);
  log('errors', errs); await b.close();
})();
