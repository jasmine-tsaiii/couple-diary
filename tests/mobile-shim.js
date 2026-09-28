// 用 NODE_OPTIONS=--require 載入：把現有測試改成用手機模式跑
//   ENGINE=webkit 改用 Safari 引擎；DEVICE=android|iphone 加上手機的 UA、觸控、isMobile
const pw = require('playwright');
const dev = process.env.DEVICE === 'iphone' ? pw.devices['iPhone 13'] : pw.devices['Pixel 7'];
const extra = { userAgent: dev.userAgent, isMobile: dev.isMobile, hasTouch: true, deviceScaleFactor: dev.deviceScaleFactor };
const engine = process.env.ENGINE === 'webkit' ? pw.webkit : pw.chromium;
const origLaunch = engine.launch.bind(engine);
const wrapLaunch = async (o) => {
  const b = await origLaunch(process.env.ENGINE === 'webkit' ? {} : o);
  const nc = b.newContext.bind(b);
  b.newContext = (o2 = {}) => nc({ ...extra, ...o2, userAgent: o2.userAgent || extra.userAgent });
  b.newPage = async (o2) => (await b.newContext(o2)).newPage();
  return b;
};
pw.chromium.launch = wrapLaunch;
if (process.env.ENGINE === 'webkit') pw.webkit.launch = wrapLaunch;
