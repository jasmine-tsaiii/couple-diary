// 回憶小卡：每週／每月總結、單則美好時刻、紀念日，做成一張圖分享到 IG、LINE 或存到相簿。
// 只放美好時刻的內容和統計數字：烏雲、吵架的內容一律不上卡片，上鎖的紀錄也不算。
// 用到 app.js 的共用函式（liveRecords、TYPES、NAMES、photoUrl…），畫面在 app.js 的 route 裡叫用。

const CARD_SIZES = { story: { w: 1080, h: 1920, label: '限動（直式）' }, square: { w: 1080, h: 1080, label: '貼文（方形）' } };
const CARD_INK = '#2B2320';
const CARD_MUTED = '#6B5E57';
const CARD_BG = '#FBF7F2';
const CARD_ACCENT = '#A33A52';

// ---------- 期間 ----------
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// 最近一個完整的週（週一到週日）
function lastWeekRange() {
  const d = new Date(`${today()}T00:00:00`);
  const dow = (d.getDay() + 6) % 7; // 週一 = 0
  const end = new Date(d); end.setDate(d.getDate() - dow - 1);
  const start = new Date(end); start.setDate(end.getDate() - 6);
  return { from: isoDay(start), to: isoDay(end), title: '我們的這一週', label: `${shortDate(isoDay(start))} – ${shortDate(isoDay(end))}` };
}
// 最近一個完整的月份
function lastMonthRange() {
  const d = new Date(`${today()}T00:00:00`);
  const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const end = new Date(d.getFullYear(), d.getMonth(), 0);
  return { from: isoDay(start), to: isoDay(end), title: `我們的 ${start.getMonth() + 1} 月`, label: `${start.getFullYear()} 年 ${start.getMonth() + 1} 月` };
}
const inRange = (iso, r) => !!iso && iso >= r.from && iso <= r.to;
const tsIn = (ts, r) => !!ts && inRange(dateOf(ts), r);
// 可以放上卡片的紀錄：兩個人都看得到的（上鎖、還沒解鎖的任務不算）
const cardSafe = (r) => !r.visibility || r.visibility === 'shared' || (r.visibility === 'task' && r.unlocked);

function periodStats(all, range) {
  const happy = all.filter((r) => r.type === 'happy' && inRange(r.date, range));
  return {
    happy: happy.length,
    cloud: all.filter((r) => r.type === 'cloud' && inRange(r.date, range)).length,
    fight: all.filter((r) => r.type === 'fight' && inRange(r.date, range)).length,
    cleared: all.filter((r) => r.type === 'cloud' && tsIn(r.clearedAt, range)).length,
    resolved: all.filter((r) => r.type === 'fight' && r.status === 'resolved' && tsIn(r.updatedAt, range)).length,
    highlight: happy.filter(cardSafe).sort(byDateDesc)[0] || null,
  };
}

// 首頁要不要提醒「回憶小卡來了」：每月 1～7 號給上個月的，其他時候給上週的；看過就不再出現
async function pendingCard(all) {
  try {
    const d = Number(today().slice(8, 10));
    const kind = d <= 7 ? 'month' : 'week';
    const range = kind === 'month' ? lastMonthRange() : lastWeekRange();
    if (localStorage.getItem(`cardSeen:${kind}:${range.from}`)) return null;
    const s = periodStats(all, range);
    if (!s.happy && !s.cleared && !s.resolved) return null;
    return { kind, range, stats: s };
  } catch (e) { return null; }
}
function markCardSeen(kind, range) { try { localStorage.setItem(`cardSeen:${kind}:${range.from}`, '1'); } catch (e) { /* 略過 */ } }
function cardBanner(p) {
  if (!p) return '';
  return `<a class="card card-banner" href="#/card/${p.kind}" style="background:var(--happy-bg);border-color:transparent;gap:4px">
    <div class="small bold" style="color:var(--happy-dark)">${p.kind === 'month' ? '這個月' : '這週'}的回憶小卡來了</div>
    <div class="bold">${esc(p.range.title)}：${p.stats.happy} 個美好時刻${p.stats.cleared ? `、放晴 ${p.stats.cleared} 次` : ''}</div>
    <div class="small" style="color:var(--happy-dark)">做成小卡，分享給朋友或存到相簿 ›</div>
  </a>`;
}

// 紀念日：在一起第 100、200… 天，或滿 N 週年
function anniversaryInfo() {
  const n = togetherDays();
  if (!n) return null;
  const since = NAMES.since;
  const years = Number(today().slice(0, 4)) - Number(since.slice(0, 4));
  if (years > 0 && today().slice(5) === since.slice(5)) return { big: `${years}`, unit: '週年', line: `在一起滿 ${years} 年了` };
  return { big: `${n}`, unit: '天', line: `在一起第 ${n} 天` };
}

// ---------- 畫圖 ----------
const loadImg = (src) => new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => resolve(null); i.src = src; });
function mascotImg(mood) {
  if (!window.Mascot) return Promise.resolve(null);
  const s = window.Mascot.svg(mood, MASCOT_PICK || window.Mascot.DEFAULT).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  return loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s));
}
// 中文一個字一個字換行；超過 maxLines 行用「…」收尾
function wrapText(g, text, maxW, maxLines) {
  const lines = [];
  let cur = '';
  for (const ch of String(text || '')) {
    if (ch === '\n') { lines.push(cur); cur = ''; continue; }
    if (g.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; } else cur += ch;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    let last = cut[maxLines - 1];
    while (last && g.measureText(last + '…').width > maxW) last = last.slice(0, -1);
    cut[maxLines - 1] = last + '…';
    return cut;
  }
  return lines;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
const SERIF = '"Noto Serif TC", "PingFang TC", serif';
const SANS = '"Noto Sans TC", "PingFang TC", sans-serif';
async function ensureFonts(text) {
  if (!document.fonts || !document.fonts.load) return;
  try {
    await Promise.all([
      document.fonts.load(`700 64px ${SERIF}`, text), document.fonts.load(`400 32px ${SANS}`, text), document.fonts.load(`700 32px ${SANS}`, text),
    ]);
  } catch (e) { /* 字型載不到就用系統字 */ }
}
function paper(g, W, H) {
  g.fillStyle = CARD_BG; g.fillRect(0, 0, W, H);
  // 淡淡的點點紙紋
  g.fillStyle = 'rgba(163,58,82,0.06)';
  for (let y = 40; y < H; y += 48) for (let x = (y / 48) % 2 ? 24 : 48; x < W; x += 48) { g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill(); }
}
function footer(g, W, H) {
  g.textAlign = 'center';
  g.fillStyle = CARD_ACCENT; g.font = `700 30px ${SANS}`;
  g.fillText('啾啾日記', W / 2, H - 86);
  g.fillStyle = CARD_MUTED; g.font = `400 26px ${SANS}`;
  g.fillText('diary.jas-soul.com', W / 2, H - 46);
}
function namesLine(opt) {
  if (!opt.names) return '';
  if (isPartner()) return `${CloudDB.partnerInfo().name || ''} & ${ownerName()}`;
  return NAMES.me && NAMES.partner ? `${NAMES.me} & ${NAMES.partner}` : '';
}

async function drawSummary(g, W, H, data, opt) {
  const sq = H === W;
  const s = data.stats;
  paper(g, W, H);
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  // 先量內容高度，讓故事版內容和吉祥物整體置中，不會中間空一大塊
  const nl0 = namesLine(opt);
  const nItems = 1 + (s.cleared ? 1 : 0) + (s.resolved ? 1 : 0) + (opt.hard ? 2 : 0);
  const rows0 = Math.ceil(Math.min(nItems, sq ? 4 : 6) / (nItems === 1 ? 1 : 2));
  let hl = [];
  if (opt.highlight && s.highlight && !sq) { g.font = `700 46px ${SERIF}`; hl = wrapText(g, `「${s.highlight.title}」`, W - 200, 2); }
  const mw0 = sq ? 300 : 520; const mh0 = mw0 * 112 / 160;
  let off = 0;
  if (!sq) {
    const used = 200 + 110 + (nl0 ? 72 : 0) + 90 + rows0 * 248 + (hl.length ? 30 + hl.length * 64 : 0) + 80 + mh0;
    off = Math.max(0, (H - 220 - used) / 2);
  }
  let y = (sq ? 120 : 200) + off;
  g.fillStyle = CARD_MUTED; g.font = `400 34px ${SANS}`; g.fillText(data.range.label, W / 2, y);
  y += sq ? 86 : 110;
  g.fillStyle = CARD_INK; g.font = `700 ${sq ? 76 : 92}px ${SERIF}`; g.fillText(data.range.title, W / 2, y);
  const nl = namesLine(opt);
  if (nl) { y += sq ? 58 : 72; g.fillStyle = CARD_ACCENT; g.font = `700 36px ${SANS}`; g.fillText(nl, W / 2, y); }
  // 數字
  const items = [['美好時刻', s.happy, '個', '#A33A52']];
  if (s.cleared) items.push(['烏雲放晴', s.cleared, '次', '#8A5A12']);
  if (s.resolved) items.push(['吵架和好', s.resolved, '次', '#3E4C8A']);
  if (opt.hard) { items.push(['烏雲時刻', s.cloud, '則', '#8A5A12']); items.push(['吵架議題', s.fight, '個', '#3E4C8A']); }
  const cols = items.length === 1 ? 1 : 2;
  const boxW = cols === 1 ? 560 : 420;
  const boxH = sq ? 170 : 220;
  const gap = 28;
  const startX = (W - (cols * boxW + (cols - 1) * gap)) / 2;
  y += sq ? 50 : 90;
  items.slice(0, sq ? 4 : 6).forEach(([label, n, unit, color], i) => {
    const x = startX + (i % cols) * (boxW + gap);
    const by = y + Math.floor(i / cols) * (boxH + gap);
    g.fillStyle = '#FFFFFF'; roundRect(g, x, by, boxW, boxH, 28); g.fill();
    g.strokeStyle = '#EFE6DD'; g.lineWidth = 2; g.stroke();
    g.fillStyle = color; g.font = `700 ${sq ? 76 : 96}px ${SERIF}`; g.textAlign = 'center';
    g.fillText(String(n), x + boxW / 2 - 24, by + boxH / 2 + (sq ? 20 : 26));
    g.font = `700 34px ${SANS}`; g.fillText(unit, x + boxW / 2 + 40, by + boxH / 2 + (sq ? 20 : 26));
    g.fillStyle = CARD_MUTED; g.font = `400 30px ${SANS}`; g.fillText(label, x + boxW / 2, by + boxH - (sq ? 22 : 30));
  });
  y += Math.ceil(Math.min(items.length, sq ? 4 : 6) / cols) * (boxH + gap);
  // 這段期間的一個美好時刻
  if (opt.highlight && s.highlight && !sq) {
    y += 30;
    g.fillStyle = CARD_MUTED; g.font = `400 30px ${SANS}`; g.fillText('最想記住的一刻', W / 2, y);
    g.fillStyle = CARD_INK; g.font = `700 46px ${SERIF}`;
    for (const line of wrapText(g, `「${s.highlight.title}」`, W - 200, 2)) { y += 64; g.fillText(line, W / 2, y); }
  }
  const m = await mascotImg(s.happy ? 'celebrate' : 'happy');
  if (m) {
    const my = sq ? H - 150 - mh0 : Math.min(y + 80, H - 200 - mh0);
    g.drawImage(m, (W - mw0) / 2, my, mw0, mh0);
  }
  footer(g, W, H);
}

async function drawRecord(g, W, H, r, opt) {
  const sq = H === W;
  paper(g, W, H);
  const pad = 70;
  const photoH = sq ? 560 : 1000;
  const ids = r.photoIds || [];
  const url = ids.length ? await photoUrl(ids[Math.min(opt.photo || 0, ids.length - 1)]) : null;
  const img = url ? await loadImg(url) : null;
  g.save(); roundRect(g, pad, pad, W - pad * 2, photoH, 36); g.clip();
  if (img) {
    const scale = Math.max((W - pad * 2) / img.width, photoH / img.height);
    const iw = img.width * scale; const ih = img.height * scale;
    g.drawImage(img, pad + (W - pad * 2 - iw) / 2, pad + (photoH - ih) / 2, iw, ih);
  } else {
    g.fillStyle = '#F6E4E8'; g.fillRect(pad, pad, W - pad * 2, photoH);
    const m = await mascotImg('happy');
    if (m) { const mw = sq ? 420 : 640; const mh = mw * 112 / 160; g.drawImage(m, (W - mw) / 2, pad + (photoH - mh) / 2, mw, mh); }
  }
  g.restore();
  g.textAlign = 'left';
  let y = pad + photoH + (sq ? 70 : 100);
  g.fillStyle = CARD_ACCENT; g.font = `700 32px ${SANS}`;
  g.fillText(`美好時刻 No. ${numberOf(r, await liveRecords())}・${longDate(r.date)}`, pad, y);
  g.fillStyle = CARD_INK; g.font = `700 ${sq ? 52 : 64}px ${SERIF}`;
  for (const line of wrapText(g, r.title, W - pad * 2, 2)) { y += sq ? 72 : 88; g.fillText(line, pad, y); }
  if (opt.text && r.description && !sq) {
    y += 30; g.fillStyle = CARD_MUTED; g.font = `400 34px ${SANS}`;
    for (const line of wrapText(g, r.description, W - pad * 2, 4)) { y += 52; g.fillText(line, pad, y); }
  }
  const nl = namesLine(opt);
  if (nl) { g.fillStyle = CARD_ACCENT; g.font = `700 34px ${SANS}`; g.textAlign = 'left'; g.fillText(nl, pad, H - (sq ? 150 : 170)); }
  footer(g, W, H);
}

async function drawDays(g, W, H, info, opt) {
  const sq = H === W;
  paper(g, W, H);
  g.textAlign = 'center';
  const nl = namesLine(opt);
  let y = sq ? 170 : 430;
  if (nl) { g.fillStyle = CARD_ACCENT; g.font = `700 40px ${SANS}`; g.fillText(nl, W / 2, y); }
  y += sq ? 90 : 130;
  g.fillStyle = CARD_MUTED; g.font = `400 40px ${SANS}`; g.fillText(info.unit === '週年' ? '在一起' : '在一起第', W / 2, y);
  y += sq ? 200 : 290;
  // 大數字和單位並排置中
  const bigFont = `700 ${sq ? 220 : 300}px ${SERIF}`;
  const unitFont = `700 64px ${SERIF}`;
  g.font = bigFont; const bw = g.measureText(info.big).width;
  g.font = unitFont; const uw = g.measureText(info.unit).width;
  const x0 = (W - bw - 16 - uw) / 2;
  g.textAlign = 'left';
  g.fillStyle = CARD_ACCENT; g.font = bigFont; g.fillText(info.big, x0, y);
  g.fillStyle = CARD_INK; g.font = unitFont; g.fillText(info.unit, x0 + bw + 16, y);
  g.textAlign = 'center';
  y += sq ? 70 : 110;
  g.fillStyle = CARD_MUTED; g.font = `400 34px ${SANS}`; g.fillText(`從 ${longDate(NAMES.since)} 開始`, W / 2, y);
  const m = await mascotImg('celebrate');
  if (m) { const mw = sq ? 320 : 560; const mh = mw * 112 / 160; g.drawImage(m, (W - mw) / 2, sq ? H - 150 - mh : y + 150, mw, mh); }
  footer(g, W, H);
}

async function renderCard(kind, data, opt) {
  const { w: W, h: H } = CARD_SIZES[opt.size];
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const text = JSON.stringify(data && data.title ? data.title : '') + '啾啾日記美好時刻烏雲放晴吵架和好最想記住的一刻在一起第天週年從開始個次則' + namesLine(opt)
    + (kind === 'record' ? `${data.title}${data.description || ''}` : '') + (data && data.range ? data.range.title + data.range.label : '')
    + (data && data.stats && data.stats.highlight ? data.stats.highlight.title : '') + '0123456789年月日一二三四五六' + (NAMES.since ? longDate(NAMES.since) : '');
  await ensureFonts(text);
  if (kind === 'record') await drawRecord(g, W, H, data, opt);
  else if (kind === 'days') await drawDays(g, W, H, data, opt);
  else await drawSummary(g, W, H, data, opt);
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}

// ---------- 小卡頁 ----------
async function viewCards() {
  const all = await liveRecords();
  const week = lastWeekRange();
  const month = lastMonthRange();
  const ws = periodStats(all, week);
  const ms = periodStats(all, month);
  const ann = anniversaryInfo();
  const happy = all.filter((r) => r.type === 'happy' && cardSafe(r)).sort(byDateDesc).slice(0, 20);
  app.className = 'theme-happy';
  app.innerHTML = `
    <div class="topbar"><a class="icon-btn" href="#/" aria-label="返回">${ICON.back}</a><h1>回憶小卡</h1><div style="width:44px"></div></div>
    <div class="small muted">把你們的回憶做成一張圖，分享到 IG、LINE，或存到相簿。只會放美好時刻和數字，烏雲、吵架的內容不會出現在卡片上。</div>
    <a class="card" href="#/card/week" style="gap:4px"><div class="bold">${esc(week.title)}</div><div class="small muted">${esc(week.label)}・${ws.happy} 個美好時刻${ws.cleared ? `・放晴 ${ws.cleared} 次` : ''}</div></a>
    <a class="card" href="#/card/month" style="gap:4px"><div class="bold">${esc(month.title)}</div><div class="small muted">${esc(month.label)}・${ms.happy} 個美好時刻${ms.cleared ? `・放晴 ${ms.cleared} 次` : ''}</div></a>
    ${ann ? `<a class="card" href="#/card/days" style="gap:4px"><div class="bold">紀念日小卡</div><div class="small muted">${esc(ann.line)}</div></a>`
      : isPartner() ? '' : '<a class="card" href="#/settings" style="gap:4px"><div class="bold">紀念日小卡</div><div class="small muted">到設定頁填「在一起的日期」就能做</div></a>'}
    <div class="section-title">用一則美好時刻做小卡</div>
    <div class="list">${happy.length ? happy.map((r) => `<a class="card related-item" href="#/card/record/${esc(r.id)}"><span class="grow related-title">${esc(r.title)}</span><span class="muted small">${shortDate(r.date)}</span></a>`).join('')
      : '<div class="small muted">還沒有可以用的美好時刻（上鎖的不會出現在這裡）。</div>'}</div>
  `;
}

async function viewCard(kind, id) {
  const all = await liveRecords();
  let data = null;
  let title = '';
  if (kind === 'week' || kind === 'month') {
    const range = kind === 'week' ? lastWeekRange() : lastMonthRange();
    data = { range, stats: periodStats(all, range) };
    title = range.title;
    markCardSeen(kind, range);
  } else if (kind === 'days') {
    data = anniversaryInfo();
    title = '紀念日小卡';
    if (!data) { go('#/cards'); return; }
  } else if (kind === 'record') {
    data = all.find((r) => r.id === id && r.type === 'happy');
    title = '美好時刻小卡';
    if (!data || !cardSafe(data)) { app.innerHTML = '<div class="empty no-mascot">這則沒辦法做成小卡（找不到，或是上鎖的紀錄）<a class="btn small" href="#/cards">回到回憶小卡</a></div>'; return; }
  } else { go('#/cards'); return; }

  const opt = { size: 'story', names: true, hard: false, highlight: true, text: false, photo: 0 };
  const nPhotos = kind === 'record' ? (data.photoIds || []).length : 0;
  app.className = 'theme-happy';
  app.innerHTML = `
    <div class="topbar"><a class="icon-btn" href="#/cards" aria-label="返回">${ICON.back}</a><h1>${esc(title)}</h1><div style="width:44px"></div></div>
    <div class="card-preview"><img id="card-img" alt="小卡預覽"><div class="small muted" id="card-wait">小卡製作中…</div></div>
    <div class="field"><div class="label">尺寸</div><div class="theme-pick" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      ${Object.entries(CARD_SIZES).map(([k, v]) => `<button class="chip ${k === opt.size ? 'on' : ''}" data-size="${k}">${v.label}</button>`).join('')}
    </div></div>
    <div class="field"><div class="label">要放什麼</div><div class="chips">
      <button class="chip on" data-opt="names">名字</button>
      ${kind === 'week' || kind === 'month' ? '<button class="chip on" data-opt="highlight">一則美好的標題</button><button class="chip" data-opt="hard">烏雲和吵架的數字</button>' : ''}
      ${kind === 'record' && data.description ? '<button class="chip" data-opt="text">內容</button>' : ''}
    </div></div>
    ${nPhotos > 1 ? `<div class="field"><div class="label">用哪張照片</div><div class="chips">${Array.from({ length: nPhotos }, (_, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-photo="${i}">第 ${i + 1} 張</button>`).join('')}</div></div>` : ''}
    <button class="btn" id="card-share">分享小卡</button>
    <div class="small muted" style="text-align:center">手機會跳出分享選單，可以傳到 IG、LINE，或選「儲存影像」存到相簿。</div>
  `;
  track('card_view', { kind, size: opt.size });
  let blob = null;
  let seq = 0;
  const img = document.getElementById('card-img');
  const redraw = async () => {
    const my = ++seq;
    document.getElementById('card-wait').hidden = false;
    const b = await renderCard(kind, data, opt);
    if (my !== seq || !b) return;
    blob = b;
    if (img.src) URL.revokeObjectURL(img.src);
    img.src = URL.createObjectURL(b);
    document.getElementById('card-wait').hidden = true;
  };
  app.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => {
    opt.size = b.dataset.size;
    app.querySelectorAll('[data-size]').forEach((x) => x.classList.toggle('on', x === b));
    redraw();
  }));
  app.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => {
    opt[b.dataset.opt] = !opt[b.dataset.opt];
    b.classList.toggle('on', opt[b.dataset.opt]);
    redraw();
  }));
  app.querySelectorAll('[data-photo]').forEach((b) => b.addEventListener('click', () => {
    opt.photo = Number(b.dataset.photo);
    app.querySelectorAll('[data-photo]').forEach((x) => x.classList.toggle('on', x === b));
    redraw();
  }));
  const shareBtn = document.getElementById('card-share');
  shareBtn.addEventListener('click', () => withBusy(shareBtn, '準備中…', async () => {
    if (!blob) await redraw();
    if (!blob) { toast('小卡還沒做好，再按一次'); return; }
    const file = new File([blob], `jiujiu-diary-${kind}-${today()}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: '啾啾日記' });
        track('card_share', { kind, size: opt.size, how: 'share' });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return; // 自己按了取消
        toast('沒辦法分享，改成下載圖片');
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('已下載圖片');
    track('card_share', { kind, size: opt.size, how: 'download' });
  }));
  redraw();
}
