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
// 各欄位的上限：畫面上擋，雲端資料庫也有對應的檢查
const LIMITS = {
  name: 20, title: 60, description: 2000, fightText: 1000, resolution: 500, followUp: 300, followUpsPerFight: 100, reflection: 500, reflectionsPerRecord: 50,
  tag: 12, tagsPerRecord: 10, photosPerRecord: 9, photoFileMB: 20, category: 12, categories: 30, task: 100, taskNote: 500,
};
const BACKUP_REMIND_DAYS = 14;
const CLOUD_BACKUP_REMIND_DAYS = 30;

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
// 日期一律要是 2026-09-26 這種格式，其他內容（例如被塞進的 HTML）都當作沒有日期
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function shortDate(iso) {
  if (!DATE_RE.test(iso || '')) return '';
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}`;
}
function longDate(iso) {
  if (!DATE_RE.test(iso || '')) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const w = '日一二三四五六'[new Date(y, m - 1, d).getDay()];
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
// 按鈕處理中先停用，避免連點；失敗時說清楚並恢復按鈕讓人重試
async function withBusy(btn, label, fn) {
  if (!btn || btn.disabled) return;
  const old = btn.textContent;
  btn.disabled = true;
  if (label) btn.textContent = label;
  try {
    await fn();
  } catch (e) {
    toast('沒有成功，請再試一次：' + (e.message || '連線問題'));
  } finally {
    if (document.body.contains(btn)) { btn.disabled = false; btn.textContent = old; }
  }
}
// 改一則紀錄時先拿最新的版本再改，兩支手機同時加後續也不會互相蓋掉
async function updateRecord(id, mutate) {
  const latest = await DB.getRecord(id);
  if (!latest) throw new Error('找不到這則紀錄，可能已經被刪除');
  await mutate(latest);
  latest.updatedAt = Date.now();
  await DB.putRecord(latest);
  return latest;
}
// 另一半看得到的小提示：最近 7 天剛解鎖、內容被改過
const JUST_DAYS = 7;
const justUnlocked = (r) => r.visibility === 'task' && r.unlocked && r.unlockedAt && Date.now() - r.unlockedAt < JUST_DAYS * 86400000;
const RECORD_VERSION = 1; // 紀錄的資料格式版本，之後改格式時用來判斷要不要轉換
// LINE、IG、FB 等 App 內建的瀏覽器：資料和 Safari／Chrome 分開，Google 登入也會被擋
const IN_APP = /Line\/|FBAN|FBAV|Instagram|MicroMessenger/i.test(navigator.userAgent);
function inAppNotice() {
  if (!IN_APP) return '';
  return `<div class="card" style="background:var(--open-bg);border-color:transparent;gap:4px">
    <div class="bold" style="color:var(--open-ink)">請改用 Safari 或 Chrome 打開</div>
    <div class="small" style="color:var(--open-ink)">你現在是在 LINE（或其他 App）裡面打開的。這裡存的資料之後在瀏覽器看不到，也不能用 Google 登入。請點右上角的「⋯」，選「用瀏覽器開啟」。</div>
  </div>`;
}
// 新紀錄預設誰可以看：美好時刻給對方看；烏雲和吵架常在氣頭上寫，預設上鎖
const defaultVisibility = (type) => (type === 'happy' ? 'shared' : 'locked');
// 另一半模式：用分享碼加入的人
function isPartner() { return CLOUD_ENABLED && CloudDB.isPartner(); }
// 試用中：有雲端設定，但這支手機還沒登入過帳號（登入過一次之後，登出就回到登入畫面）
function isGuest() { return CLOUD_ENABLED && !CloudDB.isSignedIn(); }
async function hasAccountHere() { return !!(await LocalDB.getSetting('hasAccount', false)); }
function ownerName() { return (isPartner() && CloudDB.partnerInfo().owner_name) || '對方'; }
function newShareCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((b) => SHARE_CODE_CHARS[b % SHARE_CODE_CHARS.length]).join('');
}
function byDateDesc(a, b) {
  return (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0);
}
// 每種類型依時間先後編號：第 1 則、第 2 則……（預設圖上的 No.）
// 編號規則：新增時給固定號碼（這個類型用過的最大號 +1，刪掉的號碼不會再用），
// 之後改日期、改內容都不會變；舊紀錄沒有號碼時才依日期暫時計算。
function numberOf(rec, all) {
  if (rec.no) return rec.no;
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
// 列表、首頁用小圖：雲端版先抓 t/ 裡的小圖，舊照片沒有小圖時用原圖，並順手補一張
const thumbUrlCache = new Map();
const THUMB_SIDE = 360;
async function thumbUrl(id) {
  if (!usingCloud()) return photoUrl(id);
  if (thumbUrlCache.has(id)) return thumbUrlCache.get(id);
  let t = await CloudDB.getThumb(id);
  if (!t) {
    const p = await DB.getPhoto(id);
    if (!p) return null;
    if (!photoUrlCache.has(id)) photoUrlCache.set(id, URL.createObjectURL(p.blob));
    if (!isPartner()) {
      try { await CloudDB.putThumb(id, await compressImage(p.blob, THUMB_SIDE, 0.75)); } catch (e) { /* 補小圖失敗沒關係，下次再補 */ }
    }
    return photoUrlCache.get(id);
  }
  const url = URL.createObjectURL(t.blob);
  thumbUrlCache.set(id, url);
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

// 你和伴侶的名字（沒填時用「我」和「對方」）
let NAMES = { me: '', partner: '' };
async function loadNames() {
  try { NAMES = { me: '', partner: '', ...(await DB.getSetting('names', {})) }; } catch (e) { NAMES = { me: '', partner: '' }; }
}
const myName = () => NAMES.me || '我';
// 在一起的第幾天（在一起那天算第 1 天）
function togetherDays() {
  if (!NAMES.since || !dateOk(NAMES.since)) return 0;
  return Math.floor((Date.parse(today()) - Date.parse(NAMES.since)) / 86400000) + 1;
}
const partnerName = () => NAMES.partner || '對方';
// 可見度的說明用伴侶的名字，例如「給小明看」
const visLabel = (k) => (k === 'shared' && NAMES.partner ? `給${NAMES.partner}看` : VISIBILITY[k]);
// 日期要在 1970 年到今天之間
const dateOk = (d) => DATE_RE.test(d) && d >= '1970-01-01' && d <= today();
const diaryTitle = () => (NAMES.me && NAMES.partner ? `${NAMES.me}和${NAMES.partner}的紀錄` : '我們的紀錄');

// 刪除的紀錄先放「最近刪除」30 天，畫面上都只算還在的紀錄
const TRASH_DAYS = 30;
const liveRecords = async () => (await DB.allRecords()).filter((r) => !r.deletedAt);

// 永久刪除：連照片和對方送來的任務照片一起刪
async function purgeRecord(r) {
  for (const pid of r.photoIds || []) { try { await DB.deletePhoto(pid); } catch (e) { /* 照片可能已經不在了 */ } photoUrlCache.delete(pid); thumbUrlCache.delete(pid); }
  if (usingCloud()) {
    try { for (const sub of await CloudDB.submissions({ recordId: r.id })) if (sub.photo_path) await CloudDB.removeTaskPhoto(sub.photo_path); } catch (e) { /* 舊版資料表沒有任務，略過 */ }
  }
  await DB.deleteRecord(r.id);
}
// 超過 30 天的自動清掉（每次打開只檢查一次）
let trashChecked = false;
async function purgeOldTrash() {
  if (trashChecked || isPartner()) return;
  trashChecked = true;
  try {
    for (const r of await DB.allRecords()) if (r.deletedAt && Date.now() - r.deletedAt > TRASH_DAYS * 86400000) await purgeRecord(r);
  } catch (e) { trashChecked = false; }
}
// 救回來：號碼被別則用走（重新編號過）的話拿新號碼
async function restoreRecord(id) {
  const live = await liveRecords();
  await updateRecord(id, async (r) => {
    delete r.deletedAt;
    if (!r.no || live.some((x) => x.type === r.type && x.no === r.no)) r.no = await nextNumber(r.type);
  });
}

async function nextNumber(type) {
  const all = await DB.allRecords();
  const used = await DB.getSetting('lastNo', {});
  const max = Math.max(used[type] || 0, ...all.filter((r) => r.type === type).map((r) => r.no || 0));
  await DB.setSetting('lastNo', { ...used, [type]: max + 1 });
  return max + 1;
}
const byDateAsc = (a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || 0) - (b.createdAt || 0);
// 沒有號碼的舊紀錄：依日期補上號碼（接在現有最大號後面），每次開啟只檢查一次
let numbersChecked = false;
async function ensureNumbers() {
  if (numbersChecked || isPartner()) return;
  numbersChecked = true;
  const all = await DB.allRecords();
  const missing = all.filter((r) => !r.no);
  if (!missing.length) return;
  const used = await DB.getSetting('lastNo', {});
  const next = { ...used };
  for (const type of Object.keys(TYPES)) {
    let n = Math.max(used[type] || 0, ...all.filter((r) => r.type === type).map((r) => r.no || 0));
    for (const r of missing.filter((x) => x.type === type).sort(byDateAsc)) { r.no = ++n; await DB.putRecord(r); }
    next[type] = n;
  }
  await DB.setSetting('lastNo', next);
}
// 手動重新編號：每個類型依日期重新從 1 排到 N
async function renumberAll() {
  const all = await liveRecords();
  const next = {};
  for (const type of Object.keys(TYPES)) {
    let n = 0;
    for (const r of all.filter((x) => x.type === type).sort(byDateAsc)) { n += 1; if (r.no !== n) { r.no = n; await DB.putRecord(r); } }
    next[type] = n;
  }
  await DB.setSetting('lastNo', next);
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
  const all = await liveRecords();
  const count = (t) => all.filter((r) => r.type === t).length;
  const fights = all.filter((r) => r.type === 'fight');
  const st = (s) => fights.filter((f) => (f.status || 'open') === s).length;
  const recent = all.slice().sort(byDateDesc).slice(0, 5);
  const lastBackup = await DB.getSetting('lastBackupAt', null);
  // 手機版 14 天提醒一次；雲端版免費方案沒有自動備份，30 天提醒一次
  const remindDays = usingCloud() ? CLOUD_BACKUP_REMIND_DAYS : BACKUP_REMIND_DAYS;
  const needBackup = all.length > 0 && (!lastBackup || Date.now() - lastBackup > remindDays * 86400000);
  const askNames = !NAMES.me && !NAMES.partner && !(await DB.getSetting('namesSkipped', false));
  let pending = [];
  if (usingCloud()) { try { pending = (await CloudDB.submissions({ status: 'pending' })).filter((t) => all.some((r) => r.id === t.record_id)); } catch (e) { pending = []; } }
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
        <div class="hello">${NAMES.me ? `嗨，${esc(NAMES.me)}・` : ''}今天是 ${longDate(today())}</div>
        <h1 class="title-xl">${esc(diaryTitle())}</h1>
        ${togetherDays() ? `<div class="small muted">在一起第 ${togetherDays()} 天</div>` : ''}
      </div>
      <a class="icon-btn" href="#/settings" aria-label="設定">${ICON.gear}</a>
    </div>
    ${askNames ? `<div class="card" id="names-card" style="gap:10px">
      <div class="bold">先認識一下你們</div>
      <div class="small muted">填上名字，紀錄裡就會用你們的名字，例如「${'小美'}的想法」。之後也可以在設定頁改。</div>
      <div class="grid2">
        <div class="field"><label for="n-me">你的名字</label><input id="n-me" class="input" maxlength="${LIMITS.name}"></div>
        <div class="field"><label for="n-partner">伴侶的名字</label><input id="n-partner" class="input" maxlength="${LIMITS.name}"></div>
      </div>
      <div class="btn-row"><button class="btn small" id="n-save">儲存</button><button class="btn small secondary" id="n-skip">之後再說</button></div>
    </div>` : ''}
    ${needBackup ? `<a class="card" href="#/settings" style="background:var(--progress-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--progress-ink)">該備份囉</div>
      <div class="small" style="color:var(--progress-ink)">${lastBackup ? `上次備份是 ${daysAgo(lastBackup)} 天前` : '還沒有備份過'}，${usingCloud() ? '雲端免費方案沒有自動備份，' : ''}點這裡到設定頁匯出備份，再存到 iCloud 雲碟或 Google 雲端硬碟。</div>
    </a>` : ''}
    ${isGuest() ? inAppNotice() : ''}
    ${isGuest() ? `<a class="card" href="#/login" style="background:var(--happy-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--happy-dark)">${all.length ? '註冊，把紀錄存到雲端' : '歡迎！直接開始記錄吧'}</div>
      <div class="small" style="color:var(--happy-dark)">${all.length ? `目前 ${all.length} 則紀錄只存在這支手機。` : '不用註冊就能先用，紀錄會先存在這支手機。'}在這支手機註冊或登入後會自動搬上雲端，換手機不會不見，也能分享給另一半。</div>
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
  if (askNames) {
    document.getElementById('n-save').addEventListener('click', async () => {
      const me = document.getElementById('n-me').value.trim();
      const partner = document.getElementById('n-partner').value.trim();
      if (!me || !partner) { toast('兩個名字都填一下'); return; }
      await DB.setSetting('names', { me, partner });
      await loadNames();
      viewHome();
    });
    document.getElementById('n-skip').addEventListener('click', async () => {
      await DB.setSetting('namesSkipped', true);
      document.getElementById('names-card').remove();
    });
  }
  const box = document.getElementById('recent');
  for (const r of recent) box.appendChild(await listItem(r));
}

async function listItem(r) {
  const a = document.createElement('a');
  a.className = `card item ${TYPES[r.type].theme}`;
  a.href = `#/view/${r.id}`;
  let thumb = `<div class="thumb">${r.type === 'happy' ? ICON.heart : r.type === 'cloud' ? ICON.cloud : ICON.bolt}</div>`;
  if (r.photoIds && r.photoIds.length) {
    const url = await thumbUrl(r.photoIds[0]);
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
  const all = await liveRecords();
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
      const url = await thumbUrl(r.photoIds[0]);
      top = url ? `<img class="tile-img" src="${url}" alt="">` : '';
    }
    if (!top) {
      top = `<div class="tile-default">${type === 'happy' ? ICON.bigHeart : ICON.bigCloud}<div class="no">No. ${numberOf(r, all)}</div></div>`;
    }
    const lockNote = isPartner() ? (r.visibility === 'task' ? (justUnlocked(r) ? '剛解鎖！' : '任務解鎖的') : '')
      : r.visibility === 'locked' ? '上鎖・只有你看得到' : r.visibility === 'task' ? (r.unlocked ? '任務已解鎖' : '任務解鎖') : '';
    a.innerHTML = `${top}
      <div class="tile-body">
        <div class="bold" style="font-size:14px">${esc(r.title)}</div>
        <div class="muted small">${shortDate(r.date)} · ${esc((r.emojis || []).join(''))}</div>
        ${(r.tags || []).length ? `<div class="tile-tags">${esc(r.tags.map((t) => '#' + t).join(' '))}</div>` : ''}
        ${(r.reflections || []).length ? `<div class="small muted">💭 ${r.reflections.length} 則反思</div>` : ''}
        ${lockNote ? `<div class="small row" style="color:var(--lock);gap:4px">${ICON.lockSmall}${lockNote}</div>` : ''}
      </div>`;
    grid.appendChild(a);
  }
}

// ---------- 吵架議題列表 ----------
async function viewFights(catFilter, statusFilter) {
  const all = await liveRecords();
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
  if (!r || r.deletedAt) { app.innerHTML = `<div class="empty">${r ? '這則在「最近刪除」裡，可以到設定頁救回來' : '找不到這則紀錄'}<a class="btn small" href="${r ? '#/settings' : '#/'}">${r ? '到設定頁' : '回首頁'}</a></div>`; return; }
  const all = await liveRecords();
  const conf = TYPES[r.type];
  const partner = isPartner();
  const backHref = r.type === 'fight' ? '#/fights' : `#/list/${r.type}`;
  const urls = [];
  for (const pid of r.photoIds || []) { const u = await photoUrl(pid); if (u) urls.push(u); }

  let photos = '';
  if (urls.length) photos = `<div class="detail-photos">${urls.map((u) => `<img src="${u}" alt="">`).join('')}</div>`;
  else if (r.type !== 'fight') photos = `<div class="detail-default">${r.type === 'happy' ? ICON.bigHeart : ICON.bigCloud}<div class="no" style="font-family:'Noto Serif TC',serif">No. ${numberOf(r, all)}</div></div>`;

  const visText = partner ? '' : visLabel(r.visibility || 'shared') + (r.visibility === 'task' && r.unlocked ? '・已解鎖' : '');
  let task = '';
  if (r.visibility === 'task' && r.task && r.task.text) {
    const modeText = r.task.mode === 'photo' ? '要上傳照片' : '按完成就好';
    if (partner) {
      task = `<div class="card" style="background:var(--lock-bg);border-color:transparent"><div class="small bold" style="color:var(--lock)">你完成任務解鎖了這則</div><div>${esc(r.task.text)}</div></div>`;
    } else {
      let subs = [];
      if (usingCloud()) { try { subs = await CloudDB.submissions({ recordId: r.id }); } catch (e) { subs = []; } }
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
        <div class="small" style="color:var(--lock)">${r.unlocked ? '已經解鎖，對方看得到這則。' : usingCloud() ? '對方完成任務、你按「通過」之後，對方就看得到這則。' : '雲端版開啟分享碼後，對方才能做任務。'}</div>
        ${r.unlocked ? '<button class="btn small secondary" id="relock">重新上鎖</button>' : ''}
      </div>${subCards.join('')}`;
    }
  }

  // 烏雲時刻的事後反思：氣頭上寫下的，冷靜之後可以補上新的想法
  let reflectPart = '';
  if (r.type === 'cloud') {
    const rf = r.reflections || [];
    reflectPart = `
      <div class="field"><div class="label">事後反思</div>
        <div class="timeline">
          ${rf.length ? rf.map((f, i) => `<div class="tl-item">
            <div class="tl-rail"><div class="tl-dot"></div>${i < rf.length - 1 ? '<div class="tl-line"></div>' : ''}</div>
            <div class="tl-body"><div class="muted small">${shortDate(f.date)}</div><div class="prose">${esc(f.text)}</div>${partner ? '' : `<button class="tl-del" data-del-rf="${esc(f.id)}">刪除</button>`}</div>
          </div>`).join('') : `<div class="muted">${partner ? '還沒有反思。' : '冷靜下來之後，想法有沒有不一樣？可以隨時回來補寫。'}</div>`}
        </div>
      </div>
      ${partner ? '' : `<div class="field"><label for="rf-text">寫下現在的想法</label>
        <input id="rf-date" class="input" type="date" min="1970-01-01" max="${today()}" value="${today()}" aria-label="反思日期">
        <textarea id="rf-text" class="textarea" maxlength="${LIMITS.reflection}" style="min-height:70px" placeholder="例如：後來想想，他那天其實很累，我也可以先問問他"></textarea>
        <button class="btn small" id="rf-add" style="align-self:flex-start">加入反思</button>
      </div>`}`;
  }

  let fightPart = '';
  if (r.type === 'fight') {
    const s = r.status || 'open';
    const fu = r.followUps || [];
    const myLabel = partner ? `${esc(ownerName())}的想法` : `${esc(myName())}的想法`;
    const theirLabel = partner ? `${esc(CloudDB.partnerInfo().name)}的想法（${esc(ownerName())}寫的）` : `${esc(partnerName())}的想法`;
    fightPart = `
      ${partner
        ? `<div class="field"><div class="label">狀態</div><span class="badge ${STATUS[s].cls}" style="align-self:flex-start">${STATUS[s].label}</span></div>
           ${s === 'resolved' && r.resolution ? `<div class="card"><div class="small bold" style="color:var(--fight)">我們怎麼解決的</div><p class="prose">${esc(r.resolution)}</p></div>` : ''}`
        : `<div class="field"><div class="label">狀態</div>
        <div class="opts cols-3">${Object.entries(STATUS).map(([k, v]) => `<button class="opt ${k === s ? 'on' : ''}" data-status="${k}">${v.label}</button>`).join('')}</div>
      </div>
      ${s === 'resolved' ? `<div class="field"><label for="resolution">我們怎麼解決的</label><textarea id="resolution" class="textarea" maxlength="${LIMITS.resolution}" style="min-height:70px" placeholder="例如：隔週輪流陪家人">${esc(r.resolution || '')}</textarea></div>` : ''}`}
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
        <input id="fu-date" class="input" type="date" min="1970-01-01" max="${today()}" value="${today()}" aria-label="後續日期">
        <div class="row"><input id="fu-text" class="input grow" maxlength="${LIMITS.followUp}" placeholder="發生了什麼新進展？"><button class="btn small" id="fu-add">加入</button></div>
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
        ${r.editedAt ? `<span class="muted small">・${shortDate(new Date(r.editedAt - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10))} 編輯過</span>` : ''}
      </div>
      <h1 style="font-size:24px">${esc(r.title)}</h1>
      <div class="muted">${esc((r.emojis || []).join(' '))}${(r.tags || []).length ? ' · ' + esc(r.tags.map((t) => '#' + t).join(' ')) : ''}</div>
      ${visText ? `<div class="small row" style="color:var(--lock);gap:4px">${r.visibility && r.visibility !== 'shared' ? ICON.lockSmall : ''}${visText}</div>` : ''}
    </div>
    ${photos}
    ${r.description ? `<p class="prose">${esc(r.description)}</p>` : ''}
    ${task}
    ${reflectPart}
    ${fightPart}
    ${partner ? '' : '<button class="btn danger" id="delete" style="margin-top:12px">刪除這則紀錄</button>'}
  `;
  if (partner) return;

  document.getElementById('delete').addEventListener('click', async () => {
    if (!confirm(`要刪除這則嗎？會先移到設定頁的「最近刪除」，${TRASH_DAYS} 天內都可以救回來${usingCloud() ? '，這段時間對方也看不到' : ''}。`)) return;
    await updateRecord(r.id, (x) => { x.deletedAt = Date.now(); });
    toast(`已移到最近刪除，${TRASH_DAYS} 天內可以救回來`);
    go(backHref);
  });

  app.querySelectorAll('[data-approve]').forEach((b) => b.addEventListener('click', () => withBusy(b, '解鎖中…', async () => {
    await CloudDB.reviewSubmission(b.dataset.approve, true);
    toast('已解鎖，對方看得到這則了');
    viewDetail(r.id);
  })));
  app.querySelectorAll('[data-reject]').forEach((b) => b.addEventListener('click', () => {
    if (!confirm('退回這次的任務？對方可以再送一次。')) return;
    withBusy(b, '', async () => {
      await CloudDB.reviewSubmission(b.dataset.reject, false);
      viewDetail(r.id);
    });
  }));
  const relock = document.getElementById('relock');
  if (relock) relock.addEventListener('click', () => {
    if (!confirm('重新上鎖後，對方就看不到這則，要再完成一次任務才能解鎖。')) return;
    withBusy(relock, '', async () => {
      await updateRecord(r.id, (x) => { x.unlocked = false; });
      viewDetail(r.id);
    });
  });

  if (r.type === 'cloud') {
    const rfAdd = document.getElementById('rf-add');
    rfAdd.addEventListener('click', () => {
      const text = document.getElementById('rf-text').value.trim();
      if (!text) { toast('先寫一點內容'); return; }
      const date = document.getElementById('rf-date').value || today();
      if (!dateOk(date)) { toast('日期要在今天以前'); return; }
      withBusy(rfAdd, '加入中…', async () => {
        await updateRecord(r.id, (x) => {
          const list = x.reflections || [];
          if (list.length >= LIMITS.reflectionsPerRecord) throw new Error(`每則最多 ${LIMITS.reflectionsPerRecord} 則反思`);
          x.reflections = list.concat({ id: DB.uid(), date, text }).sort((a, b) => a.date.localeCompare(b.date));
        });
        viewDetail(r.id);
      });
    });
    app.querySelectorAll('[data-del-rf]').forEach((b) => b.addEventListener('click', () => {
      if (!confirm('刪除這則反思？')) return;
      withBusy(b, '', async () => {
        await updateRecord(r.id, (x) => { x.reflections = (x.reflections || []).filter((f) => f.id !== b.dataset.delRf); });
        viewDetail(r.id);
      });
    }));
  }

  if (r.type === 'fight') {
    app.querySelectorAll('[data-status]').forEach((b) => b.addEventListener('click', () => withBusy(b, '', async () => {
      await updateRecord(r.id, (x) => { x.status = b.dataset.status; });
      viewDetail(r.id);
    })));
    const res = document.getElementById('resolution');
    if (res) res.addEventListener('change', async () => {
      try { await updateRecord(r.id, (x) => { x.resolution = res.value.trim(); }); toast('已儲存'); } catch (e) { toast('沒有存成功：' + e.message); }
    });
    const fuAdd = document.getElementById('fu-add');
    fuAdd.addEventListener('click', () => {
      const text = document.getElementById('fu-text').value.trim();
      if (!text) { toast('先寫一點內容'); return; }
      const date = document.getElementById('fu-date').value || today();
      if (!dateOk(date)) { toast('日期要在今天以前'); return; }
      withBusy(fuAdd, '加入中…', async () => {
        await updateRecord(r.id, (x) => {
          const list = x.followUps || [];
          if (list.length >= LIMITS.followUpsPerFight) throw new Error(`每個議題最多 ${LIMITS.followUpsPerFight} 則後續`);
          x.followUps = list.concat({ id: DB.uid(), date, text }).sort((a, b) => a.date.localeCompare(b.date));
          // 第一次加後續時，自動從「未解決」變成「處理中」
          if ((x.status || 'open') === 'open') x.status = 'progress';
        });
        viewDetail(r.id);
      });
    });
    app.querySelectorAll('[data-del-fu]').forEach((b) => b.addEventListener('click', () => {
      if (!confirm('刪除這則後續？')) return;
      withBusy(b, '', async () => {
        await updateRecord(r.id, (x) => { x.followUps = (x.followUps || []).filter((f) => f.id !== b.dataset.delFu); });
        viewDetail(r.id);
      });
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
      photoIds: [], emojis: [], tags: [], visibility: defaultVisibility(type), task: { text: '', mode: 'confirm' },
      category: '', reason: '', myView: '', theirView: '', status: 'open', resolution: '', followUps: [],
    };
  }
  const all = await DB.allRecords();
  const cats = await getCategories();
  const originalType = rec.type;
  const loadedUpdatedAt = rec.updatedAt || 0;
  const contentKey = (x) => JSON.stringify({ ...x, updatedAt: 0, editedAt: 0, v: 0 });
  const loadedContent = contentKey(rec);
  let visTouched = mode === 'edit';
  let dirty = false;
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
      const url = newPhotos.has(pid) ? newPhotos.get(pid).url : await thumbUrl(pid);
      if (url) photoCells.push(`<div class="photo"><img src="${url}" alt=""><button class="remove" data-rm-photo="${esc(pid)}" aria-label="移除照片">${ICON.x}</button></div>`);
    }

    app.innerHTML = `
      <div class="topbar">
        <a class="icon-btn" href="${mode === 'edit' ? '#/view/' + esc(rec.id) : '#/'}" aria-label="取消">${ICON.back}</a>
        <h1 style="font-size:20px;text-align:center">${mode === 'edit' ? '編輯紀錄' : '新增紀錄'}</h1>
        <div style="width:44px"></div>
      </div>
      ${true ? `<div class="seg" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        ${Object.entries(TYPES).map(([k, t]) => `<button class="${k === rec.type ? 'on' : ''}" data-type="${k}">${t.label}</button>`).join('')}
      </div>` : ''}
      <div class="field"><label for="f-title">${rec.type === 'fight' ? '議題' : '標題'}</label>
        <input id="f-title" class="input" value="${esc(rec.title)}" placeholder="${rec.type === 'happy' ? '例如：一起去看海' : rec.type === 'cloud' ? '例如：約好的時間又遲到了' : '例如：回訊息太慢'}" maxlength="${LIMITS.title}"></div>
      <div class="field"><label for="f-date">日期</label>
        <input id="f-date" class="input" type="date" min="1970-01-01" max="${today()}" value="${esc(rec.date)}"></div>
      ${rec.type === 'fight' ? `
        <div class="field"><div class="label">分類</div>
          <div class="chips">
            ${catList.map((c) => `<button class="chip ${c === rec.category ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
            <button class="chip dashed" id="add-cat">＋ 自訂</button>
          </div></div>
        <div class="field"><label for="f-reason">原因</label>
          <textarea id="f-reason" class="textarea" maxlength="${LIMITS.fightText}" style="min-height:70px" placeholder="這次吵架是怎麼開始的？">${esc(rec.reason)}</textarea></div>
        <div class="field"><label for="f-my">${esc(myName())}的想法</label>
          <textarea id="f-my" class="textarea" maxlength="${LIMITS.fightText}" style="min-height:70px">${esc(rec.myView)}</textarea></div>
        <div class="field"><label for="f-their">${esc(partnerName())}的想法</label>
          <textarea id="f-their" class="textarea" maxlength="${LIMITS.fightText}" style="min-height:70px">${esc(rec.theirView)}</textarea></div>
        <div class="field"><div class="label">狀態</div>
          <div class="opts cols-3">${Object.entries(STATUS).map(([k, v]) => `<button class="opt ${k === rec.status ? 'on' : ''}" data-status="${k}">${v.label}</button>`).join('')}</div></div>
      ` : `
        <div class="field"><label for="f-desc">描述</label>
          <textarea id="f-desc" class="textarea" maxlength="${LIMITS.description}" placeholder="發生了什麼？">${esc(rec.description)}</textarea></div>
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
        <input id="f-tag" class="input" maxlength="${LIMITS.tag}" placeholder="輸入新標籤，按 Enter 加入" enterkeyhint="done"></div>
      <div class="field"><div class="label">誰可以看</div>
        <div class="opts cols-3">${Object.entries(VISIBILITY).map(([k, v]) => `<button class="opt ${k === rec.visibility ? 'on' : ''}" data-vis="${k}">${esc(visLabel(k))}</button>`).join('')}</div>
        ${rec.visibility === 'task' ? `
          <label for="f-task" class="muted">對方要完成的任務</label>
          <input id="f-task" class="input" maxlength="${LIMITS.task}" value="${esc(rec.task.text)}" placeholder="例如：帶我去吃早午餐，拍一張合照給我">
          <div class="muted">完成方式</div>
          <div class="opts cols-2">
            <button class="opt ${rec.task.mode !== 'photo' ? 'on' : ''}" data-taskmode="confirm">按「完成」就好</button>
            <button class="opt ${rec.task.mode === 'photo' ? 'on' : ''}" data-taskmode="photo">要上傳照片</button>
          </div>` : ''}
        <div class="muted small">${usingCloud() ? '給對方看：對方用分享碼就看得到。上鎖：只有你看得到。任務解鎖：對方完成任務、你按通過後才看得到。' : (CLOUD_ENABLED ? '這個設定會先記下來；註冊登入並開啟分享碼後，對方就會依這個設定看到內容。' : '現在是單人版，這個設定會先記下來；換成雲端版並開啟分享碼後，對方就會依這個設定看到內容。') + '目前「上鎖」只是標記，拿到這支手機的人還是看得到。'}</div>
      </div>
      <button class="btn" id="save">儲存紀錄</button>
    `;
    bind();
  }

  function rerender() { collect(); render(); }

  function bind() {
    app.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
      collect();
      if (b.dataset.type === rec.type) return;
      if (mode === 'edit' && b.dataset.type !== originalType && !confirm('換成別的類型後，這則會拿到新類型的新編號。確定要換嗎？')) return;
      rec.type = b.dataset.type;
      if (mode === 'new') { rec.emojis = []; rec.tags = []; customEmojis = []; extraTags = []; }
      if (!visTouched) rec.visibility = defaultVisibility(rec.type);
      dirty = true;
      render();
    }));
    app.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { collect(); rec.category = rec.category === b.dataset.cat ? '' : b.dataset.cat; render(); }));
    const addCat = document.getElementById('add-cat');
    if (addCat) addCat.addEventListener('click', async () => {
      const name = (prompt(`新分類的名字（最多 ${LIMITS.category} 個字）`) || '').trim().slice(0, LIMITS.category);
      if (!name) return;
      if (cats.length >= LIMITS.categories) { toast(`分類最多 ${LIMITS.categories} 個`); return; }
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
      if (!/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(seg)) { toast('這裡只能加表情符號，文字可以寫在標籤或描述裡'); return; }
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
      const t = ev.target.value.trim().replace(/[#\s]/g, '').slice(0, LIMITS.tag);
      if (!t) return;
      if (!rec.tags.includes(t) && rec.tags.length >= LIMITS.tagsPerRecord) { toast(`標籤最多 ${LIMITS.tagsPerRecord} 個`); return; }
      collect();
      if (!extraTags.includes(t)) extraTags.push(t);
      if (!rec.tags.includes(t)) rec.tags.push(t);
      render();
    });
    app.querySelectorAll('[data-vis]').forEach((b) => b.addEventListener('click', () => { collect(); rec.visibility = b.dataset.vis; visTouched = true; dirty = true; render(); }));
    // 有改過內容時，按返回要先確認，免得寫一半的長文不見
    app.oninput = () => { dirty = true; };
    app.querySelector('.topbar .icon-btn').addEventListener('click', (ev) => {
      if ((dirty || newPhotos.size) && !confirm('還沒儲存，確定要離開嗎？寫的內容會不見。')) ev.preventDefault();
    });
    app.querySelectorAll('[data-taskmode]').forEach((b) => b.addEventListener('click', () => { collect(); rec.task.mode = b.dataset.taskmode; render(); }));
    document.getElementById('f-photos').addEventListener('change', async (ev) => {
      collect();
      let files = [...ev.target.files];
      if (!files.length) return;
      const room = LIMITS.photosPerRecord - rec.photoIds.length;
      if (room <= 0) { toast(`每則最多 ${LIMITS.photosPerRecord} 張照片`); return; }
      if (files.length > room) { toast(`每則最多 ${LIMITS.photosPerRecord} 張，只加入前 ${room} 張`); files = files.slice(0, room); }
      toast('照片處理中…');
      for (const f of files) {
        try {
          if (f.size > LIMITS.photoFileMB * 1024 * 1024) { toast(`照片超過 ${LIMITS.photoFileMB} MB，換一張試試`); continue; }
          if (f.type && !f.type.startsWith('image/')) { toast('只能選照片'); continue; }
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
    const saveBtn = document.getElementById('save');
    saveBtn.addEventListener('click', () => withBusy(saveBtn, '儲存中…', async () => {
      collect();
      rec.title = rec.title.trim();
      if (!rec.title) { toast(rec.type === 'fight' ? '請填寫議題' : '請填寫標題'); document.getElementById('f-title').focus(); return; }
      if (!rec.date) rec.date = today();
      if (!dateOk(rec.date)) { toast('日期要在 1970 年到今天之間'); return; }
      if (rec.visibility === 'task' && !rec.task.text.trim()) { toast('請填寫解鎖任務'); return; }
      if (mode === 'edit') {
        const latest = await DB.getRecord(rec.id);
        if (latest && (latest.updatedAt || 0) !== loadedUpdatedAt
          && !confirm('這則剛剛在別的裝置改過了。要用你現在的內容覆蓋嗎？按「取消」會重新載入最新的內容。')) {
          viewForm('edit', rec.id);
          return;
        }
        // 解鎖狀態以最新的為準（對方可能剛剛才完成任務）
        if (latest && latest.visibility === 'task' && rec.visibility === 'task') { rec.unlocked = latest.unlocked; rec.unlockedAt = latest.unlockedAt; }
      }
      for (const [id, p] of newPhotos) {
        await DB.putPhoto({ id, blob: p.blob, recordId: rec.id, createdAt: Date.now() });
        if (usingCloud()) { try { await CloudDB.putThumb(id, await compressImage(p.blob, THUMB_SIDE, 0.75)); } catch (e) { /* 之後列表會自動補 */ } }
      }
      for (const id of removedPhotos) { await DB.deletePhoto(id); photoUrlCache.delete(id); thumbUrlCache.delete(id); }
      const now = Date.now();
      if (!rec.no || rec.type !== originalType) rec.no = await nextNumber(rec.type);
      rec.v = RECORD_VERSION;
      if (mode === 'edit' && (contentKey(rec) !== loadedContent || newPhotos.size || removedPhotos.size)) rec.editedAt = Date.now();
      // 改成不是「任務解鎖」時，解鎖狀態就不再保留
      if (rec.visibility !== 'task') rec.unlocked = false;
      rec.createdAt = rec.createdAt || now;
      rec.updatedAt = now;
      await DB.putRecord(rec);
      dirty = false;
      toast('已儲存');
      go(`#/view/${rec.id}`);
    }));
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
    if (r.deletedAt != null && typeof r.deletedAt !== 'number') delete r.deletedAt;
    if (r.date && !DATE_RE.test(r.date)) throw new Error('備份檔內容不對，沒有匯入');
    if (r.reflections && (!Array.isArray(r.reflections) || !r.reflections.every((f) => f && DATE_RE.test(f.date) && SAFE_ID.test(String(f.id))))) throw new Error('備份檔內容不對，沒有匯入');
    if (r.followUps && (!Array.isArray(r.followUps) || !r.followUps.every((f) => f && DATE_RE.test(f.date) && SAFE_ID.test(String(f.id))))) throw new Error('備份檔內容不對，沒有匯入');
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
async function buildReadableExport(onlyShared = false) {
  const all = (await liveRecords()).filter((r) => !onlyShared || r.visibility === 'shared' || (r.visibility === 'task' && r.unlocked)).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || 0) - (b.createdAt || 0));
  const photoData = {};
  // 只放要匯出的紀錄用到的照片
  for (const pid of all.flatMap((r) => r.photoIds || [])) {
    const ph = await DB.getPhoto(pid);
    if (ph) photoData[pid] = await blobToDataUrl(ph.blob);
  }
  const colors = { happy: '#A33A52', cloud: '#8A5A12', fight: '#3E4C8A' };

  const card = (r, i) => {
    const imgs = (r.photoIds || []).map((id) => photoData[id]).filter(Boolean);
    const vis = r.visibility && r.visibility !== 'shared' ? `<span class="lock">${VISIBILITY[r.visibility]}</span>` : '';
    let fight = '';
    if (r.type === 'fight') {
      const st = STATUS[r.status || 'open'].label;
      fight = `<div class="meta">分類：${esc(r.category || '未分類')}・狀態：${st}</div>
        ${r.reason ? `<h4>原因</h4><p>${esc(r.reason)}</p>` : ''}
        ${r.myView ? `<h4>${esc(myName())}的想法</h4><p>${esc(r.myView)}</p>` : ''}
        ${r.theirView ? `<h4>${esc(partnerName())}的想法</h4><p>${esc(r.theirView)}</p>` : ''}
        ${r.resolution ? `<h4>我們怎麼解決的</h4><p>${esc(r.resolution)}</p>` : ''}
        ${(r.followUps || []).length ? `<h4>後續</h4><ul>${r.followUps.map((f) => `<li><b>${shortDate(f.date)}</b> ${esc(f.text)}</li>`).join('')}</ul>` : ''}`;
    }
    return `<article>
      <div class="meta">${r.type === 'fight' ? '' : `No. ${numberOf(r, all)}・`}${longDate(r.date)} ${vis}</div>
      <h3>${esc(r.title)} <span class="emo">${esc((r.emojis || []).join(''))}</span></h3>
      ${(r.tags || []).length ? `<div class="tags">${esc(r.tags.map((t) => '#' + t).join(' '))}</div>` : ''}
      ${r.description ? `<p>${esc(r.description)}</p>` : ''}
      ${(r.reflections || []).length ? `<h4>事後反思</h4><ul>${r.reflections.map((f) => `<li><b>${shortDate(f.date)}</b> ${esc(f.text)}</li>`).join('')}</ul>` : ''}
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
<h1>${esc(diaryTitle())}</h1>
<div class="sub">匯出於 ${longDate(today())}・共 ${all.length} 則紀錄</div>
${section('happy')}${section('cloud')}${section('fight')}
${all.length ? '' : '<p>還沒有任何紀錄。</p>'}
</main></body></html>`;
}

async function viewSettings() {
  const cats = await getCategories();
  const everything = await DB.allRecords();
  const all = everything.filter((r) => !r.deletedAt);
  const trash = everything.filter((r) => r.deletedAt).sort((a, b) => b.deletedAt - a.deletedAt);
  const tagCount = new Map();
  everything.forEach((r) => (r.tags || []).forEach((t) => tagCount.set(t, (tagCount.get(t) || 0) + 1)));
  const usedTags = [...tagCount].sort((a, b) => b[1] - a[1]);
  const lastBackup = await DB.getSetting('lastBackupAt', null);
  const persisted = await isPersisted();
  // 雲端模式下，看看這支手機裡有沒有還沒搬上去的舊紀錄
  let localCount = 0;
  if (usingCloud()) { try { localCount = (await LocalDB.allRecords()).length; } catch (e) { localCount = 0; } }
  const migratedAt = usingCloud() ? await LocalDB.getSetting('migratedAt', null) : null;
  const shareCard = usingCloud() ? await shareCardHtml() : '';
  app.className = '';
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/" aria-label="返回">${ICON.back}</a>
      <h1>設定</h1>
    </div>
    ${isGuest() ? `<div class="card" style="background:var(--happy-bg);border-color:transparent">
      <div class="bold" style="color:var(--happy-dark)">註冊或登入</div>
      <div class="small" style="color:var(--happy-dark)">現在的紀錄只存在這支手機。在這支手機註冊或登入後會自動搬上雲端，換手機不會不見，也能產生分享碼給另一半。</div>
      <a class="btn small" href="#/login">註冊／登入</a>
    </div>` : ''}
    ${usingCloud() ? `<div class="card">
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
      <div class="bold">我們的名字</div>
      <div class="grid2">
        <div class="field"><label for="set-me">你的名字</label><input id="set-me" class="input" maxlength="${LIMITS.name}" value="${esc(NAMES.me)}"></div>
        <div class="field"><label for="set-partner">伴侶的名字</label><input id="set-partner" class="input" maxlength="${LIMITS.name}" value="${esc(NAMES.partner)}"></div>
      </div>
      <div class="field"><label for="set-since">在一起的日期（可不填，首頁會顯示在一起第幾天）</label><input id="set-since" class="input" type="date" min="1970-01-01" max="${today()}" value="${esc(NAMES.since || '')}"></div>
      <button class="btn small" id="save-names">儲存</button>
    </div>
    <div class="card">
      <div class="bold">備份</div>
      ${usingCloud()
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
      <label class="row small" style="gap:8px"><input type="checkbox" id="read-shared-only"> 只匯出「給對方看」和已解鎖的紀錄（適合直接傳給對方）</label>
      <button class="btn small secondary" id="export-read">匯出閱讀版</button>
    </div>
    ${trash.length ? `<div class="card">
      <div class="bold">最近刪除（${trash.length}）</div>
      <div class="muted">刪除的紀錄會在這裡放 ${TRASH_DAYS} 天，之後連照片一起自動清掉。</div>
      ${trash.map((r) => `<div class="row between" style="gap:8px">
        <div class="grow" style="min-width:0"><div class="bold" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.title || '（沒有標題）')}</div>
          <div class="small muted">${esc(TYPES[r.type].label)}・還剩 ${Math.max(0, TRASH_DAYS - daysAgo(r.deletedAt))} 天</div></div>
        <button class="btn small secondary" data-restore="${esc(r.id)}">救回來</button>
        <button class="btn small danger" data-purge="${esc(r.id)}">永久刪除</button>
      </div>`).join('')}
    </div>` : ''}
    <div class="card">
      <div class="bold">吵架議題分類</div>
      <div class="chips">${cats.map((c) => `<span class="chip" style="display:inline-flex;align-items:center;gap:6px">${esc(c)}<button data-rm-cat="${esc(c)}" aria-label="刪除 ${esc(c)}" style="border:none;background:none;padding:0;display:flex">${ICON.x}</button></span>`).join('')}</div>
      <div class="row"><input id="new-cat" class="input grow" maxlength="${LIMITS.category}" placeholder="新增分類"><button class="btn small" id="add-cat">加入</button></div>
    </div>
    ${usedTags.length ? `<div class="card">
      <div class="bold">管理標籤</div>
      <div class="muted small">點一個標籤可以改名或刪除，所有用到它的紀錄會一起改。</div>
      <div class="chips">${usedTags.map(([t, n]) => `<button class="chip" data-edit-tag="${esc(t)}">#${esc(t)} <span class="muted">${n}</span></button>`).join('')}</div>
    </div>` : ''}
    <div class="card">
      <div class="bold">重新編號</div>
      <div class="muted">每則紀錄的 No. 在新增時就固定，刪除後會留下空號。想讓號碼重新連續的話，可以依日期從 1 重新排一次${usingCloud() ? '，另一半看到的號碼也會一起更新' : ''}。</div>
      <button class="btn small secondary" id="renumber">依日期重新編號</button>
    </div>
    <div class="card">
      <div class="bold" style="color:#9B2C1F">清除所有資料</div>
      <div class="muted">${usingCloud() ? '會刪掉雲端上你所有的紀錄和照片，也會停止分享、移除另一半，沒辦法復原。' : '會刪掉這支手機上所有紀錄和照片，沒辦法復原。'}</div>
      <button class="btn small danger" id="wipe">全部清除</button>
      ${usingCloud() ? '<button class="btn small secondary" id="delete-account">刪除帳號</button>' : ''}
    </div>
  `;

  if (usingCloud()) bindShareCard();
  app.querySelectorAll('[data-restore]').forEach((b) => b.addEventListener('click', () => withBusy(b, '', async () => {
    await restoreRecord(b.dataset.restore);
    toast('已救回來');
    viewSettings();
  })));
  app.querySelectorAll('[data-purge]').forEach((b) => b.addEventListener('click', () => {
    if (!confirm('永久刪除後就救不回來了，照片也會一起刪掉。確定嗎？')) return;
    withBusy(b, '', async () => {
      const r = trash.find((x) => x.id === b.dataset.purge);
      if (r) await purgeRecord(r);
      toast('已永久刪除');
      viewSettings();
    });
  }));
  document.getElementById('renumber').addEventListener('click', async () => {
    if (!confirm('每個類型都會依日期從 No. 1 重新排，原本的號碼會改變。確定嗎？')) return;
    await renumberAll();
    toast('已重新編號');
  });
  document.getElementById('save-names').addEventListener('click', async () => {
    const since = document.getElementById('set-since').value;
    if (since && !dateOk(since)) { toast('日期要在 1970 年到今天之間'); return; }
    await DB.setSetting('names', { me: document.getElementById('set-me').value.trim(), partner: document.getElementById('set-partner').value.trim(), since });
    await loadNames();
    toast('已儲存');
  });
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
    const html = await buildReadableExport(document.getElementById('read-shared-only').checked);
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
    const name = document.getElementById('new-cat').value.trim().slice(0, LIMITS.category);
    if (!name || cats.includes(name)) return;
    if (cats.length >= LIMITS.categories) { toast(`分類最多 ${LIMITS.categories} 個`); return; }
    cats.push(name);
    await DB.setSetting('categories', cats);
    viewSettings();
  };
  document.getElementById('add-cat').addEventListener('click', addCat);
  document.getElementById('new-cat').addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.isComposing) addCat(); });
  app.querySelectorAll('[data-edit-tag]').forEach((b) => b.addEventListener('click', async () => {
    const old = b.dataset.editTag;
    const input = prompt(`把「#${old}」改成什麼？（最多 ${LIMITS.tag} 個字；清空再按確定就是刪除這個標籤）`, old);
    if (input === null) return;
    const name = input.trim().replace(/[#\s]/g, '').slice(0, LIMITS.tag);
    if (name === old) return;
    if (!name && !confirm(`要從所有紀錄拿掉「#${old}」嗎？`)) return;
    let n = 0;
    for (const r of everything.filter((x) => (x.tags || []).includes(old))) {
      await updateRecord(r.id, (x) => {
        const tags = (x.tags || []).map((t) => (t === old ? name : t)).filter(Boolean);
        x.tags = [...new Set(tags)];
      });
      n += 1;
    }
    toast(name ? `已把 ${n} 則紀錄的標籤改成 #${name}` : `已從 ${n} 則紀錄拿掉這個標籤`);
    viewSettings();
  }));
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
      const n = await migrateLocalToCloud((t) => { migrate.textContent = t; });
      toast(`已搬上雲端：${n.records} 則紀錄、${n.photos} 張照片`);
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
    if (usingCloud()) { try { await CloudDB.deleteShare(); } catch (e) { /* 沒有分享碼就略過 */ } }
    await DB.clearAll();
    photoUrlCache.clear();
    toast('已清除');
    go('#/');
  });
  const delAcc = document.getElementById('delete-account');
  if (delAcc) delAcc.addEventListener('click', () => {
    const typed = prompt('刪除帳號會刪掉雲端上所有紀錄、照片、分享和這個帳號本身，沒辦法復原。建議先匯出備份。\n確定的話請輸入「刪除」兩個字：');
    if ((typed || '').trim() !== '刪除') return;
    withBusy(delAcc, '刪除中…', async () => {
      try { await CloudDB.deleteShare(); } catch (e) { /* 沒有分享碼就略過 */ }
      await CloudDB.clearAll();
      await CloudDB.deleteAccount();
      await LocalDB.setSetting('hasAccount', false);
      photoUrlCache.clear(); thumbUrlCache.clear();
      toast('帳號已刪除');
      go('#/login');
    });
  });
}

// ---------- 另一半模式 ----------
async function viewPartnerHome() {
  const info = CloudDB.partnerInfo();
  const all = await liveRecords();
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
      if (f.size > LIMITS.photoFileMB * 1024 * 1024) { toast(`照片超過 ${LIMITS.photoFileMB} MB，換一張試試`); return; }
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

function viewJoin(notice, code = '') {
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
        <input id="j-code" class="input" autocapitalize="characters" autocomplete="off" required value="${esc(/^[A-Za-z0-9]{6,12}$/.test(code) ? code.toUpperCase() : '')}" style="letter-spacing:4px;text-transform:uppercase"></div>
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
      <div class="field"><label for="s-name">你的名字（對方會看到）</label><input id="s-name" class="input" maxlength="${LIMITS.name}" value="${esc(NAMES.me)}"></div>
      <div class="field"><label for="s-pass">分享密碼（至少 6 個字，不要用你的登入密碼）</label><input id="s-pass" class="input" type="password" autocomplete="new-password" minlength="6" maxlength="72"></div>
      <button class="btn small" id="s-create">產生分享碼</button>
    </div>`;
  }
  return `<div class="card" id="share-card">
    <div class="bold">分享給另一半</div>
    <div class="muted">按下面的按鈕複製邀請連結傳給對方，密碼另外告訴他。對方點連結就會看到加入畫面，分享碼已經幫他填好。</div>
    <div class="share-code">${esc(share.code)}</div>
    <button class="btn small secondary" id="s-copy">複製邀請連結（不含密碼）</button>
    <div class="field"><label for="s-name">你的名字（對方會看到）</label>
      <div class="row"><input id="s-name" class="input grow" maxlength="20" value="${esc(share.owner_name)}"><button class="btn small" id="s-save-name">儲存</button></div></div>
    <div class="field"><label for="s-pass">改分享密碼</label>
      <div class="row"><input id="s-pass" class="input grow" type="password" autocomplete="new-password" minlength="6" maxlength="72" placeholder="新密碼"><button class="btn small" id="s-save-pass">更改</button></div></div>
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
    const visible = (await DB.allRecords()).filter((r) => !r.deletedAt && (r.visibility === 'shared' || (r.visibility === 'task' && r.unlocked))).length;
    if (visible && !confirm(`對方加入後，會看到 ${visible} 則「給對方看」的紀錄（包含以前寫的）。不想給這個人看的，請先改成上鎖。要繼續產生分享碼嗎？`)) return;
    await saveWithNewCode(pass, name);
    toast('分享碼產生好了');
    viewSettings();
  });
  if ($('s-copy')) $('s-copy').addEventListener('click', async () => {
    const code = document.querySelector('.share-code').textContent;
    const text = `點這個連結加入我們的紀錄：${location.origin + location.pathname}#/join/${code}（密碼我另外告訴你）`;
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
    const joined = document.querySelectorAll('[data-rm-partner]');
    if (joined.length && confirm('密碼已更改。要不要順便移除目前已加入的人？\n（如果是擔心密碼外流就按「確定」；按「取消」對方會照常看得到）')) {
      for (const b of joined) await CloudDB.removePartner(b.dataset.rmPartner);
      toast('密碼已更改，也移除了已加入的人');
      viewSettings();
      return;
    }
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

// 把手機裡（試用時）的紀錄和照片搬上雲端；同一則紀錄重搬只會覆蓋，不會重複
async function migrateLocalToCloud(progress = () => {}) {
  const records = await LocalDB.allRecords();
  const photos = await LocalDB.allPhotos();
  let done = 0;
  for (const p of photos) {
    await CloudDB.putPhoto(p);
    progress(`搬照片中… ${++done} / ${photos.length}`);
  }
  done = 0;
  for (const r of records) {
    await CloudDB.putRecord(r);
    progress(`搬紀錄中… ${++done} / ${records.length}`);
  }
  const localNames = await LocalDB.getSetting('names', null);
  if (localNames && (localNames.me || localNames.partner) && !(await CloudDB.getSetting('names', null))) await CloudDB.setSetting('names', localNames);
  const localCats = await LocalDB.getSetting('categories', null);
  if (localCats) await CloudDB.setSetting('categories', [...new Set([...(await getCategories()), ...localCats])]);
  await LocalDB.setSetting('migratedAt', Date.now());
  return { records: records.length, photos: photos.length };
}

// 自己的帳號登入後：記住這支手機登入過，第一次登入時自動把試用的紀錄搬上雲端
async function afterOwnerLogin() {
  if (!usingCloud() || CloudDB.isAnonymous() || isPartner()) return;
  await LocalDB.setSetting('hasAccount', true);
  numbersChecked = false; // 換成雲端資料後重新檢查舊紀錄的編號
  if (await LocalDB.getSetting('migratedAt', null)) return;
  const count = (await LocalDB.allRecords()).length;
  if (!count) { await LocalDB.setSetting('migratedAt', Date.now()); return; }
  toast(`正在把手機裡的 ${count} 則紀錄搬上雲端…`);
  try {
    const n = await migrateLocalToCloud();
    toast(`已搬上雲端：${n.records} 則紀錄、${n.photos} 張照片`);
  } catch (e) {
    toast('搬上雲端失敗，可以到設定頁再試一次：' + e.message);
  }
}

// 從重設密碼信回來：設定新密碼
function viewResetPassword() {
  app.className = '';
  app.innerHTML = `
    <div class="topbar"><h1>設定新密碼</h1></div>
    <form id="reset-form" style="display:flex;flex-direction:column;gap:14px">
      <div class="field"><label for="new-pass">新密碼（至少 8 個字）</label>
        <input id="new-pass" class="input" type="password" autocomplete="new-password" minlength="8" maxlength="72" required></div>
      <button class="btn" type="submit" id="reset-btn">更新密碼</button>
    </form>
  `;
  document.getElementById('reset-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const btn = document.getElementById('reset-btn');
    withBusy(btn, '更新中…', async () => {
      await CloudDB.updatePassword(document.getElementById('new-pass').value);
      toast('密碼已更新');
      go('#/');
    });
  });
}

// ---------- 登入（雲端模式） ----------
function viewLogin(mode = 'signin') {
  app.className = '';
  const isUp = mode === 'signup';
  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;margin-top:40px">
      <div class="thumb" style="width:72px;height:72px;border-radius:99px">${ICON.heart}</div>
      <h1 class="title-xl">我們的紀錄</h1>
      <div class="muted">${isUp ? '建立帳號，紀錄就會存在雲端' : '記下你們的美好時刻、烏雲時刻和吵架議題'}</div>
    </div>
    ${inAppNotice()}
    <button class="btn secondary" id="google-btn" style="gap:10px"${IN_APP ? ' hidden' : ''}>
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>
      用 Google 登入
    </button>
    <div class="muted" style="text-align:center">或用 Email</div>
    <form id="login-form" style="display:flex;flex-direction:column;gap:14px">
      <div class="field"><label for="email">Email</label>
        <input id="email" class="input" type="email" autocomplete="email" required></div>
      <div class="field"><label for="password">密碼${isUp ? '（至少 8 個字）' : ''}</label>
        <input id="password" class="input" type="password" autocomplete="${isUp ? 'new-password' : 'current-password'}" minlength="${isUp ? 8 : 6}" maxlength="72" required></div>
      <button class="btn" type="submit" id="login-btn">${isUp ? '建立帳號' : '登入'}</button>
    </form>
    <div id="login-msg" class="muted" style="text-align:center"></div>
    ${isUp ? '' : '<button class="btn secondary small" id="forgot">忘記密碼？</button>'}
    <button class="btn secondary small" id="switch">${isUp ? '已經有帳號？登入' : '第一次使用？建立帳號'}</button>
    <a class="btn secondary small" href="#/join">我是另一半，用分享碼加入</a>
    <a class="btn secondary small" href="#/" id="try-first" hidden>先不登入，直接開始用</a>
  `;
  hasAccountHere().then((has) => { const b = document.getElementById('try-first'); if (b && !has) b.hidden = false; });
  document.getElementById('switch').addEventListener('click', () => viewLogin(isUp ? 'signin' : 'signup'));
  const forgot = document.getElementById('forgot');
  if (forgot) forgot.addEventListener('click', () => {
    const email = document.getElementById('email').value.trim();
    const msg = document.getElementById('login-msg');
    if (!/^[^@\s]+@[^@\s]+$/.test(email)) { msg.textContent = '先在上面填你的 Email，再按「忘記密碼」。'; document.getElementById('email').focus(); return; }
    withBusy(forgot, '寄送中…', async () => {
      await CloudDB.resetPassword(email);
      msg.textContent = `如果 ${email} 有註冊過，會收到一封重設密碼的信，點信裡的連結就能設定新密碼。`;
    });
  });
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
      await afterOwnerLogin();
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
  app.oninput = null;
  window.scrollTo(0, 0);
  try {
    if (isGuest()) {
      if (page === 'join') { renderTabbar(null); viewJoin('', arg); return; }
      // 登入過的手機登出後回到登入畫面；新使用者可以直接試用（資料先存在手機）
      if (page === 'login' || await hasAccountHere()) { renderTabbar(null); viewLogin(); return; }
    }
    // 臨時帳號但不是（或已經不是）另一半：分享被停止、被移除，或加入沒成功
    if (CLOUD_ENABLED && CloudDB.isAnonymous() && !isPartner()) {
      renderTabbar(null);
      viewJoin(page === 'join' ? '' : '目前沒有閱讀權限，可能是分享已經停止或被移除了。請再輸入一次分享碼和密碼。', page === 'join' ? arg : '');
      return;
    }
    if (!isGuest() && (page === 'login' || page === 'join')) { go('#/'); return; }
    await loadNames();
    await ensureNumbers();
    await purgeOldTrash();
    if (page === 'reset' && usingCloud() && !CloudDB.isAnonymous()) { renderTabbar(null); viewResetPassword(); return; }
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
    try { await CloudDB.loadSession(); await afterOwnerLogin(); } catch (e) { toast('連不上雲端：' + e.message); }
  }
  route();
})();
