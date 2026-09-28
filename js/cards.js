// 回憶小卡：每週／每月總結、單則美好時刻、紀念日，做成一張圖分享到 IG、LINE 或存到相簿。
// 只放美好時刻的內容和統計數字：烏雲、吵架的內容一律不上卡片，上鎖的紀錄也不算。
// 用到 js/app/ 的共用函式（liveRecords、TYPES、NAMES、photoUrl…），畫面在 js/app/main.js 的 route 裡叫用。

const CARD_SIZES = { story: { w: 1080, h: 1920, label: '限動（直式）' }, square: { w: 1080, h: 1080, label: '貼文（方形）' } };
// 顏色照設計規範 v2：桌面、紙張、墨色、淡墨，美好時刻的玫瑰色當重點色
const CARD_DESK = '#EFE6D6';
const CARD_BG = '#FBF7EF';
const CARD_INK = '#3A2C27';
const CARD_MUTED = '#76635A';
const CARD_ACCENT = '#B04A5C';
const CARD_MARK = 'rgba(242,155,174,0.42)'; // 螢光筆
const CARD_TAPE = ['rgba(242,170,186,0.72)', 'rgba(250,208,216,0.72)']; // 紙膠帶斜紋

// ---------- 期間 ----------
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// 最近一個完整的週（週一到週日）
function lastWeekRange() {
  const d = new Date(`${today()}T00:00:00`);
  const dow = (d.getDay() + 6) % 7; // 週一 = 0
  // 星期日是一週的最後一天，當天就做這一週；其他天做上一週（週一到週日）
  const thisWeek = dow === 6;
  const end = new Date(d); end.setDate(d.getDate() - (thisWeek ? 0 : dow + 1));
  const start = new Date(end); start.setDate(end.getDate() - 6);
  return { from: isoDay(start), to: isoDay(end), title: thisWeek ? '我們的這一週' : '我們的上一週', label: `${shortDate(isoDay(start))} – ${shortDate(isoDay(end))}` };
}
// 最近一個完整的月份
function lastMonthRange() {
  const d = new Date(`${today()}T00:00:00`);
  const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const end = new Date(d.getFullYear(), d.getMonth(), 0);
  return { from: isoDay(start), to: isoDay(end), title: `我們的 ${start.getMonth() + 1} 月`, label: `上個月・${start.getFullYear()} 年 ${start.getMonth() + 1} 月` };
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
// 樣式照 marketing/設計規範-v2（手帳紙感）：米色桌面上一張紙、紙膠帶、點格，
// 標題思源宋體、內文霞鶩文楷、數字和英文 Cormorant Garamond，全部靠左。
const loadImg = (src) => new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => resolve(null); i.src = src; });
function mascotImg(mood) {
  if (!window.Mascot) return Promise.resolve(null);
  const s = window.Mascot.svg(mood, MASCOT_PICK || window.Mascot.DEFAULT).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  return loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s));
}
// 中文一個字一個字換行；超過 maxLines 行用「…」收尾。最後一行只剩一兩個字時，從上一行借字過來，避免孤字
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
  const n = lines.length;
  if (n > 1 && [...lines[n - 1]].length <= 3) {
    const prev = [...lines[n - 2]];
    const take = Math.min(3, prev.length - 4);
    if (take > 0) { lines[n - 1] = prev.slice(-take).join('') + lines[n - 1]; lines[n - 2] = prev.slice(0, -take).join(''); }
  }
  return lines;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
const SERIF = '"Noto Serif TC", "Songti TC", "PMingLiU", serif';
const KAI = '"LXGW WenKai TC", "Kaiti TC", "BiauKai", serif';
const LATIN = '"Cormorant Garamond", "Iowan Old Style", Georgia, serif';
async function ensureFonts(text) {
  if (!document.fonts || !document.fonts.load) return;
  const latin = 'No.0123456789/–&·JiujuDaryWeklMonthsAvsdi.jas-oulcm';
  try {
    await Promise.all([
      document.fonts.load(`900 64px ${SERIF}`, text), document.fonts.load(`700 32px ${SERIF}`, text), document.fonts.load(`500 26px ${SERIF}`, text),
      document.fonts.load(`400 36px ${KAI}`, text),
      document.fonts.load(`italic 500 36px ${LATIN}`, latin), document.fonts.load(`600 36px ${LATIN}`, latin),
    ]);
  } catch (e) { /* 字型載不到就用系統字 */ }
}
// 一個字一個字畫，做出字距（canvas 的 letterSpacing 在舊版 Safari 沒有）
function spaced(g, text, x, y, gap) {
  for (const ch of String(text)) { g.fillText(ch, x, y); x += g.measureText(ch).width + gap; }
  return x;
}
// 固定亂數：同一張卡每次畫出來紙紋都一樣
function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

// 版面：桌面 → 紙 → 紙膠帶 → 點格。回傳紙內可以放內容的範圍
function sheetBox(W, H) {
  const sq = H === W;
  // 限動上下會被 IG 的介面蓋住，紙往中間收
  const top = sq ? 52 : 110; const bottom = sq ? 52 : 190; const side = sq ? 52 : 60;
  return { x: side, y: top, w: W - side * 2, h: H - top - bottom, pad: sq ? 64 : 80 };
}
function paper(g, W, H, tape) { // tape = false：不貼紙上緣的膠帶（拍立得自己有一段）
  const b = sheetBox(W, H);
  g.fillStyle = CARD_DESK; g.fillRect(0, 0, W, H);
  const rnd = seeded(7);
  for (let i = 0; i < W * H / 90; i++) { g.fillStyle = `rgba(118,99,90,${0.03 + rnd() * 0.05})`; g.fillRect(rnd() * W, rnd() * H, 1.4, 1.4); }
  g.save();
  g.shadowColor = 'rgba(90,64,40,0.22)'; g.shadowBlur = 36; g.shadowOffsetY = 14;
  g.fillStyle = CARD_BG; roundRect(g, b.x, b.y, b.w, b.h, 8); g.fill();
  g.restore();
  g.save(); roundRect(g, b.x, b.y, b.w, b.h, 8); g.clip();
  g.fillStyle = 'rgba(118,99,90,0.13)';
  for (let y = b.y + 18; y < b.y + b.h; y += 36) for (let x = b.x + 18; x < b.x + b.w; x += 36) { g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill(); }
  g.restore();
  if (tape !== false) washi(g, W / 2, b.y + 4, 240, 60, -3, tape || CARD_TAPE);
  return b;
}
function washi(g, cx, cy, w, h, deg, colors) {
  g.save(); g.translate(cx, cy); g.rotate(deg * Math.PI / 180);
  g.beginPath(); g.rect(-w / 2, -h / 2, w, h); g.clip();
  g.fillStyle = colors[0]; g.fillRect(-w / 2, -h / 2, w, h);
  g.fillStyle = colors[1];
  for (let x = -w / 2 - h; x < w / 2 + h; x += 28) { g.beginPath(); g.moveTo(x, h / 2); g.lineTo(x + 14, h / 2); g.lineTo(x + 14 + h, -h / 2); g.lineTo(x + h, -h / 2); g.closePath(); g.fill(); }
  g.restore();
}
// 左上角的小標：No. 37 ── 美好時刻
function kicker(g, x, y, latin, zh, color) {
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  // Cormorant 的數字是舊式數字（1 像 I），有數字的小標改用思源宋體
  g.fillStyle = CARD_MUTED; g.font = /\d/.test(latin) ? `500 32px ${SERIF}` : `italic 500 40px ${LATIN}`; g.fillText(latin, x, y);
  let cx = x + g.measureText(latin).width + 22;
  g.strokeStyle = 'rgba(118,99,90,0.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, y - 11); g.lineTo(cx + 56, y - 11); g.stroke();
  cx += 78;
  g.fillStyle = color || CARD_ACCENT; g.font = `500 28px ${SERIF}`; spaced(g, zh, cx, y - 2, 9);
}
// 標題：思源宋體，指定的那一行底下畫一條螢光筆
function title(g, lines, x, y, size, lh, markLast) {
  g.textAlign = 'left'; g.font = `900 ${size}px ${SERIF}`;
  lines.forEach((line, i) => {
    const ly = y + i * lh;
    if (markLast && i === lines.length - 1) {
      g.fillStyle = CARD_MARK; g.fillRect(x - 4, ly - size * 0.3, g.measureText(line).width + 8, size * 0.36);
    }
    g.fillStyle = CARD_INK; g.fillText(line, x, ly);
  });
  return y + (lines.length - 1) * lh;
}
function footer(g, W, H) {
  const b = sheetBox(W, H);
  const x0 = b.x + b.pad; const x1 = b.x + b.w - b.pad;
  const y = b.y + b.h - (H === W ? 48 : 58);
  g.save(); g.strokeStyle = 'rgba(118,99,90,0.35)'; g.lineWidth = 1.5; g.setLineDash([6, 6]);
  g.beginPath(); g.moveTo(x0, y - 50); g.lineTo(x1, y - 50); g.stroke(); g.restore();
  g.textAlign = 'left'; g.fillStyle = CARD_INK; g.font = `700 32px ${SERIF}`;
  const nx = spaced(g, '啾啾日記', x0, y, 6);
  g.fillStyle = CARD_MUTED; g.font = `italic 500 28px ${LATIN}`; g.fillText('Jiujiu Diary', nx + 12, y);
  g.textAlign = 'right'; g.fillStyle = CARD_ACCENT; g.font = `600 30px ${LATIN}`; g.fillText('diary.jas-soul.com', x1, y);
  g.textAlign = 'left';
  return y - 50; // 頁尾虛線的位置，內容不能超過這裡
}
function namesLine(opt) {
  if (!opt.names) return '';
  if (isPartner()) return `${CloudDB.partnerInfo().name || ''} & ${ownerName()}`;
  return NAMES.me && NAMES.partner ? `${NAMES.me} & ${NAMES.partner}` : '';
}
// 白色便條紙，微微歪一點
function note(g, x, y, w, h, deg) {
  g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(deg * Math.PI / 180);
  g.shadowColor = 'rgba(90,64,40,0.25)'; g.shadowBlur = 22; g.shadowOffsetY = 8;
  g.fillStyle = '#FFFDF8'; g.fillRect(-w / 2, -h / 2, w, h);
  g.restore();
}
async function drawMascot(g, mood, x, y, w) {
  const m = await mascotImg(mood);
  if (m) g.drawImage(m, x, y, w, w * 112 / 160);
}

async function drawSummary(g, W, H, data, opt) {
  const sq = H === W;
  const s = data.stats;
  const b = paper(g, W, H);
  const x = b.x + b.pad; const cw = b.w - b.pad * 2;
  const limit = footer(g, W, H);
  let y = b.y + (sq ? 120 : 170);
  kicker(g, x, y, data.range.label, data.range.from === lastMonthRange().from ? '每月回憶' : '每週回憶');
  y += sq ? 104 : 140;
  g.font = `900 ${sq ? 80 : 100}px ${SERIF}`;
  y = title(g, [data.range.title], x, y, sq ? 80 : 100, 0, true);
  const nl = namesLine(opt);
  if (nl) { y += sq ? 62 : 80; g.fillStyle = CARD_MUTED; g.font = `400 ${sq ? 36 : 40}px ${KAI}`; g.fillText(nl, x, y); }
  // 數字：像帳本一樣一欄一個，中間用點線隔開
  const items = [['美好時刻', s.happy, '個', CARD_ACCENT]];
  if (s.cleared) items.push(['烏雲放晴', s.cleared, '次', '#9A6B2C']);
  if (s.resolved) items.push(['吵架和好', s.resolved, '次', '#5B76A3']);
  if (opt.hard) { items.push(['烏雲時刻', s.cloud, '則', '#9A6B2C']); items.push(['吵架議題', s.fight, '個', '#5B76A3']); }
  const cols = items.length === 4 ? 2 : Math.min(items.length, 3);
  const colW = cw / cols;
  const rowH = sq ? 170 : 210;
  y += sq ? 60 : 90;
  items.forEach(([label, n, unit, color], i) => {
    const cx = x + (i % cols) * colW + (i % cols ? 36 : 0);
    const ry = y + Math.floor(i / cols) * rowH;
    if (i % cols) { g.save(); g.strokeStyle = 'rgba(118,99,90,0.4)'; g.lineWidth = 2; g.setLineDash([2, 8]); g.beginPath(); g.moveTo(cx - 36, ry + 10); g.lineTo(cx - 36, ry + rowH - 40); g.stroke(); g.restore(); }
    g.textAlign = 'left';
    g.fillStyle = color; g.font = `900 ${sq ? 92 : 112}px ${SERIF}`; g.fillText(String(n), cx, ry + (sq ? 96 : 118));
    const nw = g.measureText(String(n)).width;
    g.font = `400 ${sq ? 34 : 38}px ${KAI}`; g.fillText(unit, cx + nw + 10, ry + (sq ? 96 : 118));
    g.fillStyle = CARD_MUTED; g.font = `500 ${sq ? 26 : 28}px ${SERIF}`; spaced(g, label, cx + 2, ry + (sq ? 142 : 170), 6);
  });
  y += Math.ceil(items.length / cols) * rowH;
  // 這段期間最想記住的一刻：寫在便條紙上
  const mw = sq ? 300 : 420; const mh = mw * 112 / 160;
  if (opt.highlight && s.highlight && !sq) {
    g.font = `400 40px ${KAI}`;
    const lines = wrapText(g, s.highlight.title, cw - 120, 3);
    const nh = 110 + lines.length * 62 + 60;
    y += 40;
    note(g, x, y, cw - 40, nh, -1.2);
    g.fillStyle = CARD_ACCENT; g.font = `700 26px ${SERIF}`; spaced(g, '最想記住的一刻', x + 44, y + 70, 8);
    g.fillStyle = CARD_INK; g.font = `400 40px ${KAI}`;
    lines.forEach((l, i) => g.fillText(l, x + 44, y + 138 + i * 62));
    g.fillStyle = CARD_MUTED; g.font = `500 26px ${SERIF}`; g.fillText(shortDate(s.highlight.date), x + 44, y + 138 + lines.length * 62 + 10);
    y += nh;
  }
  await drawMascot(g, s.happy ? 'celebrate' : 'happy', b.x + b.w - b.pad - mw + 20, Math.max(y + 10, limit - mh - 12), mw);
}

async function drawRecord(g, W, H, r, opt) {
  const sq = H === W;
  const ids = r.photoIds || [];
  const url = ids.length ? await photoUrl(ids[Math.min(opt.photo || 0, ids.length - 1)]) : null;
  const img = url ? await loadImg(url) : null;
  const b = paper(g, W, H, img ? false : undefined);
  const x = b.x + b.pad; const cw = b.w - b.pad * 2;
  const limit = footer(g, W, H);
  const nl = namesLine(opt);
  let y = b.y + (sq ? 90 : 120);
  if (img) {
    // 拍立得：白框、微微歪，上面貼一段紙膠帶
    const fw = cw; const fh = sq ? 470 : 820; const inset = 22;
    g.save(); g.translate(x + fw / 2, y + fh / 2); g.rotate(-1.2 * Math.PI / 180);
    g.shadowColor = 'rgba(90,64,40,0.28)'; g.shadowBlur = 26; g.shadowOffsetY = 10;
    g.fillStyle = '#FFFFFF'; g.fillRect(-fw / 2, -fh / 2, fw, fh);
    g.shadowColor = 'transparent';
    const iw0 = fw - inset * 2; const ih0 = fh - inset * 2;
    g.beginPath(); g.rect(-fw / 2 + inset, -fh / 2 + inset, iw0, ih0); g.clip();
    const scale = Math.max(iw0 / img.width, ih0 / img.height);
    g.drawImage(img, -img.width * scale / 2, -img.height * scale / 2, img.width * scale, img.height * scale);
    g.restore();
    washi(g, x + fw / 2, y - 4, 220, 56, 2, CARD_TAPE);
    y += fh + (sq ? 80 : 110);
  }
  // 沒有照片時，標題放大當主角；整塊內容連同吉祥物在紙上垂直置中，不會中間空一大塊
  const size = img ? (sq ? 52 : 66) : (sq ? 76 : 96);
  const lh = size * 1.36;
  g.font = `900 ${size}px ${SERIF}`;
  const tl = wrapText(g, r.title, cw, img ? 2 : 4);
  g.font = `400 38px ${KAI}`;
  const dl = opt.text && r.description && !sq ? wrapText(g, r.description, cw, img ? 3 : 5) : [];
  const mw = sq ? 300 : 460; const mh = mw * 112 / 160;
  if (!img) {
    const blockH = (sq ? 36 : 50) + size + (tl.length - 1) * lh + (dl.length ? 30 + dl.length * 62 : 0) + 60 + mh;
    const top = b.y + (sq ? 90 : 120);
    y = top + Math.max(0, (limit - (nl ? 80 : 20) - top - blockH) / 2);
  }
  kicker(g, x, y, `No. ${numberOf(r, await liveRecords())}`, '美好時刻');
  g.fillStyle = CARD_MUTED; g.font = `400 ${sq ? 28 : 32}px ${KAI}`; g.textAlign = 'right';
  g.fillText(longDate(r.date), x + cw, y); g.textAlign = 'left';
  y += (sq ? 36 : 50) + size;
  y = title(g, tl, x, y, size, lh, false);
  if (dl.length) {
    g.fillStyle = CARD_MUTED; g.font = `400 38px ${KAI}`;
    y += 30;
    for (const line of dl) { y += 62; g.fillText(line, x, y); }
  }
  if (!img) await drawMascot(g, 'happy', b.x + b.w - b.pad - mw + 20, Math.min(y + 60, limit - mh - (nl ? 80 : 12)), mw);
  if (nl) { g.fillStyle = CARD_INK; g.font = `400 ${sq ? 34 : 38}px ${KAI}`; g.textAlign = 'right'; g.fillText(`— ${nl}`, x + cw, limit - 30); g.textAlign = 'left'; }
}

async function drawDays(g, W, H, info, opt) {
  const sq = H === W;
  const b = paper(g, W, H);
  const x = b.x + b.pad; const cw = b.w - b.pad * 2;
  const limit = footer(g, W, H);
  let y = b.y + (sq ? 120 : 200);
  kicker(g, x, y, 'Anniversary', '紀念日');
  const nl = namesLine(opt);
  if (nl) { y += sq ? 90 : 130; g.fillStyle = CARD_MUTED; g.font = `400 ${sq ? 40 : 46}px ${KAI}`; g.fillText(nl, x, y); }
  y += sq ? 100 : 140;
  g.fillStyle = CARD_INK; g.font = `900 ${sq ? 60 : 76}px ${SERIF}`; g.fillText(info.unit === '週年' ? '在一起' : '在一起第', x, y);
  // 大數字：Cormorant，底下一條螢光筆
  const big = sq ? 220 : 290;
  y += sq ? 230 : 300;
  g.font = `900 ${big}px ${SERIF}`; const bw = g.measureText(info.big).width;
  g.fillStyle = CARD_MARK; g.fillRect(x - 6, y - big * 0.24, bw + 12, big * 0.22);
  g.fillStyle = CARD_ACCENT; g.fillText(info.big, x - 4, y);
  g.fillStyle = CARD_INK; g.font = `900 ${sq ? 64 : 80}px ${SERIF}`; g.fillText(info.unit, x + bw + 18, y);
  y += sq ? 80 : 110;
  g.fillStyle = CARD_MUTED; g.font = `400 ${sq ? 34 : 40}px ${KAI}`; g.fillText(`從 ${longDate(NAMES.since)} 開始`, x, y);
  const mw = sq ? 320 : 500; const mh = mw * 112 / 160;
  await drawMascot(g, 'celebrate', b.x + b.w - b.pad - mw + 20, Math.max(y + 40, limit - mh - 12), mw);
}

async function renderCard(kind, data, opt) {
  const { w: W, h: H } = CARD_SIZES[opt.size];
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const text = JSON.stringify(data && data.title ? data.title : '') + '啾啾日記美好時刻烏雲放晴吵架和好最想記住的一刻在一起第天週年從開始個次則每週每月回憶紀念日—' + namesLine(opt)
    + (kind === 'record' ? `${data.title}${data.description || ''}` : '') + (data && data.range ? data.range.title + data.range.label : '')
    + (data && data.stats && data.stats.highlight ? data.stats.highlight.title : '') + '0123456789年月日一二三四五六（）' + (NAMES.since ? longDate(NAMES.since) : '');
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
    ${inAppNotice()}
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
        // 只送圖片：加了 title 或 text，LINE、Threads 會把那段字當成貼文內容
        await navigator.share({ files: [file] });
        track('card_share', { kind, size: opt.size, how: 'share' });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return; // 自己按了取消
        toast('沒辦法分享，改成下載圖片');
      }
    }
    // LINE、IG 裡的瀏覽器不能下載：改成放大顯示圖片，讓人長按存到相簿
    if (IN_APP) { await showLongPressSave(blob); track('card_share', { kind, size: opt.size, how: 'download' }); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('已下載圖片');
    track('card_share', { kind, size: opt.size, how: 'download' });
  }));
  redraw();
}

// 在 LINE、IG 裡：全螢幕顯示小卡，長按圖片就能存到相簿
async function showLongPressSave(blob) {
  const url = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
  const box = document.createElement('div');
  box.className = 'celebrate longpress-save';
  box.innerHTML = `<div class="celebrate-box" role="dialog" aria-modal="true" aria-label="存小卡">
    <div class="bold">長按圖片，選「儲存」或「加入照片」</div>
    <img src="${url}" alt="回憶小卡" style="max-width:100%;max-height:60vh;border-radius:12px;-webkit-touch-callout:default;user-select:auto">
    <div class="small muted">存不起來的話，點右上角的「⋯」選「用瀏覽器開啟」，在 Safari 或 Chrome 裡按「分享」。</div>
    <button class="btn" id="longpress-close">好了</button>
  </div>`;
  document.body.appendChild(box);
  box.querySelector('#longpress-close').addEventListener('click', () => box.remove());
}
