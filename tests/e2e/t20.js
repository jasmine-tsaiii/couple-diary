const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const log = (...a) => console.log(...a);
  await p.goto(U + '#/'); await p.waitForTimeout(700);
  log('initial stamps', await p.evaluate(() => DB.getSetting('stamps', null)));
  // 第一個美好 → 慶祝
  await p.goto(U + '#/new/happy'); await p.waitForTimeout(400); await p.fill('#f-title', '第一個'); await p.click('#save'); await p.waitForTimeout(900);
  log('celebrate', await p.isVisible('.celebrate'), await p.textContent('.celebrate h2').catch(() => ''));
  await p.screenshot({ path: 'st1.png' });
  await p.click('#cel-ok'); await p.waitForTimeout(200);
  await p.goto(U + '#/'); await p.waitForTimeout(700);
  log('no repeat', !(await p.isVisible('.celebrate')));
  // 加 4 個美好、1 個烏雲
  await p.evaluate(async () => { const base = { emojis: [], tags: [], date: '2026-09-01', createdAt: 1, updatedAt: 1, photoIds: [], visibility: 'shared' };
    for (let i = 2; i <= 5; i++) await DB.putRecord({ ...base, id: 'h' + i, no: i, type: 'happy', title: 'H' + i });
    await DB.putRecord({ ...base, id: 'c1', no: 1, type: 'cloud', title: 'C', reflections: [] }); });
  await p.goto(U + '#/list/happy'); await p.goto(U + '#/'); await p.waitForTimeout(900);
  log('5 stamp', await p.textContent('.celebrate h2').catch(() => 'none'));
  await p.click('#cel-ok');
  log('ratio', await p.textContent('.theme-cloud'));
  log('stamp card', (await p.textContent('a[href="#/stamps"]')).replace(/\s+/g, ' '));
  await p.screenshot({ path: 'st2-home.png', fullPage: true });
  await p.goto(U + '#/stamps'); await p.waitForTimeout(600);
  log('book got', await p.$$eval('.stamp.got', (e) => e.length), 'total', await p.$$eval('.stamp', (e) => e.length));
  await p.screenshot({ path: 'st3-book.png', fullPage: true });
  // 反思透過 updateRecord 觸發
  await p.goto(U + '#/view/c1'); await p.waitForTimeout(500);
  await p.fill('#rf-text', '想通了'); await p.click('#rf-add'); await p.waitForTimeout(900);
  log('reflect stamp', await p.textContent('.celebrate h2').catch(() => 'none'));
  await p.goto(U + '#/list/cloud'); await p.waitForTimeout(500);
  log('cloud list count', (await p.textContent('.topbar .count')).trim(), 'no progress', !(await p.isVisible('.progress')));
  console.log('errors', errs); await b.close();
})();
