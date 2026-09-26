// 我們的紀錄
// 畫面用網址後面的 # 切換，例如 #/list/happy、#/new/fight、#/view/<id>。
// 用分享碼加入的另一半會進入「另一半模式」：只能看、做任務，不能改紀錄。

const TYPES = {
  happy: {
    label: '美好時刻', short: '美好', theme: 'theme-happy', goal: 100,
    emojis: ['😊', '🥰', '😂', '🤗', '😍', '🥹', '✨'],
    tags: ['被照顧', '感動', '驚喜', '好笑', '放鬆', '幸福'],
  },
  cloud: {
    label: '烏雲時刻', short: '烏雲', theme: 'theme-cloud', goal: 100,
    emojis: ['😒', '😤', '😢', '😞', '😮‍💨', '🥲', '😡'],
    tags: ['失望', '委屈', '被忽略', '不被尊重', '好累', '焦慮'],
  },
  fight: {
    label: '吵架議題', short: '吵架', theme: 'theme-fight', goal: null,
    emojis: ['😡', '😢', '😤', '🤔', '😮‍💨', '🥲', '😶'],
    tags: ['委屈', '生氣', '不被理解', '愧疚', '需要冷靜'],
  },
};

const STATUS = {
  open: { label: '未解決', cls: 'st-open' },
  progress: { label: '處理中', cls: 'st-progress' },
  resolved: { label: '已解決', cls: 'st-resolved' },
};

const VISIBILITY = {
  shared: '給對方看',
  locked: '上鎖',
  task: '任務解鎖',
};

const DEFAULT_CATEGORIES = ['溝通', '價值觀', '金錢', '家人朋友', '時間分配', '生活習慣', '信任/安全感', '其他'];
const MAX_EMOJIS = 3;
const BACKUP_REMIND_DAYS = 14;

const ICON = {
  back: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18 9 12l6-6"/></svg>',
  home: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V21H3z"/></svg>',
  heart: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>',
  bigHeart: '<svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>',
  cloud: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/></svg>',
  bigCloud: '<svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/></svg>',
  bolt: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  plus: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  plusSmall: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  camera: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  lock: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  lockSmall: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  gear: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>',
};

const SHARE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉容易看錯的 0 O 1 I

const app = document.getElementById('app');
const tabbar = document.getElementById('tabbar');

// ---------- 小工具 ----------
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function shortDate(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}`;
}
function longDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const w = '日一二三四五六'[new Date(Number(y), Number(m) - 1, Number(d)).getDay()];
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日（${w}）`;
}
function daysAgo(ts) {
  return Math.max(0, Math.floor((Date.now() - ts) / 86400000));
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 1800);
}
function go(hash) { location.hash = hash; }
// 另一半模式：用分享碼加入的人
function isPartner() { return CLOUD_ENABLED && CloudDB.isPartner(); }
function ownerName() { return (isPartner() && CloudDB.partnerInfo().owner_name) || '對方'; }
function newShareCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((b) => SHARE_CODE_CHARS[b % SHARE_CODE_CHARS.length]).join('');
}
function byDateDesc(a, b) {
  return (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0);
}
// 每種類型依時間先後編號：第 1 則、第 2 則……（預設圖上的 No.）
function numberOf(rec, all) {
  const same = all.filter((r) => r.type === rec.type).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || 0) - (b.createdAt || 0));
  return same.findIndex((r) => r.id === rec.id) + 1;
}

// 照片：存成 Blob，顯示時轉成網址並快取
const photoUrlCache = new Map();
async function photoUrl(id) {
  if (photoUrlCache.has(id)) return photoUrlCache.get(id);
  const p = await DB.getPhoto(id);
  if (!p) return null;
  const url = URL.createObjectURL(p.blob);
  photoUrlCache.set(id, url);
  return url;
}
// 上傳前先壓縮：最長邊 1280px，轉成 JPEG
function compressImage(file, maxSide = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(src);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('壓縮失敗'))), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('讀不到這張圖片')); };
    img.src = src;
  });
}

async function getCategories() {
  return DB.getSetting('categories', DEFAULT_CATEGORIES.slice());
}

// 預設建議＋用過的標籤
function tagSuggestions(type, all) {
  const set = new Set(TYPES[type].tags);
  all.filter((r) => r.type === type).forEach((r) => (r.tags || []).forEach((t) => set.add(t)));
  return [...set];
}

// ---------- 底部選單 ----------
function renderTabbar(route) {
  // 新增、編輯、詳情、設定頁不顯示底部選單，免得擋住按鈕
  tabbar.hidden = route === null;
  document.body.classList.toggle('no-tabbar', route === null);
  if (route === null) return;
  const tab = (href, icon, label, on) => `<a class="tab${on ? ' on' : ''}" href="${href}">${icon}<span>${label}</span></a>`;
  tabbar.innerHTML = [
    tab('#/', ICON.home, '首頁', route === 'home'),
    tab('#/list/happy', ICON.heart, '美好', route === 'happy'),
    isPartner()
      ? tab('#/tasks', ICON.lock, '任務', route === 'tasks')
      : `<a class="tab-add" href="#/new/${route === 'cloud' || route === 'fight' ? route : 'happy'}" aria-label="新增紀錄">${ICON.plus}</a>`,
    tab('#/list/cloud', ICON.cloud, '烏雲', route === 'cloud'),
    tab('#/fights', ICON.bolt, '吵架', route === 'fight'),
  ].join('');
}

// ---------- 首頁 ----------
async function viewHome() {
  const all = await DB.allRecords();
  const count = (t) => all.filter((r) => r.type === t).length;
  const fights = all.filter((r) => r.type === 'fight');
  const st = (s) => fights.filter((f) => (f.status || 'open') === s).length;
  const recent = all.slice().sort(byDateDesc).slice(0, 5);
  const lastBackup = await DB.getSetting('lastBackupAt', null);
  const needBackup = !CLOUD_ENABLED && all.length > 0 && (!lastBackup || Date.now() - lastBackup > BACKUP_REMIND_DAYS * 86400000);
  let pending = [];
  if (CLOUD_ENABLED) { try { pending = await CloudDB.submissions({ status: 'pending' }); } catch (e) { pending = []; } }
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  const progressCard = (type) => {
    const n = count(type);
    const pct = Math.min(100, (n / TYPES[type].goal) * 100);
    const done = n >= TYPES[type].goal;
    return `<a class="card ${TYPES[type].theme}" href="#/list/${type}">
      <div class="row between"><div class="bold" style="color:var(--accent)">${TYPES[type].label}</div>
      <div class="count"><b>${n}</b> / ${TYPES[type].goal}</div></div>
      <div class="progress"><div style="width:${pct}%"></div></div>
      ${done ? '<div class="small bold" style="color:var(--accent-dark)">集滿 100 個了！</div>' : ''}
    </a>`;
  };

  app.innerHTML = `
    <div class="row between">
      <div>
        <div class="hello">今天是 ${longDate(today())}</div>
        <h1 class="title-xl">我們的紀錄</h1>
      </div>
      <a class="icon-btn" href="#/settings" aria-label="設定">${ICON.gear}</a>
    </div>
    ${needBackup ? `<a class="card" href="#/settings" style="background:var(--progress-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--progress-ink)">該備份囉</div>
      <div class="small" style="color:var(--progress-ink)">${lastBackup ? `上次備份是 ${daysAgo(lastBackup)} 天前` : '還沒有備份過'}，點這裡到設定頁匯出備份，再存到 iCloud 雲碟或 Google 雲端硬碟。</div>
    </a>` : ''}
    ${pending.length ? `<a class="card" href="#/view/${esc(pending[0].record_id)}" style="background:var(--lock-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--lock)">有 ${pending.length} 個任務等你確認</div>
      <div class="small" style="color:var(--lock)">${esc(pending[0].partner_name)} 完成了任務，點這裡去看看，確認後那則紀錄就會解鎖給對方看。</div>
    </a>` : ''}
    ${isIOS && !standalone ? `<div class="card" style="background:var(--lock-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--lock)">建議加到主畫面</div>
      <div class="small" style="color:var(--lock)">在 Safari 按「分享 → 加入主畫面」，之後都從主畫面打開，資料才不會因為太久沒開而被自動清掉。</div>
    </div>` : ''}
    ${progressCard('happy')}
    ${progressCard('cloud')}
    <a class="card theme-fight" href="#/fights">
      <div class="bold" style="color:var(--fight)">吵架議題</div>
      <div class="status-grid">
        <div class="status-tile st-open"><b>${st('open')}</b><span class="small">未解決</span></div>
        <div class="status-tile st-progress"><b>${st('progress')}</b><span class="small">處理中</span></div>
        <div class="status-tile st-resolved"><b>${st('resolved')}</b><span class="small">已解決</span></div>
      </div>
    </a>
    <div class="section-title">最近的紀錄</div>
    <div class="list" id="recent">${recent.length ? '' : `<div class="empty">還沒有任何紀錄<a class="btn small" href="#/new/happy">寫下第一個美好時刻</a></div>`}</div>
  `;
  const box = document.getElementById('recent');
  for (const r of recent) box.appendChild(await listItem(r));
}

async function listItem(r) {
  const a = document.createElement('a');
  a.className = `card item ${TYPES[r.type].theme}`;
  a.href = `#/view/${r.id}`;
  let thumb = `<div class="thumb">${r.type === 'happy' ? ICON.heart : r.type === 'cloud' ? ICON.cloud : ICON.bolt}</div>`;
  if (r.photoIds && r.photoIds.length) {
    const url = await photoUrl(r.photoIds[0]);
    if (url) thumb = `<img class="thumb" src="${url}" alt="">`;
  }
  const tags = (r.tags || []).map((t) => '#' + t).join(' ');
  a.innerHTML = `${thumb}
    <div class="grow">
      <div style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.title)}</div>
      <div class="muted small">${shortDate(r.date)} · ${TYPES[r.type].short}${tags ? ' · ' + esc(tags) : ''}</div>
    </div>
    <div class="item-emoji">${esc((r.emojis || [])[0] || '')}</div>`;
  return a;
}

// ---------- 美好／烏雲列表 ----------
async function viewList(type, tagFilter) {
  const conf = TYPES[type];
  const all = await DB.allRecords();
  const mine = all.filter((r) => r.type === type).sort(byDateDesc);
  const tags = [...new Set(mine.flatMap((r) => r.tags || []))];
  const shown = tagFilter ? mine.filter((r) => (r.tags || []).includes(tagFilter)) : mine;
  const pct = Math.min(100, (mine.length / conf.goal) * 100);

  app.className = conf.theme;
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/" aria-label="返回">${ICON.back}</a>
      <h1>${conf.label}</h1>
      <div class="count"><b style="font-size:16px;color:var(--accent)">${mine.length}</b> / ${conf.goal}</div>
    </div>
    <div class="progress" style="height:8px"><div style="width:${pct}%"></div></div>
    ${tags.length ? `<div class="chips scroll">
      <button class="chip dark ${!tagFilter ? 'on' : ''}" data-tag="">全部</button>
      ${tags.map((t) => `<button class="chip ${t === tagFilter ? 'on' : ''}" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}
    </div>` : ''}
    <div class="grid2" id="grid"></div>
    ${mine.length ? '' : isPartner() ? `<div class="empty">${esc(ownerName())}還沒有分享${conf.label}</div>` : `<div class="empty">還沒有${conf.label}<a class="btn small" href="#/new/${type}">新增第一則</a></div>`}
  `;
  app.querySelectorAll('[data-tag]').forEach((b) => b.addEventListener('click', () => viewList(type, b.dataset.tag || null)));

  const grid = document.getElementById('grid');
  for (const r of shown) {
    const a = document.createElement('a');
    a.className = 'card tile';
    a.href = `#/view/${r.id}`;
    let top;
    if (r.photoIds && r.photoIds.length) {
      const url = await photoUrl(r.photoIds[0]);
      top = url ? `<img class="tile-img" src="${url}" alt="">` : '';
    }
    if (!top) {
      top = `<div class="tile-default">${type === 'happy' ? ICON.bigHeart : ICON.bigCloud}<div class="no">No. ${numberOf(r, all)}</div></div>`;
    }
    const lockNote = isPartner() ? (r.visibility === 'task' ? '任務解鎖的' : '')
      : r.visibility === 'locked' ? '上鎖・只有你看得到' : r.visibility === 'task' ? (r.unlocked ? '任務已解鎖' : '任務解鎖') : '';
    a.innerHTML = `${top}
      <div class="tile-body">
        <div class="bold" style="font-size:14px">${esc(r.title)}</div>
        <div class="muted small">${shortDate(r.date)} · ${esc((r.emojis || []).join(''))}</div>
        ${(r.tags || []).length ? `<div class="tile-tags">${esc(r.tags.map((t) => '#' + t).join(' '))}</div>` : ''}
        ${lockNote ? `<div class="small row" style="color:var(--lock);gap:4px">${ICON.lockSmall}${lockNote}</div>` : ''}
      </div>`;
    grid.appendChild(a);
  }
}

// ---------- 吵架議題列表 ----------
async function viewFights(catFilter, statusFilter) {
  const all = await DB.allRecords();
  const fights = all.filter((r) => r.type === 'fight').sort(byDateDesc);
  const cats = await getCategories();
  const usedCats = [...new Set([...cats, ...fights.map((f) => f.category).filter(Boolean)])];
  const counts = usedCats.map((c) => ({
    c,
    n: fights.filter((f) => f.category === c).length,
    done: fights.filter((f) => f.category === c && f.status === 'resolved').length,
  })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...counts.map((x) => x.n));
  const shown = fights.filter((f) => (!catFilter || f.category === catFilter) && (!statusFilter || (f.status || 'open') === statusFilter));

  app.className = 'theme-fight';
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/" aria-label="返回">${ICON.back}</a>
      <h1>吵架議題</h1>
    </div>
    ${counts.length ? `<div class="card">
      <div class="muted bold">按分類看</div>
      ${counts.map((x) => `<div class="bar-row"><div class="label">${esc(x.c)}</div><div class="bar"><div style="width:${(x.n / max) * 100}%"></div></div><div class="num">${x.n} 次・解決 ${x.done}</div></div>`).join('')}
    </div>` : ''}
    <div class="chips scroll">
      <button class="chip dark ${!catFilter ? 'on' : ''}" data-cat="">全部分類</button>
      ${usedCats.map((c) => `<button class="chip ${c === catFilter ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
    </div>
    <div class="chips">
      <button class="chip dark ${!statusFilter ? 'on' : ''}" data-st="">全部狀態</button>
      ${Object.entries(STATUS).map(([k, v]) => `<button class="chip ${k === statusFilter ? 'on' : ''}" data-st="${k}">${v.label}</button>`).join('')}
    </div>
    <div class="list">
      ${shown.map((f) => {
        const s = STATUS[f.status || 'open'];
        const n = (f.followUps || []).length;
        const extra = f.status === 'resolved' && f.resolution ? `解法：${esc(f.resolution)}` : `${n} 則後續`;
        return `<a class="card" href="#/view/${esc(f.id)}" style="gap:6px">
          <div class="row between"><span class="small bold" style="color:var(--fight)">${esc(f.category || '未分類')}</span><span class="badge ${s.cls}">${s.label}</span></div>
          <div class="bold" style="font-size:16px">${esc(f.title)}</div>
          <div class="muted small">${shortDate(f.date)} · ${extra} ${esc((f.emojis || []).join(''))}</div>
        </a>`;
      }).join('')}
    </div>
    ${fights.length ? (shown.length ? '' : '<div class="empty">這個條件下沒有議題</div>') : isPartner() ? '<div class="empty">沒有分享的吵架議題</div>' : `<div class="empty">還沒有吵架議題，很棒！<a class="btn small" href="#/new/fight">新增一個議題</a></div>`}
  `;
  app.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => viewFights(b.dataset.cat || null, statusFilter)));
  app.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => viewFights(catFilter, b.dataset.st || null)));
}

// ---------- 詳情 ----------
async function viewDetail(id) {
  const r = await DB.getRecord(id);
  if (!r) { app.innerHTML = '<div class="empty">找不到這則紀錄<a class="btn small" href="#/">回首頁</a></div>'; return; }
  const all = await DB.allRecords();
  const conf = TYPES[r.type];
  const partner = isPartner();
  const backHref = r.type === 'fight' ? '#/fights' : `#/list/${r.type}`;
  const urls = [];
  for (const pid of r.photoIds || []) { const u = await photoUrl(pid); if (u) urls.push(u); }

  let photos = '';
  if (urls.length) photos = `<div class="detail-photos">${urls.map((u) => `<img src="${u}" alt="">`).join('')}</div>`;
  else if (r.type !== 'fight') photos = `<div class="detail-default">${r.type === 'happy' ? ICON.bigHeart : ICON.bigCloud}<div class="no" style="font-family:'Noto Serif TC',serif">No. ${numberOf(r, all)}</div></div>`;

  const visText = partner ? '' : VISIBILITY[r.visibility || 'shared'] + (r.visibility === 'task' && r.unlocked ? '・已解鎖' : '');
  let task = '';
  if (r.visibility === 'task' && r.task && r.task.text) {
    const modeText = r.task.mode === 'photo' ? '要上傳照片' : '按完成就好';
    if (partner) {
      task = `<div class="card" style="background:var(--lock-bg);border-color:transparent"><div class="small bold" style="color:var(--lock)">你完成任務解鎖了這則</div><div>${esc(r.task.text)}</div></div>`;
    } else {
      let subs = [];
      if (CLOUD_ENABLED) { try { subs = await CloudDB.submissions({ recordId: r.id }); } catch (e) { subs = []; } }
      const subCards = [];
      for (const sub of subs) {
        let img = '';
        if (sub.photo_path) {
          const blob = await CloudDB.taskPhoto(sub.photo_path);
          if (blob) img = `<img src="${URL.createObjectURL(blob)}" alt="任務照片" style="width:100%;border-radius:12px">`;
        }
        const stText = { pending: '等你確認', approved: '已通過', rejected: '已退回' }[sub.status];
        subCards.push(`<div class="card" style="gap:6px">
          <div class="row between"><span class="bold">${esc(sub.partner_name)} 送出的任務</span><span class="small muted">${shortDate(sub.created_at.slice(0, 10))}・${stText}</span></div>
          ${sub.note ? `<div class="prose">${esc(sub.note)}</div>` : ''}
          ${img}
          ${sub.status === 'pending' ? `<div class="btn-row"><button class="btn small" data-approve="${esc(sub.id)}">通過並解鎖</button><button class="btn small secondary" data-reject="${esc(sub.id)}">退回</button></div>` : ''}
        </div>`);
      }
      task = `<div class="card" style="background:var(--lock-bg);border-color:transparent">
        <div class="small bold" style="color:var(--lock)">解鎖任務（${modeText}）</div><div>${esc(r.task.text)}</div>
        <div class="small" style="color:var(--lock)">${r.unlocked ? '已經解鎖，對方看得到這則。' : CLOUD_ENABLED ? '對方完成任務、你按「通過」之後，對方就看得到這則。' : '雲端版開啟分享碼後，對方才能做任務。'}</div>
        ${r.unlocked ? '<button class="btn small secondary" id="relock">重新上鎖</button>' : ''}
      </div>${subCards.join('')}`;
    }
  }

  let fightPart = '';
  if (r.type === 'fight') {
    const s = r.status || 'open';
    const fu = r.followUps || [];
    const myLabel = partner ? `${esc(ownerName())}的想法` : '我的想法';
    const theirLabel = partner ? '你的想法（對方寫的）' : '對方的想法';
    fightPart = `
      ${partner
        ? `<div class="field"><div class="label">狀態</div><span class="badge ${STATUS[s].cls}" style="align-self:flex-start">${STATUS[s].label}</span></div>
           ${s === 'resolved' && r.resolution ? `<div class="card"><div class="small bold" style="color:var(--fight)">我們怎麼解決的</div><p class="prose">${esc(r.resolution)}</p></div>` : ''}`
        : `<div class="field"><div class="label">狀態</div>
        <div class="opts cols-3">${Object.entries(STATUS).map(([k, v]) => `<button class="opt ${k === s ? 'on' : ''}" data-status="${k}">${v.label}</button>`).join('')}</div>
      </div>
      ${s === 'resolved' ? `<div class="field"><label for="resolution">我們怎麼解決的</label><textarea id="resolution" class="textarea" style="min-height:70px" placeholder="例如：隔週輪流陪家人">${esc(r.resolution || '')}</textarea></div>` : ''}`}
      ${r.reason ? `<div class="card"><div class="small bold" style="color:var(--fight)">原因</div><p class="prose">${esc(r.reason)}</p></div>` : ''}
      ${r.myView || r.theirView ? `<div class="grid2">
        <div class="card"><div class="small bold" style="color:var(--fight)">${myLabel}</div><p class="prose" style="font-size:14px">${esc(r.myView || '—')}</p></div>
        <div class="card"><div class="small bold" style="color:var(--fight)">${theirLabel}</div><p class="prose" style="font-size:14px">${esc(r.theirView || '—')}</p></div>
      </div>` : ''}
      <div class="field"><div class="label">後續</div>
        <div class="timeline">
          ${fu.length ? fu.map((f, i) => `<div class="tl-item">
            <div class="tl-rail"><div class="tl-dot"></div>${i < fu.length - 1 ? '<div class="tl-line"></div>' : ''}</div>
            <div class="tl-body"><div class="muted small">${shortDate(f.date)}</div><div>${esc(f.text)}</div>${partner ? '' : `<button class="tl-del" data-del-fu="${esc(f.id)}">刪除</button>`}</div>
          </div>`).join('') : `<div class="muted">${partner ? '還沒有後續。' : '還沒有後續，發生新進展時記下來吧。'}</div>`}
        </div>
      </div>
      ${partner ? '' : `<div class="field"><label for="fu-text">新增後續</label>
        <input id="fu-date" class="input" type="date" value="${today()}" aria-label="後續日期">
        <div class="row"><input id="fu-text" class="input grow" placeholder="發生了什麼新進展？"><button class="btn small" id="fu-add">加入</button></div>
      </div>`}`;
  }

  app.className = conf.theme;
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="${backHref}" aria-label="返回">${ICON.back}</a>
      <div class="grow"></div>
      ${partner ? '' : `<a class="btn small secondary" href="#/edit/${esc(r.id)}">編輯</a>`}
    </div>
    <div class="field" style="gap:6px">
      <div class="row" style="gap:8px">
        <span class="badge" style="background:var(--accent-bg);color:var(--accent-dark)">${r.type === 'fight' ? esc(r.category || '未分類') : conf.label}</span>
        <span class="muted small">${longDate(r.date)}</span>
      </div>
      <h1 style="font-size:24px">${esc(r.title)}</h1>
      <div class="muted">${esc((r.emojis || []).join(' '))}${(r.tags || []).length ? ' · ' + esc(r.tags.map((t) => '#' + t).join(' ')) : ''}</div>
      ${visText ? `<div class="small row" style="color:var(--lock);gap:4px">${r.visibility && r.visibility !== 'shared' ? ICON.lockSmall : ''}${visText}</div>` : ''}
    </div>
    ${photos}
    ${r.description ? `<p class="prose">${esc(r.description)}</p>` : ''}
    ${task}
    ${fightPart}
    ${partner ? '' : '<button class="btn danger" id="delete" style="margin-top:12px">刪除這則紀錄</button>'}
  `;
  if (partner) return;

  document.getElementById('delete').addEventListener('click', async () => {
    if (!confirm('確定要刪除嗎？刪掉就救不回來了。')) return;
    for (const pid of r.photoIds || []) await DB.deletePhoto(pid);
    await DB.deleteRecord(r.id);
    toast('已刪除');
    go(backHref);
  });

  const setUnlocked = async (on) => {
    r.unlocked = on;
    r.updatedAt = Date.now();
    await DB.putRecord(r);
  };
  app.querySelectorAll('[data-approve]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    await CloudDB.reviewSubmission(b.dataset.approve, true);
    await setUnlocked(true);
    toast('已解鎖，對方看得到這則了');
    viewDetail(r.id);
  }));
  app.querySelectorAll('[data-reject]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('退回這次的任務？對方可以再送一次。')) return;
    await CloudDB.reviewSubmission(b.dataset.reject, false);
    viewDetail(r.id);
  }));
  const relock = document.getElementById('relock');
  if (relock) relock.addEventListener('click', async () => {
    if (!confirm('重新上鎖後，對方就看不到這則，要再完成一次任務才能解鎖。')) return;
    await setUnlocked(false);
    viewDetail(r.id);
  });

  if (r.type === 'fight') {
    const save = async (patch) => {
      Object.assign(r, patch, { updatedAt: Date.now() });
      await DB.putRecord(r);
      viewDetail(r.id);
    };
    app.querySelectorAll('[data-status]').forEach((b) => b.addEventListener('click', () => save({ status: b.dataset.status })));
    const res = document.getElementById('resolution');
    if (res) res.addEventListener('change', () => { r.resolution = res.value.trim(); r.updatedAt = Date.now(); DB.putRecord(r).then(() => toast('已儲存')); });
    document.getElementById('fu-add').addEventListener('click', () => {
      const text = document.getElementById('fu-text').value.trim();
      if (!text) { toast('先寫一點內容'); return; }
      const date = document.getElementById('fu-date').value || today();
      const fu = (r.followUps || []).concat({ id: DB.uid(), date, text }).sort((a, b) => a.date.localeCompare(b.date));
      // 第一次加後續時，自動從「未解決」變成「處理中」
      save({ followUps: fu, status: (r.status || 'open') === 'open' ? 'progress' : r.status });
    });
    app.querySelectorAll('[data-del-fu]').forEach((b) => b.addEventListener('click', () => {
      if (!confirm('刪除這則後續？')) return;
      save({ followUps: (r.followUps || []).filter((f) => f.id !== b.dataset.delFu) });
    }));
  }
}

// ---------- 新增／編輯 ----------
async function viewForm(mode, arg) {
  let rec;
  if (mode === 'edit') {
    rec = await DB.getRecord(arg);
    if (!rec) { go('#/'); return; }
    rec = JSON.parse(JSON.stringify(rec));
  } else {
    const type = TYPES[arg] ? arg : 'happy';
    rec = {
      id: DB.uid(), type, authorId: 'me', title: '', date: today(), description: '',
      photoIds: [], emojis: [], tags: [], visibility: 'shared', task: { text: '', mode: 'confirm' },
      category: '', reason: '', myView: '', theirView: '', status: 'open', resolution: '', followUps: [],
    };
  }
  const all = await DB.allRecords();
  const cats = await getCategories();
  // 這次新加、還沒儲存的照片（按取消就丟掉）
  const newPhotos = new Map();
  const removedPhotos = new Set();
  let customEmojis = rec.emojis.filter((e) => !TYPES[rec.type].emojis.includes(e));
  let extraTags = [];

  function collect() {
    const v = (id) => { const el = document.getElementById(id); return el ? el.value : undefined; };
    if (v('f-title') !== undefined) rec.title = v('f-title');
    if (v('f-date') !== undefined) rec.date = v('f-date');
    if (v('f-desc') !== undefined) rec.description = v('f-desc');
    if (v('f-reason') !== undefined) rec.reason = v('f-reason');
    if (v('f-my') !== undefined) rec.myView = v('f-my');
    if (v('f-their') !== undefined) rec.theirView = v('f-their');
    if (v('f-task') !== undefined) rec.task.text = v('f-task');
  }

  async function render() {
    const conf = TYPES[rec.type];
    app.className = conf.theme;
    const emojiList = [...conf.emojis, ...customEmojis.filter((e) => !conf.emojis.includes(e))];
    const tagList = [...new Set([...tagSuggestions(rec.type, all), ...extraTags, ...rec.tags])];
    const catList = [...new Set([...cats, ...(rec.category ? [rec.category] : [])])];

    const photoCells = [];
    for (const pid of rec.photoIds) {
      const url = newPhotos.has(pid) ? newPhotos.get(pid).url : await photoUrl(pid);
      if (url) photoCells.push(`<div class="photo"><img src="${url}" alt=""><button class="remove" data-rm-photo="${esc(pid)}" aria-label="移除照片">${ICON.x}</button></div>`);
    }

    app.innerHTML = `
      <div class="topbar">
        <a class="icon-btn" href="${mode === 'edit' ? '#/view/' + esc(rec.id) : '#/'}" aria-label="取消">${ICON.back}</a>
        <h1 style="font-size:20px;text-align:center">${mode === 'edit' ? '編輯紀錄' : '新增紀錄'}</h1>
        <div style="width:44px"></div>
      </div>
      ${mode === 'new' ? `<div class="seg" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        ${Object.entries(TYPES).map(([k, t]) => `<button class="${k === rec.type ? 'on' : ''}" data-type="${k}">${t.label}</button>`).join('')}
      </div>` : ''}
      <div class="field"><label for="f-title">${rec.type === 'fight' ? '議題' : '標題'}</label>
        <input id="f-title" class="input" value="${esc(rec.title)}" placeholder="${rec.type === 'happy' ? '例如：一起去看海' : rec.type === 'cloud' ? '例如：約好的時間又遲到了' : '例如：回訊息太慢'}" maxlength="60"></div>
      <div class="field"><label for="f-date">日期</label>
        <input id="f-date" class="input" type="date" value="${esc(rec.date)}"></div>
      ${rec.type === 'fight' ? `
        <div class="field"><div class="label">分類</div>
          <div class="chips">
            ${catList.map((c) => `<button class="chip ${c === rec.category ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
            <button class="chip dashed" id="add-cat">＋ 自訂</button>
          </div></div>
        <div class="field"><label for="f-reason">原因</label>
          <textarea id="f-reason" class="textarea" style="min-height:70px" placeholder="這次吵架是怎麼開始的？">${esc(rec.reason)}</textarea></div>
        <div class="field"><label for="f-my">我的想法</label>
          <textarea id="f-my" class="textarea" style="min-height:70px">${esc(rec.myView)}</textarea></div>
        <div class="field"><label for="f-their">對方的想法</label>
          <textarea id="f-their" class="textarea" style="min-height:70px">${esc(rec.theirView)}</textarea></div>
        <div class="field"><div class="label">狀態</div>
          <div class="opts cols-3">${Object.entries(STATUS).map(([k, v]) => `<button class="opt ${k === rec.status ? 'on' : ''}" data-status="${k}">${v.label}</button>`).join('')}</div></div>
      ` : `
        <div class="field"><label for="f-desc">描述</label>
          <textarea id="f-desc" class="textarea" placeholder="發生了什麼？">${esc(rec.description)}</textarea></div>
      `}
      <div class="field"><div class="label">照片${rec.type === 'happy' ? '（沒放會用預設圖）' : '（可不放）'}</div>
        <div class="photos">
          ${photoCells.join('')}
          <label class="photo-add">${ICON.camera}上傳<input type="file" accept="image/*" multiple class="visually-hidden" id="f-photos"></label>
        </div></div>
      <div class="field"><div class="label">心情（最多 ${MAX_EMOJIS} 個）</div>
        <div class="emoji-row">
          ${emojiList.map((e) => `<button class="emoji ${rec.emojis.includes(e) ? 'on' : ''}" data-emoji="${esc(e)}">${esc(e)}</button>`).join('')}
          <button class="emoji add" id="add-emoji" aria-label="選其他表情">${ICON.plusSmall}</button>
        </div>
        <div id="emoji-input-row" class="row" hidden>
          <input id="emoji-input" class="input grow" placeholder="用手機的表情鍵盤輸入一個表情" aria-label="自訂表情">
          <button class="btn small" id="emoji-ok">加入</button>
        </div></div>
      <div class="field"><label for="f-tag">感受標籤</label>
        <div class="chips">
          ${tagList.map((t) => `<button class="chip ${rec.tags.includes(t) ? 'on' : ''}" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}
        </div>
        <input id="f-tag" class="input" placeholder="輸入新標籤，按 Enter 加入" enterkeyhint="done"></div>
      <div class="field"><div class="label">誰可以看</div>
        <div class="opts cols-3">${Object.entries(VISIBILITY).map(([k, v]) => `<button class="opt ${k === rec.visibility ? 'on' : ''}" data-vis="${k}">${v}</button>`).join('')}</div>
        ${rec.visibility === 'task' ? `
          <label for="f-task" class="muted">對方要完成的任務</label>
          <input id="f-task" class="input" value="${esc(rec.task.text)}" placeholder="例如：帶我去吃早午餐，拍一張合照給我">
          <div class="muted">完成方式</div>
          <div class="opts cols-2">
            <button class="opt ${rec.task.mode !== 'photo' ? 'on' : ''}" data-taskmode="confirm">按「完成」就好</button>
            <button class="opt ${rec.task.mode === 'photo' ? 'on' : ''}" data-taskmode="photo">要上傳照片</button>
          </div>` : ''}
        <div class="muted small">${CLOUD_ENABLED ? '給對方看：對方用分享碼就看得到。上鎖：只有你看得到。任務解鎖：對方完成任務、你按通過後才看得到。' : '現在是單人版，這個設定會先記下來；換成雲端版並開啟分享碼後，對方就會依這個設定看到內容。'}</div>
      </div>
      <button class="btn" id="save">儲存紀錄</button>
    `;
    bind();
  }

  function rerender() { collect(); render(); }

  function bind() {
    app.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
      collect();
      rec.type = b.dataset.type;
      rec.emojis = []; rec.tags = []; customEmojis = []; extraTags = [];
      render();
    }));
    app.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { collect(); rec.category = rec.category === b.dataset.cat ? '' : b.dataset.cat; render(); }));
    const addCat = document.getElementById('add-cat');
    if (addCat) addCat.addEventListener('click', async () => {
      const name = (prompt('新分類的名字') || '').trim();
      if (!name) return;
      collect();
      if (!cats.includes(name)) { cats.push(name); await DB.setSetting('categories', cats); }
      rec.category = name;
      render();
    });
    app.querySelectorAll('[data-status]').forEach((b) => b.addEventListener('click', () => { collect(); rec.status = b.dataset.status; render(); }));
    app.querySelectorAll('[data-emoji]').forEach((b) => b.addEventListener('click', () => {
      const e = b.dataset.emoji;
      collect();
      if (rec.emojis.includes(e)) rec.emojis = rec.emojis.filter((x) => x !== e);
      else if (rec.emojis.length >= MAX_EMOJIS) { toast(`最多選 ${MAX_EMOJIS} 個`); return; }
      else rec.emojis.push(e);
      render();
    }));
    document.getElementById('add-emoji').addEventListener('click', () => {
      const row = document.getElementById('emoji-input-row');
      row.hidden = false;
      document.getElementById('emoji-input').focus();
    });
    const addEmoji = () => {
      const val = document.getElementById('emoji-input').value.trim();
      if (!val) return;
      // 只取第一個字元群（一個表情，包含組合表情）
      const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter('zh', { granularity: 'grapheme' }).segment(val)][0].segment : [...val][0];
      collect();
      if (!customEmojis.includes(seg) && !TYPES[rec.type].emojis.includes(seg)) customEmojis.push(seg);
      if (!rec.emojis.includes(seg)) {
        if (rec.emojis.length >= MAX_EMOJIS) toast(`已加到清單；最多選 ${MAX_EMOJIS} 個`);
        else rec.emojis.push(seg);
      }
      render();
    };
    document.getElementById('emoji-ok').addEventListener('click', addEmoji);
    document.getElementById('emoji-input').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); addEmoji(); } });
    app.querySelectorAll('[data-tag]').forEach((b) => b.addEventListener('click', () => {
      const t = b.dataset.tag;
      collect();
      rec.tags = rec.tags.includes(t) ? rec.tags.filter((x) => x !== t) : rec.tags.concat(t);
      render();
    }));
    document.getElementById('f-tag').addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' || ev.isComposing) return;
      ev.preventDefault();
      const t = ev.target.value.trim().replace(/^#+/, '');
      if (!t) return;
      collect();
      if (!extraTags.includes(t)) extraTags.push(t);
      if (!rec.tags.includes(t)) rec.tags.push(t);
      render();
    });
    app.querySelectorAll('[data-vis]').forEach((b) => b.addEventListener('click', () => { collect(); rec.visibility = b.dataset.vis; render(); }));
    app.querySelectorAll('[data-taskmode]').forEach((b) => b.addEventListener('click', () => { collect(); rec.task.mode = b.dataset.taskmode; render(); }));
    document.getElementById('f-photos').addEventListener('change', async (ev) => {
      collect();
      const files = [...ev.target.files];
      if (!files.length) return;
      toast('照片處理中…');
      for (const f of files) {
        try {
          const blob = await compressImage(f);
          const id = DB.uid();
          newPhotos.set(id, { blob, url: URL.createObjectURL(blob) });
          rec.photoIds.push(id);
        } catch (e) { toast(e.message); }
      }
      render();
    });
    app.querySelectorAll('[data-rm-photo]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.rmPhoto;
      collect();
      rec.photoIds = rec.photoIds.filter((x) => x !== id);
      if (newPhotos.has(id)) newPhotos.delete(id); else removedPhotos.add(id);
      render();
    }));
    document.getElementById('save').addEventListener('click', async () => {
      collect();
      rec.title = rec.title.trim();
      if (!rec.title) { toast(rec.type === 'fight' ? '請填寫議題' : '請填寫標題'); document.getElementById('f-title').focus(); return; }
      if (!rec.date) rec.date = today();
      if (rec.visibility === 'task' && !rec.task.text.trim()) { toast('請填寫解鎖任務'); return; }
      for (const [id, p] of newPhotos) await DB.putPhoto({ id, blob: p.blob, recordId: rec.id, createdAt: Date.now() });
      for (const id of removedPhotos) { await DB.deletePhoto(id); photoUrlCache.delete(id); }
      const now = Date.now();
      rec.createdAt = rec.createdAt || now;
      rec.updatedAt = now;
      await DB.putRecord(rec);
      toast('已儲存');
      go(`#/view/${rec.id}`);
    });
  }

  render();
}

// ---------- 設定：備份、分類 ----------
function blobToDataUrl(blob) {
  return new Promise((resolve) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.readAsDataURL(blob); });
}
// 只接受備份檔裡的圖片資料（data:image/...），不去抓外部網址
async function dataUrlToBlob(url) {
  if (typeof url !== 'string' || !/^data:image\/[a-z+]+;base64,/i.test(url)) throw new Error('備份檔裡的照片格式不對');
  return (await fetch(url)).blob();
}
// 備份檔裡的 id 只能是英數字，避免被拿來組出奇怪的網址或雲端路徑
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
function checkBackup(data) {
  if (!data || data.app !== 'couple-diary' || !Array.isArray(data.records)) throw new Error('這不是我們的紀錄的備份檔');
  for (const r of data.records) {
    if (!r || !SAFE_ID.test(r.id) || !TYPES[r.type]) throw new Error('備份檔內容不對，沒有匯入');
    if (r.photoIds && (!Array.isArray(r.photoIds) || !r.photoIds.every((x) => SAFE_ID.test(x)))) throw new Error('備份檔內容不對，沒有匯入');
    if (r.visibility && !VISIBILITY[r.visibility]) r.visibility = 'locked';
    if (r.status && !STATUS[r.status]) r.status = 'open';
  }
  for (const p of data.photos || []) if (!p || !SAFE_ID.test(p.id)) throw new Error('備份檔內容不對，沒有匯入');
}

function downloadFile(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// 閱讀版：一個自己就能打開的網頁檔，照片直接包在裡面
async function buildReadableExport() {
  const all = (await DB.allRecords()).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || 0) - (b.createdAt || 0));
  const photoData = {};
  for (const p of await DB.allPhotos()) photoData[p.id] = await blobToDataUrl(p.blob);
  const colors = { happy: '#A33A52', cloud: '#8A5A12', fight: '#3E4C8A' };

  const card = (r, i) => {
    const imgs = (r.photoIds || []).map((id) => photoData[id]).filter(Boolean);
    const vis = r.visibility && r.visibility !== 'shared' ? `<span class="lock">${VISIBILITY[r.visibility]}</span>` : '';
    let fight = '';
    if (r.type === 'fight') {
      const st = STATUS[r.status || 'open'].label;
      fight = `<div class="meta">分類：${esc(r.category || '未分類')}・狀態：${st}</div>
        ${r.reason ? `<h4>原因</h4><p>${esc(r.reason)}</p>` : ''}
        ${r.myView ? `<h4>我的想法</h4><p>${esc(r.myView)}</p>` : ''}
        ${r.theirView ? `<h4>對方的想法</h4><p>${esc(r.theirView)}</p>` : ''}
        ${r.resolution ? `<h4>我們怎麼解決的</h4><p>${esc(r.resolution)}</p>` : ''}
        ${(r.followUps || []).length ? `<h4>後續</h4><ul>${r.followUps.map((f) => `<li><b>${shortDate(f.date)}</b> ${esc(f.text)}</li>`).join('')}</ul>` : ''}`;
    }
    return `<article>
      <div class="meta">${r.type === 'fight' ? '' : `No. ${i + 1}・`}${longDate(r.date)} ${vis}</div>
      <h3>${esc(r.title)} <span class="emo">${esc((r.emojis || []).join(''))}</span></h3>
      ${(r.tags || []).length ? `<div class="tags">${esc(r.tags.map((t) => '#' + t).join(' '))}</div>` : ''}
      ${r.description ? `<p>${esc(r.description)}</p>` : ''}
      ${fight}
      ${imgs.length ? `<div class="imgs">${imgs.map((u) => `<img src="${u}" alt="">`).join('')}</div>` : ''}
    </article>`;
  };

  const section = (type) => {
    const list = all.filter((r) => r.type === type);
    if (!list.length) return '';
    const goal = TYPES[type].goal ? ` ${list.length} / ${TYPES[type].goal}` : ` 共 ${list.length} 則`;
    return `<section style="--c:${colors[type]}"><h2>${TYPES[type].label}<small>${goal}</small></h2>${list.map(card).join('')}</section>`;
  };

  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'">
<title>我們的紀錄（閱讀版 ${today()}）</title>
<style>
body{margin:0;background:#FBF7F2;color:#2B2320;font-family:"Noto Sans TC",-apple-system,"PingFang TC","Microsoft JhengHei",sans-serif;line-height:1.7}
main{max-width:720px;margin:0 auto;padding:32px 20px 64px}
h1{font-family:"Noto Serif TC",serif;font-size:32px;margin:0 0 4px}
.sub{color:#6B5E57;font-size:14px;margin-bottom:24px}
h2{color:var(--c);font-family:"Noto Serif TC",serif;border-bottom:2px solid var(--c);padding-bottom:6px;margin:36px 0 16px}
h2 small{font-family:sans-serif;font-size:14px;color:#6B5E57;margin-left:8px;font-weight:400}
article{background:#fff;border:1px solid #EFE6DD;border-radius:16px;padding:16px 18px;margin-bottom:14px;break-inside:avoid}
h3{margin:2px 0 4px;font-size:18px}.emo{font-weight:400}
h4{margin:10px 0 0;font-size:13px;color:var(--c)}
p{margin:6px 0;white-space:pre-wrap}ul{margin:4px 0;padding-left:20px}
.meta{font-size:13px;color:#6B5E57}.tags{font-size:13px;color:var(--c)}
.lock{display:inline-block;background:#EDE6F2;color:#4B3A66;border-radius:99px;padding:0 8px;font-size:12px;margin-left:4px}
.imgs{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.imgs img{width:calc(50% - 4px);border-radius:12px;object-fit:cover;max-height:320px}
@media print{body{background:#fff}article{border-color:#ddd}}
</style></head><body><main>
<h1>我們的紀錄</h1>
<div class="sub">匯出於 ${longDate(today())}・共 ${all.length} 則紀錄</div>
${section('happy')}${section('cloud')}${section('fight')}
${all.length ? '' : '<p>還沒有任何紀錄。</p>'}
</main></body></html>`;
}

async function viewSettings() {
  const cats = await getCategories();
  const all = await DB.allRecords();
  const lastBackup = await DB.getSetting('lastBackupAt', null);
  const persisted = await isPersisted();
  // 雲端模式下，看看這支手機裡有沒有還沒搬上去的舊紀錄
  let localCount = 0;
  if (CLOUD_ENABLED) { try { localCount = (await LocalDB.allRecords()).length; } catch (e) { localCount = 0; } }
  const migratedAt = CLOUD_ENABLED ? await LocalDB.getSetting('migratedAt', null) : null;
  const shareCard = CLOUD_ENABLED ? await shareCardHtml() : '';
  app.className = '';
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/" aria-label="返回">${ICON.back}</a>
      <h1>設定</h1>
    </div>
    ${CLOUD_ENABLED ? `<div class="card">
      <div class="bold">雲端帳號</div>
      <div class="muted">已登入 ${esc(CloudDB.currentEmail())}，紀錄和照片都存在雲端，換手機只要登入同一個帳號就能看到。目前共 ${all.length} 則紀錄。</div>
      <button class="btn small secondary" id="logout">登出</button>
    </div>
    ${localCount ? `<div class="card" style="background:var(--progress-bg);border-color:transparent">
      <div class="bold" style="color:var(--progress-ink)">把這支手機裡的紀錄搬上雲端</div>
      <div class="small" style="color:var(--progress-ink)">這支手機裡還有 ${localCount} 則以前存的紀錄。${migratedAt ? `上次搬的時間是 ${daysAgo(migratedAt) === 0 ? '今天' : daysAgo(migratedAt) + ' 天前'}，再搬一次也不會重複。` : '搬上去之後，手機裡的也會留著當備份。'}</div>
      <button class="btn small" id="migrate">搬上雲端</button>
    </div>` : ''}` : ''}
    ${shareCard}
    <div class="card">
      <div class="bold">備份</div>
      ${CLOUD_ENABLED
        ? '<div class="muted">資料已經在雲端了，想多一份保險的話，也可以匯出備份存起來。</div>'
        : `<div class="muted">紀錄和照片只存在這支手機的瀏覽器裡。清除瀏覽器資料或換手機前，記得先匯出備份。目前共 ${all.length} 則紀錄。</div>
      <div class="small">${lastBackup ? `上次備份：${daysAgo(lastBackup) === 0 ? '今天' : daysAgo(lastBackup) + ' 天前'}` : '還沒有備份過'}</div>
      <div class="small" style="color:${persisted ? 'var(--resolved-ink)' : 'var(--muted)'}">${persisted ? '瀏覽器已同意不自動清除這裡的資料。' : '瀏覽器還沒同意「不自動清除」，請加到主畫面後從主畫面打開，並記得定期備份。'}</div>`}
      <div class="btn-row">
        <button class="btn small" id="export">匯出還原用備份</button>
        <label class="btn small secondary" style="cursor:pointer">匯入備份<input type="file" accept="application/json,.json" class="visually-hidden" id="import"></label>
      </div>
      <div class="small muted">還原用備份是 .json 檔，打開會是看不懂的文字，這是正常的，只要用「匯入備份」就能還原。</div>
    </div>
    <div class="card">
      <div class="bold">匯出閱讀版</div>
      <div class="muted">產生一個網頁檔，點開就能像相簿一樣瀏覽所有紀錄和照片，也可以列印或存成 PDF。閱讀版不能用來還原。</div>
      <button class="btn small secondary" id="export-read">匯出閱讀版</button>
    </div>
    <div class="card">
      <div class="bold">吵架議題分類</div>
      <div class="chips">${cats.map((c) => `<span class="chip" style="display:inline-flex;align-items:center;gap:6px">${esc(c)}<button data-rm-cat="${esc(c)}" aria-label="刪除 ${esc(c)}" style="border:none;background:none;padding:0;display:flex">${ICON.x}</button></span>`).join('')}</div>
      <div class="row"><input id="new-cat" class="input grow" placeholder="新增分類"><button class="btn small" id="add-cat">加入</button></div>
    </div>
    <div class="card">
      <div class="bold" style="color:#9B2C1F">清除所有資料</div>
      <div class="muted">${CLOUD_ENABLED ? '會刪掉雲端上你所有的紀錄和照片，沒辦法復原。' : '會刪掉這支手機上所有紀錄和照片，沒辦法復原。'}</div>
      <button class="btn small danger" id="wipe">全部清除</button>
    </div>
  `;

  if (CLOUD_ENABLED) bindShareCard();
  document.getElementById('export').addEventListener('click', async () => {
    toast('準備備份中…');
    const photos = await DB.allPhotos();
    const data = {
      app: 'couple-diary', version: 1, exportedAt: new Date().toISOString(),
      records: await DB.allRecords(),
      categories: await getCategories(),
      photos: await Promise.all(photos.map(async (p) => ({ id: p.id, recordId: p.recordId, data: await blobToDataUrl(p.blob) }))),
    };
    downloadFile(new Blob([JSON.stringify(data)], { type: 'application/json' }), `our-records-RESTORE-backup-${today()}.json`);
    await DB.setSetting('lastBackupAt', Date.now());
    setTimeout(viewSettings, 500);
  });

  document.getElementById('export-read').addEventListener('click', async () => {
    toast('製作閱讀版中…');
    const html = await buildReadableExport();
    downloadFile(new Blob([html], { type: 'text/html' }), `our-records-READ-${today()}.html`);
  });

  document.getElementById('import').addEventListener('change', async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      checkBackup(data);
      if (!confirm(`要匯入 ${data.records.length} 則紀錄嗎？同一則紀錄會被備份裡的版本取代。`)) return;
      for (const p of data.photos || []) await DB.putPhoto({ id: p.id, recordId: p.recordId, blob: await dataUrlToBlob(p.data), createdAt: Date.now() });
      for (const r of data.records) await DB.putRecord(r);
      if (Array.isArray(data.categories)) {
        const merged = [...new Set([...(await getCategories()), ...data.categories])];
        await DB.setSetting('categories', merged);
      }
      toast('匯入完成');
      viewSettings();
    } catch (e) {
      toast(e.message || '匯入失敗');
    }
  });

  const addCat = async () => {
    const name = document.getElementById('new-cat').value.trim();
    if (!name || cats.includes(name)) return;
    cats.push(name);
    await DB.setSetting('categories', cats);
    viewSettings();
  };
  document.getElementById('add-cat').addEventListener('click', addCat);
  document.getElementById('new-cat').addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.isComposing) addCat(); });
  app.querySelectorAll('[data-rm-cat]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm(`刪除分類「${b.dataset.rmCat}」？已經用這個分類的議題不會受影響。`)) return;
    await DB.setSetting('categories', cats.filter((c) => c !== b.dataset.rmCat));
    viewSettings();
  }));
  const logout = document.getElementById('logout');
  if (logout) logout.addEventListener('click', async () => {
    if (!confirm('要登出嗎？雲端的資料不會不見，之後登入就能看到。')) return;
    await CloudDB.signOut();
    photoUrlCache.clear();
    go('#/login');
  });
  const migrate = document.getElementById('migrate');
  if (migrate) migrate.addEventListener('click', async () => {
    migrate.disabled = true;
    try {
      const records = await LocalDB.allRecords();
      const photos = await LocalDB.allPhotos();
      let done = 0;
      for (const p of photos) {
        await CloudDB.putPhoto(p);
        migrate.textContent = `搬照片中… ${++done} / ${photos.length}`;
      }
      done = 0;
      for (const r of records) {
        await CloudDB.putRecord(r);
        migrate.textContent = `搬紀錄中… ${++done} / ${records.length}`;
      }
      const localCats = await LocalDB.getSetting('categories', null);
      if (localCats) await CloudDB.setSetting('categories', [...new Set([...(await getCategories()), ...localCats])]);
      await LocalDB.setSetting('migratedAt', Date.now());
      toast(`已搬上雲端：${records.length} 則紀錄、${photos.length} 張照片`);
      viewSettings();
    } catch (e) {
      migrate.disabled = false;
      migrate.textContent = '再試一次';
      toast('搬移失敗：' + e.message);
    }
  });
  document.getElementById('wipe').addEventListener('click', async () => {
    if (!confirm('真的要清除所有紀錄和照片嗎？')) return;
    if (!confirm('再確認一次：清除後無法復原。')) return;
    await DB.clearAll();
    photoUrlCache.clear();
    toast('已清除');
    go('#/');
  });
}

// ---------- 另一半模式 ----------
async function viewPartnerHome() {
  const info = CloudDB.partnerInfo();
  const all = await DB.allRecords();
  const count = (t) => all.filter((r) => r.type === t).length;
  const fights = all.filter((r) => r.type === 'fight');
  const st = (s) => fights.filter((f) => (f.status || 'open') === s).length;
  const recent = all.slice().sort(byDateDesc).slice(0, 5);
  const tasks = await CloudDB.partnerTasks();
  const todo = tasks.filter((t) => !t.submission || t.submission.status !== 'pending').length;

  const typeCard = (type) => `<a class="card ${TYPES[type].theme}" href="#/list/${type}">
      <div class="row between"><div class="bold" style="color:var(--accent)">${TYPES[type].label}</div>
      <div class="count"><b>${count(type)}</b> 則</div></div>
    </a>`;

  app.innerHTML = `
    <div class="row between">
      <div>
        <div class="hello">嗨，${esc(info.name)}</div>
        <h1 class="title-xl">${esc(ownerName())}的紀錄</h1>
      </div>
      <a class="icon-btn" href="#/settings" aria-label="設定">${ICON.gear}</a>
    </div>
    ${tasks.length ? `<a class="card" href="#/tasks" style="background:var(--lock-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--lock)">${todo ? `有 ${todo} 個任務可以解鎖` : '任務都送出了'}</div>
      <div class="small" style="color:var(--lock)">${todo ? `完成任務、${esc(ownerName())}確認之後，就能看到上鎖的紀錄。` : `等${esc(ownerName())}確認中。`}</div>
    </a>` : ''}
    ${typeCard('happy')}
    ${typeCard('cloud')}
    <a class="card theme-fight" href="#/fights">
      <div class="bold" style="color:var(--fight)">吵架議題</div>
      <div class="status-grid">
        <div class="status-tile st-open"><b>${st('open')}</b><span class="small">未解決</span></div>
        <div class="status-tile st-progress"><b>${st('progress')}</b><span class="small">處理中</span></div>
        <div class="status-tile st-resolved"><b>${st('resolved')}</b><span class="small">已解決</span></div>
      </div>
    </a>
    <div class="section-title">最近分享的紀錄</div>
    <div class="list" id="recent">${recent.length ? '' : `<div class="empty">${esc(ownerName())}還沒有分享紀錄給你</div>`}</div>
  `;
  const box = document.getElementById('recent');
  for (const r of recent) box.appendChild(await listItem(r));
}

async function viewPartnerTasks() {
  const tasks = await CloudDB.partnerTasks();
  app.className = '';
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/" aria-label="返回">${ICON.back}</a>
      <h1>解鎖任務</h1>
    </div>
    <div class="muted">完成任務、${esc(ownerName())}按「通過」之後，那則紀錄就會出現在你的列表裡。</div>
    <div class="list">
      ${tasks.map((t) => {
        const s = t.submission && t.submission.status;
        const state = s === 'pending' ? `<span class="badge st-progress">等${esc(ownerName())}確認</span>`
          : s === 'rejected' ? '<span class="badge st-open">被退回了，可以再試一次</span>' : '';
        return `<div class="card ${TYPES[t.type].theme}" style="gap:8px">
          <div class="row between"><span class="small bold" style="color:var(--accent)">${ICON.lockSmall} 一則${TYPES[t.type].label}</span>
          <span class="small muted">${t.task.mode === 'photo' ? '要上傳照片' : '按完成就好'}</span></div>
          <div class="bold" style="font-size:16px">${esc(t.task.text)}</div>
          ${state}
          ${s === 'pending' ? '' : `<a class="btn small" href="#/task/${esc(t.id)}">去完成</a>`}
        </div>`;
      }).join('')}
    </div>
    ${tasks.length ? '' : `<div class="empty">目前沒有任務</div>`}
  `;
}

async function viewPartnerTaskForm(id) {
  const t = (await CloudDB.partnerTasks()).find((x) => x.id === id);
  if (!t) { go('#/tasks'); return; }
  const needPhoto = t.task.mode === 'photo';
  let photo = null;
  app.className = TYPES[t.type].theme;
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/tasks" aria-label="返回">${ICON.back}</a>
      <h1>完成任務</h1>
    </div>
    <div class="card" style="background:var(--lock-bg);border-color:transparent">
      <div class="small bold" style="color:var(--lock)">任務</div>
      <div class="bold" style="font-size:17px">${esc(t.task.text)}</div>
    </div>
    ${needPhoto ? `<div class="field"><div class="label">任務照片（必填）</div>
      <div class="photos" id="task-photo-box">
        <label class="photo-add">${ICON.camera}上傳<input type="file" accept="image/*" class="visually-hidden" id="task-photo"></label>
      </div></div>` : ''}
    <div class="field"><label for="task-note">想說的話（可不填）</label>
      <textarea id="task-note" class="textarea" maxlength="500" placeholder="例如：早午餐超好吃！"></textarea></div>
    <button class="btn" id="task-send">${needPhoto ? '送出給' : '完成了，通知'}${esc(ownerName())}</button>
  `;
  if (needPhoto) {
    document.getElementById('task-photo').addEventListener('change', async (ev) => {
      const f = ev.target.files[0];
      if (!f) return;
      try {
        photo = await compressImage(f);
        const box = document.getElementById('task-photo-box');
        box.querySelector('.photo')?.remove();
        box.insertAdjacentHTML('afterbegin', `<div class="photo"><img src="${URL.createObjectURL(photo)}" alt=""></div>`);
      } catch (e) { toast(e.message); }
    });
  }
  document.getElementById('task-send').addEventListener('click', async (ev) => {
    if (needPhoto && !photo) { toast('這個任務要上傳照片'); return; }
    ev.target.disabled = true;
    try {
      await CloudDB.submitTask(t.id, document.getElementById('task-note').value.trim(), photo);
      toast(`已送出，等${ownerName()}確認`);
      go('#/tasks');
    } catch (e) {
      ev.target.disabled = false;
      toast(e.message);
    }
  });
}

function viewPartnerSettings() {
  const info = CloudDB.partnerInfo();
  app.className = '';
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/" aria-label="返回">${ICON.back}</a>
      <h1>設定</h1>
    </div>
    <div class="card">
      <div class="bold">你的身分</div>
      <div class="muted">你用「${esc(info.name)}」這個名字加入，可以看${esc(ownerName())}分享給你的紀錄和做任務，但不能修改紀錄。</div>
    </div>
    <div class="card">
      <div class="bold">離開</div>
      <div class="muted">離開後這支手機就看不到了，之後要再輸入分享碼和密碼才能回來。</div>
      <button class="btn small danger" id="leave">離開</button>
    </div>
  `;
  document.getElementById('leave').addEventListener('click', async () => {
    if (!confirm('確定要離開嗎？')) return;
    await CloudDB.leaveShare();
    photoUrlCache.clear();
    go('#/join');
  });
}

function viewJoin(notice) {
  app.className = '';
  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;margin-top:40px">
      <div class="thumb" style="width:72px;height:72px;border-radius:99px">${ICON.lock}</div>
      <h1 class="title-xl">用分享碼加入</h1>
      <div class="muted">輸入對方給你的分享碼和密碼，就能看對方分享的紀錄</div>
    </div>
    ${notice ? `<div class="card" style="background:var(--progress-bg);border-color:transparent;color:var(--progress-ink)">${esc(notice)}</div>` : ''}
    <form id="join-form" style="display:flex;flex-direction:column;gap:14px">
      <div class="field"><label for="j-code">分享碼</label>
        <input id="j-code" class="input" autocapitalize="characters" autocomplete="off" required style="letter-spacing:4px;text-transform:uppercase"></div>
      <div class="field"><label for="j-pass">密碼</label>
        <input id="j-pass" class="input" type="password" autocomplete="off" required></div>
      <div class="field"><label for="j-name">你的名字</label>
        <input id="j-name" class="input" maxlength="20" required placeholder="對方會看到這個名字"></div>
      <button class="btn" type="submit" id="join-btn">加入</button>
    </form>
    <div id="join-msg" class="muted" style="text-align:center"></div>
    <a class="btn secondary small" href="#/login" id="to-login">我是紀錄的主人，去登入</a>
  `;
  document.getElementById('to-login').addEventListener('click', async (ev) => {
    // 臨時帳號登出，才會回到登入畫面
    if (CloudDB.isSignedIn() && CloudDB.isAnonymous()) { ev.preventDefault(); await CloudDB.signOut(); go('#/login'); route(); }
  });
  document.getElementById('join-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = document.getElementById('join-btn');
    const msg = document.getElementById('join-msg');
    btn.disabled = true;
    msg.textContent = '';
    try {
      await CloudDB.joinWithCode(
        document.getElementById('j-code').value.trim().toUpperCase(),
        document.getElementById('j-pass').value,
        document.getElementById('j-name').value.trim(),
      );
      go('#/');
      route();
    } catch (e) {
      btn.disabled = false;
      msg.textContent = /anonymous sign-ins are disabled|signups not allowed/i.test(e.message)
        ? '對方的 App 還沒開放分享碼加入，請對方到 Supabase 開啟「Allow anonymous sign-ins」。'
        : e.message;
    }
  });
}

// ---------- 設定：分享給另一半（紀錄主人） ----------
async function shareCardHtml() {
  let share = null;
  let partners = [];
  try {
    share = await CloudDB.getShare();
    if (share) partners = await CloudDB.listPartners();
  } catch (e) {
    return `<div class="card"><div class="bold">分享給另一半</div>
      <div class="muted">要先到 Supabase 的 SQL Editor 重新貼上最新的 supabase/schema.sql 並按 Run，才能使用分享碼。</div></div>`;
  }
  if (!share) {
    return `<div class="card" id="share-card">
      <div class="bold">分享給另一半</div>
      <div class="muted">產生分享碼和密碼給對方，對方就能看你「給對方看」和任務解鎖後的紀錄，也能做任務，但不能修改任何東西。</div>
      <div class="field"><label for="s-name">你的名字（對方會看到）</label><input id="s-name" class="input" maxlength="20"></div>
      <div class="field"><label for="s-pass">分享密碼（至少 6 個字，不要用你的登入密碼）</label><input id="s-pass" class="input" type="password" autocomplete="new-password" minlength="6"></div>
      <button class="btn small" id="s-create">產生分享碼</button>
    </div>`;
  }
  return `<div class="card" id="share-card">
    <div class="bold">分享給另一半</div>
    <div class="muted">把網址、分享碼和密碼告訴對方。對方打開網址後按「用分享碼加入」。</div>
    <div class="share-code">${esc(share.code)}</div>
    <button class="btn small secondary" id="s-copy">複製邀請文字（不含密碼）</button>
    <div class="field"><label for="s-name">你的名字（對方會看到）</label>
      <div class="row"><input id="s-name" class="input grow" maxlength="20" value="${esc(share.owner_name)}"><button class="btn small" id="s-save-name">儲存</button></div></div>
    <div class="field"><label for="s-pass">改分享密碼</label>
      <div class="row"><input id="s-pass" class="input grow" type="password" autocomplete="new-password" minlength="6" placeholder="新密碼"><button class="btn small" id="s-save-pass">更改</button></div></div>
    <div class="field"><div class="label">已加入的人</div>
      ${partners.length ? partners.map((p) => `<div class="row between"><span>${esc(p.name)}<span class="muted small">・${shortDate(p.joined_at.slice(0, 10))} 加入</span></span>
        <button class="btn small secondary" data-rm-partner="${esc(p.uid)}" data-name="${esc(p.name)}">移除</button></div>`).join('') : '<div class="muted">還沒有人加入</div>'}
    </div>
    <div class="btn-row">
      <button class="btn small secondary" id="s-renew">換新分享碼</button>
      <button class="btn small danger" id="s-stop">停止分享</button>
    </div>
  </div>`;
}

function bindShareCard() {
  const $ = (id) => document.getElementById(id);
  const saveWithNewCode = async (password, name) => {
    // 分享碼剛好重複時換一組再試
    for (let i = 0; i < 3; i++) {
      try { await CloudDB.saveShare(newShareCode(), password, name); return; } catch (e) {
        if (!/duplicate|unique/i.test(e.message)) throw e;
      }
    }
    throw new Error('產生分享碼失敗，請再試一次');
  };
  if ($('s-create')) $('s-create').addEventListener('click', async () => {
    const name = $('s-name').value.trim();
    const pass = $('s-pass').value;
    if (!name) { toast('請填你的名字'); return; }
    if (pass.length < 6) { toast('密碼至少 6 個字'); return; }
    await saveWithNewCode(pass, name);
    toast('分享碼產生好了');
    viewSettings();
  });
  if ($('s-copy')) $('s-copy').addEventListener('click', async () => {
    const code = document.querySelector('.share-code').textContent;
    const text = `打開 ${location.origin + location.pathname}，按「用分享碼加入」，分享碼是 ${code}，密碼我另外告訴你。`;
    try { await navigator.clipboard.writeText(text); toast('已複製'); } catch (e) { prompt('複製下面這段文字', text); }
  });
  if ($('s-save-name')) $('s-save-name').addEventListener('click', async () => {
    const name = $('s-name').value.trim();
    if (!name) { toast('請填你的名字'); return; }
    await CloudDB.saveShare(document.querySelector('.share-code').textContent, null, name);
    toast('已儲存');
  });
  if ($('s-save-pass')) $('s-save-pass').addEventListener('click', async () => {
    const pass = $('s-pass').value;
    if (pass.length < 6) { toast('密碼至少 6 個字'); return; }
    await CloudDB.saveShare(document.querySelector('.share-code').textContent, pass, $('s-name').value.trim());
    $('s-pass').value = '';
    toast('密碼已更改，已加入的人不受影響');
  });
  if ($('s-renew')) $('s-renew').addEventListener('click', async () => {
    if (!confirm('換一組新的分享碼？舊的分享碼就不能再用來加入，已加入的人不受影響。')) return;
    await saveWithNewCode(null, $('s-name').value.trim());
    viewSettings();
  });
  if ($('s-stop')) $('s-stop').addEventListener('click', async () => {
    if (!confirm('停止分享後，所有已加入的人都會馬上看不到你的紀錄。確定嗎？')) return;
    await CloudDB.deleteShare();
    toast('已停止分享');
    viewSettings();
  });
  document.querySelectorAll('[data-rm-partner]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm(`移除「${b.dataset.name}」？對方會馬上看不到你的紀錄。`)) return;
    await CloudDB.removePartner(b.dataset.rmPartner);
    viewSettings();
  }));
}

// ---------- 登入（雲端模式） ----------
function viewLogin(mode = 'signin') {
  app.className = '';
  const isUp = mode === 'signup';
  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;margin-top:40px">
      <div class="thumb" style="width:72px;height:72px;border-radius:99px">${ICON.heart}</div>
      <h1 class="title-xl">我們的紀錄</h1>
      <div class="muted">${isUp ? '建立帳號，紀錄就會存在雲端' : '登入你的帳號'}</div>
    </div>
    <button class="btn secondary" id="google-btn" style="gap:10px">
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>
      用 Google 登入
    </button>
    <div class="muted" style="text-align:center">或用 Email</div>
    <form id="login-form" style="display:flex;flex-direction:column;gap:14px">
      <div class="field"><label for="email">Email</label>
        <input id="email" class="input" type="email" autocomplete="email" required></div>
      <div class="field"><label for="password">密碼${isUp ? '（至少 6 個字）' : ''}</label>
        <input id="password" class="input" type="password" autocomplete="${isUp ? 'new-password' : 'current-password'}" minlength="6" required></div>
      <button class="btn" type="submit" id="login-btn">${isUp ? '建立帳號' : '登入'}</button>
    </form>
    <div id="login-msg" class="muted" style="text-align:center"></div>
    <button class="btn secondary small" id="switch">${isUp ? '已經有帳號？登入' : '第一次使用？建立帳號'}</button>
    <a class="btn secondary small" href="#/join">我是另一半，用分享碼加入</a>
  `;
  document.getElementById('switch').addEventListener('click', () => viewLogin(isUp ? 'signin' : 'signup'));
  document.getElementById('google-btn').addEventListener('click', async () => {
    try { await CloudDB.signInWithGoogle(); } catch (e) {
      document.getElementById('login-msg').textContent = /provider is not enabled|Unsupported provider/i.test(e.message)
        ? 'Google 登入還沒在 Supabase 開啟，先用 Email 登入吧。' : '沒辦法用 Google 登入：' + e.message;
    }
  });
  document.getElementById('login-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('login-btn');
    const msg = document.getElementById('login-msg');
    btn.disabled = true;
    msg.textContent = '';
    try {
      if (isUp) {
        const session = await CloudDB.signUp(email, password);
        if (!session) {
          msg.textContent = '帳號建立好了！請到信箱點確認連結，確認後回到這裡登入。';
          btn.disabled = false;
          viewLoginAfterSignup(email);
          return;
        }
      } else {
        await CloudDB.signIn(email, password);
      }
      go('#/');
      route();
    } catch (e) {
      btn.disabled = false;
      msg.textContent = /invalid login/i.test(e.message) ? 'Email 或密碼不對，再試一次。'
        : /not confirmed/i.test(e.message) ? '這個帳號還沒確認，請先到信箱點確認連結。'
        : '沒辦法完成：' + e.message;
    }
  });
}
function viewLoginAfterSignup(email) {
  viewLogin('signin');
  document.getElementById('email').value = email;
  document.getElementById('login-msg').textContent = '帳號建立好了！請到信箱點確認連結，確認後在這裡登入。';
}

// ---------- 路由 ----------
async function route() {
  const parts = (location.hash.replace(/^#\/?/, '') || '').split('/');
  const [page, arg] = parts;
  app.className = '';
  window.scrollTo(0, 0);
  try {
    if (CLOUD_ENABLED && !CloudDB.isSignedIn()) { renderTabbar(null); if (page === 'join') viewJoin(); else viewLogin(); return; }
    // 臨時帳號但不是（或已經不是）另一半：分享被停止、被移除，或加入沒成功
    if (CLOUD_ENABLED && CloudDB.isAnonymous() && !isPartner()) {
      renderTabbar(null);
      viewJoin(page === 'join' ? '' : '目前沒有閱讀權限，可能是分享已經停止或被移除了。請再輸入一次分享碼和密碼。');
      return;
    }
    if (page === 'login' || page === 'join') { go('#/'); return; }
    if (isPartner()) {
      if (!page) { renderTabbar('home'); await viewPartnerHome(); }
      else if (page === 'list' && TYPES[arg] && arg !== 'fight') { renderTabbar(arg); await viewList(arg); }
      else if (page === 'fights') { renderTabbar('fight'); await viewFights(); }
      else if (page === 'view') { renderTabbar(null); await viewDetail(arg); }
      else if (page === 'tasks') { renderTabbar('tasks'); await viewPartnerTasks(); }
      else if (page === 'task') { renderTabbar(null); await viewPartnerTaskForm(arg); }
      else if (page === 'settings') { renderTabbar(null); viewPartnerSettings(); }
      else go('#/');
      return;
    }
    if (!page) { renderTabbar('home'); await viewHome(); }
    else if (page === 'list' && TYPES[arg] && arg !== 'fight') { renderTabbar(arg); await viewList(arg); }
    else if (page === 'fights') { renderTabbar('fight'); await viewFights(); }
    else if (page === 'view') { renderTabbar(null); await viewDetail(arg); }
    else if (page === 'new') { renderTabbar(null); await viewForm('new', arg); }
    else if (page === 'edit') { renderTabbar(null); await viewForm('edit', arg); }
    else if (page === 'settings') { renderTabbar(null); await viewSettings(); }
    else go('#/');
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="empty">出了一點問題：${esc(e.message)}<a class="btn small" href="#/">回首頁</a></div>`;
  }
}

// 向瀏覽器申請「不要自動清除這個網站的資料」
async function isPersisted() {
  try { return !!(navigator.storage && navigator.storage.persisted && await navigator.storage.persisted()); } catch (e) { return false; }
}
async function requestPersist() {
  try {
    if (navigator.storage && navigator.storage.persist && !(await isPersisted())) await navigator.storage.persist();
  } catch (e) { /* 不支援的瀏覽器就略過 */ }
}

// 沒接住的錯誤（例如雲端連不上）用提示告訴使用者
window.addEventListener('unhandledrejection', (ev) => {
  toast((ev.reason && ev.reason.message) || '出了一點問題，請再試一次');
});

window.addEventListener('hashchange', route);
requestPersist();
(async () => {
  if (CLOUD_ENABLED) {
    try { await CloudDB.loadSession(); } catch (e) { toast('連不上雲端：' + e.message); }
  }
  route();
})();
