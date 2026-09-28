const { chromium } = require('playwright');
const U = process.env.U;
(async () => {
  const b = await chromium.launch(require('./_launch'));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  await ctx.addInitScript(() => { localStorage.setItem('tourDone', '1'); localStorage.setItem('guestStarted', '1'); window.__noCelebrate = 1; new MutationObserver(() => document.querySelectorAll('.tour-dlg,.celebrate').forEach((e) => e.remove())).observe(document, { childList: true, subtree: true }); });
  const p = await ctx.newPage();
  await p.goto(U + '#/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => {
    const base = { photoIds: [], emojis: ['😊'], tags: ['約會'], createdAt: 1, updatedAt: 1 };
    await DB.putRecord({ ...base, id: 'h1', type: 'happy', title: '一起看海', note: '很開心', date: '2026-09-01', visibility: 'shared' });
    await DB.putRecord({ ...base, id: 'h2', type: 'happy', title: '鎖住的', date: '2026-09-02', visibility: 'task', task: { text: '抱一下', mode: 'confirm' } });
    await DB.putRecord({ ...base, id: 'c1', type: 'cloud', title: '遲到', note: '等很久', date: '2026-09-03', visibility: 'shared' });
    await DB.putRecord({ ...base, id: 'f1', type: 'fight', title: '家事分配', category: '生活', status: 'open', date: '2026-09-04', visibility: 'shared' });
    await DB.putRecord({ ...base, id: 'f2', type: 'fight', title: '存錢', category: '金錢', status: 'resolved', date: '2026-09-05', visibility: 'shared' });
  });
  const pages = ['', 'list/happy', 'list/cloud', 'fights', 'view/h1', 'view/h2', 'view/c1', 'view/f1', 'new/happy', 'new/cloud', 'new/fight', 'settings', 'stamps', 'wishes', 'cards', 'feedback'];
  const scan = () => p.evaluate(() => {
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v[3] == null ? 1 : v[3] }; };
    const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const bgOf = (el) => { let layers = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; const c = parse(cs.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let out = { r: 28, g: 24, b: 22 }; for (const l of layers.reverse()) out = { r: l.r * l.a + out.r * (1 - l.a), g: l.g * l.a + out.g * (1 - l.a), b: l.b * l.a + out.b * (1 - l.a) }; return out; };
    const bad = [];
    for (const el of document.querySelectorAll('body *')) {
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
      const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('').trim();
      const isField = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      if (!txt && !isField) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || Number(cs.opacity) < 0.3) continue;
      const fg = parse(cs.color); const bg = bgOf(el); if (!fg || !bg) continue;
      const blended = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) };
      const L1 = lum(blended), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const big = parseFloat(cs.fontSize) >= 18.66 || (parseFloat(cs.fontSize) >= 14 && Number(cs.fontWeight) >= 700);
      if (ratio < (big ? 3 : 4.5)) bad.push(`${ratio.toFixed(2)} ${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${(txt || el.placeholder || el.value || '').slice(0, 20)}" fg=${cs.color} bg=rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`);
    }
    return bad;
  });
  for (const pg of pages) {
    await p.goto(U + '#/' + pg); await p.waitForTimeout(900);
    const bad = await scan();
    console.log(`== ${pg || 'home'} ${bad.length}`); bad.slice(0, 25).forEach((x) => console.log('  ' + x));
  }
  await b.close();
})();
