// 配對情境表：各種身分打開邀請連結（#/join/分享碼）都要有清楚的下一步，不能默默跳走
// 沒帳號／試用中／登出過／新帳號／已有日記／點到自己的連結／等同意中／已是另一半／被移除的臨時身分
const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg, .celebrate').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const as = async (uid) => { await p.evaluate((u) => { if (u) sessionStorage.setItem('mockUid', u); else sessionStorage.removeItem('mockUid'); }, uid); };
  const openLink = async (code) => { await p.goto(U + '?utm_source=invite#/join/' + code); await p.reload(); await p.waitForTimeout(1200); };
  const text = () => p.textContent('#app');
  const login = async (email, role = 'owner') => {
    await p.goto(U + '#/login'); await as(null); await p.reload(); await p.waitForTimeout(500);
    await p.fill('#email', email); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1200);
    if (role === 'owner') { await p.click('#role-owner'); await p.waitForTimeout(600); }
    return p.evaluate(() => sessionStorage.getItem('mockUid'));
  };
  const join = async (name) => { await p.fill('#j-pass', '123456'); await p.fill('#j-name', name); await p.click('#join-btn'); await p.waitForTimeout(1500); };
  const resetDevice = async () => { await p.evaluate(async () => { const S = localStorage.getItem('mockServer'); localStorage.clear(); localStorage.setItem('mockServer', S); localStorage.setItem('tourDone', '1'); localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); sessionStorage.clear(); await new Promise((r) => { const q = indexedDB.deleteDatabase('couple-diary'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); }); };

  // 邀請方：A 開日記、產生分享碼
  await p.goto(U + '#/'); await p.waitForTimeout(400);
  const a = await login('jas@x.com');
  await p.evaluate(() => DB.setSetting('names', { me: 'Jasmine', partner: '' }));
  await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(900);
  log('home invite card offers joining other', await p.isVisible('#invite-join'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(700);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(800);
  const code = (await p.textContent('.share-code')).trim();

  // F. 主人點到自己的邀請連結
  await openLink(code);
  log('F own link explained', (await text()).includes('這是你自己的邀請連結') && await p.isVisible('#own-code-share'));

  // A. 沒帳號、第一次打開
  await resetDevice(); await openLink(code);
  log('A fresh: join form, code filled', await p.isVisible('#join-form') && (await p.inputValue('#j-code')) === code);

  // B. 試用中、手機裡有紀錄
  await resetDevice(); await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(async () => { localStorage.setItem('guestStarted', '1'); await LocalDB.putRecord({ id: 'g1', type: 'happy', title: '試用寫的', date: '2026-10-01', visibility: 'shared', photoIds: [], emojis: [], tags: [], createdAt: 1, updatedAt: 1 }); });
  await openLink(code);
  log('B trial: join form', await p.isVisible('#join-form'));
  await join('小試');
  log('B trial: waiting approval', (await text()).includes('等'));
  log('B trial: local record kept on phone', await p.evaluate(async () => !!(await LocalDB.getRecord('g1'))));

  // C. 這支手機登出過帳號
  await resetDevice(); await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(500);
  await p.evaluate(async () => { await LocalDB.setSetting('hasAccount', true); });
  await openLink(code);
  log('C logged-out device: join form not login', await p.isVisible('#join-form'));

  // D. 剛註冊、還沒選身分
  await resetDevice(); await login('new@x.com', 'none');
  log('D role choice wording', (await text()).includes('另一半已經在用了，我要加入'));
  await openLink(code);
  log('D new account: join form with notice', await p.isVisible('#join-form') && (await text()).includes('這個帳號就會接到對方的日記'));

  // E. 已經有自己日記的主人
  await resetDevice(); await login('solo@x.com');
  await p.evaluate(async () => { await DB.setSetting('names', { me: '小獨', partner: '' }); await DB.putRecord({ id: 's1', type: 'happy', title: '我的', date: '2026-10-01', visibility: 'shared', photoIds: [], emojis: [], tags: [], createdAt: 1, updatedAt: 1 }); });
  await openLink(code);
  log('E owner: join form with move option', await p.isVisible('#join-form') && await p.isVisible('#j-bring'));
  await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(900);
  await p.click('#invite-join'); await p.waitForTimeout(900);
  log('E home link opens join form', await p.isVisible('#join-form'));

  // G. 送出加入、等同意中又點連結
  await resetDevice(); await openLink(code); await join('小等');
  const waitUid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await openLink(code);
  log('G pending: still waiting page', (await text()).includes('等') && !(await p.isVisible('#join-form')));

  // H. 已經是另一半又點連結
  await resetDevice(); await login('jas@x.com', 'none'); await p.goto(U + '#/settings/share'); await p.waitForTimeout(1000);
  await p.click(`[data-approve-partner="${waitUid}"]`); await p.waitForTimeout(900);
  // 先換成另一半的身分重新打開，再像點連結一樣打開邀請網址
  await as(waitUid); await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(900);
  await p.goto(U + '?utm_source=invite#/join/' + code); await p.waitForTimeout(900);
  log('H partner: back home with reason', await p.evaluate(() => isPartner() && location.hash === '#/') && !(await p.isVisible('#join-form'))
    && (await p.textContent('#toast')).includes('你已經加入Jasmine的日記了'));

  // I. 臨時身分被移除後打開 App
  await p.evaluate((u) => { const S = JSON.parse(localStorage.mockServer); S.t.partners = S.t.partners.filter((x) => x.uid !== u); localStorage.mockServer = JSON.stringify(S); }, waitUid);
  await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(1200);
  log('I removed anon: join form with reason', await p.isVisible('#join-form') && (await text()).includes('這段分享已經結束了'));

  // 找不到的紀錄：說明原因
  await as(a); await p.goto(U + '#/edit/nope'); await p.reload(); await p.waitForTimeout(1200);
  log('missing record explained', await p.isVisible('text=找不到這則紀錄'));
  log('errors', JSON.stringify(errs));
  await b.close();
})();
