const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a);
  const errs = [];
  const obs = () => { new MutationObserver(() => document.querySelectorAll('.celebrate:not(.wish-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); };
  // ---- 照片傳到一半失敗（手機版）----
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addInitScript(obs);
    await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
    await p.goto(U + '#/new/happy'); await p.waitForTimeout(600);
    await p.fill('#f-title', '有照片'); await p.setInputFiles('#f-photos', ['big.jpg', 'big.jpg']); await p.waitForTimeout(2500);
    await p.evaluate(() => { let n = 0; const orig = LocalDB.putPhoto.bind(LocalDB); LocalDB.putPhoto = async (x) => { if (++n === 2) throw new Error('網路斷了'); return orig(x); }; });
    await p.click('#save'); await p.waitForTimeout(1500);
    log('photo fail: still on form', p.url().endsWith('#/new/happy'), 'photos left', await p.evaluate(async () => (await LocalDB.allPhotos()).length), 'records', await p.evaluate(async () => (await LocalDB.allRecords()).length));
    // 分類改名
    await p.evaluate(async () => {
      await DB.putRecord({ id: 'f1', no: 1, type: 'fight', title: '家事', category: '家事', date: '2026-09-01', emojis: [], tags: [], photoIds: [], visibility: 'shared', status: 'open', followUps: [], createdAt: 1, updatedAt: 1 });
      await DB.setSetting('categories', ['家事', '溝通']);
    });
    await p.goto(U + '#/settings'); await p.waitForTimeout(600);
    p.removeAllListeners('dialog'); p.on('dialog', (d) => (d.type() === 'prompt' ? d.accept('家務分工') : d.accept()));
    await p.click('[data-edit-cat="家事"]'); await p.waitForTimeout(800);
    log('cat renamed', await p.evaluate(async () => [(await DB.getSetting('categories')).join(','), (await DB.getRecord('f1')).category]));
    await p.click('[data-rm-cat="家務分工"]'); await p.waitForTimeout(600);
    await p.goto(U + '#/view/f1'); await p.waitForTimeout(600);
    log('deleted cat label', await p.isVisible('text=（已刪除的分類）'));
    await ctx.close();
  }
  // ---- 備份匯入到第二個帳號 ----
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
    await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
    await ctx.addInitScript(obs);
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
    const login = async (email) => { await p.goto(U + '#/login'); await p.evaluate(() => sessionStorage.removeItem('mockUid')); await p.reload(); await p.waitForTimeout(600); await p.fill('#email', email); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(900); };
    await login('a@x.com');
    await p.evaluate(async () => { await DB.putRecord({ id: 'same1', no: 1, type: 'happy', title: 'A 的紀錄', date: '2026-09-01', emojis: [], tags: [], photoIds: [], visibility: 'shared', createdAt: 1, updatedAt: 1 }); });
    const backup = { app: 'couple-diary', version: 1, records: [{ id: 'same1', no: 1, type: 'happy', title: '備份裡的', date: '2026-09-01', emojis: [], tags: [], photoIds: [], visibility: 'shared', createdAt: 1, updatedAt: 1 }], photos: [], categories: [] };
    fs.writeFileSync('imp.json', JSON.stringify(backup));
    await login('b@x.com');
    await p.goto(U + '#/settings'); await p.waitForTimeout(700);
    await p.setInputFiles('#import', 'imp.json'); await p.waitForTimeout(1200);
    log('B imported', await p.evaluate(async () => (await DB.allRecords()).map((r) => r.title + ':' + (r.id === 'same1' ? 'sameid' : 'newid'))));
    log('A untouched', await p.evaluate(() => JSON.parse(localStorage.mockServer).t.records.find((r) => r.id === 'same1').data.title));
    await ctx.close();
  }
  console.log('errors', errs); await b.close();
})();
