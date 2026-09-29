// 通知第二批：新的通知種類文字與連結、今天／更早分組、點一則只讀一則、打開紀錄就讀掉那則的通知、分頁小紅點、信裡的一鍵取消
const { chromium } = require('playwright');
const fs = require('fs');
const U = process.env.U || 'http://localhost:8770/';
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'light' });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(U + '#/login'); await p.waitForSelector('#email');
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn');
  await p.waitForSelector('#role-owner', { timeout: 15000 }); await p.click('#role-owner'); await p.waitForTimeout(500);
  // 先寫一則，再把它改成「對方寫的」，模擬另一半新增
  await p.goto(U + '#/new/happy'); await p.waitForSelector('#f-title'); await p.fill('#f-title', '一起吃早餐');
  await p.click('#save'); await p.waitForSelector('#done', { timeout: 8000 });
  const rid = await p.evaluate(() => location.hash.split('/')[2]);
  await p.goto(U + '#/'); await p.waitForSelector('.home-head'); await p.waitForTimeout(500);
  await p.evaluate((rid) => {
    const S = JSON.parse(localStorage.getItem('mockServer'));
    const uid = Object.keys(S.users).find((k) => S.users[k].email === 'jas@x.com');
    const r = S.t.records.find((x) => x.id === rid); r.author = 'pp'; r.data.author = 'pp'; r.data.authorName = '小明';
    const t = (m) => new Date(Date.now() - m * 60000).toISOString();
    S.notifs = [
      { id: 11, recipient: uid, actor_name: '小明', kind: 'new_happy', record_id: rid, created_at: t(3), read_at: null },
      { id: 12, recipient: uid, actor_name: '', kind: 'anniversary', record_id: null, extra: { days: 100 }, created_at: t(10), read_at: null },
      { id: 13, recipient: uid, actor_name: '小明', kind: 'partner_request', record_id: null, created_at: t(20), read_at: null },
      { id: 14, recipient: uid, actor_name: '', kind: 'cloud_reflect', record_id: 'c1', created_at: t(60 * 30), read_at: null },
      { id: 15, recipient: uid, actor_name: '', kind: 'write_nudge', record_id: null, created_at: t(60 * 50), read_at: null },
    ];
    S.unsubTokens = { [uid]: 'tok-123' };
    localStorage.setItem('mockServer', JSON.stringify(S));
  }, rid);
  await p.reload(); await p.waitForTimeout(3000);
  console.log('bell 5', (await p.textContent('#bell .bell-dot')) === '5');
  console.log('happy tab dot', await p.locator('a.tab.has-new[href="#/list/happy"]').count() === 1 && await p.locator('a.tab.has-new[href="#/list/cloud"]').count() === 0);
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/home-dots.png' });
  await p.click('#bell'); await p.waitForSelector('.notify-item');
  const heads = await p.locator('.section-title').allTextContents();
  console.log('grouped today / earlier', heads.join(',') === '今天,更早');
  const txt = await p.locator('.notify-item .notify-text').allTextContents();
  console.log('anniversary text', txt.includes('今天是你們在一起第 100 天 🎉'));
  console.log('request text', txt.includes('小明想加入你們的日記，到設定頁按同意'));
  console.log('reflect + nudge text', txt.includes('3 天前記下的烏雲，現在回頭看，有沒有新的想法？') && txt.includes('好幾天沒寫了，最近有什麼想記下來的嗎？'));
  const href = async (id) => p.getAttribute(`[data-nid="${id}"]`, 'href');
  console.log('links', (await href(12)) === '#/cards' && (await href(13)) === '#/settings' && (await href(14)) === '#/view/c1' && (await href(15)) === '#/new/happy');
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/notifications.png', fullPage: true });
  // 點紀念日那則：只有那則變已讀
  await p.click('[data-nid="12"]'); await p.waitForTimeout(600);
  await p.goto(U + '#/notifications'); await p.waitForSelector('.notify-item');
  console.log('one read, four left', await p.locator('.notify-item.unread').count() === 4 && !(await p.getAttribute('[data-nid="12"]', 'class')).includes('unread'));
  // 直接打開那則紀錄：它的通知也讀掉、美好分頁紅點消失
  await p.goto(U + `#/view/${rid}`); await p.waitForTimeout(800);
  await p.goto(U + '#/'); await p.waitForSelector('#bell:not([hidden])'); await p.waitForTimeout(600);
  console.log('bell number gone after opening list', await p.locator('#bell .bell-dot:not([hidden])').count() === 0);
  console.log('happy tab dot gone', await p.locator('a.tab.has-new').count() === 0);
  await p.goto(U + '#/notifications'); await p.waitForSelector('.notify-item');
  console.log('record opened -> 3 left in list', await p.locator('.notify-item.unread').count() === 3);
  // 之後新來的通知：數字又出現
  await p.evaluate(() => { const S = JSON.parse(localStorage.getItem('mockServer')); const uid = Object.keys(S.users).find((k) => S.users[k].email === 'jas@x.com'); S.notifs.push({ id: 16, recipient: uid, actor_name: '小明', kind: 'new_happy', record_id: 'zz', created_at: new Date(Date.now() + 5000).toISOString(), read_at: null }); localStorage.setItem('mockServer', JSON.stringify(S)); });
  await p.goto(U + '#/'); await p.reload(); await p.waitForSelector('#bell .bell-dot:not([hidden])', { timeout: 8000 });
  console.log('new one after seen shows 1', (await p.textContent('#bell .bell-dot')) === '1');
  // 一鍵取消：錯的暗號不行、對的可以；設定頁跟著變成已關閉
  const uid = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('mockServer')).users).find((k) => JSON.parse(localStorage.getItem('mockServer')).users[k].email === 'jas@x.com'));
  await p.goto(U + `#/unsubscribe?u=${uid}&t=wrong`); await p.waitForSelector('#unsub-yes'); await p.click('#unsub-yes'); await p.waitForTimeout(500);
  console.log('wrong token refused', (await p.textContent('#app')).includes('連結已經失效'));
  await p.goto(U + `#/unsubscribe?u=${uid}&t=tok-123`); await p.waitForSelector('#unsub-yes');
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/unsubscribe.png' });
  await p.click('#unsub-yes'); await p.waitForTimeout(500);
  console.log('unsubscribed', (await p.textContent('#app')).includes('已經取消了'));
  await p.goto(U + '#/settings'); await p.waitForSelector('#notify-email:not([disabled])', { timeout: 10000 });
  console.log('settings shows off', (await p.getAttribute('#notify-email', 'aria-pressed')) === 'false');
  console.log('errors', errs); await b.close();
})();
