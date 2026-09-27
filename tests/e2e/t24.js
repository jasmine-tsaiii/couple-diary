const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a);
  const errs = [];
  const obs = () => { new MutationObserver(() => document.querySelectorAll('.celebrate:not(.wish-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); };
  // ---- 手機版（訪客） ----
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
    await ctx.addInitScript(obs);
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('L ' + e.message)); p.on('dialog', (d) => d.accept());
    await p.goto(U + '#/'); await p.waitForTimeout(600);
    log('L home card', await p.isVisible('text=一起完成的事'));
    await p.goto(U + '#/wishes'); await p.waitForTimeout(500);
    await p.click('[data-widea="一起看日出"]'); await p.waitForTimeout(400);
    await p.click('#w-add'); await p.fill('#w-title', '去墾丁'); await p.click('[data-wcat="旅行"]'); await p.fill('#w-note', '夏天'); await p.click('#w-save'); await p.waitForTimeout(500);
    log('L items', await p.$$eval('.list .bold', (e) => e.map((x) => x.textContent)));
    await p.click('[aria-label="標成完成：去墾丁"]'); await p.waitForTimeout(800);
    log('L went to form', p.url().endsWith('#/new/happy'), await p.inputValue('#f-title').catch(() => '?'));
    await p.screenshot({ path: 'w-form.png' });
    await p.click('text=儲存'); await p.waitForTimeout(900);
    await p.goto(U + '#/wishes'); await p.waitForTimeout(400); await p.click('[data-widea="一起去露營"]').catch(() => {}); await p.waitForTimeout(400); await p.screenshot({ path: 'w-list.png' }); await p.click('[data-wshow="done"]'); await p.waitForTimeout(400);
    log('L linked', await p.isVisible('text=看那則美好時刻'));
    await p.goto(U + '#/stamps'); await p.waitForTimeout(500);
    log('L stamp got', await p.$$eval('.stamp.got .stamp-name', (e) => e.map((x) => x.textContent)));
    await p.goto(U + '#/'); await p.waitForTimeout(500);
    log('L home', await p.textContent('a[href="#/wishes"]'));
    await ctx.close();
  }
  // ---- 雲端：主人 + 另一半 ----
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
    await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
    await ctx.addInitScript(() => localStorage.setItem('mockAutoApprove', '1'));
    await ctx.addInitScript(obs);
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('C ' + e.message)); p.on('dialog', (d) => d.accept());
    const as = async (uid, hash) => { await p.evaluate((u) => (u ? sessionStorage.setItem('mockUid', u) : sessionStorage.removeItem('mockUid')), uid); await p.goto(U + hash); await p.reload(); await p.waitForTimeout(800); };
    await p.goto(U + '#/login'); await p.waitForTimeout(500);
    await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(800); if (await p.locator('#role-owner').count()) { await p.click('#role-owner'); await p.waitForTimeout(600); }
    await p.evaluate(async () => { await DB.setSetting('names', { me: 'Jasmine', partner: '小明' }); });
    await p.goto(U + '#/wishes'); await p.waitForTimeout(600);
    await p.click('#w-add'); await p.fill('#w-title', '主人的事'); await p.click('#w-save'); await p.waitForTimeout(600);
    await p.goto(U + '#/settings'); await p.waitForTimeout(600);
    await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(600);
    const code = (await p.textContent('.share-code')).trim();
    await as(null, '#/login'); await p.click('text=我是另一半，用分享碼加入'); await p.waitForTimeout(300);
    await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(900);
    log('P home card', await p.textContent('a[href="#/wishes"]').catch(() => 'none'));
    await p.goto(U + '#/wishes'); await p.waitForTimeout(600);
    log('P no delete on owner item', await p.$$eval('[data-wdel]', (e) => e.length));
    await p.click('#w-add'); await p.fill('#w-title', '小明想做的'); await p.click('#w-save'); await p.waitForTimeout(700);
    log('P items', await p.$$eval('.list .bold', (e) => e.map((x) => x.textContent)), 'del btns', await p.$$eval('[data-wdel]', (e) => e.length));
    await p.click('[aria-label="標成完成：主人的事"]'); await p.waitForTimeout(800);
    log('P stays on list', p.url().endsWith('#/wishes'));
    log('P cannot delete owner item', await p.evaluate(async () => { const l = await CloudDB.listWishes(); try { await CloudDB.deleteWish(l.find((w) => w.title === '主人的事').id); return 'no!'; } catch (e) { return e.message; } }));
    await p.screenshot({ path: 'w-partner.png', fullPage: true });
    const a1 = await p.evaluate(() => sessionStorage.getItem('mockUid'));
    await as('owner-jas', '#/wishes'); await p.click('[data-wshow="done"]'); await p.waitForTimeout(500);
    log('O sees done by', await p.isVisible('text=小明打勾'), 'rec btn', await p.isVisible('[data-wrec]'));
    await p.click('[data-wshow="todo"]'); await p.waitForTimeout(400);
    log('O sees partner item', await p.isVisible('text=小明加的'));
    await p.screenshot({ path: 'w-owner.png', fullPage: true });
    await p.click('[data-wshow="done"]'); await p.waitForTimeout(400);
    await p.click('[data-wrec]'); await p.waitForTimeout(800);
    await p.click('text=儲存'); await p.waitForTimeout(900);
    const rid = await p.evaluate(async () => (await CloudDB.listWishes()).find((w) => w.title === '主人的事').record_id);
    log('O record linked', !!rid);
    await p.click('[data-wdel]').catch(() => {});
    await ctx.close();
  }
  console.log('errors', errs); await b.close();
})();
