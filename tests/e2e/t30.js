const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a);
  const errs = []; const dialogs = []; const toasts = [];
  const obs = () => { new MutationObserver(() => document.querySelectorAll('.celebrate:not(.wish-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); };
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addInitScript(obs);
    await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => { dialogs.push(d.message()); d.accept(); });
    await p.goto(U + '#/new/happy'); await p.waitForTimeout(600);
    await p.click('[data-type="cloud"]'); await p.waitForTimeout(200);
    log('no confirm when empty', dialogs.length === 0);
    await p.click('.emoji-row [data-emoji]'); await p.click('[data-type="fight"]'); await p.waitForTimeout(300);
    log('type confirm', dialogs.some((m) => m.includes('心情和標籤會清掉')));
    log('screenshot hint', await p.isVisible('text=截圖裡可能有其他人'));
    await p.evaluate(async () => { await DB.putRecord({ id: 'f1', no: 1, type: 'fight', title: '家事', date: '2026-09-01', emojis: [], tags: [], photoIds: [], visibility: 'shared', status: 'open', followUps: [], createdAt: 1, updatedAt: 1 }); });
    await p.goto(U + '#/view/f1'); await p.waitForTimeout(600);
    await p.fill('#fu-text', '聊過了'); await p.click('#fu-add');
    const t = await p.waitForSelector('.toast', { timeout: 3000 }).then((e) => e.textContent()).catch(() => '');
    log('fu toast', t);
    log('quota text', await p.evaluate(() => cloudErrorText({ name: 'QuotaExceededError', message: 'x' })));
    await ctx.close();
  }
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
    await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
    await ctx.addInitScript(obs);
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => { dialogs.push(d.message()); d.accept(); });
    await p.goto(U + '#/login'); await p.waitForTimeout(600);
    log('no hint first', !(await p.isVisible('#last-login')));
    await p.fill('#email', 'a@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(900); if (await p.locator('#role-owner').count()) { await p.click('#role-owner'); await p.waitForTimeout(600); }
    await p.evaluate(async () => { await DB.putRecord({ id: 'h1', no: 1, type: 'cloud', title: '分享的', date: '2026-09-01', emojis: [], tags: [], photoIds: [], visibility: 'shared', reflections: [], createdAt: 1, updatedAt: 1 }); });
    await p.goto(U + '#/edit/h1'); await p.waitForTimeout(700);
    dialogs.length = 0;
    await p.click('[data-vis="locked"]'); await p.click('#save'); await p.waitForTimeout(700);
    log('seen warning', dialogs.some((m) => m.includes('可能已經看過')));
    await p.evaluate(() => CloudDB.signOut && CloudDB.signOut()); await p.evaluate(() => sessionStorage.removeItem('mockUid'));
    await p.goto(U + '#/login'); await p.reload(); await p.waitForTimeout(700);
    log('hint', await p.textContent('#last-login').catch(() => null), 'email prefilled', await p.inputValue('#email'));
    await p.screenshot({ path: 'r1-login.png', fullPage: true });
    await ctx.close();
  }
  console.log('errors', errs); await b.close();
})();
