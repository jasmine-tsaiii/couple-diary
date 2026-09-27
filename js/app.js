// 啾啾日記
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

// 匿名使用統計：只送事件名稱和固定選項（見 js/analytics.js），不送任何內容
function track(name, params) { try { if (window.Analytics) window.Analytics.track(name, params); } catch (e) { /* 統計失敗不影響使用 */ } }
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
    toast('沒有成功，請再試一次：' + cloudErrorText(e));
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
  checkNewStamps().catch(() => {});
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
// 吵架議題是兩個人的事，一律兩個人都看得到；烏雲預設只有自己看得到
const defaultVisibility = (type) => (type === 'cloud' ? 'locked' : 'shared');
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
    if (CloudDB.photoIsMine(id)) {
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
  // 吉祥物的顏色：另一半看到的是主人選的顏色
  try { MASCOT_PICK = isPartner() ? (CloudDB.partnerInfo().mascot || null) : await DB.getSetting('mascot', null); } catch (e) { MASCOT_PICK = null; }
}
// ---------- 吉祥物「啾啾與啵啵」 ----------
let MASCOT_PICK = null;
function mascotHtml(mood, width, extraClass = '') {
  if (!window.Mascot) return '';
  return `<div class="mascot ${extraClass}" style="width:${width}px" aria-hidden="true">${window.Mascot.svg(mood, MASCOT_PICK || window.Mascot.DEFAULT)}</div>`;
}
// 空白狀態（.empty）自動加上等紀錄的吉祥物；錯誤畫面加 no-mascot 就不放
new MutationObserver(() => {
  app.querySelectorAll('.empty:not(.no-mascot):not([data-m])').forEach((e) => { e.dataset.m = '1'; e.insertAdjacentHTML('afterbegin', mascotHtml('empty', 160)); });
}).observe(app, { childList: true, subtree: true });
// 按「已放晴」之後，吉祥物出來曬一下太陽
function showClearMascot() {
  const box = document.createElement('div');
  box.className = 'celebrate mascot-pop';
  box.innerHTML = `<div class="celebrate-box" role="status">${mascotHtml('clear', 160)}<div class="bold">放晴了！</div></div>`;
  document.body.appendChild(box);
  const close = () => box.remove();
  box.addEventListener('click', close);
  setTimeout(close, 1800);
}
const myName = () => NAMES.me || '我';
// 時間戳記轉成當地的 YYYY-MM-DD
const dateOf = (ts) => new Date(ts - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
// 在一起的第幾天（在一起那天算第 1 天）
function togetherDays() {
  if (!NAMES.since || !dateOk(NAMES.since)) return 0;
  return Math.floor((Date.parse(today()) - Date.parse(NAMES.since)) / 86400000) + 1;
}
const partnerName = () => NAMES.partner || '對方';
// 雙人版：這則是不是我寫的（舊紀錄沒有記作者，就是主人寫的）；「對方」的名字
function isMine(r) {
  if (!usingCloud()) return true;
  return r.author ? r.author === CloudDB.myId() : !isPartner();
}
const otherName = () => (isPartner() ? ownerName() : partnerName());
const authorLabel = (r) => (isMine(r) ? '你' : esc(r.authorName || otherName()));
// 可見度的說明用伴侶的名字，例如「給小明看」
const visLabel = (k) => (k === 'shared' && (isPartner() || NAMES.partner) ? `給${otherName()}看` : VISIBILITY[k]);
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
  // 雲端版由資料庫給號碼，才會算到另一半上鎖、你看不到的紀錄
  if (usingCloud() && !isPartner()) { const n = await CloudDB.nextNo(type); if (n) return n; }
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
  if (usingCloud()) { try { await CloudDB.renumberAll(); return; } catch (e) { if (!/renumber_all/.test(e.message)) throw e; } }
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
    isPartner() && !CloudDB.isBoundPartner()
      ? tab('#/tasks', ICON.lock, '任務', route === 'tasks')
      : `<a class="tab-add" href="#/new/${route === 'cloud' || route === 'fight' ? route : 'happy'}" aria-label="新增紀錄">${ICON.plus}</a>`,
    tab('#/list/cloud', ICON.cloud, '烏雲', route === 'cloud'),
    tab('#/fights', ICON.bolt, '吵架', route === 'fight'),
  ].join('');
}

// 付費功能（還沒推出）：雲端照片超過免費額度時跳出來，按「我有興趣」會記下來，讓你知道有多少人想要
function showPaywall(q) {
  // 另一半不能付費：告訴他額度是兩個人共用的，請主人看看
  if (isPartner()) {
    alert(`照片額度用完了：兩個人共用 ${q.limit} 張，目前用了 ${q.used} 張（你放了 ${q.mine || 0} 張）。刪掉用不到的照片就能空出位置，或請${ownerName()}到設定頁看看。`);
    return;
  }
  const box = document.createElement('div');
  box.className = 'celebrate';
  box.innerHTML = `<div class="celebrate-box" role="dialog" aria-label="付費功能">
    <div class="thumb" style="width:64px;height:64px;border-radius:99px;background:var(--lock-bg);color:var(--lock)">${ICON.lock}</div>
    <h2 style="font-size:20px">放更多照片是付費功能</h2>
    <div class="muted">免費帳號可以在雲端放 ${q.limit} 張照片，已經用了 ${q.used} 張${q.mine != null && q.used > q.mine ? `（你 ${q.mine} 張、${esc(partnerName())} ${q.used - q.mine} 張）` : ''}。付費方案準備中，推出後就能放更多照片。</div>
    <div class="small muted">刪掉用不到的照片（或清空「最近刪除」）就能空出位置。</div>
    <button class="btn small" id="pw-yes">我有興趣，推出時想用</button>
    <button class="btn small secondary" id="pw-no">先不用</button>
  </div>`;
  document.body.appendChild(box);
  const close = () => box.remove();
  box.querySelector('#pw-no').addEventListener('click', close);
  box.addEventListener('click', (ev) => { if (ev.target === box) close(); });
  box.querySelector('#pw-yes').addEventListener('click', async () => {
    track('upgrade_interest', { feature: 'photos' });
    try { await CloudDB.noteUpgradeInterest(); } catch (e) { /* 記不到也沒關係 */ }
    close();
    toast('謝謝！已經記下你有興趣');
  });
}

// ---------- 一起完成的事：兩個人一起的待辦清單 ----------
const WISH_CATS = ['約會', '旅行', '一起學', '生活', '其他'];
const WISH_IDEAS = ['一起看日出', '一起做一頓晚餐', '去一個沒去過的城市', '一起完成一幅拼圖', '一起學一道新料理', '一起去露營', '拍一組情侶寫真', '一起看完一部影集', '一起運動一個月', '寫一封信給一年後的我們'];
const WISH_MAX = 200;
// 手機版存在設定裡；雲端版存在 wishes 資料表（另一半也能新增、打勾）
const Wishes = {
  async list() {
    if (usingCloud()) return CloudDB.listWishes();
    return (await LocalDB.getSetting('wishes', [])).slice().sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  },
  async add(w) {
    if (usingCloud()) return CloudDB.addWish(w);
    const list = await LocalDB.getSetting('wishes', []);
    if (list.length >= WISH_MAX) throw new Error(`一起完成的事最多 ${WISH_MAX} 件`);
    list.push({ id: DB.uid(), done: false, done_at: null, done_by_name: '', record_id: null, created_by: 'owner', created_at: new Date().toISOString(), ...w });
    await LocalDB.setSetting('wishes', list);
  },
  async update(id, patch) {
    if (usingCloud()) return CloudDB.updateWish(id, patch);
    const list = await LocalDB.getSetting('wishes', []);
    await LocalDB.setSetting('wishes', list.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  },
  async setDone(id, done) {
    const name = isPartner() ? '' : myName();
    if (usingCloud()) return CloudDB.setWishDone(id, done, name);
    return Wishes.update(id, { done, done_at: done ? new Date().toISOString() : null, done_by_name: done ? name : '' });
  },
  async remove(id) {
    if (usingCloud()) return CloudDB.deleteWish(id);
    const list = await LocalDB.getSetting('wishes', []);
    await LocalDB.setSetting('wishes', list.filter((w) => w.id !== id));
  },
};
// 印章要用到「完成了幾件」，讀清單時順便記下來
let wishDoneCount = 0;
async function loadWishesSafe() {
  try { const list = await Wishes.list(); wishDoneCount = list.filter((w) => w.done).length; return list; } catch (e) { return null; }
}
// 完成後要記成美好時刻：先把標題、日期帶到新增畫面
let formPrefill = null;

// 新增／修改一件事的小視窗
// 幾個選項選一個的小視窗；回傳選到的 key，按取消回傳 null
function choose(title, text, options) {
  return new Promise((resolve) => {
    const box = document.createElement('div');
    box.className = 'celebrate wish-dlg choice-dlg';
    box.innerHTML = `<div class="celebrate-box" style="align-items:stretch;text-align:left" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <h2 style="font-size:20px">${esc(title)}</h2>
      <div class="muted">${esc(text)}</div>
      ${options.map((o) => `<button class="btn ${o.primary ? '' : 'secondary'}" data-choice="${esc(o.key)}">${esc(o.label)}${o.hint ? `<span class="small" style="display:block;font-weight:400;opacity:.8">${esc(o.hint)}</span>` : ''}</button>`).join('')}
      <button class="btn secondary small" data-choice="">取消</button>
    </div>`;
    document.body.appendChild(box);
    box.querySelectorAll('[data-choice]').forEach((b) => b.addEventListener('click', () => { box.remove(); resolve(b.dataset.choice || null); }));
  });
}

function wishDialog(w, onSave) {
  const box = document.createElement('div');
  box.className = 'celebrate wish-dlg';
  box.innerHTML = `<form class="celebrate-box" style="align-items:stretch;text-align:left" role="dialog" aria-label="${w ? '修改' : '新增'}一起完成的事">
    <h2 style="font-size:20px">${w ? '修改' : '想一起完成什麼？'}</h2>
    <div class="field"><label for="w-title">要做的事</label><input id="w-title" class="input" maxlength="60" required value="${esc(w ? w.title : '')}" placeholder="例如：一起看日出"></div>
    <div class="field"><div class="label">分類</div><div class="chips">${WISH_CATS.map((c) => `<button type="button" class="chip ${w && w.category === c ? 'on' : ''}" data-wcat="${c}">${c}</button>`).join('')}</div></div>
    <div class="field"><label for="w-note">備註（可不填）</label><textarea id="w-note" class="textarea" maxlength="300" style="min-height:60px" placeholder="例如：想去合歡山">${esc(w ? w.note : '')}</textarea></div>
    <button class="btn" type="submit" id="w-save">${w ? '儲存' : '加入清單'}</button>
    <button class="btn secondary small" type="button" id="w-cancel">取消</button>
  </form>`;
  document.body.appendChild(box);
  let cat = w ? w.category : '';
  box.querySelectorAll('[data-wcat]').forEach((b) => b.addEventListener('click', () => {
    cat = cat === b.dataset.wcat ? '' : b.dataset.wcat;
    box.querySelectorAll('[data-wcat]').forEach((x) => x.classList.toggle('on', x.dataset.wcat === cat));
  }));
  const close = () => box.remove();
  box.querySelector('#w-cancel').addEventListener('click', close);
  box.querySelector('#w-title').focus();
  box.querySelector('form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const title = box.querySelector('#w-title').value.trim();
    if (!title) return;
    withBusy(box.querySelector('#w-save'), '儲存中…', async () => {
      await onSave({ title: title.slice(0, 60), note: box.querySelector('#w-note').value.trim().slice(0, 300), category: cat });
      close();
    });
  });
}

// 完成時問要不要記成美好時刻（只有紀錄主人能新增紀錄）
function askRecordWish(w) {
  if (isPartner()) return;
  if (!confirm(`🎉 完成「${w.title}」了！要把它記成一則美好時刻嗎？`)) return;
  formPrefill = { title: w.title, description: w.note || '', wishId: w.id };
  go('#/new/happy');
}

async function viewWishes(show = 'todo') {
  const list = await Wishes.list();
  wishDoneCount = list.filter((w) => w.done).length;
  const todo = list.filter((w) => !w.done);
  const done = list.filter((w) => w.done).sort((a, b) => (a.done_at < b.done_at ? 1 : -1));
  const partner = isPartner();
  const who = (w) => (w.created_by === 'partner' ? (partner ? '你加的' : `${esc(w.created_by_name || partnerName())}加的`) : (partner ? `${esc(ownerName())}加的` : ''));
  const canDelete = (w) => !partner || w.created_by === 'partner';
  const item = (w) => `<div class="card" style="flex-direction:row;align-items:flex-start;gap:12px">
      <button class="wish-check ${w.done ? 'on' : ''}" data-wdone="${esc(w.id)}" aria-label="${w.done ? '取消完成' : '標成完成'}：${esc(w.title)}">${w.done ? '✓' : ''}</button>
      <div class="grow" style="display:flex;flex-direction:column;gap:4px">
        <div class="bold" style="${w.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(w.title)}</div>
        ${w.note ? `<div class="small muted">${esc(w.note)}</div>` : ''}
        <div class="small muted">${[Date.parse(w.created_at) ? `${shortDate(dateOf(Date.parse(w.created_at)))} 建立` : '', w.category ? esc(w.category) : '', who(w), w.done ? `${Date.parse(w.done_at) ? shortDate(dateOf(Date.parse(w.done_at))) : ''} ${w.done_by_name ? `${esc(w.done_by_name)}打勾` : '完成'}` : ''].filter(Boolean).join('・')}</div>
        ${!partner && w.done && !w.record_id ? `<button class="btn small secondary" data-wrec="${esc(w.id)}" style="align-self:flex-start">記成美好時刻</button>` : ''}
        ${!partner && w.record_id ? `<a class="small" href="#/view/${esc(w.record_id)}" style="color:var(--happy-dark)">❤️ 看那則美好時刻</a>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        ${partner ? '' : `<button class="btn small secondary" data-wedit="${esc(w.id)}">編輯</button>`}
        ${canDelete(w) ? `<button class="btn small secondary" data-wdel="${esc(w.id)}">刪除</button>` : ''}
      </div>
    </div>`;
  app.className = 'theme-happy';
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/" aria-label="返回">${ICON.back}</a>
      <h1>一起完成的事</h1>
      <div class="count"><b style="font-size:16px;color:var(--accent)">${done.length}</b> / ${list.length}</div>
    </div>
    <div class="muted small">想和${esc(partner ? ownerName() : partnerName())}一起做的事都寫在這裡，兩個人都能新增、打勾。</div>
    <button class="btn" id="w-add">＋ 新增一件事</button>
    <div class="chips">
      <button class="chip ${show === 'todo' ? 'on' : ''}" data-wshow="todo">還沒完成 ${todo.length}</button>
      <button class="chip ${show === 'done' ? 'on' : ''}" data-wshow="done">完成了 ${done.length}</button>
    </div>
    <div class="list">${(show === 'todo' ? todo : done).map(item).join('')}</div>
    ${show === 'todo' && !todo.length ? `<div class="card" style="gap:8px">
      <div class="bold">${list.length ? '全部完成了！再想幾件吧' : '還沒有清單，從這些點子開始？'}</div>
      <div class="chips">${WISH_IDEAS.filter((i) => !list.some((w) => w.title === i)).slice(0, 8).map((i) => `<button class="chip" data-widea="${esc(i)}">＋ ${esc(i)}</button>`).join('')}</div>
    </div>` : ''}
    ${show === 'done' && !done.length ? '<div class="empty">還沒有完成的事，一起加油！</div>' : ''}
  `;
  const refresh = () => viewWishes(show);
  app.querySelectorAll('[data-wshow]').forEach((b) => b.addEventListener('click', () => viewWishes(b.dataset.wshow)));
  document.getElementById('w-add').addEventListener('click', () => {
    if (list.length >= WISH_MAX) { toast(`最多 ${WISH_MAX} 件`); return; }
    wishDialog(null, async (w) => { await Wishes.add({ ...w, created_by_name: partner ? '' : myName() }); track('wish_create'); toast('已加入清單'); refresh(); });
  });
  app.querySelectorAll('[data-widea]').forEach((b) => b.addEventListener('click', () => withBusy(b, '', async () => {
    await Wishes.add({ title: b.dataset.widea, note: '', category: '', created_by_name: partner ? '' : myName() });
    track('wish_create');
    refresh();
  })));
  app.querySelectorAll('[data-wdone]').forEach((b) => b.addEventListener('click', () => withBusy(b, '', async () => {
    const w = list.find((x) => x.id === b.dataset.wdone);
    await Wishes.setDone(w.id, !w.done);
    if (!w.done) track('wish_done');
    if (!w.done) {
      toast(partner ? `完成了！${ownerName()}會看到` : '完成了！');
      checkNewStamps().catch(() => {});
      askRecordWish(w);
      if (location.hash.startsWith('#/new')) return;
    }
    refresh();
  })));
  app.querySelectorAll('[data-wrec]').forEach((b) => b.addEventListener('click', () => {
    const w = list.find((x) => x.id === b.dataset.wrec);
    formPrefill = { title: w.title, description: w.note || '', wishId: w.id };
    go('#/new/happy');
  }));
  app.querySelectorAll('[data-wedit]').forEach((b) => b.addEventListener('click', () => {
    const w = list.find((x) => x.id === b.dataset.wedit);
    wishDialog(w, async (patch) => { await Wishes.update(w.id, patch); toast('已儲存'); refresh(); });
  }));
  app.querySelectorAll('[data-wdel]').forEach((b) => b.addEventListener('click', () => {
    const w = list.find((x) => x.id === b.dataset.wdel);
    if (!confirm(`刪除「${w.title}」？`)) return;
    withBusy(b, '', async () => { await Wishes.remove(w.id); refresh(); });
  }));
}

// ---------- 第一次打開的導覽：吉祥物帶三頁，主人和另一半各一版 ----------
function tourKey(kind) { return kind === 'partner' ? `tourDone:p:${CloudDB.myId() || ''}` : 'tourDone'; }
function tourDone(kind) { try { return !!localStorage.getItem(tourKey(kind)); } catch (e) { return true; } }
function tourPages(kind) {
  if (kind === 'partner') {
    const o = esc(ownerName());
    return [
      { mood: 'happy', title: '這是你們兩個人的紀錄', text: `這裡看得到${o}分享給你的美好時刻、烏雲時刻和吵架議題。上鎖的紀錄，完成${o}出的任務後就能打開。` },
      { mood: 'celebrate', title: '你也可以寫', text: CloudDB.isBoundPartner() ? '在美好時刻或烏雲時刻按「＋」，就能記下你自己的。每一則都可以選要給對方看，還是先上鎖。' : '綁定 Email 或 Google 之後，你也能記自己的美好、烏雲時刻，一起寫吵架議題。首頁有「綁定帳號」可以按。' },
      { mood: 'clear', title: '回應對方的心意', text: `在${o}的美好時刻按愛心，在吵架議題寫下「我的補充」，讓${o}知道你看到了。` },
    ];
  }
  return [
    { mood: 'happy', title: '先記一則美好時刻', text: '開心的小事、想謝謝對方的事都可以記。首頁上方按「記美好」就能寫。不開心的時候，也可以記烏雲或吵架。' },
    { mood: 'celebrate', title: '分享給另一半', text: isGuest() ? '註冊或登入後，到設定頁拿邀請連結傳給另一半。每一則都可以選要給對方看，還是先上鎖。' : '到設定頁拿邀請連結傳給另一半。每一則都可以選要給對方看，還是先上鎖。' },
    { mood: 'clear', title: '一起集印章', text: '記滿 1、5、10 則……就會拿到印章。到印章冊看看，下一個章還差多少。' },
    // 試用的人看完導覽，最後一頁邀請註冊（也可以先試用）
    ...(isGuest() ? [{ mood: 'celebrate', title: '註冊，保存你們的紀錄', signup: true, text: `<ul class="benefits">${SIGNUP_BENEFITS.map(([t]) => `<li>${t}</li>`).join('')}</ul>` }] : []),
  ];
}
function showTour(kind) {
  if (document.querySelector('.tour-dlg')) return;
  const pages = tourPages(kind);
  let i = 0;
  const box = document.createElement('div');
  box.className = 'celebrate tour-dlg';
  const finish = () => { try { localStorage.setItem(tourKey(kind), String(Date.now())); } catch (e) { /* 略過 */ } box.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (ev) => { if (ev.key === 'Escape') finish(); };
  const render = () => {
    const pg = pages[i];
    const last = i === pages.length - 1;
    box.innerHTML = `<div class="celebrate-box" role="dialog" aria-modal="true" aria-label="使用導覽">
      ${mascotHtml(pg.mood, 150)}
      <h2 style="font-size:20px">${pg.title}</h2>
      <div class="muted">${pg.text}</div>
      <div class="tour-dots" aria-label="第 ${i + 1} 頁，共 ${pages.length} 頁">${pages.map((_, k) => `<span class="${k === i ? 'on' : ''}"></span>`).join('')}</div>
      ${pg.signup ? '<a class="btn" href="#/signup" id="tour-signup">免費註冊</a>' : ''}
      <button class="btn${pg.signup ? ' secondary' : ''}" id="tour-next">${pg.signup ? '先試用看看' : last ? '開始使用' : '下一步'}</button>
      ${last ? '' : '<button class="btn secondary small" id="tour-skip">略過</button>'}
    </div>`;
    const su = box.querySelector('#tour-signup');
    if (su) su.addEventListener('click', () => { track('tutorial_complete'); track('signup_prompt', { where: 'tour' }); finish(); });
    box.querySelector('#tour-next').addEventListener('click', () => { if (last) { track('tutorial_complete'); finish(); } else { i += 1; render(); } });
    const sk = box.querySelector('#tour-skip');
    if (sk) sk.addEventListener('click', finish);
    box.querySelector('#tour-next').focus();
  };
  document.body.appendChild(box);
  document.addEventListener('keydown', onKey);
  render();
}
function tourCard() {
  return `<button class="card" id="tour-again" style="gap:4px;text-align:left;font:inherit;color:inherit;cursor:pointer">
    <div class="row between" style="width:100%"><div class="bold">使用導覽</div><div class="muted">›</div></div>
    <div class="small muted">再看一次這個 App 怎麼用</div>
  </button>`;
}
document.addEventListener('click', (ev) => { if (ev.target.closest && ev.target.closest('#tour-again')) showTour(isPartner() ? 'partner' : 'owner'); });
// 設定頁「匿名使用統計」開關（config.js 沒填 GA 評估 ID 時不顯示）
const ANALYTICS_NOTE = '我們用 Google Analytics 了解有多少人在用、哪些功能有人用。只會記「新增了一則美好」這類次數，不會傳送你寫的標題、內容、名字或照片。';
function analyticsCard() {
  if (!window.Analytics || !window.Analytics.configured()) return '';
  const on = window.Analytics.enabled();
  return `<div class="card" style="gap:8px">
    <div class="row between" style="gap:12px"><div class="bold">匿名使用統計</div>
      <button class="btn small ${on ? '' : 'secondary'}" id="analytics-toggle" aria-pressed="${on}">${on ? '開啟中' : '已關閉'}</button></div>
    <div class="small muted">${ANALYTICS_NOTE}關掉之後，這支手機就不會再送出任何統計。</div>
  </div>`;
}
document.addEventListener('click', (ev) => {
  const b = ev.target.closest && ev.target.closest('#analytics-toggle');
  if (!b) return;
  const next = b.getAttribute('aria-pressed') !== 'true';
  window.Analytics.setEnabled(next);
  b.setAttribute('aria-pressed', String(next));
  b.textContent = next ? '開啟中' : '已關閉';
  b.classList.toggle('secondary', !next);
  toast(next ? '已開啟匿名使用統計' : '已關閉匿名使用統計');
});

// ---------- 引導加到主畫面：寫完紀錄後提醒一次，像 App 一樣從圖示打開 ----------
let installEvt = null;
window.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); installEvt = ev; });
window.addEventListener('appinstalled', () => { installEvt = null; try { localStorage.setItem('a2hsNever', '1'); } catch (e) { /* 略過 */ } });
const A2HS_GAP_MS = 3 * 86400000;
function a2hsEligible() {
  const ua = navigator.userAgent;
  const mobile = /iphone|ipad|ipod|android/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (!mobile || standalone) return false;
  try {
    if (localStorage.getItem('a2hsNever')) return false;
    const st = JSON.parse(localStorage.getItem('a2hsShown') || '{"n":0,"at":0}');
    return st.n < 3 && Date.now() - st.at > A2HS_GAP_MS;
  } catch (e) { return false; }
}
function markA2hsPending() { try { sessionStorage.setItem('a2hsPending', '1'); } catch (e) { /* 略過 */ } }
function maybeShowA2hs() {
  try { if (!sessionStorage.getItem('a2hsPending')) return; } catch (e) { return; }
  if (!a2hsEligible()) return;
  // 等慶祝、印章、導覽這些小視窗關掉再出現，免得疊在一起
  let tries = 0;
  const t = setInterval(() => {
    if (++tries > 120) { clearInterval(t); return; }
    if (document.querySelector('.celebrate, .pin-lock')) return;
    clearInterval(t);
    try { sessionStorage.removeItem('a2hsPending'); } catch (e) { /* 略過 */ }
    showA2hs();
  }, 500);
}
// 試用的人寫到第 3 則：提醒一次註冊，紀錄才會保存在雲端
function maybeShowSignupNudge() {
  try {
    if (!sessionStorage.getItem('signupNudge')) return false;
    sessionStorage.removeItem('signupNudge');
    if (!isGuest() || localStorage.getItem('signupNudgeShown')) return false;
    localStorage.setItem('signupNudgeShown', '1');
  } catch (e) { return false; }
  let tries = 0;
  const t = setInterval(() => {
    if (++tries > 120) { clearInterval(t); return; }
    if (document.querySelector('.celebrate, .pin-lock')) return;
    clearInterval(t);
    showSignupNudge();
  }, 500);
  return true;
}
function showSignupNudge() {
  track('signup_prompt', { where: 'third_record' });
  showSignupSheet('已經寫了 3 則，要不要保存起來？', '現在的紀錄只存在這支手機的瀏覽器，清掉資料或換手機就會不見。');
}
// 試用中碰到要註冊才能用的功能（例如分享給另一半），就在原地跳出來，不用離開現在的畫面
function showSignupSheet(title, text) {
  if (document.querySelector('.signup-dlg')) return;
  const box = document.createElement('div');
  box.className = 'celebrate signup-dlg';
  box.innerHTML = `<div class="celebrate-box" role="dialog" aria-modal="true" aria-label="註冊">
    ${mascotHtml('celebrate', 130)}
    <h2 style="font-size:20px">${title}</h2>
    <div class="muted">${text}</div>
    <ul class="benefits">${SIGNUP_BENEFITS.map(([t]) => `<li>${t}</li>`).join('')}</ul>
    <a class="btn" href="#/signup" id="nudge-signup">免費註冊</a>
    <a class="btn secondary small" href="#/login" id="nudge-login">已經有帳號？登入</a>
    <button class="btn secondary" id="nudge-later">繼續試用</button>
  </div>`;
  document.body.appendChild(box);
  const close = () => box.remove();
  box.querySelectorAll('#nudge-later, #nudge-signup, #nudge-login').forEach((b) => b.addEventListener('click', close));
  box.addEventListener('click', (ev) => { if (ev.target === box) close(); });
}
const SHARE_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
function a2hsSteps() {
  const ua = navigator.userAgent;
  if (IN_APP) return ['這個畫面是在聊天 App 裡打開的，沒辦法加到主畫面', '點右上角的「⋯」，選「用瀏覽器開啟」', '在 Safari 或 Chrome 打開後，再照著提示加到主畫面'];
  if (/iphone|ipad|ipod/i.test(ua) || /Macintosh/.test(ua)) return [`點畫面下方（或網址列旁）的分享按鈕 ${SHARE_ICON}`, '往下滑，選「加入主畫面」', '按右上角的「新增」'];
  return ['點右上角的「⋮」', '選「加到主畫面」或「安裝應用程式」', '按「新增」或「安裝」'];
}
function showA2hs() {
  if (document.querySelector('.a2hs-dlg')) return;
  try {
    const st = JSON.parse(localStorage.getItem('a2hsShown') || '{"n":0,"at":0}');
    localStorage.setItem('a2hsShown', JSON.stringify({ n: st.n + 1, at: Date.now() }));
  } catch (e) { /* 略過 */ }
  const box = document.createElement('div');
  box.className = 'celebrate a2hs-dlg';
  const steps = a2hsSteps();
  // 還沒登入的人：iPhone 主畫面和 Safari 的資料是分開的，先存上雲端再加，紀錄才不會像不見了
  const guestFirst = isGuest() && /iphone|ipad|ipod|Macintosh/i.test(navigator.userAgent) && !IN_APP;
  box.innerHTML = `<div class="celebrate-box" role="dialog" aria-modal="true" aria-label="加到主畫面">
    ${mascotHtml('celebrate', 130)}
    <h2 style="font-size:20px">把啾啾日記放到主畫面</h2>
    <div class="muted">像 App 一樣，點圖示就能打開，想記的時候不用再找網址。${/iphone|ipad|ipod/i.test(navigator.userAgent) ? '放在主畫面，手機也比較不會自動清掉資料。' : ''}</div>
    ${guestFirst ? '<div class="small" style="background:var(--progress-bg);color:var(--progress-ink);border-radius:12px;padding:10px 12px;text-align:left">要先註冊或登入喔！iPhone 從主畫面打開時，看不到在 Safari 裡寫的紀錄。登入後紀錄會存到雲端，兩邊登入同一個帳號就都看得到。</div><a class="btn" href="#/login" id="a2hs-login">先註冊或登入</a>' : ''}
    ${installEvt && !IN_APP ? '<button class="btn" id="a2hs-install">加到主畫面</button>' : `<ol class="a2hs-steps">${steps.map((x) => `<li>${x}</li>`).join('')}</ol>`}
    <button class="btn ${(installEvt && !IN_APP) || guestFirst ? 'secondary' : ''}" id="a2hs-ok">${installEvt && !IN_APP ? '之後再說' : '知道了'}</button>
    <button class="btn secondary small" id="a2hs-never">不要再提醒</button>
  </div>`;
  document.body.appendChild(box);
  const close = () => box.remove();
  box.querySelector('#a2hs-ok').addEventListener('click', () => { if (!installEvt || IN_APP) track('add_to_home', { how: 'steps' }); close(); });
  const lg = box.querySelector('#a2hs-login');
  if (lg) lg.addEventListener('click', close);
  box.querySelector('#a2hs-never').addEventListener('click', () => { try { localStorage.setItem('a2hsNever', '1'); } catch (e) { /* 略過 */ } close(); });
  const inst = box.querySelector('#a2hs-install');
  if (inst) inst.addEventListener('click', async () => {
    const ev = installEvt; installEvt = null; close();
    track('add_to_home', { how: 'prompt' });
    try { ev.prompt(); await ev.userChoice; } catch (e) { /* 使用者取消 */ }
  });
}

// ---------- 6 位數字的分享密碼：一個輸入框疊在 6 個格子上（可以貼上、自動填入） ----------
const SHARE_PASS_RE = /^\d{6}$/;
function digitBoxes(id, label) {
  return `<div class="field"><label for="${id}">${label}</label>
    <div class="digits"><input id="${id}" class="digits-input" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" aria-describedby="${id}-hint">
      <div class="digit-cells" aria-hidden="true">${'<span></span>'.repeat(6)}</div></div>
    <div class="small muted" id="${id}-hint">6 位數字</div></div>`;
}
function bindDigitBoxes(root = document) {
  root.querySelectorAll('.digits-input').forEach((inp) => {
    if (inp.dataset.bound) return;
    inp.dataset.bound = '1';
    const cells = inp.parentElement.querySelectorAll('.digit-cells span');
    const paint = () => {
      inp.value = inp.value.replace(/\D/g, '').slice(0, 6);
      cells.forEach((c, i) => { c.textContent = inp.value[i] || ''; c.classList.toggle('on', i === Math.min(inp.value.length, 5) && document.activeElement === inp); });
    };
    ['input', 'focus', 'blur'].forEach((e) => inp.addEventListener(e, paint));
    paint();
  });
}

// ---------- 意見回饋：哪裡有問題、哪裡可以更好 ----------
const FEEDBACK_KINDS = ['有問題', '建議', '喜歡的地方', '其他'];
function feedbackCard() {
  return `<a class="card" href="#/feedback" style="gap:4px">
    <div class="row between"><div class="bold">意見回饋</div><div class="muted">›</div></div>
    <div class="small muted">哪裡怪怪的、哪裡可以更好，都歡迎告訴我們</div>
  </a>`;
}
function viewFeedback() {
  const from = sessionStorage.getItem('fbFrom') || '';
  let kind = '有問題';
  let draft = '';
  try { draft = localStorage.getItem('fbDraft') || ''; } catch (e) { /* 沒關係 */ }
  app.className = '';
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/settings" aria-label="返回">${ICON.back}</a>
      <h1>意見回饋</h1>
    </div>
    <div class="muted">遇到問題或有想法都可以寫在這裡，我們會一則一則看，用來把 App 改得更好。紀錄內容和照片不會一起送出。</div>
    <form class="card" id="fb-form" style="gap:12px">
      <div class="field"><div class="label">是關於</div><div class="chips">${FEEDBACK_KINDS.map((k) => `<button type="button" class="chip ${k === kind ? 'on' : ''}" data-fbkind="${k}">${k}</button>`).join('')}</div></div>
      <div class="field"><label for="fb-msg">想說的話</label><textarea id="fb-msg" class="textarea" maxlength="1000" required placeholder="例如：在哪個畫面、做了什麼、發生什麼事">${esc(draft)}</textarea><div class="small muted" id="fb-count"></div></div>
      <div class="field"><label for="fb-contact">聯絡方式（可不填）</label><input id="fb-contact" class="input" maxlength="100" placeholder="Email 或 IG，想收到回覆再填"></div>
      <button class="btn" type="submit" id="fb-send">送出</button>
    </form>
  `;
  const msg = document.getElementById('fb-msg');
  const count = () => { document.getElementById('fb-count').textContent = `${msg.value.length} / 1000`; try { localStorage.setItem('fbDraft', msg.value); } catch (e) { /* 沒關係 */ } };
  msg.addEventListener('input', count); count();
  app.querySelectorAll('[data-fbkind]').forEach((b) => b.addEventListener('click', () => {
    kind = b.dataset.fbkind;
    app.querySelectorAll('[data-fbkind]').forEach((x) => x.classList.toggle('on', x.dataset.fbkind === kind));
  }));
  document.getElementById('fb-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const text = msg.value.trim();
    if (!text) { toast('請寫下想說的話'); return; }
    if (!CLOUD_ENABLED) { toast('目前沒有連上雲端，送不出去'); return; }
    withBusy(document.getElementById('fb-send'), '送出中…', async () => {
      try {
        track('feedback_send');
        await CloudDB.sendFeedback({ kind, message: text.slice(0, 1000), contact: document.getElementById('fb-contact').value.trim().slice(0, 100), page: from.slice(0, 60), mode: isPartner() ? 'partner' : usingCloud() ? 'cloud' : 'phone', agent: navigator.userAgent.slice(0, 200) });
      } catch (e) { toast(cloudErrorText(e)); return; }
      try { localStorage.removeItem('fbDraft'); } catch (e) { /* 沒關係 */ }
      app.innerHTML = `<div class="topbar"><a class="icon-btn" href="#/" aria-label="返回">${ICON.back}</a><h1>意見回饋</h1></div>
        <div class="card" style="align-items:center;text-align:center;gap:10px"><div style="font-size:40px">💌</div><div class="bold">謝謝你！已經收到了</div><div class="muted">你的回饋會幫助我們把 App 變得更好。</div><a class="btn small secondary" href="#/">回首頁</a></div>`;
    });
  });
}

// ---------- 印章冊：像集點卡一樣，達到里程碑就蓋一個章 ----------
// 每一組：怎麼算數量、各階段的門檻、每個章的圖案和名字
const STAMP_GROUPS = [
  { key: 'happy', title: '美好時刻', help: '每新增一則美好時刻就算 1 個。移到「最近刪除」的不算。', unit: '個美好時刻', u: '個', count: (c) => c.happy,
    steps: [[1, '💗', '第一個美好'], [5, '🌸', '5 個美好'], [10, '💐', '10 個美好'], [30, '🌹', '30 個美好'], [50, '🎀', '50 個美好'], [100, '👑', '集滿 100 個']] },
  { key: 'sunny', title: '吵架和好', help: '在吵架議題的詳情頁，把「狀態」按成「已解決」就算 1 個。之後改回「處理中」就不算。', unit: '個吵架議題改成「已解決」', u: '個', count: (c) => c.resolved,
    steps: [[1, '🤝', '第一次和好'], [5, '💞', '和好 5 次'], [10, '🕊️', '和好 10 次'], [30, '🏆', '和好 30 次']] },
  { key: 'clear', title: '烏雲放晴', help: '在烏雲時刻的詳情頁，心情過去了就按「已放晴」，每則算 1 個。之後取消放晴就不算。', unit: '則烏雲時刻按「已放晴」', u: '則', count: (c) => c.cleared,
    steps: [[1, '🌤️', '第一次放晴'], [5, '🌈', '放晴 5 次'], [10, '☀️', '放晴 10 次'], [30, '🌻', '放晴 30 次']] },
  { key: 'reflect', title: '事後反思', help: '在烏雲時刻的詳情頁按「新增反思」，寫下冷靜之後的想法，每寫 1 則算 1 次。', unit: '則反思', u: '則', count: (c) => c.reflections,
    steps: [[1, '💭', '第一次反思'], [5, '📖', '反思 5 次'], [10, '🧘', '反思 10 次']] },
  { key: 'task', title: '任務解鎖', help: '把紀錄設成「任務解鎖」，另一半完成任務、你按「通過並解鎖」就算 1 個（雲端版開啟分享碼後才能用）。', unit: '個任務解鎖', u: '個', count: (c) => c.unlocked,
    steps: [[1, '🔓', '第一次解鎖'], [5, '🗝️', '解鎖 5 個'], [10, '🎁', '解鎖 10 個']] },
  { key: 'wish', title: '一起完成', help: '在首頁的「一起完成的事」清單打勾，每完成 1 件算 1 個，你們兩個誰打勾都算。', unit: '件一起完成的事', u: '件', count: (c) => c.wishes,
    steps: [[1, '✅', '第一件完成'], [5, '🎯', '完成 5 件'], [10, '🗺️', '完成 10 件'], [30, '🌟', '完成 30 件']] },
  { key: 'days', title: '在一起', help: '到設定頁填「在一起的日期」，每天自動累積，在一起那天算第 1 天。', unit: '天', u: '天', count: (c) => c.days,
    steps: [[100, '💯', '100 天'], [365, '🎂', '一週年'], [1000, '💍', '1000 天']] },
];
function stampCounts(all) {
  return {
    happy: all.filter((r) => r.type === 'happy').length,
    resolved: all.filter((r) => r.type === 'fight' && r.status === 'resolved').length,
    cleared: all.filter((r) => r.type === 'cloud' && r.clearedAt).length,
    reflections: all.reduce((n, r) => n + (r.reflections || []).length, 0),
    unlocked: all.filter((r) => r.visibility === 'task' && r.unlocked).length,
    wishes: wishDoneCount,
    days: togetherDays(),
  };
}
// 全部的章，標出拿到了沒有
function allStamps(all) {
  const c = stampCounts(all);
  return STAMP_GROUPS.flatMap((g) => g.steps.map(([n, icon, name]) => ({ id: `${g.key}-${n}`, group: g, n, icon, name, have: g.count(c), got: g.count(c) >= n })));
}
// 下一個最接近的章：「再 2 個美好時刻，就能拿到『10 個美好』」
function nextStamp(all) {
  const left = allStamps(all).filter((s) => !s.got && s.group.key !== 'days').map((s) => ({ ...s, need: s.n - s.have }));
  return left.sort((a, b) => a.need / a.n - b.need / b.n)[0] || null;
}
const stampFace = (s) => `<div class="stamp ${s.got ? 'got' : ''}"><div class="stamp-face">${s.icon}</div><div class="stamp-name">${esc(s.name)}</div></div>`;

// 有新的章就跳出慶祝畫面；第一次用這個功能時，已經達成的章直接記下來，不一次跳一堆
let stampChecking = false;
async function checkNewStamps() {
  if (isPartner() || stampChecking || document.querySelector('.celebrate')) return;
  stampChecking = true;
  try { await showNewStamps(); } finally { stampChecking = false; }
}
async function showNewStamps() {
  await loadWishesSafe();
  const got = allStamps(await liveRecords()).filter((s) => s.got);
  const seen = await DB.getSetting('stamps', null);
  if (!seen) { await DB.setSetting('stamps', Object.fromEntries(got.map((s) => [s.id, Date.now()]))); return; }
  const fresh = got.filter((s) => !seen[s.id]);
  if (!fresh.length) return;
  await DB.setSetting('stamps', { ...seen, ...Object.fromEntries(fresh.map((s) => [s.id, Date.now()])) });
  fresh.forEach((x) => track('stamp_earned', { stamp: x.id }));
  const s = fresh[fresh.length - 1];
  const box = document.createElement('div');
  box.className = 'celebrate';
  box.innerHTML = `<div class="celebrate-box" role="dialog" aria-label="解鎖印章">
    ${mascotHtml('celebrate', 180)}
    <div class="small bold" style="color:var(--happy)">解鎖新印章！</div>
    <div class="stamp got"><div class="stamp-face">${s.icon}</div></div>
    <h2 style="font-size:22px">${esc(s.name)}</h2>
    <div class="muted">${esc(s.group.title)}：${s.n} ${s.group.u}${fresh.length > 1 ? `（這次一共拿到 ${fresh.length} 個章）` : ''}</div>
    <a class="btn small secondary" href="#/stamps" id="cel-book">看印章冊</a>
    <button class="btn small" id="cel-ok">太棒了</button>
  </div>`;
  document.body.appendChild(box);
  const close = () => box.remove();
  box.querySelector('#cel-ok').addEventListener('click', close);
  box.querySelector('#cel-book').addEventListener('click', close);
  box.addEventListener('click', (ev) => { if (ev.target === box) close(); });
}

async function viewStamps() {
  const all = await liveRecords();
  await loadWishesSafe();
  const stamps = allStamps(all);
  const next = nextStamp(all);
  app.className = '';
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/" aria-label="返回">${ICON.back}</a>
      <h1>印章冊</h1>
      <div class="count"><b style="font-size:16px;color:var(--happy)">${stamps.filter((x) => x.got).length}</b> / ${stamps.length}</div>
    </div>
    ${next ? `<div class="card" style="background:var(--happy-bg);border-color:transparent;gap:4px">
      <div class="small bold" style="color:var(--happy-dark)">下一個印章</div>
      <div>再 ${next.need} ${esc(next.group.unit)}，就能拿到「${esc(next.name)}」${next.icon}</div>
    </div>` : ''}
    ${STAMP_GROUPS.map((g) => {
      const list = stamps.filter((x) => x.group === g);
      return `<div class="card">
        <div class="row between"><div class="row" style="gap:6px"><span class="bold">${esc(g.title)}</span>
          <button class="help-btn" data-help="${g.key}" aria-label="怎麼集${esc(g.title)}的章" aria-expanded="false">?</button></div>
          <div class="small muted">目前 ${list[0].have} ${g.u}</div></div>
        <div class="help-text small" id="help-${g.key}" hidden>${esc(g.help)}</div>
        ${g.key === 'days' && !NAMES.since ? '<div class="small muted">到設定頁填「在一起的日期」就能開始集這組章。</div>' : ''}
        <div class="stamp-grid">${list.map(stampFace).join('')}</div>
      </div>`;
    }).join('')}
  `;
  app.querySelectorAll('[data-help]').forEach((b) => b.addEventListener('click', () => {
    const t = document.getElementById(`help-${b.dataset.help}`);
    t.hidden = !t.hidden;
    b.setAttribute('aria-expanded', String(!t.hidden));
  }));
}

// ---------- 首頁 ----------
// 首頁上方的「今天想記下什麼？」：三個大按鈕直接開始寫
function quickRecord(text) {
  return `<div class="card quick-rec">
    <div class="quick-head">${mascotHtml('happy', 64)}<div class="bold">${text}</div></div>
    <div class="quick-btns">
      <a class="quick-btn theme-happy" href="#/new/happy">${ICON.heart}<span>記美好</span></a>
      <a class="quick-btn theme-cloud" href="#/new/cloud">${ICON.cloud}<span>記烏雲</span></a>
      <a class="quick-btn theme-fight" href="#/new/fight">${ICON.bolt}<span>記吵架</span></a>
    </div>
  </div>`;
}
const TILE_ICON = {
  wish: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>',
  stamp: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/></svg>',
  share: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/></svg>',
};
// 「所有功能」的一格：圖示、名稱、一行狀態
function homeTile({ href, icon, color, title, sub, extra = '', id = '', cls = '' }) {
  return `<a class="ftile ${cls}" href="${href}"${id ? ` id="${id}"` : ''}>
    <span class="ftile-icon" style="color:${color}">${icon}</span>
    <span class="ftile-text"><span class="bold">${title}</span><span class="small muted">${sub}</span>${extra}</span>
  </a>`;
}
function fightSub(fights) {
  const open = fights.filter((f) => (f.status || 'open') !== 'resolved').length;
  return !fights.length ? '還沒有吵架紀錄' : open ? `${open} 個還沒解決` : '都解決了';
}
function wishTile(list) {
  if (!list) return '';
  const done = list.filter((w) => w.done).length;
  return homeTile({ href: '#/wishes', icon: TILE_ICON.wish, color: 'var(--happy)', title: '一起完成的事', sub: list.length ? `情侶待辦・${done} / ${list.length}` : '情侶待辦清單' });
}
// 兩個人都有寫的時候，小字顯示各自寫了幾則（一起累積，不是比賽）
function splitLine(total, mine) {
  if (!usingCloud() || mine >= total || mine === 0 && total === 0) return '';
  return `<div class="small muted">你 ${mine}・${esc(otherName())} ${total - mine}</div>`;
}
async function viewHome() {
  const all = await liveRecords();
  // 另一半上鎖的紀錄你看不到內容，但數量要算進去（100 個目標是兩個人一起的）
  const lockedOthers = usingCloud() ? await CloudDB.othersLocked() : [];
  const count = (t) => all.filter((r) => r.type === t).length + lockedOthers.filter((x) => x.type === t).length;
  const fights = all.filter((r) => r.type === 'fight');
  const recent = all.slice().sort(byDateDesc).slice(0, 5);
  const lastBackup = await DB.getSetting('lastBackupAt', null);
  // 手機版 14 天提醒一次；雲端版免費方案沒有自動備份，30 天提醒一次
  const remindDays = usingCloud() ? CLOUD_BACKUP_REMIND_DAYS : BACKUP_REMIND_DAYS;
  const needBackup = all.length > 0 && (!lastBackup || Date.now() - lastBackup > remindDays * 86400000);
  const askNames = !NAMES.me && !NAMES.partner && !(await DB.getSetting('namesSkipped', false));
  let pending = [];
  if (usingCloud()) { try { pending = (await CloudDB.submissions({ status: 'pending' })).filter((t) => all.some((r) => r.id === t.record_id && isMine(r))); } catch (e) { pending = []; } }
  let myTasks = [];
  if (usingCloud()) { try { myTasks = await CloudDB.partnerTasks(); } catch (e) { myTasks = []; } }
  const myTodo = myTasks.filter((t) => !t.submission || t.submission.status !== 'pending').length;
  let partnerLeft = null;
  let endedWith = null;
  if (usingCloud()) {
    try { partnerLeft = await DB.getSetting('partnerLeft', null); } catch (e) { partnerLeft = null; }
    try { endedWith = localStorage.getItem(`endedWith:${CloudDB.myId()}`); } catch (e) { endedWith = null; }
  }
  let joinReqs = [];
  let hasPartner = true;
  if (usingCloud()) {
    try { const ps = await CloudDB.listPartners(); joinReqs = ps.filter((p) => p.approved === false); hasPartner = ps.some((p) => p.approved !== false); } catch (e) { joinReqs = []; }
  }
  let inviteHidden = false;
  try { inviteHidden = !!localStorage.getItem('inviteCardHidden'); } catch (e) { /* 略過 */ }
  const showInvite = usingCloud() && !hasPartner && !joinReqs.length && !inviteHidden;
  // 「一年前的今天」只挑美好時刻，免得一打開就看到舊的烏雲
  const memory = all.filter((r) => r.type === 'happy' && DATE_RE.test(r.date || '') && r.date.slice(5) === today().slice(5) && r.date < today()).sort(byDateDesc)[0];
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  // 烏雲不當成要集滿的目標，改看「美好：烏雲」的比例（研究說幸福的情侶大約是 5 : 1）
  const ratioText = () => {
    const h = count('happy');
    const c = count('cloud');
    const ratio = c ? h / c : 0;
    if (!c) return h ? '還沒有烏雲，繼續保持 ☀️' : '記下不開心的時刻';
    return `美好 : 烏雲 = ${ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10} : 1${ratio >= 5 ? '（達到 5 : 1 了！）' : ''}`;
  };
  const wishes = await loadWishesSafe();
  const nHappy = count('happy');
  const stamps = allStamps(all);
  const gotStamps = stamps.filter((x) => x.got).length;
  const taskSub = pending.length ? `${pending.length} 個等你確認` : myTodo ? `${esc(partnerName())}出了 ${myTodo} 個給你` : '上鎖紀錄的解鎖任務';
  const shareSub = !usingCloud() ? '註冊後就能邀請對方一起寫' : hasPartner ? `${esc(partnerName())}已加入・邀請、暫停分享` : joinReqs.length ? '有人想加入，等你同意' : '還沒邀請・傳邀請連結給對方';
  const tilesHtml = [
    homeTile({ href: '#/list/happy', icon: ICON.heart, color: 'var(--happy)', title: '美好時刻', sub: `${nHappy} / ${TYPES.happy.goal}`,
      extra: `${splitLine(nHappy, all.filter((r) => r.type === 'happy' && isMine(r)).length)}${nHappy >= TYPES.happy.goal ? '<span class="small bold" style="color:var(--happy-dark)">集滿 100 個了！</span>' : ''}` }),
    homeTile({ href: '#/list/cloud', icon: ICON.cloud, color: 'var(--cloud)', title: '烏雲時刻', sub: ratioText() }),
    homeTile({ href: '#/fights', icon: ICON.bolt, color: 'var(--fight)', title: '吵架議題', sub: fightSub(fights) }),
    wishTile(wishes),
    homeTile({ href: '#/stamps', icon: TILE_ICON.stamp, color: 'var(--cloud)', title: '印章冊', sub: `已集 ${gotStamps} / ${stamps.length}` }),
    usingCloud() ? homeTile({ href: '#/tasks', icon: ICON.lock, color: 'var(--lock)', title: '解鎖任務', sub: taskSub }) : '',
    homeTile({ href: isGuest() ? '#/signup' : '#/settings', icon: TILE_ICON.share, color: 'var(--happy-dark)', title: '分享給另一半', sub: shareSub, id: 'tile-share', cls: 'ftile-wide' }),
  ].join('');

  app.innerHTML = `
    <div class="row between">
      <div>
        <div class="hello">${NAMES.me ? `嗨，${esc(NAMES.me)}・` : ''}今天是 ${longDate(today())}</div>
        <h1 class="title-xl">${esc(diaryTitle())}</h1>
        ${togetherDays() ? `<div class="small muted">在一起第 ${togetherDays()} 天</div>` : ''}
      </div>
      <a class="icon-btn gear-btn" href="#/settings" aria-label="設定">${ICON.gear}<span>設定</span></a>
    </div>
    ${quickRecord('今天想記下什麼？')}
    ${joinReqs.map((j) => `<div class="card join-req" style="background:var(--lock-bg);border-color:transparent;gap:8px">
      <div class="bold" style="color:var(--lock)">${esc(j.name)} 想加入你們的日記</div>
      <div class="small" style="color:var(--lock)">是你的另一半就按「同意」，同意後對方就能看到分享的紀錄、一起寫。不認識的人請按「拒絕」。</div>
      <div class="btn-row"><button class="btn small" data-home-approve="${esc(j.uid)}" data-name="${esc(j.name)}">同意</button><button class="btn small secondary" data-home-reject="${esc(j.uid)}" data-name="${esc(j.name)}">拒絕</button></div>
    </div>`).join('')}
    ${showInvite ? `<div class="card" id="invite-card" style="background:var(--happy-bg);border-color:transparent;gap:8px">
      <div class="bold" style="color:var(--happy-dark)">邀請另一半一起寫</div>
      <div class="small" style="color:var(--happy-dark)">傳邀請連結給另一半，對方加入後就能看你分享的紀錄，也能寫自己的美好時刻。</div>
      <div class="btn-row"><a class="btn small" href="#/settings" id="invite-go">去邀請</a><button class="btn small secondary" id="invite-hide">之後再說</button></div>
    </div>` : ''}
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
      <div class="bold" style="color:var(--happy-dark)">${all.length ? '註冊，把紀錄存到雲端' : '免費註冊，保存你們的紀錄'}</div>
      <div class="small" style="color:var(--happy-dark)">${all.length ? `目前 ${all.length} 則紀錄只存在這支手機。` : '現在是試用，紀錄只存在這支手機。'}在這支手機註冊或登入後會自動搬上雲端，換手機不會不見，也能分享給另一半 ›</div>
      ${isIOS && standalone && !all.length ? '<div class="small" style="color:var(--happy-dark)">之前在 Safari 寫過的話：從主畫面打開的和 Safari 是分開存的。請回 Safari 打開網址、註冊或登入，紀錄就會搬上雲端，再回來這裡登入同一個帳號就看得到。</div>' : ''}
    </a>` : ''}
    ${partnerLeft ? `<div class="card" id="partner-left" style="background:var(--lock-bg);border-color:transparent;gap:6px">
      <div class="bold" style="color:var(--lock)">${esc(partnerLeft.name)}結束了這段關係</div>
      <div class="small" style="color:var(--lock)">${esc(partnerLeft.name)}已經看不到你的紀錄了。之前的紀錄要封存（收起來，只有你看得到）還是刪除？之後分享給新的人，對方就看不到這些。</div>
      <div class="btn-row"><a class="btn small" href="#/end">封存或刪除</a><button class="btn small secondary" id="partner-left-ok">先保留</button></div>
    </div>` : ''}
    ${endedWith ? `<div class="card" id="ended-with" style="gap:6px">
      <div class="bold">和${esc(endedWith)}的分享已經結束了</div>
      <div class="small muted">這裡是你自己的空間，可以開始記自己的紀錄，也可以匯入之前匯出的備份。</div>
      <button class="btn small secondary" id="ended-with-ok" style="align-self:flex-start">知道了</button>
    </div>` : ''}
    ${newFromOtherCard(all)}
    ${pending.length ? `<a class="card" href="#/view/${esc(pending[0].record_id)}" style="background:var(--lock-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--lock)">有 ${pending.length} 個任務等你確認</div>
      <div class="small" style="color:var(--lock)">${esc(pending[0].partner_name)} 完成了任務，點這裡去看看，確認後那則紀錄就會解鎖給對方看。</div>
    </a>` : ''}
    ${myTodo ? `<a class="card" href="#/tasks" id="my-tasks-card" style="background:var(--lock-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--lock)">${esc(partnerName())}出了 ${myTodo} 個任務給你</div>
      <div class="small" style="color:var(--lock)">完成任務、${esc(partnerName())}確認之後，就能看到那則上鎖的紀錄 ›</div>
    </a>` : ''}
    ${memory ? `<a class="card theme-happy" href="#/view/${esc(memory.id)}" style="background:var(--happy-bg);border-color:transparent;gap:4px">
      <div class="small bold" style="color:var(--happy-dark)">${Number(today().slice(0, 4)) - Number(memory.date.slice(0, 4))} 年前的今天</div>
      <div class="bold">${esc(memory.title)}</div>
    </a>` : ''}
    <div class="section-title">所有功能</div>
    <div class="home-tiles">${tilesHtml}</div>
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
  const ts = document.getElementById('tile-share');
  if (ts && isGuest()) ts.addEventListener('click', (ev) => { ev.preventDefault(); track('signup_prompt', { where: 'share' }); showSignupSheet('註冊後就能分享給另一半', '傳一個邀請連結給對方，兩個人就能一起看、一起寫。現在試用寫的紀錄，註冊後會自動搬上雲端。'); });
  ['invite-go', 'tile-share'].forEach((id) => {
    const el = document.getElementById(id);
    if (el && el.getAttribute('href') === '#/settings') el.addEventListener('click', () => { try { sessionStorage.setItem('jumpShare', '1'); } catch (e) { /* 略過 */ } });
  });
  const ih = document.getElementById('invite-hide');
  if (ih) ih.addEventListener('click', () => { try { localStorage.setItem('inviteCardHidden', '1'); } catch (e) { /* 略過 */ } document.getElementById('invite-card').remove(); });
  app.querySelectorAll('[data-home-approve]').forEach((b) => b.addEventListener('click', async () => {
    if (await approveJoin(b, b.dataset.homeApprove, b.dataset.name)) viewHome();
  }));
  app.querySelectorAll('[data-home-reject]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm(`拒絕「${b.dataset.name}」加入？`)) return;
    await CloudDB.removePartner(b.dataset.homeReject);
    toast('已拒絕');
    viewHome();
  }));
  const plOk = document.getElementById('partner-left-ok');
  if (plOk) plOk.addEventListener('click', () => withBusy(plOk, '', async () => { await DB.setSetting('partnerLeft', null); document.getElementById('partner-left').remove(); }));
  const ewOk = document.getElementById('ended-with-ok');
  if (ewOk) ewOk.addEventListener('click', () => { try { localStorage.removeItem(`endedWith:${CloudDB.myId()}`); } catch (e) { /* 略過 */ } document.getElementById('ended-with').remove(); });
  const box = document.getElementById('recent');
  for (const r of recent) box.appendChild(await listItem(r));
  if (!all.length && !tourDone('owner')) showTour('owner');
}

// 對方新寫的紀錄：記在這支手機上「看過了沒」，列表加小點、首頁提示。
// 第一次用這個功能時，現有的都當作看過，免得一次冒出一大堆
let seenCache = null;
let seenFor = null;
const seenKey = () => `seenOthers:${CloudDB.myId()}`;
function seenSet() {
  if (seenFor !== seenKey()) { seenCache = null; seenFor = seenKey(); }
  if (seenCache) return seenCache;
  try { const raw = localStorage.getItem(seenKey()); seenCache = raw ? new Set(JSON.parse(raw)) : null; } catch (e) { seenCache = null; }
  return seenCache;
}
function saveSeen() { try { localStorage.setItem(seenKey(), JSON.stringify([...seenCache].slice(-3000))); } catch (e) { /* 略過 */ } }
function initSeen(all) {
  if (!usingCloud() || seenSet()) return;
  seenCache = new Set(all.filter((r) => !isMine(r)).map((r) => r.id));
  saveSeen();
}
const isNewFromOther = (r) => usingCloud() && !isMine(r) && !!seenSet() && !seenSet().has(r.id);
function markSeen(r) { if (!usingCloud() || isMine(r) || !seenSet() || seenCache.has(r.id)) return; seenCache.add(r.id); saveSeen(); }
function newFromOtherCard(all) {
  initSeen(all);
  const fresh = all.filter(isNewFromOther).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (!fresh.length) return '';
  return `<a class="card" id="new-from-other" href="#/view/${esc(fresh[0].id)}" style="gap:4px">
    <div class="row" style="gap:8px"><span class="new-dot" aria-hidden="true"></span><span class="bold">${esc(otherName())}最近寫了 ${fresh.length} 則新的</span></div>
    <div class="small muted">${fresh.slice(0, 3).map((r) => `${TYPES[r.type].short}「${esc(r.title)}」`).join('、')}${fresh.length > 3 ? '…' : ''}，點這裡從最新的開始看 ›</div>
  </a>`;
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
    <div class="item-emoji">${esc((r.emojis || [])[0] || '')}</div>${isNewFromOther(r) ? '<span class="new-dot" aria-label="新的"></span>' : ''}`;
  return a;
}

// ---------- 美好／烏雲列表 ----------
// 列表要看誰寫的：全部／我的／對方的（兩個人都有寫紀錄時才顯示）
let listWho = 'all';
async function viewList(type, tagFilter) {
  const conf = TYPES[type];
  const all = await liveRecords();
  const partner = isPartner();
  const ofType = all.filter((r) => r.type === type).sort(byDateDesc);
  // 對方上鎖的紀錄：只知道有幾則、編號，看不到內容
  const lockedOthers = usingCloud() ? (await CloudDB.othersLocked()).filter((x) => x.type === type) : [];
  const total = ofType.length + lockedOthers.length;
  const twoAuthors = usingCloud() && (lockedOthers.length > 0 || ofType.some((r) => !isMine(r))) && ofType.some((r) => isMine(r));
  const who = twoAuthors ? listWho : 'all';
  const mine = ofType.filter((r) => who === 'all' || (who === 'mine') === isMine(r));
  const tags = [...new Set(mine.flatMap((r) => r.tags || []))];
  const shown = tagFilter ? mine.filter((r) => (r.tags || []).includes(tagFilter)) : mine;
  const pct = Math.min(100, (total / conf.goal) * 100);

  app.className = conf.theme;
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/" aria-label="返回">${ICON.back}</a>
      <h1>${conf.label}</h1>
      <div class="count"><b style="font-size:16px;color:var(--accent)">${total}</b>${type === 'cloud' ? ' 則' : ` / ${conf.goal}`}</div>
    </div>
    ${type === 'cloud' ? `<div class="card mascot-hello" style="background:var(--cloud-bg);border-color:transparent">${mascotHtml('cloud', 120)}<div class="small" style="color:var(--cloud-dark)">不開心的時刻也值得記下來，心情過去了就按「已放晴」。</div></div>` : `<div class="progress" style="height:8px"><div style="width:${pct}%"></div></div>`}
    ${twoAuthors ? `<div class="chips">
      ${[['all', '全部'], ['mine', '我的'], ['other', `${esc(otherName())}的`]].map(([k, l]) => `<button class="chip ${k === who ? 'on' : ''}" data-who="${k}">${l}</button>`).join('')}
    </div>` : ''}
    ${tags.length ? `<div class="chips scroll">
      <button class="chip dark ${!tagFilter ? 'on' : ''}" data-tag="">全部</button>
      ${tags.map((t) => `<button class="chip ${t === tagFilter ? 'on' : ''}" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}
    </div>` : ''}
    <div class="grid2" id="grid"></div>
    ${mine.length || (who !== 'mine' && lockedOthers.length) ? '' : partner && !CloudDB.isBoundPartner() ? `<div class="empty">${esc(ownerName())}還沒有分享${conf.label}<a class="btn small secondary" href="#/bind">綁定帳號，自己也來寫</a></div>` : `<div class="empty">還沒有${who === 'other' ? `${esc(otherName())}分享的` : ''}${conf.label}${who === 'other' ? '' : `<a class="btn small" href="#/new/${type}">新增第一則</a>`}</div>`}
  `;
  app.querySelectorAll('[data-tag]').forEach((b) => b.addEventListener('click', () => viewList(type, b.dataset.tag || null)));
  app.querySelectorAll('[data-who]').forEach((b) => b.addEventListener('click', () => { listWho = b.dataset.who; viewList(type, tagFilter); }));

  const grid = document.getElementById('grid');
  const hearted = usingCloud() && type === 'happy' ? await CloudDB.heartedIds() : new Set();
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
    const lockNote = !isMine(r) ? (r.visibility === 'task' ? (justUnlocked(r) ? '剛解鎖！' : '任務解鎖的') : '')
      : r.visibility === 'locked' ? '上鎖・只有你看得到' : r.visibility === 'task' ? (r.unlocked ? '任務已解鎖' : '任務解鎖') : '';
    a.innerHTML = `${top}
      <div class="tile-body">
        <div class="bold" style="font-size:14px">${isNewFromOther(r) ? '<span class="new-dot" aria-label="新的"></span> ' : ''}${esc(r.title)}</div>
        <div class="muted small">${shortDate(r.date)} · ${esc((r.emojis || []).join(''))}</div>
        ${(r.tags || []).length ? `<div class="tile-tags">${esc(r.tags.map((t) => '#' + t).join(' '))}</div>` : ''}
        ${(r.reflections || []).length ? `<div class="small muted">💭 ${r.reflections.length} 則反思</div>` : ''}
        ${r.clearedAt ? '<div class="small" style="color:var(--resolved-ink)">☀️ 已放晴</div>' : ''}
        ${twoAuthors && who === 'all' ? `<div class="small muted">${isMine(r) ? '你寫的' : `${esc(r.authorName || otherName())}寫的`}</div>` : ''}
        ${hearted.has(r.id) ? `<div class="small" style="color:var(--happy-dark)">❤️ ${isMine(r) ? `${esc(otherName())}按了愛心` : '你按了愛心'}</div>` : ''}
        ${lockNote ? `<div class="small row" style="color:var(--lock);gap:4px">${ICON.lockSmall}${lockNote}</div>` : ''}
      </div>`;
    grid.appendChild(a);
  }
  // 對方上鎖的紀錄只顯示「這一則上鎖了」，看不到內容
  if (!tagFilter && who !== 'mine') {
    for (const l of lockedOthers) {
      const d = document.createElement('div');
      d.className = 'card tile';
      d.innerHTML = `<div class="tile-default tile-lock">${ICON.lock}<div class="no">${l.no ? `No. ${Number(l.no)}` : ''}</div></div>
        <div class="tile-body"><div class="bold small" style="color:var(--lock)">上鎖的紀錄</div><div class="muted small">${esc(otherName())}還沒有打開這一則</div></div>`;
      grid.appendChild(d);
    }
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

  const lockedFights = isPartner() && !catFilter && !statusFilter ? (await CloudDB.partnerLocked()).filter((x) => x.type === 'fight').length : 0;
  const partner = isPartner();
  const myId = usingCloud() ? CloudDB.myId() : null;
  const byOther = (f) => usingCloud() && f.author && f.author !== myId;
  const openCount = fights.filter((f) => (f.status || 'open') !== 'resolved').length;
  app.className = 'theme-fight';
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/" aria-label="返回">${ICON.back}</a>
      <h1>吵架議題</h1>
    </div>
    ${openCount ? `<div class="card mascot-hello" style="background:var(--fight-bg);border-color:transparent">${mascotHtml('fight', 120)}<div class="small" style="color:var(--fight-dark)">還有 ${openCount} 個沒解決。先深呼吸，再慢慢聊。</div></div>` : ''}
    ${partner ? `<a class="btn" href="${CloudDB.isBoundPartner() ? '#/new/fight' : '#/bind'}">＋ 新增議題</a>
      ${CloudDB.isBoundPartner() ? '' : `<div class="small muted">綁定帳號後，就能和${esc(ownerName())}一起新增、更新吵架議題。</div>`}` : ''}
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
          <div class="bold" style="font-size:16px">${isNewFromOther(f) ? '<span class="new-dot" aria-label="新的"></span> ' : ''}${esc(f.title)}</div>
          <div class="muted small">${shortDate(f.date)} · ${extra} ${esc((f.emojis || []).join(''))}${byOther(f) ? ` · ${esc(f.authorName || (partner ? ownerName() : partnerName()))}新增` : ''}</div>
        </a>`;
      }).join('')}
    </div>
    ${lockedFights ? `<div class="card" style="background:var(--lock-bg);border-color:transparent;gap:4px;flex-direction:row;align-items:center">${ICON.lockSmall}<span class="small" style="color:var(--lock)">另外還有 ${lockedFights} 則上鎖的吵架議題</span></div>` : ''}
    ${fights.length ? (shown.length ? '' : '<div class="empty">這個條件下沒有議題</div>') : isPartner() ? (lockedFights ? '' : '<div class="empty">還沒有吵架議題</div>') : `<div class="empty">還沒有吵架議題，很棒！<a class="btn small" href="#/new/fight">新增一個議題</a></div>`}
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
  markSeen(r);
  const bound = partner && CloudDB.isBoundPartner();
  // 吵架議題兩個人都能改：主人全部都能改；另一半要綁定帳號，而且是分享給他的議題
  const fightEdit = r.type === 'fight' && (!partner || (bound && r.visibility === 'shared'));
  // 誰新增的（舊紀錄沒有記，就是主人）
  const mine = isMine(r);
  // 分類被刪掉的舊議題：標示出來（另一半沒有你的分類清單，不標）
  const catDeleted = r.type === 'fight' && r.category && !partner && mine && !(await getCategories()).includes(r.category);
  const authorText = usingCloud() && r.author ? `${authorLabel(r)}新增的` : '';
  const canDelete = partner ? bound && mine : mine;
  const backHref = r.archivedAt ? '#/archive' : r.type === 'fight' ? '#/fights' : `#/list/${r.type}`;
  const urls = [];
  for (const pid of r.photoIds || []) { const u = await photoUrl(pid); if (u) urls.push(u); }

  let photos = '';
  if (urls.length) photos = `<div class="detail-photos">${urls.map((u) => `<img src="${u}" alt="">`).join('')}</div>`;
  else if (r.type !== 'fight') photos = `<div class="detail-default">${r.type === 'happy' ? ICON.bigHeart : ICON.bigCloud}<div class="no" style="font-family:'Noto Serif TC',serif">No. ${numberOf(r, all)}</div></div>`;

  const visText = !mine ? '' : visLabel(r.visibility || 'shared') + (r.visibility === 'task' && r.unlocked ? '・已解鎖' : '');
  let task = '';
  if (r.visibility === 'task' && r.task && r.task.text) {
    const modeText = r.task.mode === 'photo' ? '要上傳照片' : '按完成就好';
    if (!mine) {
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
        const stText = { pending: '等你確認', approved: '已通過', rejected: '已退回' }[sub.status] + (sub.status === 'rejected' && sub.review_note ? `：${esc(sub.review_note)}` : '');
        subCards.push(`<div class="card" style="gap:6px">
          <div class="row between"><span class="bold">${esc(sub.partner_name)} 送出的任務</span><span class="small muted">${shortDate(sub.created_at.slice(0, 10))}・${stText}</span></div>
          ${sub.note ? `<div class="prose">${esc(sub.note)}</div>` : ''}
          ${img}
          ${sub.status === 'pending' ? `<div class="btn-row"><button class="btn small" data-approve="${esc(sub.id)}">通過並解鎖</button><button class="btn small secondary" data-reject="${esc(sub.id)}" data-photo="${esc(sub.photo_path || '')}">退回</button></div>` : ''}
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
      ${!mine ? (r.clearedAt ? `<div class="card" style="background:var(--resolved-bg);border-color:transparent;color:var(--resolved-ink)">☀️ ${shortDate(dateOf(r.clearedAt))} 已經放晴了</div>` : '')
        : `<div class="card" style="background:${r.clearedAt ? 'var(--resolved-bg)' : 'var(--cloud-bg)'};border-color:transparent;gap:6px">
          <div class="bold" style="color:${r.clearedAt ? 'var(--resolved-ink)' : 'var(--cloud-dark)'}">${r.clearedAt ? `☀️ ${shortDate(dateOf(r.clearedAt))} 已放晴` : '這片烏雲還在嗎？'}</div>
          <div class="small muted">${r.clearedAt ? '心情又回來了的話，可以取消放晴。' : '心情過去了、想通了，就按「已放晴」，印章冊的「烏雲放晴」會加 1。'}</div>
          <button class="btn small ${r.clearedAt ? 'secondary' : ''}" id="clear-btn" style="align-self:flex-start">${r.clearedAt ? '取消放晴' : '☀️ 已放晴'}</button>
        </div>`}
      <div class="field"><div class="label">事後反思</div>
        <div class="timeline">
          ${rf.length ? rf.map((f, i) => `<div class="tl-item">
            <div class="tl-rail"><div class="tl-dot"></div>${i < rf.length - 1 ? '<div class="tl-line"></div>' : ''}</div>
            <div class="tl-body"><div class="muted small">${shortDate(f.date)}</div><div class="prose">${esc(f.text)}</div>${!mine ? '' : `<button class="tl-del" data-del-rf="${esc(f.id)}">刪除</button>`}</div>
          </div>`).join('') : `<div class="muted">${!mine ? '還沒有反思。' : '冷靜下來之後，想法有沒有不一樣？可以隨時回來補寫。'}</div>`}
        </div>
      </div>
      ${!mine ? '' : `<div class="field"><label for="rf-text">寫下現在的想法</label>
        <input id="rf-date" class="input" type="date" min="1970-01-01" max="${today()}" value="${today()}" aria-label="反思日期">
        <textarea id="rf-text" class="textarea" maxlength="${LIMITS.reflection}" style="min-height:70px" placeholder="例如：後來想想，他那天其實很累，我也可以先問問他"></textarea>
        <button class="btn small" id="rf-add" style="align-self:flex-start">加入反思</button>
      </div>`}`;
  }

  // 另一半的回應：美好時刻的愛心、吵架議題的補充（雲端版才有）
  let notesPart = '';
  if (usingCloud() && (r.type === 'happy' || r.type === 'fight')) {
    const notes = await CloudDB.partnerNotes(r.id);
    const hearts = notes.filter((n) => n.kind === 'heart');
    const pnotes = notes.filter((n) => n.kind === 'note');
    // 對方寫的美好時刻：按愛心讓對方知道你也喜歡（兩個人都可以按）
    if (r.type === 'happy' && !mine) {
      const myHeart = hearts.some((h) => h.partner === CloudDB.myId());
      notesPart = `<button class="btn ${myHeart ? '' : 'secondary'}" id="heart-btn">${myHeart ? '❤️ 你喜歡這則（再按一次收回）' : '🤍 按愛心，讓' + authorLabel(r) + '知道你也喜歡'}</button>`;
    } else if (r.type === 'happy' && hearts.length) {
      notesPart = `<div class="card" style="background:var(--happy-bg);border-color:transparent;flex-direction:row;align-items:center"><span style="font-size:20px">❤️</span><span class="bold" style="color:var(--happy-dark)">${esc(hearts[0].partner_name)} 按了愛心</span></div>`;
    } else if (r.type === 'fight' && ((partner && !bound) || pnotes.length)) {
      notesPart = `<div class="card theme-fight" style="gap:10px">
        <div class="bold" style="color:var(--fight)">${partner ? '我的補充' : `${esc(pnotes[0].partner_name)}的補充`}</div>
        ${partner && !bound ? `<div class="muted small">${esc(ownerName())}寫的內容你不能改，但可以在這裡補充你的想法，${esc(ownerName())}看得到。</div>` : ''}
        ${pnotes.map((n) => `<div class="field" style="gap:4px">
          <div class="row between"><span class="small muted">${shortDate(n.created_at.slice(0, 10))}</span>${partner ? `<button class="btn small secondary" data-del-pn="${esc(n.id)}">刪除</button>` : ''}</div>
          <div class="prose">${esc(n.text)}</div></div>`).join('')}
        ${partner && !bound ? `<textarea id="pn-text" class="input" rows="3" maxlength="${LIMITS.fightText}" placeholder="例如：我那天其實是因為…"></textarea>
        <button class="btn small" id="pn-add">送出補充</button>` : ''}
      </div>`;
    }
  }

  let fightPart = '';
  if (r.type === 'fight') {
    const s = r.status || 'open';
    const fu = r.followUps || [];
    const myLabel = partner ? `${esc(ownerName())}的想法` : `${esc(myName())}的想法`;
    const theirLabel = partner ? `${esc(CloudDB.partnerInfo().name)}的想法` : `${esc(partnerName())}的想法`;
    fightPart = `
      ${!fightEdit
        ? `<div class="field"><div class="label">狀態</div><span class="badge ${STATUS[s].cls}" style="align-self:flex-start">${STATUS[s].label}</span></div>
           ${s === 'resolved' && r.resolution ? `<div class="card"><div class="small bold" style="color:var(--fight)">我們怎麼解決的</div><p class="prose">${esc(r.resolution)}</p></div>` : ''}`
        : `<div class="field"><div class="label">狀態</div>
        <div class="opts cols-3">${Object.entries(STATUS).map(([k, v]) => `<button class="opt ${k === s ? 'on' : ''}" data-status="${k}">${v.label}</button>`).join('')}</div>
        ${s === 'resolved' ? '' : '<div class="small muted">和好之後按「已解決」，印章冊的「吵架和好」就會加 1。</div>'}
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
            <div class="tl-body"><div class="muted small">${shortDate(f.date)}${f.by ? `・${esc(f.by)}` : ''}</div><div>${esc(f.text)}</div>${fightEdit ? `<button class="tl-del" data-del-fu="${esc(f.id)}">刪除</button>` : ''}</div>
          </div>`).join('') : `<div class="muted">${fightEdit ? '還沒有後續，發生新進展時記下來吧。' : '還沒有後續。'}</div>`}
        </div>
      </div>
      ${partner && !bound && r.visibility === 'shared' ? `<a class="card" href="#/bind" style="background:var(--fight-bg);border-color:transparent;gap:4px">
        <div class="bold" style="color:var(--fight-dark)">想一起更新狀態、寫後續？</div>
        <div class="small muted">綁定 Email 或 Google 帳號後，就能和${esc(ownerName())}一起編輯吵架議題 ›</div></a>` : ''}
      ${!fightEdit ? '' : `<div class="field"><label for="fu-text">新增後續</label>
        <input id="fu-date" class="input" type="date" min="1970-01-01" max="${today()}" value="${today()}" aria-label="後續日期">
        <div class="row"><input id="fu-text" class="input grow" maxlength="${LIMITS.followUp}" placeholder="發生了什麼新進展？"><button class="btn small" id="fu-add">加入</button></div>
      </div>`}`;
  }

  app.className = conf.theme;
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="${backHref}" aria-label="返回">${ICON.back}</a>
      <div class="grow"></div>
      ${r.archivedAt ? '' : (mine && (!partner || bound)) || fightEdit ? `<a class="btn small secondary" href="#/edit/${esc(r.id)}">編輯</a>` : ''}
    </div>
    ${r.archivedAt ? `<div class="card" style="background:var(--lock-bg);border-color:transparent"><div class="small" style="color:var(--lock)">這是 ${shortDate(dateOf(r.archivedAt))} 封存的紀錄，只有你看得到。</div></div>` : ''}
    <div class="field" style="gap:6px">
      <div class="row" style="gap:8px">
        <span class="badge" style="background:var(--accent-bg);color:var(--accent-dark)">${r.type === 'fight' ? esc(r.category || '未分類') + (catDeleted ? '（已刪除的分類）' : '') : conf.label}</span>
        <span class="muted small">${longDate(r.date)}</span>
        ${authorText ? `<span class="muted small">・${authorText}</span>` : ''}
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
    ${notesPart}
    ${canDelete ? '<button class="btn danger" id="delete" style="margin-top:12px">刪除這則紀錄</button>' : ''}
    ${!partner && !canDelete ? `<div class="small muted" style="text-align:center">這則是${authorLabel(r)}寫的，只有${authorLabel(r)}能${r.type === 'fight' ? '刪除' : '修改和刪除'}。</div>` : ''}
  `;
  const heartBtn = document.getElementById('heart-btn');
  if (heartBtn) heartBtn.addEventListener('click', () => withBusy(heartBtn, '', async () => {
    const on = await CloudDB.toggleHeart(r.id);
    toast(on ? `已經讓${authorLabel(r)}知道你喜歡這則` : '已收回愛心');
    viewDetail(r.id);
  }));
  const pnAdd = document.getElementById('pn-add');
  if (pnAdd) pnAdd.addEventListener('click', () => {
    const text = document.getElementById('pn-text').value.trim();
    if (!text) { toast('先寫點什麼'); return; }
    withBusy(pnAdd, '送出中…', async () => {
      await CloudDB.addPartnerNote(r.id, text);
      toast(`已送出，${ownerName()}看得到`);
      viewDetail(r.id);
    });
  });
  app.querySelectorAll('[data-del-pn]').forEach((b) => b.addEventListener('click', () => {
    if (!confirm('刪除這則補充？')) return;
    withBusy(b, '', async () => { await CloudDB.deletePartnerNote(b.dataset.delPn); viewDetail(r.id); });
  }));
  if (fightEdit) {
    app.querySelectorAll('[data-status]').forEach((b) => b.addEventListener('click', () => withBusy(b, '', async () => {
      await updateRecord(r.id, (x) => { x.status = b.dataset.status; });
      track('fight_status_change', { status: b.dataset.status });
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
        let movedToProgress = false;
        await updateRecord(r.id, (x) => {
          const list = x.followUps || [];
          if (list.length >= LIMITS.followUpsPerFight) throw new Error(`每個議題最多 ${LIMITS.followUpsPerFight} 則後續`);
          x.followUps = list.concat({ id: DB.uid(), date, text, by: partner ? CloudDB.partnerInfo().name : myName() }).sort((a, b) => a.date.localeCompare(b.date));
          // 第一次加後續時，自動從「未解決」變成「處理中」
          if ((x.status || 'open') === 'open') { x.status = 'progress'; movedToProgress = true; }
        });
        if (movedToProgress) toast('已加入後續，狀態改成「處理中」');
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
  if (partner && canDelete) {
    const delBtn = document.getElementById('delete');
    delBtn.addEventListener('click', () => {
      if (!confirm(r.type === 'fight' ? `要刪除這個議題嗎？${ownerName()}那邊也會看不到。` : '要刪除這則嗎？刪除後就救不回來了。')) return;
      withBusy(delBtn, '', async () => {
        await CloudDB.partnerDeleteRecord(r.id);
        track('record_delete', { type: r.type });
        // 美好、烏雲是直接刪掉，照片也一起清掉（吵架議題會先放到最近刪除，照片先留著）
        if (r.type !== 'fight') for (const pid of r.photoIds || []) { try { await DB.deletePhoto(pid); } catch (e) { /* 之後再清 */ } }
        toast('已刪除'); go(backHref);
      });
    });
  }
  if (!mine) return;

  // 封存的紀錄在「封存的回憶」頁一起刪，這裡不單獨刪（刪了會找不到）
  if (r.archivedAt) { const d = document.getElementById('delete'); if (d) d.remove(); }
  const delBtn = partner || r.archivedAt ? null : document.getElementById('delete');
  if (delBtn) delBtn.addEventListener('click', async () => {
    if (!confirm(`要刪除這則嗎？會先移到設定頁的「最近刪除」，${TRASH_DAYS} 天內都可以救回來${usingCloud() ? '，這段時間對方也看不到' : ''}。`)) return;
    await updateRecord(r.id, (x) => { x.deletedAt = Date.now(); });
    track('record_delete', { type: r.type });
    toast(`已移到最近刪除，${TRASH_DAYS} 天內可以救回來`);
    go(backHref);
  });

  app.querySelectorAll('[data-approve]').forEach((b) => b.addEventListener('click', () => withBusy(b, '解鎖中…', async () => {
    await CloudDB.reviewSubmission(b.dataset.approve, true);
    track('task_approve');
    toast('已解鎖，對方看得到這則了');
    checkNewStamps().catch(() => {});
    viewDetail(r.id);
  })));
  app.querySelectorAll('[data-reject]').forEach((b) => b.addEventListener('click', () => {
    const why = prompt('退回這次的任務？對方可以再送一次。\n想說一下原因的話寫在這裡（可以不寫，最多 200 個字）：', '');
    if (why === null) return;
    withBusy(b, '', async () => {
      await CloudDB.reviewSubmission(b.dataset.reject, false, why.trim().slice(0, 200) || null);
      track('task_reject');
      // 退回的任務照片用不到了，順便刪掉
      if (b.dataset.photo) { try { await CloudDB.removeTaskPhoto(b.dataset.photo); } catch (e) { /* 刪不掉沒關係 */ } }
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
    const clearBtn = document.getElementById('clear-btn');
    clearBtn.addEventListener('click', () => withBusy(clearBtn, '', async () => {
      // 另一半的紀錄透過資料庫函式改，要明確送出「取消放晴」
      const wasCleared = !!r.clearedAt;
      const clearing = !r.clearedAt;
      await updateRecord(r.id, (x) => { if (x.clearedAt) { if (partner) x.clearedAt = null; else delete x.clearedAt; } else x.clearedAt = Date.now(); });
      if (clearing) track('cloud_cleared');
      if (!wasCleared) showClearMascot();
      viewDetail(r.id);
    }));
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

}

// ---------- 新增／編輯 ----------
// 新增到一半的草稿只存在這支手機（照片不存），存好或放棄時清掉
const DRAFT_KEY = 'couple-diary-draft';
let draftTimer = null;
function loadDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { return null; } }
function saveDraft(rec) {
  const hasText = rec.title || rec.description || rec.reason || rec.myView || rec.theirView;
  try { if (hasText) localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), rec: { ...rec, photoIds: [] } })); } catch (e) { /* 空間不足就算了 */ }
}
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* 略過 */ } }

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
    // 從「一起完成的事」過來：帶入標題和內容，不問草稿
    const prefill = type === 'happy' ? formPrefill : null;
    formPrefill = null;
    if (prefill) { rec.title = prefill.title; rec.description = prefill.description; rec.wishId = prefill.wishId; }
    // 上次寫到一半沒存（例如 App 被關掉）：問要不要接著寫
    const draft = prefill ? null : loadDraft();
    if (draft && draft.rec && TYPES[draft.rec.type]) {
      const label = draft.rec.title ? `「${draft.rec.title.slice(0, 20)}」` : '';
      if (confirm(`有一則${TYPES[draft.rec.type].label}${label}還沒儲存（${daysAgo(draft.savedAt) === 0 ? '今天' : daysAgo(draft.savedAt) + ' 天前'}寫的，照片要重新選）。要接著寫嗎？`)) {
        rec = { ...rec, ...draft.rec, id: rec.id, photoIds: [] };
      } else clearDraft();
    }
  }
  const all = await DB.allRecords();
  const cats = await getCategories();
  const originalType = rec.type;
  const partner = isPartner();
  // 另一半要先綁定帳號才能寫；能改自己寫的紀錄和分享的吵架議題。主人不能改另一半寫的美好、烏雲
  if (partner && !CloudDB.isBoundPartner()) { go('#/bind'); return; }
  if (mode === 'edit' && rec.type !== 'fight' && !isMine(rec)) { go(`#/view/${rec.id}`); return; }
  if (partner && mode === 'edit' && rec.type === 'fight' && rec.visibility !== 'shared') { go('#/fights'); return; }
  const fightAlwaysShared = () => rec.type === 'fight' && (mode === 'new' || originalVisibility === 'shared' || originalType !== 'fight');
  const originalVisibility = rec.visibility;
  const originalUnlocked = !!rec.unlocked;
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
    const catList = [...new Set([...cats, ...all.filter((x) => x.type === 'fight' && !x.deletedAt).map((x) => x.category).filter(Boolean), ...(rec.category ? [rec.category] : [])])];

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
      ${!partner || mode === 'new' ? `<div class="seg" style="grid-template-columns:repeat(3,minmax(0,1fr))">
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
        <div class="field"><label for="f-my">${esc(partner ? ownerName() : myName())}的想法</label>
          <textarea id="f-my" class="textarea" maxlength="${LIMITS.fightText}" style="min-height:70px">${esc(rec.myView)}</textarea></div>
        <div class="field"><label for="f-their">${esc(partner ? `${CloudDB.partnerInfo().name}（你）` : partnerName())}的想法</label>
          <textarea id="f-their" class="textarea" maxlength="${LIMITS.fightText}" style="min-height:70px">${esc(rec.theirView)}</textarea></div>
        <div class="field"><div class="label">狀態</div>
          <div class="opts cols-3">${Object.entries(STATUS).map(([k, v]) => `<button class="opt ${k === rec.status ? 'on' : ''}" data-status="${k}">${v.label}</button>`).join('')}</div></div>
      ` : `
        <div class="field"><label for="f-desc">描述</label>
          <textarea id="f-desc" class="textarea" maxlength="${LIMITS.description}" placeholder="發生了什麼？">${esc(rec.description)}</textarea></div>
      `}
      ${mode === 'edit' && !isMine(rec) ? `<div class="small muted">照片只有寫這則的${esc(otherName())}能改。</div>` : `<div class="field"><div class="label">照片${rec.type === 'happy' ? '（沒放會用預設圖）' : '（可不放）'}</div>
        <div class="photos">
          ${photoCells.join('')}
          <label class="photo-add">${ICON.camera}上傳<input type="file" accept="image/*" multiple class="visually-hidden" id="f-photos"></label>
        </div>${rec.type === 'fight' ? '<div class="small muted">上傳對話截圖前看一下：截圖裡可能有其他人的名字或訊息，需要的話先裁掉。</div>' : ''}</div>`}
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
      ${fightAlwaysShared() ? `<div class="small muted">${partner ? `吵架議題是兩個人的事，${esc(ownerName())}也看得到、也能一起更新。` : usingCloud() ? `吵架議題是兩個人的事，${esc(partnerName())}也看得到、也能一起更新狀態和後續。` : '吵架議題是兩個人的事，開啟分享後兩個人都看得到。'}</div>` : `<div class="field"><div class="label">誰可以看</div>
        <div class="opts cols-3">${Object.keys(VISIBILITY).map((k) => `<button class="opt ${k === rec.visibility ? 'on' : ''}" data-vis="${k}">${esc(visLabel(k))}</button>`).join('')}</div>
        ${rec.visibility === 'task' ? `
          <label for="f-task" class="muted">對方要完成的任務</label>
          <input id="f-task" class="input" maxlength="${LIMITS.task}" value="${esc(rec.task.text)}" placeholder="例如：帶我去吃早午餐，拍一張合照給我">
          <div class="muted">完成方式</div>
          <div class="opts cols-2">
            <button class="opt ${rec.task.mode !== 'photo' ? 'on' : ''}" data-taskmode="confirm">按「完成」就好</button>
            <button class="opt ${rec.task.mode === 'photo' ? 'on' : ''}" data-taskmode="photo">要上傳照片</button>
          </div>
          ${mode === 'edit' && originalUnlocked && originalVisibility === 'task' ? `<div class="small muted">這則已經解鎖了，改任務內容不會重新上鎖，${esc(otherName())}還是看得到。想收回的話，改成「上鎖」。</div>` : ''}` : ''}
        <div class="muted small">${partner ? `給${esc(ownerName())}看：${esc(ownerName())}看得到。上鎖：只有你看得到，${esc(ownerName())}只會看到「有一則上鎖」。任務解鎖：${esc(ownerName())}完成任務、你按通過後才看得到。` : usingCloud() ? '給對方看：對方用分享碼就看得到。上鎖：只有你看得到。任務解鎖：對方完成任務、你按通過後才看得到。' : (CLOUD_ENABLED ? '這個設定會先記下來；註冊登入並開啟分享碼後，對方就會依這個設定看到內容。' : '現在是單人版，這個設定會先記下來；換成雲端版並開啟分享碼後，對方就會依這個設定看到內容。') + '目前「上鎖」只是標記，拿到這支手機的人還是看得到。'}</div>
      </div>`}
      <button class="btn" id="save">${partner ? '儲存' : usingCloud() && (rec.visibility === 'shared' || fightAlwaysShared()) && rec.type !== 'happy' ? `儲存並給${esc(partnerName())}看` : '儲存紀錄'}</button>
    `;
    bind();
  }

  function rerender() { collect(); render(); }

  function bind() {
    app.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
      collect();
      if (b.dataset.type === rec.type) return;
      if (mode === 'edit' && b.dataset.type !== originalType && !confirm('換成別的類型後，這則會拿到新類型的新編號。確定要換嗎？')) return;
      if (mode === 'new' && (rec.emojis.length || rec.tags.length) && !confirm('換類型後，已經選的心情和標籤會清掉（標題、描述會保留）。確定要換嗎？')) return;
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
    app.oninput = () => { dirty = true; if (mode === 'new') { clearTimeout(draftTimer); draftTimer = setTimeout(() => { collect(); saveDraft(rec); }, 800); } };
    app.querySelector('.topbar .icon-btn').addEventListener('click', (ev) => {
      if ((dirty || newPhotos.size) && !confirm('還沒儲存，確定要離開嗎？寫的內容會不見。')) { ev.preventDefault(); return; }
      clearTimeout(draftTimer);
      if (mode === 'new') clearDraft();
    });
    app.querySelectorAll('[data-taskmode]').forEach((b) => b.addEventListener('click', () => { collect(); rec.task.mode = b.dataset.taskmode; render(); }));
    const photoInput = document.getElementById('f-photos');
    if (photoInput) photoInput.addEventListener('change', async (ev) => {
      collect();
      let files = [...ev.target.files];
      if (!files.length) return;
      const room = LIMITS.photosPerRecord - rec.photoIds.length;
      if (room <= 0) { toast(`每則最多 ${LIMITS.photosPerRecord} 張照片`); return; }
      if (files.length > room) { toast(`每則最多 ${LIMITS.photosPerRecord} 張，只加入前 ${room} 張`); files = files.slice(0, room); }
      // 雲端免費帳號的照片額度（這次要新增的也要算進去）
      let quotaNote = '';
      if (usingCloud()) {
        const q = await CloudDB.photoQuota();
        if (q && q.limit != null) {
          const left = q.limit - q.used - newPhotos.size;
          if (left <= 0) { ev.target.value = ''; showPaywall(q); return; }
          if (files.length > left) { quotaNote = `免費帳號的雲端照片只剩 ${left} 張，先加入前 ${left} 張`; files = files.slice(0, left); }
        }
      }
      toast(quotaNote || '照片處理中…');
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
      if (fightAlwaysShared()) rec.visibility = 'shared';
      if (rec.visibility === 'task' && !rec.task.text.trim()) { toast('請填寫解鎖任務'); return; }
      if (mode === 'edit' && usingCloud() && rec.type !== 'fight' && (originalVisibility === 'shared' || (originalVisibility === 'task' && originalUnlocked)) && rec.visibility !== 'shared'
        && !confirm(`這則之前${otherName()}看得到，改成不給看之後就看不到了，但${otherName()}可能已經看過內容。確定要改嗎？`)) return;
      if (mode === 'edit') {
        const latest = await DB.getRecord(rec.id);
        const byOther = latest && usingCloud() && latest.editedBy && latest.editedBy !== CloudDB.myId();
        if (latest && (latest.updatedAt || 0) !== loadedUpdatedAt
          && !confirm(`${byOther ? `${otherName()}剛剛也改了這則` : '這則剛剛在別的裝置改過了'}。要用你現在的內容覆蓋嗎？按「取消」會重新載入最新的內容。`)) {
          viewForm('edit', rec.id);
          return;
        }
        // 解鎖狀態以最新的為準（對方可能剛剛才完成任務）
        if (latest && latest.visibility === 'task' && rec.visibility === 'task') { rec.unlocked = latest.unlocked; rec.unlockedAt = latest.unlockedAt; }
      }
      // 照片先傳；傳到一半或存紀錄失敗時，把這次已經傳上去的照片刪掉，免得佔空間
      const uploaded = [];
      const cleanup = async () => { for (const id of uploaded) { try { await DB.deletePhoto(id); } catch (e) { /* 刪不掉就算了 */ } } };
      let up = 0;
      try {
        for (const [id, p] of newPhotos) {
          saveBtn.textContent = `上傳照片 ${++up} / ${newPhotos.size}…`;
          await DB.putPhoto({ id, blob: p.blob, recordId: rec.id, createdAt: Date.now() });
          uploaded.push(id);
          if (usingCloud()) { try { await CloudDB.putThumb(id, await compressImage(p.blob, THUMB_SIDE, 0.75)); } catch (e) { /* 之後列表會自動補 */ } }
        }
      } catch (e) { await cleanup(); throw e; }
      const now = Date.now();
      // 另一半新增的議題由資料庫編號
      if (!partner && (!rec.no || rec.type !== originalType)) rec.no = await nextNumber(rec.type);
      rec.v = RECORD_VERSION;
      if (mode === 'edit' && (contentKey(rec) !== loadedContent || newPhotos.size || removedPhotos.size)) rec.editedAt = Date.now();
      // 改成不是「任務解鎖」時，解鎖狀態就不再保留
      if (rec.visibility !== 'task') rec.unlocked = false;
      rec.createdAt = rec.createdAt || now;
      rec.updatedAt = now;
      // 記下最後是誰改的，兩個人同時改時可以說是誰
      if (usingCloud()) rec.editedBy = CloudDB.myId();
      try { await DB.putRecord(rec); } catch (e) { await cleanup(); throw e; }
      // 紀錄存好之後，才刪掉這次移除的舊照片
      for (const id of removedPhotos) { try { await DB.deletePhoto(id); } catch (e) { /* 之後再清 */ } photoUrlCache.delete(id); thumbUrlCache.delete(id); }
      dirty = false;
      clearTimeout(draftTimer);
      if (mode === 'new') clearDraft();
      if (mode === 'new' && rec.wishId) { try { await Wishes.update(rec.wishId, { record_id: rec.id }); } catch (e) { /* 連不到清單也沒關係 */ } }
      toast('已儲存');
      if (mode === 'new') {
        const before = (await liveRecords()).length;
        if (before === 1) track('first_record', { type: rec.type });
        track('record_create', { type: rec.type, visibility: rec.visibility || 'shared', has_photo: (rec.photoIds || []).length > 0, author: partner ? 'partner' : 'me' });
      } else track('record_edit', { type: rec.type });
      markA2hsPending();
      if (mode === 'new' && isGuest()) { try { if ((await liveRecords()).length >= 3) sessionStorage.setItem('signupNudge', '1'); } catch (e) { /* 略過 */ } }
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
  if (!data || data.app !== 'couple-diary' || !Array.isArray(data.records)) throw new Error('這不是啾啾日記的備份檔');
  for (const r of data.records) {
    if (!r || !SAFE_ID.test(r.id) || !TYPES[r.type]) throw new Error('備份檔內容不對，沒有匯入');
    if (r.photoIds && (!Array.isArray(r.photoIds) || !r.photoIds.every((x) => SAFE_ID.test(x)))) throw new Error('備份檔內容不對，沒有匯入');
    if (r.visibility && !VISIBILITY[r.visibility]) r.visibility = 'locked';
    if (r.status && !STATUS[r.status]) r.status = 'open';
    if (r.deletedAt != null && typeof r.deletedAt !== 'number') delete r.deletedAt;
    if (r.clearedAt != null && typeof r.clearedAt !== 'number') delete r.clearedAt;
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

// 閱讀版在 App 裡打開，按「存成 PDF」用手機的列印功能存檔（iPhone、Android 都內建）
function showReadView(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const css = [...doc.querySelectorAll('style')].map((x) => x.textContent).join('\n').replace(/(^|\})\s*body\s*\{/g, '$1:host{display:block;');
  const view = document.createElement('div');
  view.className = 'read-view';
  const isIOS = /iphone|ipad|ipod|Macintosh/i.test(navigator.userAgent);
  view.innerHTML = `<div class="read-toolbar">
      <button class="btn small secondary" id="read-close">關閉</button>
      <button class="btn small" id="read-print">存成 PDF</button>
    </div>
    <div class="read-hint small muted">${isIOS ? '按「存成 PDF」後，在列印畫面點右上角的分享按鈕，選「儲存到檔案」或直接傳給對方。' : '按「存成 PDF」後，印表機選「另存為 PDF」再按下載。'}</div>
    <div class="read-body"></div>`;
  const root = view.querySelector('.read-body').attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${css}</style>${doc.body.innerHTML}`;
  document.body.appendChild(view);
  document.body.classList.add('reading');
  const close = () => { view.remove(); document.body.classList.remove('reading'); document.title = oldTitle; };
  const oldTitle = document.title;
  document.title = doc.title || oldTitle; // 存 PDF 時的檔名
  view.querySelector('#read-close').addEventListener('click', close);
  view.querySelector('#read-print').addEventListener('click', () => window.print());
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
<title>啾啾日記（閱讀版 ${today()}）</title>
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

// 設定頁分成幾區，上方有捷徑可以直接跳過去
const SETTING_SECTIONS = [['share', '分享'], ['us', '我們'], ['records', '整理紀錄'], ['backup', '備份'], ['account', '帳號與安全'], ['other', '其他']];
async function viewSettings() {
  const cats = await getCategories();
  const everything = await DB.allRecords();
  const quota = usingCloud() ? await CloudDB.photoQuota() : null;
  let archivedCount = 0;
  if (usingCloud()) { try { archivedCount = (await CloudDB.archivedRecords()).length; } catch (e) { archivedCount = 0; } }
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
    <nav class="set-nav" aria-label="設定分類">${SETTING_SECTIONS.map(([id, label]) => `<button class="chip" data-jump="set-${id}">${label}</button>`).join('')}</nav>
    <h2 class="section-title set-sec" id="set-share">分享給另一半</h2>
    ${isGuest() ? `<div class="card" style="background:var(--happy-bg);border-color:transparent">
      <div class="bold" style="color:var(--happy-dark)">註冊或登入</div>
      <div class="small" style="color:var(--happy-dark)">現在的紀錄只存在這支手機。在這支手機註冊或登入後會自動搬上雲端，換手機不會不見，也能產生分享碼給另一半。</div>
      <a class="btn small" href="#/login">註冊／登入</a>
    </div>` : ''}
    ${shareCard}
    ${!usingCloud() && !isGuest() ? '<div class="card small muted">分享給另一半要用雲端帳號。</div>' : ''}
    <h2 class="section-title set-sec" id="set-us">我們</h2>
    <div class="card">
      <div class="bold">我們的名字</div>
      <div class="grid2">
        <div class="field"><label for="set-me">你的名字</label><input id="set-me" class="input" maxlength="${LIMITS.name}" value="${esc(NAMES.me)}"></div>
        <div class="field"><label for="set-partner">伴侶的名字</label><input id="set-partner" class="input" maxlength="${LIMITS.name}" value="${esc(NAMES.partner)}"></div>
      </div>
      <div class="field"><label for="set-since">在一起的日期（可不填，首頁會顯示在一起第幾天）</label><input id="set-since" class="input" type="date" min="1970-01-01" max="${today()}" value="${esc(NAMES.since || '')}"></div>
      <button class="btn small" id="save-names">儲存</button>
    </div>
    <div class="card" style="gap:10px">
      <div class="bold">吉祥物顏色</div>
      <div class="small muted">啾啾和啵啵的顏色可以自己挑${usingCloud() ? `，${esc(partnerName())}看到的也是這個顏色` : ''}。</div>
      <div id="mascot-preview" style="align-self:center">${mascotHtml('happy', 150)}</div>
      ${[['left', '左邊（啾啾）'], ['right', '右邊（啵啵）']].map(([side, label]) => `<div class="field" style="gap:6px"><div class="label">${label}</div>
        <div class="swatches">${(window.Mascot ? window.Mascot.COLORS : []).map(([n, body]) => {
          const on = ((MASCOT_PICK || (window.Mascot && window.Mascot.DEFAULT) || {})[side]) === n;
          return `<button class="swatch ${on ? 'on' : ''}" data-mside="${side}" data-mcolor="${esc(n)}" aria-pressed="${on}" title="${esc(n)}"><span style="background:${body}"></span>${esc(n)}</button>`;
        }).join('')}</div></div>`).join('')}
    </div>
    <h2 class="section-title set-sec" id="set-records">整理紀錄</h2>
    <div class="card">
      <div class="bold">吵架議題分類</div>
      <div class="small muted">點分類名字可以改名，用這個分類的議題會一起改。</div>
      <div class="chips">${cats.map((c) => `<span class="chip" style="display:inline-flex;align-items:center;gap:6px"><button data-edit-cat="${esc(c)}" aria-label="改名 ${esc(c)}" style="border:none;background:none;padding:0;font:inherit;color:inherit">${esc(c)}</button><button data-rm-cat="${esc(c)}" aria-label="刪除 ${esc(c)}" style="border:none;background:none;padding:0;display:flex">${ICON.x}</button></span>`).join('')}</div>
      <div class="row"><input id="new-cat" class="input grow" maxlength="${LIMITS.category}" placeholder="新增分類"><button class="btn small" id="add-cat">加入</button></div>
    </div>
    ${usedTags.length ? `<div class="card">
      <div class="bold">管理標籤</div>
      <div class="muted small">點一個標籤可以改名或刪除，所有用到它的紀錄會一起改。</div>
      <div class="chips">${usedTags.map(([t, n]) => `<button class="chip" data-edit-tag="${esc(t)}">#${esc(t)} <span class="muted">${n}</span></button>`).join('')}</div>
    </div>` : ''}
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
      <div class="bold">重新編號</div>
      <div class="muted">每則紀錄的 No. 在新增時就固定，刪除後會留下空號。想讓號碼重新連續的話，可以依日期從 1 重新排一次${usingCloud() ? '，另一半看到的號碼也會一起更新' : ''}。</div>
      <button class="btn small secondary" id="renumber">依日期重新編號</button>
    </div>
    <h2 class="section-title set-sec" id="set-backup">備份與匯出</h2>
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
      <div class="muted">把所有紀錄和照片排成一本小冊子，可以存成 PDF 或列印，傳給對方也很方便。閱讀版不能用來還原。</div>
      <label class="row small" style="gap:8px"><input type="checkbox" id="read-shared-only"> 只匯出「給對方看」和已解鎖的紀錄（適合直接傳給對方）</label>
      <button class="btn small secondary" id="export-read">製作閱讀版（PDF）</button>
    </div>
    <h2 class="section-title set-sec" id="set-account">帳號與安全</h2>
    ${usingCloud() ? `<div class="card">
      <div class="bold">雲端帳號</div>
      <div class="muted">已登入 ${esc(CloudDB.currentEmail())}，紀錄和照片都存在雲端，換手機只要登入同一個帳號就能看到。目前共 ${all.length} 則紀錄。</div>
      ${quota ? `<div class="small">雲端照片：${quota.used}${quota.limit != null ? ` / ${quota.limit} 張（免費帳號，兩個人共用）` : ' 張（不限張數）'}${quota.mine != null && quota.used > quota.mine ? `・你 ${quota.mine} 張、${esc(partnerName())} ${quota.used - quota.mine} 張` : ''}</div>
        ${quota.limit != null ? `<div class="progress" style="height:6px"><div style="width:${Math.min(100, (quota.used / quota.limit) * 100)}%"></div></div>
        <button class="btn small secondary" id="more-photos">${ICON.lockSmall} 想放更多照片？</button>` : ''}` : ''}
      <button class="btn small secondary" id="logout">登出</button>
    </div>
    ${localCount ? `<div class="card" style="background:var(--progress-bg);border-color:transparent">
      <div class="bold" style="color:var(--progress-ink)">把這支手機裡的紀錄搬上雲端</div>
      <div class="small" style="color:var(--progress-ink)">這支手機裡還有 ${localCount} 則以前存的紀錄。${migratedAt ? `上次搬的時間是 ${daysAgo(migratedAt) === 0 ? '今天' : daysAgo(migratedAt) + ' 天前'}，再搬一次也不會重複。` : '搬上去之後，手機裡的也會留著當備份。'}</div>
      <button class="btn small" id="migrate">搬上雲端</button>
    </div>` : ''}` : ''}
    ${pinCardHtml()}
    ${usingCloud() ? `<div class="card" id="end-card">
      <div class="bold">結束這段關係</div>
      <div class="muted">分開了、或要和新的對象開始，可以把目前的紀錄封存（收起來，只有你看得到）或刪除。另一半會被移除，分享碼也會作廢。</div>
      <a class="btn small secondary" href="#/end">結束這段關係…</a>
      ${archivedCount ? `<a class="btn small secondary" href="#/archive">封存的回憶（${archivedCount} 則）</a>` : ''}
    </div>` : ''}
    <div class="card">
      <div class="bold" style="color:#9B2C1F">清除所有資料</div>
      <div class="muted">${usingCloud() ? '會刪掉雲端上你所有的紀錄和照片，也會停止分享、移除另一半，沒辦法復原。' : '會刪掉這支手機上所有紀錄和照片，沒辦法復原。'}</div>
      <button class="btn small danger" id="wipe">全部清除</button>
      ${usingCloud() ? '<button class="btn small secondary" id="delete-account">刪除帳號</button>' : ''}
    </div>
    <h2 class="section-title set-sec" id="set-other">其他</h2>
    ${tourCard()}
    ${analyticsCard()}
    ${feedbackCard()}
  `;

  app.querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', () => {
    const el = document.getElementById(b.dataset.jump);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: 'smooth' });
  }));
  if (location.hash.includes('#share') || sessionStorage.getItem('jumpShare')) {
    try { sessionStorage.removeItem('jumpShare'); } catch (e) { /* 略過 */ }
    const el = document.getElementById('set-share'); if (el) el.scrollIntoView();
  }
  if (usingCloud()) bindShareCard();
  bindPinCard(viewSettings);
  app.querySelectorAll('[data-mside]').forEach((b) => b.addEventListener('click', async () => {
    const pick = { ...(MASCOT_PICK || window.Mascot.DEFAULT), [b.dataset.mside]: b.dataset.mcolor };
    MASCOT_PICK = pick;
    document.getElementById('mascot-preview').innerHTML = mascotHtml('happy', 150);
    app.querySelectorAll(`[data-mside="${b.dataset.mside}"]`).forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    try { await DB.setSetting('mascot', pick); } catch (e) { toast('顏色沒有存成功：' + cloudErrorText(e)); }
  }));
  const more = document.getElementById('more-photos');
  if (more) more.addEventListener('click', () => showPaywall(quota));
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
    const file = new Blob([JSON.stringify(data)], { type: 'application/json' });
    downloadFile(file, `our-records-RESTORE-backup-${today()}.json`);
    track('export_backup', { format: 'json' });
    await DB.setSetting('lastBackupAt', Date.now());
    toast(`備份好了：${data.records.length} 則紀錄、${data.photos.length} 張照片，檔案約 ${Math.max(1, Math.round(file.size / 1048576))} MB`);
    setTimeout(viewSettings, 500);
  });

  document.getElementById('export-read').addEventListener('click', async () => {
    toast('製作閱讀版中…');
    showReadView(await buildReadableExport(document.getElementById('read-shared-only').checked));
    track('export_backup', { format: 'pdf' });
  });

  document.getElementById('import').addEventListener('change', async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1048576 && !confirm(`這個備份檔約 ${Math.round(file.size / 1048576)} MB，比較大，匯入可能要一段時間，手機空間也要夠。匯入時先不要關掉畫面。要繼續嗎？`)) { ev.target.value = ''; return; }
    try {
      const data = JSON.parse(await file.text());
      checkBackup(data);
      if (!confirm(`要匯入 ${data.records.length} 則紀錄嗎？同一則紀錄會被備份裡的版本取代。`)) return;
      for (const p of data.photos || []) await DB.putPhoto({ id: p.id, recordId: p.recordId, blob: await dataUrlToBlob(p.data), createdAt: Date.now() });
      // 另一半寫的紀錄屬於他自己，雲端版匯入時略過（他那邊還在）
      let skippedOthers = 0;
      for (const r of data.records) {
        if (usingCloud() && r.author && r.author !== CloudDB.myId()) { skippedOthers++; continue; }
        await putImportedRecord(r);
      }
      if (skippedOthers) toast(`另外 ${skippedOthers} 則是對方寫的，沒有匯入`);
      if (Array.isArray(data.categories)) {
        const merged = [...new Set([...(await getCategories()), ...data.categories])];
        await DB.setSetting('categories', merged);
      }
      if (!skippedOthers) toast('匯入完成');
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
    // 另一半寫的美好、烏雲不能改，只改自己的和吵架議題
    for (const r of everything.filter((x) => (x.tags || []).includes(old) && (isMine(x) || x.type === 'fight'))) {
      await updateRecord(r.id, (x) => {
        const tags = (x.tags || []).map((t) => (t === old ? name : t)).filter(Boolean);
        x.tags = [...new Set(tags)];
      });
      n += 1;
    }
    toast(name ? `已把 ${n} 則紀錄的標籤改成 #${name}` : `已從 ${n} 則紀錄拿掉這個標籤`);
    viewSettings();
  }));
  app.querySelectorAll('[data-edit-cat]').forEach((b) => b.addEventListener('click', async () => {
    const old = b.dataset.editCat;
    const input = prompt(`把分類「${old}」改成什麼？（最多 ${LIMITS.category} 個字）`, old);
    if (input === null) return;
    const name = input.trim().slice(0, LIMITS.category);
    if (!name || name === old) return;
    const used = everything.filter((x) => x.type === 'fight' && x.category === old);
    if (!confirm(`改成「${name}」？${used.length ? `用這個分類的 ${used.length} 個議題也會一起改。` : ''}`)) return;
    await DB.setSetting('categories', [...new Set(cats.map((c) => (c === old ? name : c)))]);
    let failed = 0;
    for (const r of used) { try { await updateRecord(r.id, (x) => { if (x.category === old) x.category = name; }); } catch (e) { failed += 1; } }
    toast(failed ? `已改名，但有 ${failed} 個議題沒改到，請再試一次` : `已改成「${name}」${used.length ? `，${used.length} 個議題一起更新了` : ''}`);
    viewSettings();
  }));
  app.querySelectorAll('[data-rm-cat]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm(`刪除分類「${b.dataset.rmCat}」？已經用這個分類的議題會保留原本的分類，並標示「已刪除的分類」。`)) return;
    await DB.setSetting('categories', cats.filter((c) => c !== b.dataset.rmCat));
    viewSettings();
  }));
  const logout = document.getElementById('logout');
  if (logout) logout.addEventListener('click', async () => {
    if (!confirm('要登出嗎？雲端的資料不會不見，之後登入就能看到。')) return;
    clearDraft();
    await CloudDB.signOut();
    photoUrlCache.clear();
    go('#/login');
  });
  const migrate = document.getElementById('migrate');
  if (migrate) migrate.addEventListener('click', async () => {
    migrate.disabled = true;
    try {
      const n = await migrateLocalToCloud((t) => { migrate.textContent = t; });
      toast(`已搬上雲端：${n.records} 則紀錄、${n.photos} 張照片${n.skipped ? `；另外 ${n.skipped} 張超過免費雲端額度，還留在這支手機裡` : ''}`);
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
    clearDraft();
    await DB.clearAll();
    photoUrlCache.clear();
    toast('已清除');
    go('#/');
  });
  const delAcc = document.getElementById('delete-account');
  if (delAcc) delAcc.addEventListener('click', async () => {
    // 另一半寫的紀錄也存在你的空間裡，刪帳號會一起刪掉，先講清楚
    let others = 0;
    try { others = (await DB.allRecords()).filter((r) => !isMine(r)).length; } catch (e) { others = 0; }
    const typed = prompt(`刪除帳號會刪掉雲端上所有紀錄、照片、分享和這個帳號本身，沒辦法復原。建議先匯出備份。${others ? `\n${partnerName()}寫的 ${others} 則紀錄也會一起刪掉，可以先請${partnerName()}到設定頁「匯出我寫的紀錄」。` : ''}\n確定的話請輸入「刪除」兩個字：`);
    if ((typed || '').trim() !== '刪除') return;
    withBusy(delAcc, '刪除中…', async () => {
      try { await CloudDB.deleteShare(); } catch (e) { /* 沒有分享碼就略過 */ }
      clearDraft();
      await CloudDB.clearAll();
      await CloudDB.deleteAccount();
      await LocalDB.setSetting('hasAccount', false);
      photoUrlCache.clear(); thumbUrlCache.clear();
      toast('帳號已刪除');
      go('#/login');
    });
  });
}

// 另一半匯出自己寫的紀錄（格式和「匯出還原用備份」一樣，可以匯入自己的帳號或手機版）
async function exportMyRecords() {
  const records = (await DB.allRecords()).filter((r) => isMine(r) && !r.deletedAt);
  const photos = [];
  for (const r of records) for (const pid of r.photoIds || []) {
    const ph = await DB.getPhoto(pid);
    if (ph) photos.push({ id: pid, recordId: r.id, data: await blobToDataUrl(ph.blob) });
  }
  const data = { app: 'couple-diary', version: 1, exportedAt: new Date().toISOString(), records, categories: [], photos };
  downloadFile(new Blob([JSON.stringify(data)], { type: 'application/json' }), `our-records-MINE-backup-${today()}.json`);
  toast(`匯出好了：${records.length} 則紀錄、${photos.length} 張照片`);
}

// ---------- 結束這段關係 ----------
async function viewEnd(keepUid = '') {
  const all = await liveRecords();
  const other = partnerName();
  let keepName = '';
  if (keepUid) {
    try { const p = (await CloudDB.listPartners()).find((x) => x.uid === keepUid && x.approved === false); keepName = p ? p.name : ''; } catch (e) { keepName = ''; }
    if (!keepName) keepUid = '';
  }
  app.className = '';
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/settings" aria-label="返回">${ICON.back}</a>
      <h1>結束這段關係</h1>
    </div>
    <div class="muted">${keepUid ? `讓「${esc(keepName)}」加入之前，先處理之前的 ${all.length} 則紀錄。兩種做法都會移除之前的另一半，首頁的數字和編號會從頭開始；${esc(keepName)}看不到之前的任何紀錄。處理完就會讓${esc(keepName)}加入。` : `目前這段關係有 ${all.length} 則紀錄。兩種做法都會移除${esc(other)}、讓分享碼作廢，首頁的數字和編號會從頭開始；之後分享給新的人，對方看不到這段的任何紀錄。`}</div>
    <div class="card" style="gap:8px">
      <div class="bold">封存（建議）</div>
      <div class="small muted">紀錄、照片、一起完成的事都收進設定頁的「封存的回憶」，只有你看得到，之後想刪再刪。${esc(other)}寫的、上鎖的紀錄你還是看不到。</div>
      <button class="btn small" id="end-archive">封存並結束</button>
    </div>
    <div class="card" style="gap:8px">
      <div class="bold" style="color:#9B2C1F">全部刪除</div>
      <div class="small muted">這段關係的紀錄（包含${esc(other)}寫的）、照片和一起完成的事全部刪掉，沒辦法復原。建議先到設定頁匯出備份。之前封存的不會動。</div>
      <button class="btn small danger" id="end-delete">刪除並結束</button>
    </div>
  `;
  const done = async (msg) => {
    if (keepUid) { await CloudDB.approvePartner(keepUid); msg += `，也讓 ${keepName} 加入了`; }
    photoUrlCache.clear(); thumbUrlCache.clear();
    await loadNames();
    toast(msg);
    go('#/');
  };
  const archiveBtn = document.getElementById('end-archive');
  archiveBtn.addEventListener('click', () => {
    if (!confirm(`封存目前的 ${all.length} 則紀錄，並移除${other}？封存的紀錄只有你看得到。`)) return;
    withBusy(archiveBtn, '封存中…', async () => {
      await CloudDB.endRelationship('archive', keepUid || null);
      track('end_relationship', { mode: 'archive' });
      await done('已封存，這段回憶收在設定頁的「封存的回憶」');
    });
  });
  const delBtn = document.getElementById('end-delete');
  delBtn.addEventListener('click', () => {
    const typed = prompt(`會刪掉這段關係的 ${all.length} 則紀錄和照片（包含${other}寫的），沒辦法復原。\n確定的話請輸入「刪除」兩個字：`);
    if ((typed || '').trim() !== '刪除') return;
    withBusy(delBtn, '刪除中…', async () => {
      // 先刪你資料夾裡的照片和任務照片（紀錄刪掉後就找不到了）
      for (const r of await DB.allRecords()) {
        for (const pid of r.photoIds || []) if (CloudDB.photoIsMine(pid)) { try { await DB.deletePhoto(pid); } catch (e) { /* 之後再清 */ } }
      }
      try { for (const sub of await CloudDB.submissions()) if (sub.photo_path) await CloudDB.removeTaskPhoto(sub.photo_path); } catch (e) { /* 略過 */ }
      await CloudDB.endRelationship('delete', keepUid || null);
      track('end_relationship', { mode: 'delete' });
      await done('已刪除這段關係的紀錄');
    });
  });
}

async function viewArchive() {
  const list = (await CloudDB.archivedRecords()).filter((r) => !r.deletedAt).sort(byDateDesc);
  app.className = '';
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/settings" aria-label="返回">${ICON.back}</a>
      <h1>封存的回憶</h1>
    </div>
    <div class="muted">結束上一段關係時封存的紀錄，只有你看得到，不算在首頁的數字裡。</div>
    <div class="list" id="archive-list"></div>
    ${list.length ? '<button class="btn small danger" id="purge-archive">永久刪除全部封存</button>' : '<div class="empty">沒有封存的紀錄</div>'}
  `;
  const box = document.getElementById('archive-list');
  for (const r of list) box.appendChild(await listItem(r));
  const purge = document.getElementById('purge-archive');
  if (purge) purge.addEventListener('click', () => {
    const typed = prompt(`會永久刪除 ${list.length} 則封存的紀錄和照片，沒辦法復原。\n確定的話請輸入「刪除」兩個字：`);
    if ((typed || '').trim() !== '刪除') return;
    withBusy(purge, '刪除中…', async () => {
      for (const r of list) for (const pid of r.photoIds || []) if (CloudDB.photoIsMine(pid)) { try { await DB.deletePhoto(pid); } catch (e) { /* 之後再清 */ } }
      await CloudDB.deleteArchive();
      toast('已刪除封存的紀錄');
      go('#/settings');
    });
  });
}

// ---------- 另一半模式 ----------
async function viewPartnerHome() {
  const info = CloudDB.partnerInfo();
  const all = await liveRecords();
  const count = (t) => all.filter((r) => r.type === t).length;
  const fights = all.filter((r) => r.type === 'fight');
  const recent = all.slice().sort(byDateDesc).slice(0, 5);
  const tasks = await CloudDB.partnerTasks();
  const todo = tasks.filter((t) => !t.submission || t.submission.status !== 'pending').length;
  const locked = await CloudDB.partnerLocked();
  const lockedOf = (t) => locked.filter((x) => x.type === t).length;
  let pending = [];
  if (CloudDB.isBoundPartner()) { try { pending = (await CloudDB.submissions({ status: 'pending' })).filter((t) => all.some((r) => r.id === t.record_id && isMine(r))); } catch (e) { pending = []; } }

  const bound = CloudDB.isBoundPartner();
  const typeTile = (type, icon, color, sub) => homeTile({ href: `#/list/${type}`, icon, color, title: TYPES[type].label, sub,
    extra: `${lockedOf(type) ? `<span class="small row" style="color:var(--lock);gap:4px">${ICON.lockSmall}另有 ${lockedOf(type)} 則上鎖</span>` : ''}${bound ? splitLine(count(type) + lockedOf(type), all.filter((r) => r.type === type && isMine(r)).length) : ''}` });
  const tilesHtml = [
    typeTile('happy', ICON.heart, 'var(--happy)', `${count('happy') + lockedOf('happy')} / ${TYPES.happy.goal}`),
    typeTile('cloud', ICON.cloud, 'var(--cloud)', `${count('cloud')} 則`),
    homeTile({ href: '#/fights', icon: ICON.bolt, color: 'var(--fight)', title: '吵架議題', sub: fightSub(fights) }),
    wishTile(await loadWishesSafe()),
    homeTile({ href: '#/tasks', icon: ICON.lock, color: 'var(--lock)', title: '解鎖任務', sub: pending.length ? `${pending.length} 個等你確認` : todo ? `${todo} 個可以解鎖` : tasks.length ? `等${esc(ownerName())}確認中` : '目前沒有任務' }),
  ].join('');

  app.innerHTML = `
    <div class="row between">
      <div>
        <div class="hello">嗨，${esc(info.name)}</div>
        <h1 class="title-xl">${bound ? `${esc(ownerName())}和${esc(info.name)}的紀錄` : `${esc(ownerName())}的紀錄`}</h1>
      </div>
      <a class="icon-btn gear-btn" href="#/settings" aria-label="設定">${ICON.gear}<span>設定</span></a>
    </div>
    ${bound ? quickRecord('今天想記下什麼？') : `<div class="mascot-hello">${mascotHtml('happy', 110)}<div class="small muted">看看${esc(ownerName())}分享了什麼</div></div>`}
    ${info.paused ? `<div class="card" id="paused-note" style="background:var(--lock-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--lock)">${esc(ownerName())}暫時停止分享</div>
      <div class="small" style="color:var(--lock)">這段時間看不到${esc(ownerName())}寫的紀錄，你自己寫的照舊。${esc(ownerName())}恢復之後就會回來，什麼都不會不見。</div>
    </div>` : ''}
    ${tasks.length ? `<a class="card" href="#/tasks" style="background:var(--lock-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--lock)">${todo ? `有 ${todo} 個任務可以解鎖` : '任務都送出了'}</div>
      <div class="small" style="color:var(--lock)">${todo ? `完成任務、${esc(ownerName())}確認之後，就能看到上鎖的紀錄。` : `等${esc(ownerName())}確認中。`}</div>
    </a>` : ''}
    ${newFromOtherCard(all)}
    ${pending.length ? `<a class="card" href="#/view/${esc(pending[0].record_id)}" style="background:var(--lock-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--lock)">有 ${pending.length} 個任務等你確認</div>
      <div class="small" style="color:var(--lock)">${esc(ownerName())}完成了你出的任務，點這裡去看看，確認後那則紀錄就會解鎖給${esc(ownerName())}看。</div>
    </a>` : ''}
    ${CloudDB.isAnonymous() ? `<a class="card" href="#/bind" style="background:var(--fight-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--fight-dark)">綁定帳號，你也可以寫紀錄</div>
      <div class="small muted">現在是用分享碼暫時登入。綁定 Email 或 Google 後，就能記自己的美好、烏雲時刻，一起寫吵架議題，換手機也不用重新加入 ›</div>
    </a>` : ''}
    <div class="section-title">所有功能</div>
    <div class="home-tiles">${tilesHtml}</div>
    <div class="section-title">${bound ? '最近的紀錄' : '最近分享的紀錄'}</div>
    <div class="list" id="recent">${recent.length ? '' : bound ? `<div class="empty">還沒有紀錄<a class="btn small" href="#/new/happy">寫下第一個美好時刻</a></div>` : `<div class="empty">${esc(ownerName())}還沒有分享紀錄給你</div>`}</div>
  `;
  const box = document.getElementById('recent');
  for (const r of recent) box.appendChild(await listItem(r));
  if (!tourDone('partner')) showTour('partner');
}

async function viewPartnerTasks() {
  const tasks = await CloudDB.partnerTasks();
  app.className = '';
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/" aria-label="返回">${ICON.back}</a>
      <h1>解鎖任務</h1>
    </div>
    <div class="muted">完成任務、${esc(otherName())}按「通過」之後，那則紀錄就會出現在你的列表裡。</div>
    <div class="list">
      ${tasks.map((t) => {
        const s = t.submission && t.submission.status;
        const sentAgo = t.submission && t.submission.created_at ? daysAgo(new Date(t.submission.created_at).getTime()) : null;
        const state = s === 'pending' ? `<span class="badge st-progress">已送出${sentAgo == null ? '' : sentAgo === 0 ? '・今天' : `・${sentAgo} 天前`}，等${esc(otherName())}確認</span>`
          : s === 'rejected' ? `<span class="badge st-open">被退回了，可以再試一次</span>${t.submission.review_note ? `<div class="small" style="color:var(--open-ink, var(--accent))">${esc(otherName())}說：「${esc(t.submission.review_note)}」</div>` : ''}` : '';
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
    <button class="btn" id="task-send">${needPhoto ? '送出給' : '完成了，通知'}${esc(otherName())}</button>
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
      track('task_submit');
      toast(`已送出，等${otherName()}確認`);
      go('#/tasks');
    } catch (e) {
      ev.target.disabled = false;
      toast(e.message);
    }
  });
}

// 另一半綁定 Email / Google：臨時帳號變成正式帳號（同一個身分，不用重新加入）
// Google 綁定失敗的原因，換成看得懂的說明
let bindError = '';
let bindErrorExists = false;
let rejoinNotice = false;
function googleBindErrorText(err) {
  const o = esc(ownerName());
  const t = `${(err && err.code) || ''} ${(err && err.message) || ''}`;
  bindErrorExists = false;
  if (/identity_already_exists|already linked|already (been )?registered|already exists|already in use/i.test(t)) {
    bindErrorExists = true;
    return '這個 Google 帳號已經有啾啾日記的帳號了（如果你之前綁定過，就是它）。按下面的「改用這個 Google 帳號登入」回到原本的帳號就好，不用再綁一次；之前寫的紀錄都還在。如果登入後又要你輸入分享碼，再輸入一次、等對方按同意就好。';
  }
  if (/manual_linking_disabled|manual linking|linking is disabled/i.test(t)) return `Google 綁定還沒開通。請${o}到 Supabase 後台的 Authentication → Sign In / Providers，打開「Allow manual linking」。現在可以先用下面的 Email 綁定。`;
  if (/access_denied|not.*test user|unverified|blocked/i.test(t)) return `Google 擋下了這次登入。如果 Google 畫面寫「存取遭封鎖」或「應用程式未經驗證」，是 Google Cloud 的 OAuth 同意畫面還在「測試」模式：請${o}到 Google Cloud Console → OAuth 同意畫面按「發布應用程式」，或把這個 Gmail 加進「測試使用者」。現在可以先用下面的 Email 綁定。`;
  if (!err) return `從 Google 回來了，但綁定沒有完成。可能是網址設定還沒更新：請${o}到 Supabase 的 Authentication → URL Configuration，確認 Redirect URLs 有 https://diary.jas-soul.com/**。現在可以先用下面的 Email 綁定。`;
  return `Google 綁定沒有成功：${esc(err.message || err.code || '不知道的錯誤')}。可以改用下面的 Email 綁定。`;
}
function viewBind(sentTo = '') {
  app.className = 'theme-fight';
  const bound = CloudDB.isBoundPartner();
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/" aria-label="返回">${ICON.back}</a>
      <h1>綁定帳號</h1>
    </div>
    ${bound ? `<div class="card" style="gap:6px">
      <div class="bold">已經綁定 ${esc(CloudDB.currentEmail() || '')}</div>
      <div class="muted">現在可以和${esc(ownerName())}一起新增、更新吵架議題。換手機時用這個帳號登入就好，不用再輸入分享碼。</div>
      <a class="btn small" href="#/fights" style="align-self:flex-start">去看吵架議題</a>
    </div>
    <form class="card" id="pw-form" style="gap:10px">
      <div class="bold">設定登入密碼</div>
      <div class="small muted">用 Email 綁定的話，設定密碼後就能在別的手機用 Email 和密碼登入。用 Google 綁定的可以略過。</div>
      <input id="b-pass" class="input" type="password" autocomplete="new-password" minlength="8" maxlength="72" required placeholder="至少 8 個字" aria-label="新密碼">
      <button class="btn small" id="b-pass-save" type="submit">儲存密碼</button>
    </form>` : `
    <div class="muted">你現在是用分享碼暫時登入，身分只存在這個瀏覽器裡。綁定之後：</div>
    <div class="card" style="gap:6px">
      <div>・可以和${esc(ownerName())}一起新增、更新吵架議題</div>
      <div>・換手機或清掉瀏覽器資料，登入就回來了，不用${esc(ownerName())}再同意一次</div>
    </div>
    ${sentTo ? `<div class="card" style="background:var(--resolved-bg);border-color:transparent;gap:8px">
      <div class="bold" style="color:var(--resolved-ink)">確認信已經寄到 ${esc(sentTo)}</div>
      <div class="small">到信箱點信裡的連結就完成了。如果是在別的 App 或瀏覽器打開連結，回到這裡按下面的按鈕。</div>
      <button class="btn small secondary" id="b-check" style="align-self:flex-start">我已經點了連結</button>
    </div>` : ''}
    ${bindError ? `<div class="card" id="bind-error" role="alert" style="background:var(--open-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--open-ink)">Google 綁定沒有成功</div>
      <div class="small" style="color:var(--open-ink)">${bindError}</div>
      ${bindErrorExists ? '<button class="btn small" id="b-login-google" style="align-self:flex-start">改用這個 Google 帳號登入</button>' : ''}
    </div>` : ''}
    <button class="btn secondary" id="b-google"${IN_APP ? ' hidden' : ''}>用 Google 綁定</button>
    <form class="card" id="b-form" style="gap:10px">
      <label for="b-email" class="bold">用 Email 綁定</label>
      <input id="b-email" class="input" type="email" autocomplete="email" required placeholder="you@example.com">
      <button class="btn" id="b-send" type="submit">寄確認信</button>
    </form>`}
  `;
  const pw = document.getElementById('pw-form');
  if (pw) pw.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const v = document.getElementById('b-pass').value;
    if (v.length < 8) { toast('密碼至少 8 個字'); return; }
    withBusy(document.getElementById('b-pass-save'), '儲存中…', async () => { await CloudDB.updatePassword(v); toast('密碼已設定'); document.getElementById('b-pass').value = ''; });
  });
  if (bound) return;
  const lg = document.getElementById('b-login-google');
  if (lg) lg.addEventListener('click', () => withBusy(lg, '前往 Google…', async () => {
    // 臨時身分登出，改用已經綁好的 Google 帳號登入；沒連到對方的話，回來後帶去輸入分享碼
    try { sessionStorage.setItem('rejoinAfterLogin', '1'); } catch (e) { /* 略過 */ }
    await CloudDB.signOut();
    bindError = ''; bindErrorExists = false;
    await CloudDB.signInWithGoogle();
  }));
  const g = document.getElementById('b-google');
  g.addEventListener('click', () => withBusy(g, '前往 Google…', async () => {
    try { sessionStorage.setItem('linkPending', '1'); } catch (e) { /* 略過 */ }
    try { await CloudDB.linkGoogle(); } catch (e) {
      try { sessionStorage.removeItem('linkPending'); } catch (x) { /* 略過 */ }
      bindError = googleBindErrorText({ code: '', message: e.message });
      viewBind();
      return;
    }
    await CloudDB.refreshUser(); viewBind();
  }));
  document.getElementById('b-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const email = document.getElementById('b-email').value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('Email 格式不對'); return; }
    withBusy(document.getElementById('b-send'), '寄送中…', async () => { await CloudDB.bindEmail(email); viewBind(email); });
  });
  const chk = document.getElementById('b-check');
  if (chk) chk.addEventListener('click', () => withBusy(chk, '確認中…', async () => {
    await CloudDB.refreshUser();
    if (CloudDB.isBoundPartner()) { toast('綁定完成！'); viewBind(); } else toast('還沒收到確認，請到信箱點連結（也看看垃圾信件匣）');
  }));
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
      <div class="muted">你用「${esc(info.name)}」這個名字加入，可以看${esc(ownerName())}分享給你的紀錄、做任務${CloudDB.isBoundPartner() ? '，也能一起新增、更新吵架議題' : ''}。</div>
    </div>
    <a class="card" href="#/bind" style="gap:4px">
      <div class="row between"><div class="bold">帳號</div><div class="muted">›</div></div>
      <div class="small muted">${CloudDB.isBoundPartner() ? `已綁定 ${esc(CloudDB.currentEmail() || '')}` : '還沒綁定：綁定後可以一起寫吵架議題，換手機也不會不見'}</div>
    </a>
    ${CloudDB.isBoundPartner() ? `<div class="card">
      <div class="bold">登出</div>
      <div class="muted">登出後用綁定的帳號登入就能回來。</div>
      <button class="btn small secondary" id="logout">登出</button>
    </div>` : ''}
    ${pinCardHtml()}
    ${CloudDB.isBoundPartner() ? `<div class="card">
      <div class="bold">匯出我寫的紀錄</div>
      <div class="muted">把你自己寫的紀錄和照片存成備份檔。之後用自己的帳號或手機版「匯入備份」就能還原。</div>
      <button class="btn small secondary" id="export-mine">匯出我寫的紀錄</button>
    </div>` : ''}
    ${tourCard()}
    ${analyticsCard()}
    ${feedbackCard()}
    <div class="card">
      <div class="bold">離開</div>
      <div class="muted">只是不想在這支手機上看，選「這支手機登出」；要分開了，選「結束這段關係」，${esc(ownerName())}下次打開 App 會收到通知。</div>
      ${CloudDB.isBoundPartner() ? '' : '<div class="small muted">還沒綁定帳號的話，登出後要重新用分享碼加入。</div>'}
      <button class="btn small secondary" id="leave">這支手機登出</button>
      <button class="btn small danger" id="end-rel">結束這段關係</button>
    </div>
  `;
  const logout = document.getElementById('logout');
  bindPinCard(viewPartnerSettings);
  if (logout) logout.addEventListener('click', async () => { await CloudDB.signOut(); photoUrlCache.clear(); go('#/login'); });
  document.getElementById('leave').addEventListener('click', async () => {
    if (CloudDB.isBoundPartner()) {
      if (!confirm('登出這支手機？之後用綁定的帳號登入就能回來。')) return;
      await CloudDB.signOut(); photoUrlCache.clear(); go('#/login');
      return;
    }
    if (!confirm(`確定要登出嗎？還沒綁定帳號，登出後要重新用分享碼加入、等${ownerName()}同意。`)) return;
    await CloudDB.leaveShare();
    photoUrlCache.clear();
    go('#/join');
  });
  const exportMine = document.getElementById('export-mine');
  if (exportMine) exportMine.addEventListener('click', () => withBusy(exportMine, '準備中…', () => exportMyRecords()));
  document.getElementById('end-rel').addEventListener('click', async () => {
    const mineCount = (await DB.allRecords()).filter((r) => isMine(r) && !r.deletedAt).length;
    const bound = CloudDB.isBoundPartner();
    const msg = `結束和${ownerName()}的這段關係？你會看不到${ownerName()}的紀錄，${ownerName()}會收到通知。`
      + (mineCount ? `\n你寫的 ${mineCount} 則紀錄會留在${ownerName()}那邊、之後你就看不到了${bound ? '，建議先按「匯出我寫的紀錄」' : ''}。` : '');
    if (!confirm(msg)) return;
    const name = ownerName();
    await CloudDB.partnerEndRelationship();
    try { localStorage.setItem(`endedWith:${CloudDB.myId()}`, name); } catch (e) { /* 略過 */ }
    photoUrlCache.clear(); thumbUrlCache.clear();
    if (bound) { location.hash = '#/'; location.reload(); } else { await CloudDB.signOut(); go('#/login'); }
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
      ${digitBoxes('j-pass', '密碼')}
      <div class="field"><label for="j-name">你的名字</label>
        <input id="j-name" class="input" maxlength="20" required placeholder="對方會看到這個名字"></div>
      <button class="btn" type="submit" id="join-btn">加入</button>
    </form>
    <div id="join-msg" class="muted" style="text-align:center"></div>
    <a class="btn secondary small" href="#/login" id="to-login">${rejoinNotice ? '回到首頁' : '我是紀錄的主人，或已經綁定過帳號，去登入'}</a>
  `;
  bindDigitBoxes(app);
  document.getElementById('to-login').addEventListener('click', async (ev) => {
    rejoinNotice = false;
    // 臨時帳號登出，才會回到登入畫面
    if (CloudDB.isSignedIn() && CloudDB.isAnonymous()) { ev.preventDefault(); await CloudDB.signOut(); go('#/login'); route(); }
  });
  document.getElementById('join-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = document.getElementById('join-btn');
    const msg = document.getElementById('join-msg');
    // 錯誤訊息放在按鈕旁邊也用小提示跳出來，手機鍵盤擋住時也看得到
    const fail = (t) => { msg.textContent = t; toast(t); msg.scrollIntoView({ block: 'center' }); };
    if (!SHARE_PASS_RE.test(document.getElementById('j-pass').value)) { fail('密碼是 6 位數字，再檢查一下'); return; }
    if (document.activeElement) document.activeElement.blur();
    btn.disabled = true;
    btn.textContent = '加入中…';
    msg.textContent = '';
    try {
      const slow = new Promise((_, rej) => setTimeout(() => rej(new Error('連線太久沒有回應，請確認網路後再按一次「加入」')), 20000));
      await Promise.race([slow, CloudDB.joinWithCode(
        document.getElementById('j-code').value.trim().toUpperCase(),
        document.getElementById('j-pass').value,
        document.getElementById('j-name').value.trim(),
      )]);
      track('partner_join_request');
      rejoinNotice = false;
      if (CloudDB.pendingJoin()) toast('已送出，等對方同意');
      go('#/');
      route();
    } catch (e) {
      btn.disabled = false;
      btn.textContent = '加入';
      fail(/anonymous sign-ins are disabled|signups not allowed/i.test(e.message)
        ? '對方的 App 還沒開放分享碼加入，請對方到 Supabase 開啟「Allow anonymous sign-ins」。'
        : /captcha/i.test(e.message) ? '加入時被安全驗證擋住了，請把這個畫面截圖給對方。'
        : cloudErrorText(e));
    }
  });
}

// 另一半送出加入要求後，等主人同意
function viewWaitingApproval() {
  const info = CloudDB.pendingJoin();
  app.className = '';
  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;margin-top:40px">
      <div class="thumb" style="width:72px;height:72px;border-radius:99px">${ICON.heart}</div>
      <h1 class="title-xl">等 ${esc(info.owner_name || '對方')} 同意</h1>
      <div class="muted">已經送出加入要求了。請 ${esc(info.owner_name || '對方')} 打開 App，到設定頁按「同意」，你就看得到分享的紀錄。</div>
    </div>
    <button class="btn" id="w-check">對方同意了，重新看看</button>
    <button class="btn secondary small" id="w-leave">取消加入</button>
  `;
  const check = document.getElementById('w-check');
  check.addEventListener('click', () => withBusy(check, '檢查中…', async () => {
    await CloudDB.refreshPartner();
    if (CloudDB.pendingJoin()) { toast('還沒同意，晚點再試試'); return; }
    route();
  }));
  document.getElementById('w-leave').addEventListener('click', async () => {
    if (!confirm('取消加入要求？')) return;
    await CloudDB.leaveShare();
    go('#/login');
  });
}

// ---------- 設定：分享給另一半（紀錄主人） ----------
async function shareCardHtml() {
  let share = null;
  let partners = [];
  let paused = false;
  try {
    share = await CloudDB.getShare();
    if (share) partners = await CloudDB.listPartners();
    if (share) paused = (await DB.getSetting('sharePaused', false)) === true;
  } catch (e) {
    return `<div class="card"><div class="bold">分享給另一半</div>
      <div class="muted">要先到 Supabase 的 SQL Editor 重新貼上最新的 supabase/schema.sql 並按 Run，才能使用分享碼。</div></div>`;
  }
  if (!share) {
    return `<div class="card" id="share-card">
      <div class="bold">分享給另一半</div>
      <div class="muted">產生分享碼和密碼給對方，對方就能看你「給對方看」和任務解鎖後的紀錄，也能做任務，但不能修改任何東西。</div>
      <div class="field"><label for="s-name">你的名字（對方會看到）</label><input id="s-name" class="input" maxlength="${LIMITS.name}" value="${esc(NAMES.me)}"></div>
      ${digitBoxes('s-pass', '分享密碼（自己設 6 位數字，再告訴對方）')}
      <button class="btn small" id="s-create">產生分享碼</button>
    </div>`;
  }
  const joined = partners.filter((p) => p.approved !== false);
  const waiting = partners.filter((p) => p.approved === false);
  return `<div class="card" id="share-card">
    <div class="bold">分享給另一半</div>
    <div class="muted">按下面的按鈕複製邀請連結傳給對方，密碼另外告訴他。對方點連結就會看到加入畫面，分享碼已經幫他填好。</div>
    <div class="share-code">${esc(share.code)}</div>
    <button class="btn small secondary" id="s-copy">分享邀請連結（不含密碼）</button>
    <div class="field"><label for="s-name">你的名字（對方會看到）</label>
      <div class="row"><input id="s-name" class="input grow" maxlength="20" value="${esc(share.owner_name)}"><button class="btn small" id="s-save-name">儲存</button></div></div>
    ${digitBoxes('s-pass', '改分享密碼')}
    <button class="btn small secondary" id="s-save-pass">更改密碼</button>
    ${waiting.length ? `<div class="field" id="join-requests"><div class="label">想加入的人（要你同意）</div>
      <div class="muted small">換手機或清掉瀏覽器重新加入的，也會出現在這裡。同意後會取代目前的另一半。</div>
      ${waiting.map((p) => `<div class="row between"><span>${esc(p.name)}<span class="muted small">・${shortDate(p.joined_at.slice(0, 10))} 送出</span></span>
        <span class="row" style="gap:6px"><button class="btn small" data-approve-partner="${esc(p.uid)}" data-name="${esc(p.name)}">同意</button>
        <button class="btn small secondary" data-rm-partner="${esc(p.uid)}" data-name="${esc(p.name)}" data-pending="1">拒絕</button></span></div>`).join('')}
    </div>` : ''}
    <div class="field"><div class="label">已加入的人</div>
      ${joined.length ? joined.map((p) => `<div class="row between"><span>${esc(p.name)}<span class="muted small">・${shortDate(p.joined_at.slice(0, 10))} 加入</span></span>
        <button class="btn small secondary" data-rm-partner="${esc(p.uid)}" data-name="${esc(p.name)}">移除</button></div>`).join('') : '<div class="muted">還沒有人加入</div>'}
    </div>
    ${joined.length ? `<div class="field" id="pause-box" style="background:${paused ? 'var(--lock-bg)' : 'transparent'};border-radius:12px;padding:${paused ? '10px' : '0'}">
      <div class="row between"><div class="label" style="margin:0">暫停分享</div>
        <button class="btn small ${paused ? '' : 'secondary'}" id="s-pause" aria-pressed="${paused}">${paused ? '恢復分享' : '暫停'}</button></div>
      <div class="small muted">${paused ? `暫停中：${esc(joined[0].name)}現在看不到你寫的任何紀錄、照片和任務，對方自己寫的照舊。按「恢復分享」就回來，資料都不會動。` : `想先冷靜一下時可以暫停，${esc(joined[0].name)}會暫時看不到你寫的紀錄，隨時可以恢復。`}</div>
    </div>` : ''}
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
    if (!SHARE_PASS_RE.test(pass)) { toast('分享密碼要 6 位數字'); return; }
    const visible = (await DB.allRecords()).filter((r) => !r.deletedAt && (r.visibility === 'shared' || (r.visibility === 'task' && r.unlocked))).length;
    if (visible && !confirm(`對方加入後，會看到 ${visible} 則「給對方看」的紀錄（包含以前寫的）。不想給這個人看的，請先改成上鎖。要繼續產生分享碼嗎？`)) return;
    await saveWithNewCode(pass, name);
    toast('分享碼產生好了');
    viewSettings();
  });
  if ($('s-copy')) $('s-copy').addEventListener('click', async () => {
    const code = document.querySelector('.share-code').textContent;
    const url = `${location.origin + location.pathname}?utm_source=invite&utm_medium=share#/join/${code}`;
    const text = `點這個連結，一起用啾啾日記：${url}（密碼我另外告訴你）`;
    // 手機會跳出分享畫面（LINE、訊息…）。要在按下的當下馬上叫出來，先做別的事 iPhone 會擋掉；不支援或失敗時改成複製
    if (navigator.share) {
      try { await navigator.share({ title: '一起用啾啾日記', text }); track('share_invite', { how: 'share' }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    track('share_invite', { how: 'copy' });
    try { await navigator.clipboard.writeText(text); toast('已複製，貼給另一半就可以了'); } catch (e) { prompt('複製下面這段文字', text); }
  });
  if ($('s-save-name')) $('s-save-name').addEventListener('click', async () => {
    const name = $('s-name').value.trim();
    if (!name) { toast('請填你的名字'); return; }
    await CloudDB.saveShare(document.querySelector('.share-code').textContent, null, name);
    toast('已儲存');
  });
  if ($('s-save-pass')) $('s-save-pass').addEventListener('click', async () => {
    const pass = $('s-pass').value;
    if (!SHARE_PASS_RE.test(pass)) { toast('分享密碼要 6 位數字'); return; }
    await CloudDB.saveShare(document.querySelector('.share-code').textContent, pass, $('s-name').value.trim());
    $('s-pass').value = ''; $('s-pass').dispatchEvent(new Event('input'));
    const joined = document.querySelectorAll('[data-rm-partner]');
    if (joined.length && confirm('密碼已更改。要不要順便移除目前已加入的人？\n（如果是擔心密碼外流就按「確定」；按「取消」對方會照常看得到）')) {
      for (const b of joined) await CloudDB.removePartner(b.dataset.rmPartner);
      toast('密碼已更改，也移除了已加入的人');
      viewSettings();
      return;
    }
    toast('密碼已更改，已加入的人不受影響');
  });
  if ($('s-pause')) $('s-pause').addEventListener('click', () => withBusy($('s-pause'), '', async () => {
    const next = $('s-pause').getAttribute('aria-pressed') !== 'true';
    if (next && !confirm('暫停分享？對方會暫時看不到你寫的紀錄、照片和任務，你隨時可以恢復。')) return;
    await DB.setSetting('sharePaused', next);
    if (next) track('pause_share');
    toast(next ? '已暫停分享' : '已恢復分享');
    viewSettings();
  }));
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
  document.querySelectorAll('[data-approve-partner]').forEach((b) => b.addEventListener('click', async () => {
    if (await approveJoin(b, b.dataset.approvePartner, b.dataset.name)) viewSettings();
  }));
  document.querySelectorAll('[data-rm-partner]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm(b.dataset.pending ? `拒絕「${b.dataset.name}」加入？` : `移除「${b.dataset.name}」？對方會馬上看不到你的紀錄。`)) return;
    await CloudDB.removePartner(b.dataset.rmPartner);
    viewSettings();
  }));
}

// 同意有人用分享碼加入（首頁和設定頁共用）。已經有另一半、或已經有紀錄時，
// 先分清楚是「同一個人換手機」還是「新的對象」：新的對象要先結束上一段（封存或刪除），不然他會看到之前所有分享的紀錄
async function approveJoin(btn, uid, name) {
  const current = (await CloudDB.listPartners()).find((p) => p.approved !== false && p.uid !== uid);
  const hasRecords = (await liveRecords()).length > 0;
  if (current || hasRecords) {
    const before = current ? current.name : (NAMES.partner || '');
    const same = before && before === name;
    const pick = await choose(`${name} 想加入`, current ? `目前的另一半是「${before}」。同意後會取代「${before}」。` : '你已經有一些紀錄了。', [
      { key: 'same', label: `是${before || '同一個人'}換手機或重新加入`, hint: '照舊看得到之前分享的紀錄', primary: same },
      { key: 'new', label: '是新的對象', hint: '先把之前的紀錄封存或刪除，新的人才看不到', primary: !same },
    ]);
    if (!pick) return false;
    if (pick === 'new') { go(`#/end/${encodeURIComponent(uid)}`); return false; }
  }
  let ok = false;
  await withBusy(btn, '', async () => {
    await CloudDB.approvePartner(uid);
    track('partner_approved');
    toast(`已同意 ${name} 加入，現在可以一起用了`);
    ok = true;
  });
  return ok;
}

// 把手機裡（試用時）的紀錄和照片搬上雲端；同一則紀錄重搬只會覆蓋，不會重複
// 匯入、搬上雲端時存一則紀錄：紀錄 id 在雲端是全部帳號共用的，
// 同一份備份匯入第二個帳號時 id 會撞到，就換一個新的 id 再存
async function putImportedRecord(r) {
  if (!usingCloud()) { await DB.putRecord(r); return r.id; }
  try { await CloudDB.putRecord(r); return r.id; } catch (e) {
    if (!/row-level security|duplicate|violates/i.test(e.message)) throw e;
    const copy = { ...r, id: DB.uid() };
    await CloudDB.putRecord(copy);
    return copy.id;
  }
}

// since：只搬這個時間之後新增或改過的（登入過又登出、在手機裡寫了新的，下次登入時補搬）
async function migrateLocalToCloud(progress = () => {}, since = 0) {
  const records = (await LocalDB.allRecords()).filter((r) => (r.updatedAt || r.createdAt || 0) > since);
  const ids = new Set(records.map((r) => r.id));
  const photos = (await LocalDB.allPhotos()).filter((p) => ids.has(p.recordId) || (p.createdAt || 0) > since);
  let done = 0;
  let skipped = 0;
  for (const p of photos) {
    // 超過免費帳號的雲端照片額度時，剩下的照片留在手機裡，紀錄照樣搬
    if (skipped) { skipped++; continue; }
    try { await CloudDB.putPhoto(p); } catch (e) {
      if (!/row-level security|policy|quota/i.test(e.message)) throw e;
      skipped = 1;
      continue;
    }
    progress(`搬照片中… ${++done} / ${photos.length}`);
  }
  done = 0;
  for (const r of records) {
    await putImportedRecord(r);
    progress(`搬紀錄中… ${++done} / ${records.length}`);
  }
  const localNames = await LocalDB.getSetting('names', null);
  if (localNames && (localNames.me || localNames.partner) && !(await CloudDB.getSetting('names', null))) await CloudDB.setSetting('names', localNames);
  const localCats = await LocalDB.getSetting('categories', null);
  if (localCats) await CloudDB.setSetting('categories', [...new Set([...(await getCategories()), ...localCats])]);
  await LocalDB.setSetting('migratedAt', Date.now());
  return { records: records.length, photos: photos.length - skipped, skipped };
}

// 自己的帳號登入後：記住這支手機登入過，第一次登入時自動把試用的紀錄搬上雲端
async function afterOwnerLogin() {
  if (!usingCloud() || CloudDB.isAnonymous() || isPartner()) return;
  // Google 登入回來時記一次：帳號 10 分鐘內建立的算註冊，其他算登入
  try {
    if (sessionStorage.getItem('googlePending')) {
      sessionStorage.removeItem('googlePending');
      track(Date.now() - CloudDB.createdAtMs() < 600000 ? 'sign_up' : 'login', { method: 'google' });
    }
  } catch (e) { /* 略過 */ }
  await LocalDB.setSetting('hasAccount', true);
  numbersChecked = false; // 換成雲端資料後重新檢查舊紀錄的編號
  // 第一次登入搬全部；之後登出時在手機裡寫的新紀錄，下次登入也會自動補搬
  const since = (await LocalDB.getSetting('migratedAt', null)) || 0;
  const count = (await LocalDB.allRecords()).filter((r) => (r.updatedAt || r.createdAt || 0) > since).length;
  if (!count) { await LocalDB.setSetting('migratedAt', Date.now()); return; }
  toast(`正在把手機裡的 ${count} 則紀錄搬上雲端…`);
  try {
    const n = await migrateLocalToCloud(() => {}, since);
    toast(`已搬上雲端：${n.records} 則紀錄、${n.photos} 張照片${n.skipped ? `；另外 ${n.skipped} 張超過免費雲端額度，還留在這支手機裡` : ''}`);
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
// 登入頁下方的介紹：第一次來的人知道這個 App 能做什麼
const INTRO = [
  ['❤️', '美好時刻', '把約會、驚喜、小確幸記下來，目標是一起集滿 100 個。'],
  ['☁️', '烏雲時刻', '不開心的時刻也記下來，事後寫反思，心情過去了就按「放晴」。'],
  ['⚡', '吵架議題', '分類、原因、後續進度，和好了就標成已解決，不再重複吵同一件事。'],
  ['✅', '一起完成的事', '寫下想一起做的事，兩個人都能打勾，完成後變成美好時刻。'],
  ['🔒', '上鎖與任務', '想給對方看的可以分享，也可以上鎖，出一個任務讓對方完成才解鎖。'],
  ['🏅', '印章冊', '美好時刻、和好、放晴達到里程碑就蓋一個章，像集點卡一樣。'],
];
// 註冊的好處（登入頁、試用提醒共用）
const SIGNUP_BENEFITS = [
  ['紀錄存在雲端，換手機、清掉瀏覽器也不會不見'],
  ['分享給另一半，兩個人一起寫'],
  ['出任務解鎖紀錄、一起完成的待辦清單'],
  ['照片跟著帳號走，在哪支手機都看得到'],
];
function introFeatures() {
  return `<section class="card" style="gap:12px;margin-top:8px" aria-labelledby="intro-h">
    <h2 id="intro-h" class="bold" style="font-size:17px;font-family:inherit;margin:0">這個 App 可以做什麼</h2>
    ${INTRO.map(([icon, t, d]) => `<div class="row" style="align-items:flex-start;gap:12px"><div style="font-size:22px;line-height:1.2" aria-hidden="true">${icon}</div><div style="display:flex;flex-direction:column;gap:2px"><div class="bold">${t}</div><div class="small muted">${d}</div></div></div>`).join('')}
    <div class="small muted">紀錄只有你和你分享的人看得到。${window.Analytics && window.Analytics.configured() ? ANALYTICS_NOTE : ''}</div>
  </section>`;
}
// 記住上次用哪種方式登入，避免 Google 和 Email 各註冊一個帳號、以為資料不見
function rememberLogin(kind) {
  try {
    localStorage.setItem('lastLogin', kind);
    const em = kind === 'email' && document.getElementById('email');
    if (em && em.value) localStorage.setItem('lastLoginEmail', em.value.trim());
  } catch (e) { /* 不能存就算了 */ }
}
function lastLogin() { try { return localStorage.getItem('lastLogin'); } catch (e) { return null; } }
function viewLogin(mode = 'signin') {
  app.className = '';
  const isUp = mode === 'signup';
  const last = lastLogin();
  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;margin-top:40px">
      ${mascotHtml('happy', 140)}
      <h1 class="title-xl">啾啾日記</h1>
      <div class="bold" style="font-size:17px">兩個人一起記下 100 個美好時刻</div>
      <div class="muted">也記下烏雲、整理吵架，讓感情越來越好</div>
    </div>
    ${last ? '' : `<section class="card benefits-card" aria-labelledby="ben-h">
      <div id="ben-h" class="bold">免費註冊，你們就可以：</div>
      <ul class="benefits">${SIGNUP_BENEFITS.map(([t]) => `<li>${t}</li>`).join('')}</ul>
    </section>`}
    ${inAppNotice()}
    <button class="btn secondary" id="google-btn" style="gap:10px"${IN_APP ? ' hidden' : ''}>
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>
      ${isUp ? '用 Google 註冊／登入' : '用 Google 登入'}
    </button>
    <div class="muted" style="text-align:center">或用 Email</div>
    <form id="login-form" style="display:flex;flex-direction:column;gap:14px">
      <div class="field"><label for="email">Email</label>
        <input id="email" class="input" type="email" autocomplete="email" required></div>
      <div class="field"><label for="password">密碼${isUp ? '（至少 8 個字）' : ''}</label>
        <input id="password" class="input" type="password" autocomplete="${isUp ? 'new-password' : 'current-password'}" minlength="${isUp ? 8 : 6}" maxlength="72" required></div>
      <button class="btn" type="submit" id="login-btn">${isUp ? '免費註冊，開始我們的日記' : '登入'}</button>
    </form>
    <div id="login-msg" class="muted" style="text-align:center"></div>
    ${isUp ? '' : '<button class="btn secondary small" id="forgot">忘記密碼？</button>'}
    <button class="btn ${isUp ? 'secondary small' : 'secondary'}" id="switch">${isUp ? '已經有帳號？登入' : '第一次使用？免費註冊'}</button>
    <a class="btn secondary small" href="#/join">我是另一半，用分享碼加入</a>
    <a class="text-link small" href="#/" id="try-first" hidden>先看看，之後再註冊</a>
    ${isUp || !last ? introFeatures() : ''}
  `;
  if (!isUp && last) {
    const hint = document.createElement('div');
    hint.className = 'small muted'; hint.style.textAlign = 'center'; hint.id = 'last-login';
    hint.textContent = last === 'google' ? '你上次是用 Google 登入的' : '你上次是用 Email 登入的';
    const anchor = document.getElementById(last === 'google' && !IN_APP ? 'google-btn' : 'login-form');
    anchor.parentNode.insertBefore(hint, anchor);
    if (last === 'email') { try { const em = localStorage.getItem('lastLoginEmail'); if (em) document.getElementById('email').value = em; } catch (e) { /* 略過 */ } }
  }
  hasAccountHere().then((has) => { const b = document.getElementById('try-first'); if (b && !has) b.hidden = false; });
  document.getElementById('try-first').addEventListener('click', (ev) => {
    ev.preventDefault();
    if (location.hash === '#/') route(); else go('#/');
  });
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
    rememberLogin('google');
    try { sessionStorage.setItem('googlePending', '1'); } catch (e) { /* 略過 */ }
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
        track('sign_up', { method: 'email' });
        if (!session) {
          msg.textContent = '帳號建立好了！請到信箱點確認連結，確認後回到這裡登入。';
          btn.disabled = false;
          viewLoginAfterSignup(email);
          return;
        }
      } else {
        await CloudDB.signIn(email, password);
        track('login', { method: 'email' });
      }
      rememberLogin('email');
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
  // 意見回饋會附上是從哪一頁來的（只有頁面名稱，不含紀錄內容）
  if (page !== 'feedback') { try { sessionStorage.setItem('fbFrom', page || 'home'); } catch (e) { /* 沒關係 */ } }
  app.className = '';
  app.oninput = null;
  window.scrollTo(0, 0);
  try { if (window.Analytics) window.Analytics.pageView(); } catch (e) { /* 略過 */ }
  try {
    if (isGuest()) {
      if (page === 'join') { renderTabbar(null); viewJoin('', arg); return; }
      // 登入過的手機登出後回到登入畫面；新使用者可以直接試用（資料先存在手機）
      if (page === 'login' || page === 'signup' || await hasAccountHere()) { renderTabbar(null); viewLogin(page === 'signup' ? 'signup' : 'signin'); return; }
    }
    // 已經送出加入要求、還在等主人同意
    if (CLOUD_ENABLED && CloudDB.pendingJoin() && !isPartner()) { renderTabbar(null); viewWaitingApproval(); return; }
    // 臨時帳號但不是（或已經不是）另一半：分享被停止、被移除，或加入沒成功
    if (CLOUD_ENABLED && CloudDB.isAnonymous() && !isPartner()) {
      renderTabbar(null);
      viewJoin(page === 'join' ? '' : '這段分享已經結束了，或這支手機的加入資料不見了。如果還要一起用，請對方給你分享碼和密碼，再加入一次。', page === 'join' ? arg : '');
      return;
    }
    // 已經綁定過的另一半用 Google 登入回來，但還沒連到對方的日記：讓他再輸入一次分享碼
    if (page === 'join' && rejoinNotice && !isPartner()) { renderTabbar(null); viewJoin('你已經用原本的帳號登入了，但還沒連到對方的日記。再輸入一次分享碼和密碼，對方按「同意」後就回來了，之前寫的紀錄都還在。', arg); return; }
    if (!isGuest() && (page === 'login' || page === 'signup' || page === 'join')) { go('#/'); return; }
    await loadNames();
    await ensureNumbers();
    await purgeOldTrash();
    if (page === 'reset' && usingCloud() && !CloudDB.isAnonymous()) { renderTabbar(null); viewResetPassword(); return; }
    if (isPartner()) {
      if (!page) { renderTabbar('home'); await viewPartnerHome(); }
      else if (page === 'list' && TYPES[arg] && arg !== 'fight') { renderTabbar(arg); await viewList(arg); }
      else if (page === 'fights') { renderTabbar('fight'); await viewFights(); }
      else if (page === 'view') { renderTabbar(null); await viewDetail(arg); }
      else if (page === 'new' && TYPES[arg]) { renderTabbar(null); await viewForm('new', arg); }
      else if (page === 'edit') { renderTabbar(null); await viewForm('edit', arg); }
      else if (page === 'bind') { renderTabbar(null); viewBind(); }
      else if (page === 'tasks') { renderTabbar('tasks'); await viewPartnerTasks(); }
      else if (page === 'wishes') { renderTabbar(null); await viewWishes(); }
      else if (page === 'feedback') { renderTabbar(null); viewFeedback(); }
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
    else if (page === 'stamps') { renderTabbar(null); await viewStamps(); }
    else if (page === 'wishes') { renderTabbar(null); await viewWishes(); }
    else if (page === 'feedback') { renderTabbar(null); viewFeedback(); }
    else if (page === 'tasks' && usingCloud()) { renderTabbar(null); await viewPartnerTasks(); }
    else if (page === 'end' && usingCloud()) { renderTabbar(null); await viewEnd(arg ? decodeURIComponent(arg) : ''); }
    else if (page === 'archive' && usingCloud()) { renderTabbar(null); await viewArchive(); }
    else if (page === 'task' && usingCloud()) { renderTabbar(null); await viewPartnerTaskForm(arg); }
    else go('#/');
    if (!page || page === 'view') checkNewStamps().catch(() => {});
    if (!page || page === 'view') { if (!maybeShowSignupNudge()) maybeShowA2hs(); }
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="empty no-mascot">${esc(cloudErrorText(e))}<button class="btn small" id="reload">重新整理</button></div>`;
    document.getElementById('reload').addEventListener('click', () => location.reload());
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

// 連不上雲端時說清楚：資料沒有不見，可能是網路或雲端暫停（免費方案一週沒人用會暫停）
function cloudErrorText(e) {
  const m = (e && e.message) || '';
  if ((e && e.name === 'QuotaExceededError') || /quota|storage.*full|No space/i.test(m)) return '手機的儲存空間可能滿了，存不進去。先刪掉一些照片或 App，或先匯出備份，再試一次。';
  if (/fetch|network|load failed|timeout/i.test(m)) return navigator.onLine === false ? '現在沒有網路，連上網路後再試一次。' : '連不上雲端。資料沒有不見，可能是網路不穩，或雲端太久沒人用被暫停了（到 Supabase 後台按 Restore 就會恢復）。';
  return m || '出了一點問題，請再試一次';
}
// 沒接住的錯誤（例如雲端連不上）用提示告訴使用者
window.addEventListener('unhandledrejection', (ev) => {
  toast(cloudErrorText(ev.reason));
});

// ---------- App 密碼鎖（可自己開，預設關閉）----------
// 只存在這支手機：4 位數密碼加鹽雜湊後放 localStorage。打開 App、或離開超過 1 分鐘再回來時要輸入。
// 這是防「手機借給別人看」的簡單鎖，不是加密；忘記的話雲端版登出再登入就會解除。
const PIN_KEY = 'appPin';
const PIN_RELOCK_MS = 60 * 1000;
function pinSaved() { try { return JSON.parse(localStorage.getItem(PIN_KEY) || 'null'); } catch (e) { return null; } }
async function pinHash(pin, salt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function pinSet(pin) {
  const salt = DB.uid();
  localStorage.setItem(PIN_KEY, JSON.stringify({ salt, hash: await pinHash(pin, salt) }));
}
async function pinCheck(pin) { const p = pinSaved(); return !!p && (await pinHash(pin, p.salt)) === p.hash; }
function pinClear() { try { localStorage.removeItem(PIN_KEY); } catch (e) { /* 略過 */ } }

// 輸入 4 位數的鍵盤畫面；onDone(pin) 回傳 true 代表通過（關掉畫面），false 會搖一下重來
function pinPad({ title, sub, onDone, cancelable = false, forgot = null }) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'pin-lock';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', title);
    el.innerHTML = `
      <div class="pin-box">
        ${mascotHtml('happy', 90)}
        <div class="bold" style="font-size:18px">${esc(title)}</div>
        <div class="small muted" id="pin-sub">${esc(sub || '')}</div>
        <div class="pin-dots" aria-hidden="true">${'<span></span>'.repeat(4)}</div>
        <div class="pin-keys">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-pin="${n}">${n}</button>`).join('')}
          <button data-pin-cancel ${cancelable ? '' : 'style="visibility:hidden"'}>取消</button>
          <button data-pin="0">0</button>
          <button data-pin-back aria-label="刪除一個數字">⌫</button>
        </div>
        ${forgot ? '<button class="btn small secondary" id="pin-forgot">忘記密碼？</button>' : ''}
      </div>`;
    document.body.appendChild(el);
    let val = '';
    const dots = el.querySelectorAll('.pin-dots span');
    const paint = () => dots.forEach((d, i) => d.classList.toggle('on', i < val.length));
    const close = (v) => { el.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const push = async (d) => {
      if (val.length >= 4) return;
      val += d; paint();
      if (val.length < 4) return;
      const ok = await onDone(val);
      if (ok) { close(val); return; }
      el.querySelector('.pin-dots').classList.add('shake');
      setTimeout(() => { val = ''; paint(); const x = el.querySelector('.pin-dots'); if (x) x.classList.remove('shake'); }, 400);
    };
    const onKey = (ev) => {
      if (/^\d$/.test(ev.key)) push(ev.key);
      else if (ev.key === 'Backspace') { val = val.slice(0, -1); paint(); }
      else if (ev.key === 'Escape' && cancelable) close(null);
    };
    document.addEventListener('keydown', onKey);
    el.querySelectorAll('[data-pin]').forEach((b) => b.addEventListener('click', () => push(b.dataset.pin)));
    el.querySelector('[data-pin-back]').addEventListener('click', () => { val = val.slice(0, -1); paint(); });
    if (cancelable) el.querySelector('[data-pin-cancel]').addEventListener('click', () => close(null));
    if (forgot) el.querySelector('#pin-forgot').addEventListener('click', () => forgot(close));
  });
}

let pinLocked = false;
async function showPinLock() {
  if (pinLocked || !pinSaved()) return;
  pinLocked = true;
  // 猜錯太多次要等：5 次等 30 秒、10 次以上等 5 分鐘（記在這支手機，重新整理也不會歸零）
  const fails = () => { try { return JSON.parse(localStorage.getItem('pinFails') || '{"n":0,"until":0}'); } catch (e) { return { n: 0, until: 0 }; } };
  const setFails = (f) => { try { localStorage.setItem('pinFails', JSON.stringify(f)); } catch (e) { /* 略過 */ } };
  await pinPad({
    title: '輸入密碼',
    sub: '這支手機設了 App 密碼鎖',
    onDone: async (pin) => {
      const sub = document.getElementById('pin-sub');
      const f = fails();
      if (f.until > Date.now()) {
        if (sub) sub.textContent = `錯太多次了，請等 ${Math.ceil((f.until - Date.now()) / 1000)} 秒再試`;
        return false;
      }
      if (await pinCheck(pin)) { setFails({ n: 0, until: 0 }); return true; }
      f.n += 1;
      f.until = f.n >= 10 ? Date.now() + 5 * 60000 : f.n % 5 === 0 ? Date.now() + 30000 : 0;
      setFails(f);
      if (sub) sub.textContent = f.until ? `錯太多次了，請等 ${f.n >= 10 ? '5 分鐘' : '30 秒'}再試。忘記的話可以按「忘記密碼？」` : '密碼不對，再試一次';
      return false;
    },
    forgot: (close) => {
      if (usingCloud() && CloudDB.isSignedIn() && !CloudDB.isAnonymous()) {
        if (!confirm('忘記密碼的話，要登出再重新登入，登入後密碼鎖會解除。要登出嗎？')) return;
        pinClear();
        close(null);
        CloudDB.signOut().then(() => { go('#/login'); route(); });
      } else {
        alert(usingCloud() ? '用分享碼加入的另一半忘記密碼，要清除這個網站的瀏覽器資料，再用分享碼重新加入。' : '手機版的紀錄只存在這支手機，忘記密碼只能清除這個網站的瀏覽器資料，紀錄也會一起不見。有匯出過備份的話，可以之後再匯入。');
      }
    },
  });
  pinLocked = false;
}
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hiddenAt = Date.now();
  else if (hiddenAt && Date.now() - hiddenAt > PIN_RELOCK_MS) showPinLock();
});

function pinCardHtml() {
  const on = !!pinSaved();
  return `<div class="card" id="pin-card">
    <div class="row between"><div class="bold">App 密碼鎖</div>
      <button class="btn small ${on ? 'secondary' : ''}" id="pin-toggle">${on ? '關閉' : '開啟'}</button></div>
    <div class="muted small">${on ? '已開啟：打開 App、或離開超過 1 分鐘再回來時，要輸入 4 位數密碼。只鎖這支手機。' : '開啟後，打開 App 要先輸入 4 位數密碼，手機借別人看也不怕。只鎖這支手機，預設關閉。'}</div>
    ${on ? '<button class="btn small secondary" id="pin-change">更改密碼</button>' : ''}
  </div>`;
}
function bindPinCard(refresh) {
  const ask = async (title, sub) => pinPad({ title, sub, cancelable: true, onDone: async () => true });
  const toggle = document.getElementById('pin-toggle');
  if (toggle) toggle.addEventListener('click', async () => {
    if (pinSaved()) {
      const cur = await pinPad({ title: '輸入目前的密碼', sub: '確認是你本人，才能關閉', cancelable: true, onDone: pinCheck });
      if (!cur) return;
      pinClear(); toast('已關閉密碼鎖'); refresh();
      return;
    }
    // 手機版忘記密碼只能清掉資料，所以開啟前要先有一份最近的備份
    if (!usingCloud() && (await DB.allRecords()).length) {
      const last = await DB.getSetting('lastBackupAt', null);
      if (!last || Date.now() - last > 86400000) {
        if (!confirm('手機版的紀錄只存在這支手機，忘記密碼的話只能清除瀏覽器資料，紀錄會一起不見。\n開啟密碼鎖前要先匯出一份備份，按「確定」現在匯出。')) return;
        const exp = document.getElementById('export');
        if (exp) exp.click();
        toast('備份好之後，再按一次「開啟」設定密碼');
        return;
      }
    }
    const a = await ask('設定 4 位數密碼', '之後打開 App 要輸入');
    if (!a) return;
    const b = await pinPad({ title: '再輸入一次', sub: '確認密碼', cancelable: true, onDone: async (x) => x === a });
    if (!b) return;
    await pinSet(a); track('pin_enable'); toast('已開啟密碼鎖'); refresh();
  });
  const change = document.getElementById('pin-change');
  if (change) change.addEventListener('click', async () => {
    const cur = await pinPad({ title: '輸入目前的密碼', cancelable: true, onDone: pinCheck });
    if (!cur) return;
    const a = await ask('新的 4 位數密碼');
    if (!a) return;
    const b = await pinPad({ title: '再輸入一次', sub: '確認新密碼', cancelable: true, onDone: async (x) => x === a });
    if (!b) return;
    await pinSet(a); toast('密碼已更改'); refresh();
  });
}

// ---------- 回到頂端、從左邊滑回上一頁 ----------
const toTop = document.createElement('button');
toTop.className = 'to-top';
toTop.type = 'button';
toTop.setAttribute('aria-label', '回到最上面');
toTop.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';
toTop.hidden = true;
toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
document.body.appendChild(toTop);
window.addEventListener('scroll', () => { toTop.hidden = window.scrollY < 500; }, { passive: true });
window.addEventListener('hashchange', () => { toTop.hidden = true; });
// 從畫面左邊往右滑：等於按左上角的返回（加到主畫面後沒有瀏覽器的返回鍵，這樣比較方便）
let swipe = null;
document.addEventListener('touchstart', (ev) => {
  const t = ev.touches[0];
  swipe = ev.touches.length === 1 && t.clientX < 30 && !document.querySelector('.celebrate, .pin-lock') ? { x: t.clientX, y: t.clientY } : null;
}, { passive: true });
document.addEventListener('touchend', (ev) => {
  if (!swipe) return;
  const t = ev.changedTouches[0];
  const dx = t.clientX - swipe.x;
  const dy = Math.abs(t.clientY - swipe.y);
  swipe = null;
  if (dx < 80 || dy > 60) return;
  const back = document.querySelector('.topbar .icon-btn[aria-label="返回"]');
  if (back) back.click();
}, { passive: true });

window.addEventListener('hashchange', route);
requestPersist();
(async () => {
  // 密碼鎖最先蓋上，紀錄內容才不會先閃出來
  showPinLock();
  if (CLOUD_ENABLED) {
    try { await CloudDB.loadSession(); await afterOwnerLogin(); } catch (e) { toast(cloudErrorText(e)); }
    // 從 Google 回來：另一半綁定成功就說一聲；失敗就回到綁定頁、寫清楚原因（不然會一直繞回同一個畫面）
    let linking = false;
    try { linking = !!sessionStorage.getItem('linkPending'); sessionStorage.removeItem('linkPending'); } catch (e) { /* 略過 */ }
    const urlErr = CloudDB.takeUrlError();
    let rejoin = false;
    try { rejoin = !!sessionStorage.getItem('rejoinAfterLogin'); sessionStorage.removeItem('rejoinAfterLogin'); } catch (e) { /* 略過 */ }
    if (rejoin && CloudDB.isSignedIn() && !CloudDB.isAnonymous()) {
      if (isPartner()) toast('歡迎回來！已經回到原本的帳號');
      else if (!CloudDB.pendingJoin()) { rejoinNotice = true; go('#/join'); }
    }
    if (linking && CloudDB.isBoundPartner()) { bindError = ''; toast('Google 綁定完成！'); }
    else if (linking && isPartner()) { bindError = googleBindErrorText(urlErr); go('#/bind'); }
    else if (urlErr) toast(/identity_already_exists|already/i.test(`${urlErr.code} ${urlErr.message}`) ? '這個 Google 帳號已經被用過了，換一個帳號或改用 Email。' : `Google 登入沒有成功：${urlErr.message || urlErr.code}`);
  }
  route();
})();
