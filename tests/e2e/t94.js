// 每月回憶卡（照片拼貼版）：有照片的放拍立得、沒照片的用 emoji，數字貼紙、這段時間的心情；直式和方形都畫得出來
const pw = require('playwright');
const U = process.env.U || 'http://localhost:8770/';
const OUT = (process.env.SHOT_DIR || '.') + '/';
(async () => {
  const b = await pw.chromium.launch(require('./_launch'));
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.celebrate:not(.wish-dlg):not(.danger-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const add = async (type, title, photo) => {
    await p.goto(U + '#/new/' + type); await p.waitForTimeout(600); await p.fill('#f-title', title);
    if (photo) { await p.setInputFiles('#f-photos', photo); await p.waitForTimeout(800); }
    await p.click('#save'); await p.waitForFunction(() => location.hash.startsWith('#/view/'), null, { timeout: 30000 });
  };
  await p.goto(U); await p.waitForTimeout(600);
  await p.fill('#n-me', 'Jasmine'); await p.fill('#n-partner', '小明'); await p.click('#n-save'); await p.waitForTimeout(500);
  await add('happy', '一起去淡水看夕陽', 'big.jpg');
  await add('happy', '吃到超好吃的拉麵', 'big.jpg');
  await add('happy', '一起按摩');
  await add('happy', '週末睡到自然醒');
  await add('cloud', '遲到');
  // 全部改到上個月，加上心情 emoji；烏雲在上個月放晴
  await p.evaluate(async () => {
    const r0 = lastMonthRange(); const day = (n) => r0.from.slice(0, 8) + String(n).padStart(2, '0');
    const emo = { 一起去淡水看夕陽: ['🌅', '🥰'], 吃到超好吃的拉麵: ['🍜', '🥰'], 一起按摩: ['💆', '🥰'], 週末睡到自然醒: ['💤'] };
    let n = 3;
    for (const r of await DB.allRecords()) {
      r.date = day(n); n += 6;
      if (emo[r.title]) r.emojis = emo[r.title];
      if (r.type === 'cloud') r.clearedAt = new Date(`${day(20)}T12:00:00`).getTime();
      await DB.putRecord(r);
    }
  });
  const save = async (name) => { const src = await p.evaluate(() => { const i = document.getElementById('card-img'); const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext('2d').drawImage(i, 0, 0); return c.toDataURL('image/png'); }); require('fs').writeFileSync(OUT + name, Buffer.from(src.split(',')[1], 'base64')); };
  await p.goto(U + '#/card/month'); await p.waitForTimeout(3000);
  console.log('story size', await p.evaluate(() => document.getElementById('card-img').naturalHeight) === 1920);
  const st = await p.evaluate(() => { const r = lastMonthRange(); return liveRecords().then((all) => { const s = periodStats(all, r); return { picks: s.picks.map((x) => x.title), moods: s.moods, cleared: s.cleared }; }); });
  console.log('photos first, 3 picks', st.picks.length === 3 && st.picks.slice(0, 2).every((t) => ['一起去淡水看夕陽', '吃到超好吃的拉麵'].includes(t)));
  console.log('moods most used first', st.moods[0] === '🥰' && st.moods.length === 4);
  console.log('cleared counted', st.cleared === 1);
  await save('card-month.png');
  // 自己挑：取消拉麵、改放原本沒選到的那則
  const chips = await p.$$eval('[data-pick]', (bs) => bs.map((b) => [b.textContent, b.classList.contains('on')]));
  console.log('pick list shows all 4, 3 on', chips.length === 4 && chips.filter((c) => c[1]).length === 3);
  await p.click('[data-pick]:has-text("吃到超好吃的拉麵")'); await p.waitForTimeout(400);
  const offTitle = chips.find((c) => !c[1])[0].replace(/\d+\/\d+$/, '').replace('📷 ', '').trim();
  await p.click('[data-pick]:not(.on):not(:has-text("拉麵"))'); await p.waitForTimeout(2000);
  const on = await p.$$eval('[data-pick].on', (bs) => bs.map((b) => b.textContent));
  console.log('pick changes', on.length === 3 && !on.some((t) => t.includes('拉麵')) && on.some((t) => t.includes(offTitle)));
  await save('card-month-picked.png');
  await p.screenshot({ path: OUT + 'card-pick-ui.png', fullPage: true });
  await p.click('[data-size="square"]'); await p.waitForTimeout(2500);
  console.log('square size', await p.evaluate(() => document.getElementById('card-img').naturalHeight) === 1080);
  await save('card-month-square.png');
  await p.click('[data-opt="hard"]'); await p.waitForTimeout(2500);
  await save('card-month-square-hard.png');
  await p.click('[data-size="story"]'); await p.waitForTimeout(2500);
  await save('card-month-hard.png');
  console.log('errors', errs); await b.close();
})();
