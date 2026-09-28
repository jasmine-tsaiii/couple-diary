const pw = require('playwright');
// BROWSER=webkit 用 Safari 的引擎跑（GitHub 上的 cards-safari 工作流程）
const chromium = process.env.BROWSER === 'webkit' ? pw.webkit : pw.chromium;
const U = process.env.U || 'http://localhost:8770/';
const OUT = (process.env.SHOT_DIR || '.') + '/';
(async () => {
  const b = await chromium.launch(process.env.BROWSER === 'webkit' ? {} : require('./_launch'));
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.celebrate:not(.wish-dlg):not(.danger-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  // 上週的日期
  const lw = await p.evaluate(() => { const d = new Date(); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow - 3); return d.toISOString().slice(0, 10); });
  const add = async (type, title, desc, photo) => {
    await p.goto(U + '#/new/' + type); await p.waitForTimeout(600); await p.fill('#f-title', title); await p.fill('#f-date', lw);
    if (desc) await p.fill('#f-desc', desc).catch(() => {});
    if (photo) { await p.setInputFiles('#f-photos', photo); await p.waitForTimeout(800); }
    await p.click('#save'); await p.waitForTimeout(1000); return p.url().split('/').pop();
  };
  await p.goto(U); await p.waitForTimeout(600);
  await p.fill('#n-me', 'Jasmine'); await p.fill('#n-partner', '小明'); await p.click('#n-save'); await p.waitForTimeout(500);
  await add('happy', '一起去淡水看夕陽，吃了雞蛋糕', '風很大但很開心', 'big.jpg');
  await add('happy', '他煮了晚餐');
  await add('cloud', '遲到');
  // Safari 引擎填日期欄不一定吃得到，直接把日期設成上週；紀錄 id 也從資料庫拿
  const id = await p.evaluate(async (d) => {
    let found = '';
    for (const r of await DB.allRecords()) { if (r.date !== d) { r.date = d; await DB.putRecord(r); } if (r.title.startsWith('一起去淡水')) found = r.id; }
    return found;
  }, lw);
  await p.goto(U); await p.waitForTimeout(900);
  console.log('home banner', await p.isVisible('.card-banner'), 'tile', await p.isVisible('text=回憶小卡'));
  await p.goto(U + '#/cards'); await p.waitForTimeout(700);
  console.log('cards list week', (await p.textContent('body')).includes('2 個美好時刻'));
  await p.goto(U + '#/card/week'); await p.waitForTimeout(2500);
  console.log('week img', await p.evaluate(() => { const i = document.getElementById('card-img'); return i.naturalWidth + 'x' + i.naturalHeight; }));
  const save = async (name) => { const src = await p.evaluate(() => { const i = document.getElementById('card-img'); const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext('2d').drawImage(i, 0, 0); return c.toDataURL('image/png'); }); require('fs').writeFileSync(OUT + name, Buffer.from(src.split(',')[1], 'base64')); };
  await save('card-week.png');
  await p.click('[data-size="square"]'); await p.waitForTimeout(2000);
  console.log('square', await p.evaluate(() => document.getElementById('card-img').naturalHeight));
  await save('card-week-square.png');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.click('#card-share')]);
  console.log('download', !!dl && dl.suggestedFilename());
  await p.goto(U); await p.waitForTimeout(700);
  console.log('banner gone after view', !(await p.isVisible('.card-banner')));
  await p.goto(U + '#/view/' + id); await p.waitForTimeout(700);
  await p.click('text=做成回憶小卡'); await p.waitForTimeout(2500);
  await save('card-record.png');
  // 紀念日
  await p.evaluate(() => {}); await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  const since = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 99); return d.toISOString().slice(0, 10); });
  await p.fill('#set-since', since); await p.locator('#set-since').dispatchEvent('change'); await p.waitForTimeout(300);
  const saveBtn = p.locator('#save-names'); if (await saveBtn.count()) await saveBtn.first().click();
  await p.waitForTimeout(600);
  await p.goto(U + '#/card/days'); await p.waitForTimeout(2500);
  if (p.url().includes('card/days')) await save('card-days.png'); else console.log('days not available', p.url());
  console.log('errors', errs); await b.close();
})();
