// 試用模式：主題背景（免費套用、上鎖的預覽）、臥底任務卡包、主題題庫、時光膠囊存在手機；「我有興趣」本機只記一次
const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.U || 'http://localhost:8770/');
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem("tourDone", "1"); localStorage.setItem("guestStarted", "1"); new MutationObserver(() => document.querySelectorAll(".tour-dlg").forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  await ctx.route('**/vendor/supabase-2.117.2.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('mock2.js', 'utf8') }));
  await ctx.addInitScript(() => { new MutationObserver(() => document.querySelectorAll('.celebrate:not(.plus-dlg):not(.tpl-dlg):not(.qpack-dlg)').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => d.accept());
  const log = (...a) => console.log(...a);
  const SHOT = (n) => (process.env.SHOT_DIR || '.') + '/' + n;
  const skin = () => p.evaluate(() => document.documentElement.dataset.skin || '');
  await p.goto(U + '#/together'); await p.waitForTimeout(1000);
  log('guest together rows', await p.locator('#row-mission').count() === 1 && (await p.textContent('#app')).includes('時光膠囊'));

  // 啾啾的窩（免費功能的假門：沒有價格）
  await p.click('#row-nest'); await p.waitForTimeout(500);
  log('nest sheet', await p.locator('.plus-dlg .nest-preview').count() === 1 && !(await p.textContent('.plus-dlg')).includes('NT$'));
  await p.screenshot({ path: SHOT('nest.png') });
  await p.click('#plus-yes'); await p.waitForTimeout(400);
  log('nest registered', await p.locator('#plus-yes').isDisabled() && await p.evaluate(() => !!localStorage.getItem('interest:guest:nest') && !!localStorage.getItem('pwview:guest:nest')));
  await p.click('#plus-x'); await p.waitForTimeout(300);
  // 臥底任務卡包（這支手機抽到 790 的那組）
  await p.evaluate(() => localStorage.setItem('priceVariant', '790'));
  await p.click('#row-mission'); await p.waitForTimeout(500);
  log('790 variant', (await p.textContent('.plus-dlg')).includes('每月 NT$66') && (await p.textContent('.plus-dlg')).includes('省 12%'));
  await p.evaluate(() => document.querySelector('.plus-box').scrollTo(0, 99999)); await p.waitForTimeout(200);
  await p.screenshot({ path: SHOT('plus-790.png') });
  await p.evaluate(() => document.querySelector('.plus-box').scrollTo(0, 0));
  log('mission sheet', await p.locator('.plus-dlg .mission-card').count() === 8);
  await p.screenshot({ path: SHOT('mission-pack.png') });
  await p.click('#plus-yes'); await p.waitForTimeout(400);
  log('mission registered', await p.locator('#plus-yes').isDisabled());
  await p.click('#plus-x'); await p.waitForTimeout(300);
  await p.click('#row-mission'); await p.waitForTimeout(500);
  log('mission still registered', (await p.textContent('#plus-yes')).includes('已登記'));
  await p.click('#plus-no'); await p.waitForTimeout(300);
  log('guest interest local', await p.evaluate(() => !!localStorage.getItem('interest:guest:mission_pack')));

  // 主題題庫：試答一題
  await p.click('#row-qpack'); await p.waitForTimeout(500);
  await p.click('[data-q="0"]'); await p.waitForTimeout(300);
  await p.fill('#qp-ans', '存起來一半，一半去旅行');
  await p.click('#qp-send'); await p.waitForTimeout(300);
  log('qpack locked message', (await p.textContent('.qpack-dlg')).includes('兩個人都答了，才看得到對方的答案'));
  await p.screenshot({ path: SHOT('question-pack.png') });
  await p.click('#qp-want'); await p.waitForTimeout(500);
  log('qpack plus sheet', await p.locator('.plus-dlg').count() === 1);
  await p.click('#plus-no'); await p.waitForTimeout(300);

  // 時光膠囊（存在這支手機）
  await p.goto(U + '#/capsules'); await p.waitForTimeout(800);
  log('guest hint', (await p.textContent('#app')).includes('邀請另一半'));
  await p.click('#cap-new'); await p.waitForTimeout(500);
  const d = await p.evaluate(() => new Date(Date.now() + 9 * 864e5).toISOString().slice(0, 10));
  await p.click('[data-occ="birthday"]'); await p.waitForTimeout(200);
  await p.fill('#cap-date', d); await p.dispatchEvent('#cap-date', 'change'); await p.waitForTimeout(300);
  await p.fill('#cap-body', '生日快樂');
  await p.click('#cap-save'); await p.waitForTimeout(800);
  log('guest capsule saved', (await p.locator('.cap-row').count()) === 1);
  await p.screenshot({ path: SHOT('capsule-guest.png'), fullPage: true });
  await p.click('.cap-row'); await p.waitForTimeout(600);
  log('edit own capsule', (await p.inputValue('#cap-body')) === '生日快樂');
  await p.goto(U + '#/capsules'); await p.waitForTimeout(600);
  await p.click('#cap-new'); await p.waitForTimeout(500);
  log('guest second capsule paywall', await p.locator('.plus-dlg').count() === 1);
  await p.click('#plus-no'); await p.waitForTimeout(300);

  // 主題背景
  await p.goto(U + '#/settings/theme'); await p.waitForTimeout(900);
  log('skin card', await p.locator('#skin-card [data-skin-pick]').count() === 5);
  await p.click('[data-skin-pick="paper"]'); await p.waitForTimeout(300);
  log('paper applied', (await skin()) === 'paper' && await p.evaluate(() => localStorage.getItem('skin')) === 'paper');
  await p.goto(U + '#/'); await p.waitForTimeout(800);
  await p.screenshot({ path: SHOT('skin-paper.png') });
  await p.goto(U + '#/settings/theme'); await p.waitForTimeout(900);
  for (const k of ['night', 'sakura', 'xmas']) {
    await p.click(`[data-skin-pick="${k}"]`); await p.waitForTimeout(300);
    log(k + ' preview', (await skin()) === k && await p.locator('#skin-bar').count() === 1);
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(150);
    await p.screenshot({ path: SHOT(`skin-${k}.png`) });
  }
  await p.click('#skin-apply'); await p.waitForTimeout(500);
  log('theme plus sheet with single', await p.locator('.plus-dlg #plus-single').count() === 1);
  await p.screenshot({ path: SHOT('plus-theme.png') });
  await p.click('#plus-single'); await p.waitForTimeout(400);
  log('single registered, plus not', await p.locator('#plus-single').isDisabled() && !(await p.locator('#plus-yes').isDisabled()));
  await p.click('#plus-no'); await p.waitForTimeout(300);
  log('preview ended back to paper', (await skin()) === 'paper' && await p.locator('#skin-bar').count() === 0);
  // 預覽中換頁也會結束
  await p.click('[data-skin-pick="night"]'); await p.waitForTimeout(300);
  await p.goto(U + '#/'); await p.waitForTimeout(600);
  log('navigating ends preview', (await skin()) === 'paper');
  await p.reload(); await p.waitForTimeout(800);
  log('paper kept after reload', (await skin()) === 'paper');
  // 深色模式下手帳紙不換配色
  await p.evaluate(() => { localStorage.setItem('theme', 'dark'); applyTheme('dark'); });
  log('dark mode wins', await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim().toUpperCase()) === '#1C1816');
  log('errors', errs); await b.close();
})();
