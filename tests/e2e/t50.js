const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); localStorage.setItem('a2hsNever', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const as = async (uid, hash) => { await p.evaluate((u) => (u ? sessionStorage.setItem('mockUid', u) : sessionStorage.removeItem('mockUid')), uid); await p.goto(U + '#/settings'); await p.reload(); await p.waitForTimeout(500); await p.goto(U + hash); await p.reload(); await p.waitForTimeout(900); };
  // 試用首頁
  await p.goto(U + '#/'); await p.waitForTimeout(700);
  log('guest quick btns', await p.$$eval('.quick-btn', (e) => e.map((x) => x.textContent.trim()).join(',')));
  log('guest tiles', await p.$$eval('.ftile .bold', (e) => e.map((x) => x.textContent).join(',')), 'share href', await p.getAttribute('#tile-share', 'href'));
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/home-a-guest.png', fullPage: true });
  await p.click('.quick-btn.theme-cloud'); await p.waitForTimeout(400);
  log('quick cloud form', p.url().endsWith('#/new/cloud'));
  // 主人
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
  const oid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();
  await p.evaluate(async () => {
    const mk = (id, type, title, extra = {}) => DB.putRecord({ id, type, title, date: '2026-09-2' + id.slice(-1), visibility: 'shared', photoIds: [], tags: [], createdAt: Date.now(), updatedAt: Date.now(), ...extra });
    await mk('h1', 'happy', '一起去看海'); await mk('h2', 'happy', '煮火鍋'); await mk('c3', 'cloud', '遲到半小時'); await mk('f4', 'fight', '家事怎麼分', { status: 'open', category: '生活' });
  });
  await as(null, '#/login'); await p.click('text=我是另一半，用分享碼加入'); await p.waitForTimeout(300);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(1200);
  const pid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await as(oid, '#/');
  log('join card before tiles', await p.evaluate(() => { const j = document.querySelector('.join-req'); const t = document.querySelector('.home-tiles'); return !!j && !!(j.compareDocumentPosition(t) & 4); }));
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/home-a-join.png' });
  await p.click('[data-home-approve]'); await p.waitForTimeout(1200);
  const c = await p.$$('.celebrate button'); for (const x of c) { try { await x.click(); } catch (e) {} }
  await as(oid, '#/');
  log('owner tiles', await p.$$eval('.ftile', (e) => e.map((x) => x.innerText.replace(/\n/g, ' ')).join(' | ')));
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/home-a-owner.png', fullPage: true });
  await p.click('#tile-share'); await p.waitForTimeout(900);
  log('share tile → settings share', p.url().endsWith('#/settings'), await p.evaluate(() => Math.round(document.getElementById('set-share').getBoundingClientRect().top)));
  await as(pid, '#/');
  log('partner tiles', await p.$$eval('.ftile', (e) => e.map((x) => x.innerText.replace(/\n/g, ' ')).join(' | ')));
  log('partner quick', await p.$$eval('.quick-btn', (e) => e.length));
  await p.screenshot({ path: (process.env.SHOT_DIR || '.') + '/home-a-partner.png', fullPage: true });
  console.log('errors', errs); await b.close();
})();
