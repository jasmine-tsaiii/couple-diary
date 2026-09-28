// 用手機模式跑現有測試（#30）。run.js 看到 DEVICE 會自動用 NODE_OPTIONS=--require 載入這個檔案。
//   DEVICE=android|iphone  加上手機的瀏覽器識別、觸控、isMobile
//   ENGINE=webkit          改用 Safari 引擎（要先 npx playwright install webkit）
// 另外：
//   - 手機上寫完紀錄會跳「加到主畫面」「先註冊」提示，測試預設關掉（專門測這些提示的 t43、t45 除外）
//   - 不連真的 Google 登入按鈕（127.0.0.1 不在 Google 允許的網址裡）
const path = require('path');
const pw = require('playwright');
const dev = process.env.DEVICE === 'iphone' ? pw.devices['iPhone 13'] : pw.devices['Pixel 7'];
const extra = { userAgent: dev.userAgent, isMobile: process.env.ENGINE === 'webkit' ? undefined : dev.isMobile, hasTouch: true, deviceScaleFactor: dev.deviceScaleFactor };
const name = path.basename(process.argv[1] || '', '.js');
const keepPrompts = ['t43', 't45', 't51', 't67', 't72'].includes(name);
const engine = process.env.ENGINE === 'webkit' ? pw.webkit : pw.chromium;
const origLaunch = engine.launch.bind(engine);
const wrapLaunch = async (o) => {
  const b = await origLaunch(process.env.ENGINE === 'webkit' ? {} : o);
  const nc = b.newContext.bind(b);
  b.newContext = async (o2 = {}) => {
    const ctx = await nc({ ...extra, ...o2, userAgent: o2.userAgent || extra.userAgent });
    if (!keepPrompts) await ctx.addInitScript(() => { try { localStorage.setItem('a2hsNever', '1'); localStorage.setItem('signupNudgeShown', '1'); } catch (e) { /* about:blank */ } });
    await ctx.route('https://accounts.google.com/gsi/**', (r) => r.abort());
    return ctx;
  };
  b.newPage = async (o2) => (await b.newContext(o2)).newPage();
  return b;
};
pw.chromium.launch = wrapLaunch;
if (process.env.ENGINE === 'webkit') pw.webkit.launch = wrapLaunch;
