// 備份匯入（含照片）與照片上傳：看 Safari 引擎能不能正常
const pw = require('playwright');
const fs = require('fs');
const U = process.env.U;
(async () => {
  const b = await pw.chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1'); new MutationObserver(() => document.querySelectorAll('.celebrate').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200))); p.on('dialog', (d) => d.accept());
  p.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text().slice(0, 200)); });
  await p.goto(U + '#/'); await p.waitForTimeout(800);
  console.log('direct fetch data url', await p.evaluate(async () => { try { const b = await (await fetch('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')).blob(); return 'ok ' + b.size; } catch (e) { return 'FAIL ' + e.message; } }));
  const img = 'data:image/jpeg;base64,' + fs.readFileSync('big.jpg').toString('base64');
  fs.writeFileSync('bk.json', JSON.stringify({ app: 'couple-diary', version: 1, records: [{ id: 'imp1', no: 1, type: 'happy', title: '匯入的', description: '', emojis: [], tags: [], date: '2026-09-01', createdAt: 1, updatedAt: 1, photoIds: ['ph1'], visibility: 'shared' }], photos: [{ id: 'ph1', data: img }], settings: {} }));
  await p.goto(U + '#/settings'); await p.waitForTimeout(800);
  await p.setInputFiles('#import', 'bk.json'); await p.waitForTimeout(1500);
  console.log('import toast', await p.textContent('#toast').catch(() => ''));
  await p.goto(U + '#/view/imp1'); await p.waitForTimeout(1000);
  console.log('imported photo shown', await p.$$eval('.detail-photos img', (e) => e.map((x) => x.naturalWidth)));
  // 上傳照片再存檔
  await p.goto(U + '#/new/happy'); await p.waitForTimeout(800);
  await p.fill('#f-title', '上傳測試'); await p.setInputFiles('#f-photos', 'big.jpg'); await p.waitForTimeout(1500);
  await p.click('#save'); await p.waitForTimeout(1500);

  console.log('after save url', p.url().split('#')[1], 'photos', await p.$$eval('.detail-photos img', (e) => e.map((x) => x.naturalWidth)));
  // 匯出備份
  await p.goto(U + '#/settings'); await p.waitForTimeout(800);
  const dl = p.waitForEvent('download', { timeout: 5000 }).then((d) => 'download ' + d.suggestedFilename()).catch(() => 'no download');
  const exp = await p.$('#export'); if (exp) await exp.click();
  console.log('export', exp ? await dl : 'no #export button', await p.textContent('#toast').catch(() => ''));
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
