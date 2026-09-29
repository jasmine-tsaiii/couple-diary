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
const BACKUP_SNOOZE_DAYS = 7; // 首頁備份提醒按叉叉後，幾天後再出現

const ICON = {
  bell: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
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
// 同一頁換篩選條件時重畫：留在原本的位置，橫向捲動的標籤列也不要跳回最左邊（iPhone 點最右邊的分類會跳掉）
async function keepPlace(render) {
  const y = window.scrollY;
  const lefts = [...app.querySelectorAll('.chips.scroll')].map((el) => el.scrollLeft);
  app.style.minHeight = app.offsetHeight + 'px'; // 結果變少時頁面不會突然縮短、整頁往上跳
  await render();
  app.querySelectorAll('.chips.scroll').forEach((el, i) => {
    el.scrollLeft = lefts[i] || 0;
    const on = el.querySelector('.chip.on');
    if (on && (on.offsetLeft < el.scrollLeft || on.offsetLeft + on.offsetWidth > el.scrollLeft + el.clientWidth)) {
      el.scrollLeft = Math.max(0, on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2);
    }
  });
  window.scrollTo(0, y);
}
// 編輯頁還沒儲存時，手機返回鍵、滑動返回、重新整理都要先問（record.js 設定，換頁後清掉）
let formGuard = null;
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
// iPhone 在 Safari 分頁裡用（不是主畫面、不是 LINE/IG）：7 天沒打開，Safari 可能清掉這個網站存在手機裡的資料
const IOS_SAFARI_TAB = /iphone|ipad|ipod/i.test(navigator.userAgent) && !IN_APP
  && !(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) && navigator.standalone !== true;
const IOS_CLEAR_NOTE = 'iPhone 的 Safari 如果超過 7 天沒打開這個網站，可能會自動清掉存在手機裡的紀錄。';
function inAppNotice() {
  if (!IN_APP) return '';
  return `<div class="card" style="background:var(--open-bg);border-color:transparent;gap:4px">
    <div class="bold" style="color:var(--open-ink)">請改用 Safari 或 Chrome 打開</div>
    <div class="small" style="color:var(--open-ink)">你現在是在 LINE（或其他 App）裡面打開的。這裡存的資料之後在瀏覽器看不到，也不能用 Google 登入。請點右上角的「⋯」，選「用瀏覽器開啟」。</div>
  </div>`;
}
// LINE、IG 裡面的瀏覽器存不了檔案：先說清楚，不要假裝已經下載
function inAppCantSave(what) {
  if (!IN_APP) return false;
  alert(`LINE、IG 裡打開的畫面沒辦法存${what}。\n請點右上角的「⋯」，選「用瀏覽器開啟」，在 Safari 或 Chrome 裡再按一次。`);
  return true;
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
