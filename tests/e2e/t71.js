// #26 編輯頁還沒儲存時，手機返回鍵（瀏覽器上一頁）要先問；選「取消」留在原頁、內容還在；選「確定」才離開
const { chromium } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); new MutationObserver(() => document.querySelectorAll('.tour-dlg').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  let answer = false; const asked = [];
  p.on('dialog', (d) => { asked.push(d.type() + ':' + d.message()); answer ? d.accept() : d.dismiss(); });
  await p.goto(U + '#/'); await p.waitForTimeout(600);
  await p.goto(U + '#/new/happy'); await p.waitForSelector('#f-title');
  // 沒改東西：上一頁直接離開、不問
  await p.goBack(); await p.waitForTimeout(500);
  console.log('clean form leaves without asking', asked.length === 0 && !(await p.locator('#f-title').count()));
  await p.goto(U + '#/new/happy'); await p.waitForSelector('#f-title');
  await p.fill('#f-title', '一起去看海');
  await p.goBack(); await p.waitForTimeout(500);
  console.log('asked on back', asked.length === 1 && asked[0].includes('還沒儲存'));
  console.log('stayed with text', (await p.inputValue('#f-title')) === '一起去看海' && p.url().includes('#/new/happy'));
  // 再按一次上一頁、這次確定離開
  answer = true;
  await p.goBack(); await p.waitForTimeout(600);
  console.log('left after confirm', asked.length === 2 && !(await p.locator('#f-title').count()));
  // 存好之後不再問
  await p.goto(U + '#/new/happy'); await p.waitForSelector('#f-title');
  const n = asked.length;
  if (n > 2) { console.log('draft prompt handled', true); }
  await p.fill('#f-title', '存好的'); await p.click('#save'); await p.waitForTimeout(800);
  console.log('no ask after save', asked.filter((m) => m.includes('還沒儲存')).length === 2 && !(await p.locator('#f-title').count()));
  console.log('errors', errs); await b.close();
})();
