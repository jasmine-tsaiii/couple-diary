const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const log = (...a) => console.log(...a);
  const errs = [];
  const mk = async () => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
    await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); new MutationObserver(() => document.querySelectorAll('.celebrate:not(.wish-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
    return p;
  };
  const write = async (p, t) => { await p.goto(U + '#/new/happy'); await p.waitForTimeout(600); await p.fill('#f-title', t); await p.click('#save'); await p.waitForTimeout(900); };
  const login = async (p) => { await p.goto(U + '#/login'); await p.waitForTimeout(600); await p.fill('#email', 'jas@x.com'); await p.fill('#password', 'secret123'); await p.click('#login-btn'); await p.waitForTimeout(1500); };
  const cloudTitles = (p) => p.evaluate(async () => (await DB.allRecords()).map((r) => r.title).sort());
  // A：試用先寫，再登入
  let p = await mk();
  await p.goto(U); await p.waitForTimeout(600);
  await write(p, '試用一'); await write(p, '試用二');
  await login(p);
  log('A cloud', await cloudTitles(p));
  // B：登入過（手機沒紀錄）→ 登出 → 能不能寫？
  p = await mk();
  await login(p);
  await p.goto(U + '#/settings'); await p.waitForTimeout(600); await p.click('#logout'); await p.waitForTimeout(1200);
  await p.goto(U + '#/new/happy'); await p.waitForTimeout(800);
  log('B after logout url', p.url(), 'form?', await p.isVisible('#f-title'));
  if (await p.isVisible('#f-title')) { await p.fill('#f-title', '登出後寫的'); await p.click('#save'); await p.waitForTimeout(900); await login(p); log('B cloud', await cloudTitles(p)); }
  console.log('errors', errs); await b.close();
})();
