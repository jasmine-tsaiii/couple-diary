// 巡邏找到的易混淆處（#17–#25）：標籤沒按 Enter 也要存到、試用不能出任務、吵架有編號、小卡週期、註冊錯誤是中文
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
  const text = () => p.evaluate(() => document.body.innerText);
  await p.goto(U + '#/'); await p.waitForTimeout(700);
  // 試用首頁：一次只有一張提醒卡（先填名字），不會出現「該備份囉」
  log('names card', await p.isVisible('#names-card'), 'no guest card yet', !(await p.isVisible('#guest-account')));
  await p.click('#n-skip'); await p.waitForTimeout(500);
  log('guest card after skip', await p.isVisible('#guest-account'));
  // 1) 標籤打了沒按「加入」，存檔還是會留著
  await p.goto(U + '#/new/happy'); await p.waitForTimeout(600);
  const taskBtn = p.locator('.opt', { hasText: '任務解鎖' });
  log('guest task disabled', await taskBtn.isDisabled(), 'hint', (await taskBtn.innerText()).includes('註冊後可用'));
  log('vis help plain', (await p.textContent('.vis-help')).includes('還不會分享給任何人'));
  await p.fill('#f-title', '一起吃早餐'); await p.fill('#f-tag', '旅行');
  await p.click('#save'); await p.waitForTimeout(900);
  log('typed tag kept', (await text()).includes('#旅行'));
  // 「加入」按鈕也能加標籤
  await p.goto(U + '#/new/happy'); await p.waitForTimeout(600);
  await p.fill('#f-tag', '散步'); await p.click('#f-tag-add'); await p.waitForTimeout(300);
  log('add button', await p.isVisible('.chip.on >> text=#散步'), 'input cleared', (await p.inputValue('#f-tag')) === '');
  // 2) 吵架詳細頁有編號，沒選分類寫「沒選分類」
  await p.goto(U + '#/new/fight'); await p.waitForTimeout(600);
  await p.fill('#f-title', '家事分配'); await p.click('#save'); await p.waitForTimeout(900);
  const t2 = await text();
  log('fight no', /No\. 1/.test(t2), 'no category text', t2.includes('沒選分類'));
  await p.goto(U + '#/fights'); await p.waitForTimeout(600);
  log('fight list follow-up text', (await text()).includes('還沒有後續進展'));
  // 3) 心願清單空的時候不顯示 0 / 0
  await p.goto(U + '#/wishes'); await p.waitForTimeout(600);
  log('no 0/0', !(await p.isVisible('.topbar .count')), 'guest wish hint', (await text()).includes('註冊並邀請另一半之後'));
  // 4) 回憶小卡：標題和日期範圍對得上
  await p.goto(U + '#/cards'); await p.waitForTimeout(700);
  const t4 = await text();
  const sunday = await p.evaluate(() => new Date(`${today()}T00:00:00`).getDay() === 0);
  log('week title', t4.includes(sunday ? '我們的這一週' : '我們的上一週'), 'month label', t4.includes('上個月・'));
  // 5) 註冊錯誤翻成中文，不出現英文
  await p.goto(U + '#/signup'); await p.waitForTimeout(600);
  await p.evaluate(() => { CloudDB.signUp = async () => { throw new Error('User already registered'); }; });
  await p.fill('#email', 'a@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(500);
  const m5 = await p.textContent('#login-msg');
  log('signup zh', m5.includes('已經註冊過'), 'no english', !/[A-Za-z]{4,}/.test(m5.replace(/Email/g, '')));
  await p.evaluate(() => { CloudDB.signUp = async () => { throw new Error('email rate limit exceeded'); }; });
  await p.click('#login-btn'); await p.waitForTimeout(500);
  log('rate limit zh', (await p.textContent('#login-msg')).includes('試太多次'));
  // 6) 使用者看得到的畫面沒有後台用語
  const src = ['js/app/main.js', 'js/app/partner.js', 'js/app/auth.js', 'js/db-cloud.js'].map((f) => fs.readFileSync(require('path').join(__dirname, '..', '..', f), 'utf8')).join('\n');
  const shown = src.split('\n').filter((l) => !/^\s*\/\//.test(l) && !/console\.warn/.test(l)).join('\n');
  log('no admin words', !/schema\.sql|Supabase 後台|Allow (manual|anonymous)|Redirect URLs|按 Restore/.test(shown.replace(/\/\/[^\n'`]*$/gm, '')));
  console.log('errors', errs); await b.close();
})();
