const pw = require('playwright');
const fs = require('fs');
const U = process.env.U;
(async () => {
  const b = await pw.chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ ...pw.devices['Pixel 7'] });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1'); });
  const p = await ctx.newPage();
  const dialogs = []; const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => { dialogs.push(d.message()); d.accept(); });
  await p.goto(U + '#/'); await p.waitForTimeout(800);
  await p.evaluate(async () => { await DB.putRecord({ id: 'r1', no: 1, type: 'happy', title: '原本的標題', description: '', emojis: [], tags: [], date: '2026-09-20', createdAt: 1, updatedAt: 1, photoIds: [], visibility: 'shared' }); });
  // 1. 編輯中按手機返回鍵
  await p.goto(U + '#/view/r1'); await p.waitForTimeout(600);
  await p.goto(U + '#/edit/r1'); await p.waitForTimeout(700);
  await p.fill('#f-title', '改過的標題'); await p.waitForTimeout(1500);
  await p.goBack(); await p.waitForTimeout(800);
  console.log('edit+back: url', p.url().split('#')[1], 'confirm shown', dialogs.length);
  const t = await p.evaluate(async () => (await DB.getRecord ? DB.getRecord('r1') : (await DB.allRecords()).find((r) => r.id === 'r1')).title);
  await p.goForward(); await p.waitForTimeout(800);
  console.log('stored title', t, 'form title after forward', await p.inputValue('#f-title').catch(() => 'no form'));
  // 2. 新增：加照片後按返回鍵
  dialogs.length = 0;
  await p.goto(U + '#/'); await p.waitForTimeout(500);
  await p.goto(U + '#/new/happy'); await p.waitForTimeout(700);
  await p.fill('#f-title', '海邊'); 
  await p.setInputFiles('#f-photos', 'big.jpg'); await p.waitForTimeout(1500);
  console.log('photos in form', await p.$$eval('.photo-thumb, .photos img, [data-rm-photo]', (e) => e.length));
  await p.goBack(); await p.waitForTimeout(800);
  console.log('new+photo+back: url', p.url().split('#')[1], 'confirm shown', dialogs.length);
  await p.goto(U + '#/new/happy'); await p.waitForTimeout(900);
  console.log('draft restored title', await p.inputValue('#f-title'), 'photos', await p.$$eval('[data-rm-photo]', (e) => e.length));
  await p.screenshot({ path: `${process.env.SHOT}/qa2-draft.png`, fullPage: true });
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
