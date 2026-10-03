// 兩個人各自用帳號開了自己的日記：已經是主人的人點邀請連結（或從設定進去）也能在 App 裡加入對方，不會被跳回首頁；
// 加入時可以勾「把我寫的紀錄搬過去」，對方同意後自動搬；之後也能在設定搬；同意後看到同一本、每天一題同一題
const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); localStorage.setItem('inviteCardHidden', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  let dialogs = []; let accept = true;
  p.on('dialog', (d) => { dialogs.push(d.message()); accept ? d.accept() : d.dismiss(); });
  const as = async (uid) => { await p.evaluate((u) => { if (u) sessionStorage.setItem('mockUid', u); else sessionStorage.removeItem('mockUid'); }, uid); await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(1000); };
  const login = async (email) => {
    if (p.url().startsWith('http')) await as(null);
    await p.goto(U + '#/login'); await p.waitForTimeout(500);
    await p.fill('#email', email); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
    await p.click('#role-owner'); await p.waitForTimeout(600);
    return p.evaluate(() => sessionStorage.getItem('mockUid'));
  };
  // A 開了自己的日記並產生分享碼
  const a = await login('jas@x.com');
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  log('owner without partner sees join-other link', await p.isVisible('#join-other a[href="#/join"]'));
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();
  log('join-other link still there after share made', await p.isVisible('#join-other'));
  // B 也各自開了一本，寫了一則
  const bId = await login('ming@x.com');
  await p.evaluate(async () => { await DB.setSetting('names', { me: '小明', partner: '' }); await DB.putRecord({ id: 'b1', type: 'happy', title: '我自己的', date: '2026-10-01', visibility: 'shared', photoIds: [], emojis: [], tags: [], createdAt: 1, updatedAt: 1 }); });
  await p.goto(U + '#/me'); await p.waitForTimeout(800);
  log('me row hints can join', (await p.textContent('#row-share')).includes('也能加入對方的'));
  // B 點 A 的邀請連結：以前會被跳回首頁
  await p.goto(U + '?utm_source=invite#/join/' + code); await p.reload(); await p.waitForTimeout(1200);
  log('join form shown for signed-in owner', await p.isVisible('#join-form'));
  log('code prefilled', (await p.inputValue('#j-code')) === code);
  log('name prefilled', (await p.inputValue('#j-name')) === '小明');
  log('notice mentions records', (await p.textContent('#app')).includes('1 則紀錄可以一起搬過去'));
  log('bring checkbox checked by default', await p.isChecked('#j-bring'));
  log('back link goes to own diary', (await p.getAttribute('#to-login', 'href')) === '#/settings');
  await p.fill('#j-pass', '123456');
  dialogs = []; accept = false; await p.click('#join-btn'); await p.waitForTimeout(600);
  log('confirm before join', (dialogs[0] || '').includes('會搬進共用的日記'), 'still form', await p.isVisible('#join-form'));
  dialogs = []; accept = true; await p.click('#join-btn'); await p.waitForTimeout(1500);
  log('waiting approval', (await p.textContent('#app')).includes('等'));
  // A 同意
  await as(a); await p.click('[data-home-approve]'); await p.waitForTimeout(900);
  await p.goto(U + '#/daily'); await p.reload(); await p.waitForTimeout(1200);
  const qa = await p.getAttribute('#d-send', 'data-q');
  // B 現在看到 A 的日記，每天一題同一題
  await as(bId);
  log('B is partner now', await p.evaluate(() => isPartner()));
  const b1 = await p.evaluate(async () => (await DB.allRecords()).find((r) => r.id === 'b1'));
  log('B record moved into shared diary', !!b1 && b1.author === bId && b1.authorName === '小明' && b1.no === 1);
  log('moved toast', await p.isVisible('text=你寫的 1 則紀錄搬過來了'));
  log('flag cleared', await p.evaluate(() => !Object.keys(localStorage).some((k) => k.startsWith('bringRecords:'))));
  await p.goto(U + '#/settings'); await p.reload(); await p.waitForTimeout(1000);
  log('no bring card when nothing left', !(await p.isVisible('#bring-card')));
  // 之後才發現還有自己那本的紀錄：設定裡可以搬
  await p.evaluate((u) => { const S = JSON.parse(localStorage.mockServer); S.t.records.push({ id: 'b9', owner: u, author: u, type: 'cloud', visibility: 'locked', unlocked: false, data: { id: 'b9', type: 'cloud', no: 1, title: '後來的', date: '2026-09-30', visibility: 'locked', photoIds: [], emojis: [], tags: [], createdAt: 2, updatedAt: 2 }, created_at: new Date().toISOString() }); localStorage.mockServer = JSON.stringify(S); }, bId);
  await p.goto(U + '#/settings'); await p.reload(); await p.waitForTimeout(1000);
  log('bring card shows 1', (await p.textContent('#bring-card')).includes('1 則'));
  dialogs = []; await p.click('#bring-btn'); await p.waitForTimeout(1000);
  log('bring confirm asked', (dialogs[0] || '').includes('搬進'), 'card gone', !(await p.isVisible('#bring-card')));
  log('b9 now in shared diary', await p.evaluate(async () => (await DB.allRecords()).some((r) => r.id === 'b9')));
  // 主人看得到搬過來的分享紀錄，看不到上鎖的
  await as(a);
  const seen = await p.evaluate(async () => (await DB.allRecords()).map((r) => r.id));
  log('owner sees moved shared, not locked', seen.includes('b1') && !seen.includes('b9'));
  await as(bId);
  await p.goto(U + '#/daily'); await p.reload(); await p.waitForTimeout(1200);
  log('same daily question', !!qa && (await p.getAttribute('#d-send', 'data-q')) === qa);
  log('errors', JSON.stringify(errs));
  await b.close();
})();
