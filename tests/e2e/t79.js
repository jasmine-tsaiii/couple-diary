// 返回的流程：左上角返回、取消、「完成」都是退回上一頁（不多疊一層），手機返回鍵也不會繞回剛剛那頁；
// 從通知信直接打開的紀錄，返回去列表；加到主畫面時從左邊滑可以返回
const { chromium } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate:not(.danger-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const hash = () => p.evaluate(() => location.hash || '#/');
  const settle = () => p.waitForTimeout(500);
  await p.goto(U + '#/'); await settle();
  // 從美好列表新增 → 存好 → 完成：回到美好列表；再按手機返回回首頁，不會繞回紀錄或表單
  await p.goto(U + '#/list/happy'); await settle();
  await p.click('.tab-add'); await p.waitForSelector('#f-title');
  await p.fill('#f-title', '一起看夕陽'); await p.click('#save'); await p.waitForSelector('#done', { timeout: 8000 });
  const id = (await hash()).split('/')[2];
  await p.tap('#done'); await settle();
  console.log('done -> back to list', (await hash()) === '#/list/happy');
  await p.goBack(); await settle();
  console.log('phone back then goes home', (await hash()) === '#/');
  // 列表 → 紀錄 → 左上角返回：回列表；手機返回不會又回到紀錄
  await p.goto(U + '#/list/happy'); await settle();
  await p.goto(U + `#/view/${id}`); await settle();
  await p.tap('.topbar a.icon-btn'); await settle();
  console.log('back arrow -> list', (await hash()) === '#/list/happy');
  await p.goBack(); await settle();
  console.log('no ping-pong to record', (await hash()) !== `#/view/${id}`);
  // 列表 → 紀錄 → 編輯 → 存好：回到同一頁紀錄（不多一層），再返回就是列表
  await p.goto(U + '#/list/happy'); await settle();
  await p.goto(U + `#/view/${id}`); await settle();
  await p.goto(U + `#/edit/${id}`); await p.waitForSelector('#f-title');
  await p.fill('#f-title', '一起看夕陽！'); await p.click('#save'); await p.waitForSelector('#done', { timeout: 8000 });
  console.log('edit save -> same record', (await hash()) === `#/view/${id}`);
  await p.tap('.topbar a.icon-btn'); await settle();
  console.log('then back -> list (one step)', (await hash()) === '#/list/happy');
  // 表單的取消：回到上一頁（列表），不是首頁
  await p.goto(U + '#/list/cloud'); await settle();
  await p.goto(U + '#/new/cloud'); await p.waitForSelector('#f-title');
  await p.tap('.topbar a.icon-btn'); await settle();
  console.log('cancel -> previous page', (await hash()) === '#/list/cloud');
  // 直接打開一則紀錄（例如從通知信點進來）：返回去列表
  await p.goto(U + `#/view/${id}`); await p.reload(); await settle();
  await p.tap('.topbar a.icon-btn'); await settle();
  console.log('fresh open -> fallback list', (await hash()) === '#/list/happy');
  // 加到主畫面的模式：從左邊往右滑回上一頁，滑的時候有提示
  await p.goto(U + '#/list/happy'); await settle();
  await p.goto(U + `#/view/${id}`); await settle();
  await p.evaluate(() => { window.__forceSwipeBack = 1; });
  const swipeTo = async (x2, shot) => p.evaluate(async ({ x2, shot }) => {
    const mk = (x) => new Touch({ identifier: 1, target: document.body, clientX: x, clientY: 400 });
    document.dispatchEvent(new TouchEvent('touchstart', { touches: [mk(8)], changedTouches: [mk(8)], bubbles: true }));
    for (let x = 20; x <= x2; x += 20) document.dispatchEvent(new TouchEvent('touchmove', { touches: [mk(x)], changedTouches: [mk(x)], bubbles: true }));
    const hint = document.querySelector('.swipe-back').className;
    if (shot) return hint;
    document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [mk(x2)], bubbles: true }));
    return hint;
  }, { x2, shot });
  console.log('short swipe stays', (await swipeTo(40)).includes('on') && (await p.waitForTimeout(400), await hash()) === `#/view/${id}`);
  const hint = await swipeTo(100, true);
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/swipe-hint.png' });
  await p.evaluate(() => document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [new Touch({ identifier: 1, target: document.body, clientX: 100, clientY: 400 })], bubbles: true })));
  await settle();
  console.log('long swipe goes back', hint.includes('ready') && (await hash()) === '#/list/happy');
  console.log('errors', errs); await b.close();
})();
