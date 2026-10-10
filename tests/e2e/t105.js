const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => localStorage.setItem('mockAutoApprove', '1'));
  await ctx.addInitScript(() => { new MutationObserver(() => document.querySelectorAll('.celebrate:not(.wish-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  let promptAnswer = '';
  p.on('dialog', (d) => (d.type() === 'prompt' ? d.accept(promptAnswer) : d.accept()));
  const log = (...a) => console.log(...a);
  const as = async (uid, hash) => { await p.evaluate((u) => (u ? sessionStorage.setItem('mockUid', u) : sessionStorage.removeItem('mockUid')), uid); await p.goto(U + '#/settings'); await p.reload(); await p.waitForTimeout(500); await p.goto(U + hash); await p.reload(); await p.waitForTimeout(800); };
  await p.goto(U + '#/login'); await p.waitForTimeout(500);
  await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(800);
  await p.evaluate(async () => { await DB.setSetting('names', { me: 'Jasmine', partner: '小明' }); });
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  await p.fill('#s-name', 'Jasmine'); await p.fill('#s-pass', '123456'); await p.click('#s-create'); await p.waitForTimeout(600);
  const code = (await p.textContent('.share-code')).trim();
  await as(null, '#/login'); await p.click('text=我是另一半，用分享碼加入'); await p.waitForTimeout(300);
  await p.fill('#j-code', code); await p.fill('#j-pass', '123456'); await p.fill('#j-name', '小明'); await p.click('#join-btn'); await p.waitForTimeout(900);
  const pid = await p.evaluate(() => sessionStorage.getItem('mockUid'));
  await p.evaluate((id) => { const S = JSON.parse(localStorage.mockServer); S.users[id].is_anonymous = false; S.users[id].email = 'ming@x.com'; localStorage.mockServer = JSON.stringify(S); }, pid);
  await as('owner-jas', '#/');
  log('no card at first', !(await p.isVisible('#new-from-other')));
  await as(pid, '#/new/happy');
  await p.fill('#f-title', '小明的新美好'); await p.click('#save'); await p.waitForTimeout(900);
  await as('owner-jas', '#/');
  log('card', (await p.textContent('#new-from-other').catch(() => '')).includes('1 則新的'));
  // 再寫一則，用叉叉關掉
  await as(pid, '#/new/cloud');
  await p.fill('#f-title', '小明的新烏雲'); await p.click('#save'); await p.waitForTimeout(900);
  await as('owner-jas', '#/');
  log('card again', await p.isVisible('#new-from-other'));
  log('has x', await p.isVisible('#new-from-other-x'));
  await p.click('#new-from-other-x'); await p.waitForTimeout(400);
  log('closed', !(await p.isVisible('#new-from-other')));
  log('no dots after close', (await p.$$eval('#recent .new-dot', (e) => e.length)) === 0);
  await p.reload(); await p.waitForTimeout(800);
  log('stays closed', !(await p.isVisible('#new-from-other')));
  // 換一台裝置（這台的已讀清掉）：雲端記得看過
  await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('seenOthers')).forEach((k) => localStorage.removeItem(k)));
  await p.reload(); await p.waitForTimeout(800);
  log('other device closed too', !(await p.isVisible('#new-from-other')));
  // 之後再寫一則：還是會提示
  await as(pid, '#/new/happy');
  await p.fill('#f-title', '小明的第三則'); await p.click('#save'); await p.waitForTimeout(900);
  await as('owner-jas', '#/');
  log('newer shows', (await p.textContent('#new-from-other').catch(() => '')).includes('1 則新的'));
  // 在這台點開看過，換台裝置也不提示
  await p.click('#new-from-other a'); await p.waitForTimeout(800);
  await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('seenOthers')).forEach((k) => localStorage.removeItem(k)));
  await p.goto(U + '#/'); await p.reload(); await p.waitForTimeout(800);
  log('opened synced', !(await p.isVisible('#new-from-other')));
  console.log('errors', errs); await b.close();
})();
