// 啾啾日記 js/app/plus.js：付費功能的免費版和「假門」入口（2026-10-01）
// 規格：plans/付費功能免費版與假門規格-2026-10-01.md
// - 「我有興趣」每個人每個功能只算一次（資料庫 upgrade_interest 是 (owner, feature) 一列；試用模式記在這支手機）
// - paywall_view（看過付費說明）也是每人每功能只送一次
// - 時光膠囊：免費同時 1 個還沒打開的；打開日期前，對方只拿得到「哪天打開」，內容在資料庫擋
// - 主題背景：預設＋手帳紙免費，夜空、櫻花、聖誕可以預覽，按套用出現 Plus 說明
// - 假門：任務範本（任務包）、臥底任務卡包、主題題庫（每日一問）

// ---------- 「我有興趣」：每人每功能一次 ----------
const PLUS_FEATURES = ['photos', 'capsule', 'theme', 'theme_single', 'daily_question', 'task_pack', 'mission_pack', 'recap_premium', 'nest'];
function interestWho() {
  try { return usingCloud() ? CloudDB.myId() || 'guest' : 'guest'; } catch (e) { return 'guest'; }
}
function localFlag(kind, feature) {
  try { return !!localStorage.getItem(`${kind}:${interestWho()}:${feature}`); } catch (e) { return false; }
}
function setLocalFlag(kind, feature) {
  try { localStorage.setItem(`${kind}:${interestWho()}:${feature}`, String(Date.now())); } catch (e) { /* 存不了就算了 */ }
}
let cloudInterests = null;
let cloudInterestsFor = null;
async function hasInterest(feature) {
  if (localFlag('interest', feature)) return true;
  if (!usingCloud()) return false;
  if (cloudInterestsFor !== interestWho()) { cloudInterests = null; cloudInterestsFor = interestWho(); }
  if (!cloudInterests) { try { cloudInterests = await CloudDB.myInterests(); } catch (e) { cloudInterests = []; } }
  return cloudInterests.includes(feature);
}
// 回傳 true 代表這次是第一次登記（才送 GA 事件）
async function registerInterest(feature) {
  if (!PLUS_FEATURES.includes(feature)) return false;
  if (await hasInterest(feature)) return false;
  let fresh = true;
  if (usingCloud()) {
    try { fresh = await CloudDB.noteInterest(feature, yearPrice()); } catch (e) { /* 記不到雲端，至少這支手機記住 */ }
    if (cloudInterests) cloudInterests.push(feature);
  }
  setLocalFlag('interest', feature);
  if (fresh) track('upgrade_interest', { feature, price: yearPrice() });
  return fresh;
}
function notePaywallView(feature) {
  if (localFlag('pwview', feature)) return;
  setLocalFlag('pwview', feature);
  track('paywall_view', { feature, price: yearPrice() });
}

// ---------- 價格（2026-10-01 定案，規格第五～七節） ----------
// 一人付兩人用；年費＝一次買 12 個月、不自動續約；月費可隨時取消。
// 價格測試：一半的人看到年費 690、一半看到 790，同一個人永遠看到同一個
// （登入的人用帳號 id 算，換手機也一樣；試用的人隨機一次記在這支手機）。
const PRICE_A = 690;
const PRICE_B = 790;
const PRICE_MONTH = 75;
// 2026-10-01 12:17 改：早鳥只給前 20 組，沒有第二波
const WAVES = [{ upto: 20, price: 490, name: '首發早鳥' }];
function yearPrice() {
  let id = '';
  try { id = usingCloud() ? CloudDB.myId() || '' : ''; } catch (e) { id = ''; }
  if (id) { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 2 ? PRICE_B : PRICE_A; }
  try {
    let v = localStorage.getItem('priceVariant');
    if (v !== String(PRICE_A) && v !== String(PRICE_B)) { v = String(Math.random() < 0.5 ? PRICE_A : PRICE_B); localStorage.setItem('priceVariant', v); }
    return Number(v);
  } catch (e) { return PRICE_A; }
}
function priceLadderHtml(groups) {
  const y = yearPrice();
  const save = Math.round((1 - y / (PRICE_MONTH * 12)) * 100);
  const perDay = y / 365 / 2;
  return `<div class="plus-ladder">
    <div class="plan early"><div class="plan-top"><span class="plan-name">${WAVES[0].name}：前 ${WAVES[0].upto} 組</span><span class="plan-badge">續約也是這個價</span></div>
      <div><s>NT$${y}</s> <b>NT$${WAVES[0].price}</b>／年</div>
      <div class="small muted">第 ${WAVES[0].upto + 1} 組起 NT$${y}／年</div></div>
    <div class="plan on"><div class="plan-top"><span class="plan-name">年費</span><span class="plan-badge">最划算・省 ${save}%</span></div>
      <div><b class="plan-big">每月 NT$${Math.round(y / 12)}</b></div>
      <div class="small muted">一年 NT$${y}，一次買 12 個月，不會自動續約</div></div>
    <div class="plan"><div class="plan-top"><span class="plan-name">月費</span></div>
      <div>NT$${PRICE_MONTH}／月</div>
      <div class="small muted">一年下來 NT$${PRICE_MONTH * 12}，可以隨時取消</div></div>
  </div>
  <div class="plus-who"><b>一人付，兩人用</b>・每人每天${perDay < 1 ? '不到 1 元' : `約 ${Math.round(perDay * 10) / 10} 元`}</div>
  ${groups ? `<div class="plus-groups">已有 <b>${groups}</b> 組情侶登記</div>` : ''}
  <div class="small muted">推出時可以先免費試用 7 天，不用綁卡。</div>`;
}

// ---------- Plus 說明（即將推出） ----------
const PLUS_PERKS = [
  ['💌', '時光膠囊不限數量'],
  ['🎨', '全部主題背景（夜空、櫻花、聖誕…）'],
  ['🎁', '任務包、臥底任務卡包、主題題庫'],
  ['📷', '雲端放更多照片'],
];
const DONE_TEXT = '已登記，推出時通知你';
// feature：這個入口的代號；opts.title、opts.lead：說明；opts.preview：預覽（HTML）；opts.single：另外「單買」的按鈕 { feature, label }
async function showPlusSheet(feature, opts = {}) {
  if (document.querySelector('.plus-dlg')) return;
  notePaywallView(feature);
  const done = await hasInterest(feature);
  const singleDone = opts.single ? await hasInterest(opts.single.feature) : false;
  let groups = null;
  if (!opts.free && CLOUD_ENABLED) { try { groups = await CloudDB.interestGroups(); } catch (e) { groups = null; } }
  const box = document.createElement('div');
  box.className = 'celebrate plus-dlg';
  box.innerHTML = `<div class="celebrate-box plus-box" role="dialog" aria-modal="true" aria-label="${esc(opts.title || '啾啾 Plus')}">
    <button class="card-x" id="plus-x" aria-label="關閉">${ICON.x}</button>
    <div class="plus-tag">${opts.free ? '即將推出' : '啾啾 Plus・即將推出'}</div>
    <h2 style="font-size:20px">${esc(opts.title || '這是 Plus 功能')}</h2>
    ${opts.lead ? `<div class="muted">${opts.lead}</div>` : ''}
    ${opts.preview || ''}
    ${opts.free ? '' : `<div class="plus-subhead">啾啾 Plus：一個人訂閱，你們兩個人都能用</div>
    <ul class="plus-perks">${PLUS_PERKS.map(([i, t]) => `<li><span aria-hidden="true">${i}</span>${t}</li>`).join('')}</ul>
    ${priceLadderHtml(groups)}`}
    <button class="btn" id="plus-yes" ${done ? 'disabled' : ''}>${done ? DONE_TEXT : '我有興趣，推出時通知我'}</button>
    ${opts.single ? `<button class="btn secondary small" id="plus-single" ${singleDone ? 'disabled' : ''}>${singleDone ? DONE_TEXT : esc(opts.single.label)}</button>` : ''}
    <button class="btn secondary small" id="plus-no">${opts.noLabel || '先不用'}</button>
    <div class="small muted">${opts.free ? '想要的人夠多，就會先做這個。' : '還沒開始收費，按了也不會扣款。'}${done ? '' : '每個人按一次就記下來了。'}</div>
    ${opts.free ? '' : '<div class="small muted">解除綁定時，Plus 會留在付費的人身上；已經寫下的內容都不會被刪除。</div>'}
  </div>`;
  document.body.appendChild(box);
  const close = () => { box.remove(); if (opts.onClose) opts.onClose(); };
  box.querySelector('#plus-no').addEventListener('click', close);
  box.querySelector('#plus-x').addEventListener('click', close);
  box.addEventListener('click', (ev) => { if (ev.target === box) close(); });
  const mark = async (btn, f) => {
    btn.disabled = true;
    const fresh = await registerInterest(f);
    btn.textContent = DONE_TEXT;
    toast(fresh ? '謝謝！推出時會通知你' : '已經登記過了，推出時通知你');
  };
  box.querySelector('#plus-yes').addEventListener('click', (ev) => mark(ev.currentTarget, feature));
  const single = box.querySelector('#plus-single');
  if (single) single.addEventListener('click', (ev) => mark(ev.currentTarget, opts.single.feature));
}

// ---------- 時光膠囊 ----------
const CAPSULE_FREE = 1;
const CAPSULE_MAX = 2000;
const OCCASIONS = { anniversary: '週年紀念日', birthday: '生日', custom: '自己選日期' };
// 雲端（正式帳號或另一半）存在資料庫；試用、單機版存在這支手機
const capsuleCloud = () => usingCloud() && (!CloudDB.isAnonymous() || isPartner());
const Capsules = {
  async list() {
    if (capsuleCloud()) return (await CloudDB.capsuleList()).map((c) => ({ ...c, open_on: String(c.open_on).slice(0, 10) }));
    const list = await LocalDB.getSetting('capsules', []);
    return list.map((c) => ({ ...c, mine: true, opened: c.open_on <= today() })).sort((a, b) => a.open_on.localeCompare(b.open_on));
  },
  // c：{ id?, open_on, occasion, body, photo_path? }；blob：新照片；removePhoto：拿掉照片
  async save(c, blob, removePhoto) {
    if (capsuleCloud()) {
      const prev = c.photo_path || null;
      let path = removePhoto ? null : prev;
      if (blob) path = await CloudDB.capsuleUpload(blob);
      let res;
      try { res = await CloudDB.capsuleSave({ ...c, photo_path: path }); } catch (e) {
        if (blob && path) await CloudDB.capsuleRemovePhoto(path);
        throw e;
      }
      if (res && res.old_photo) await CloudDB.capsuleRemovePhoto(res.old_photo);
      return res && res.id;
    }
    const list = await LocalDB.getSetting('capsules', []);
    const old = c.id ? list.find((x) => x.id === c.id) : null;
    if (!old && list.filter((x) => x.open_on > today()).length >= CAPSULE_FREE) { const e = new Error('capsule_limit'); e.limit = true; throw e; }
    let photo = removePhoto ? null : (old && old.photo_path) || null;
    if (blob) { photo = `cap-${LocalDB.uid()}`; await LocalDB.putPhoto({ id: photo, blob }); }
    if (old && old.photo_path && old.photo_path !== photo) { try { await LocalDB.deletePhoto(old.photo_path); } catch (e) { /* 略過 */ } }
    const rec = { id: (old && old.id) || LocalDB.uid(), open_on: c.open_on, occasion: c.occasion, body: c.body, photo_path: photo, created_at: (old && old.created_at) || new Date().toISOString(), updated_at: new Date().toISOString() };
    await LocalDB.setSetting('capsules', [...list.filter((x) => x.id !== rec.id), rec]);
    return rec.id;
  },
  async remove(c) {
    if (capsuleCloud()) {
      const photo = await CloudDB.capsuleDelete(c.id);
      if (photo) await CloudDB.capsuleRemovePhoto(photo);
      return;
    }
    const list = await LocalDB.getSetting('capsules', []);
    await LocalDB.setSetting('capsules', list.filter((x) => x.id !== c.id));
    if (c.photo_path) { try { await LocalDB.deletePhoto(c.photo_path); } catch (e) { /* 略過 */ } }
  },
  async photoUrl(c) {
    if (!c.photo_path) return null;
    try {
      if (capsuleCloud()) { const b = await CloudDB.taskPhoto(c.photo_path); return b ? URL.createObjectURL(b) : null; }
      const p = await LocalDB.getPhoto(c.photo_path);
      return p ? URL.createObjectURL(p.blob) : null;
    } catch (e) { return null; }
  },
};
// 印章要用：我寫過幾個、打開過幾個
let capsuleCounts = { made: 0, opened: 0 };
async function loadCapsulesSafe() {
  try {
    const list = await Capsules.list();
    capsuleCounts = { made: list.filter((c) => c.mine).length, opened: list.filter((c) => c.opened).length };
    return list;
  } catch (e) { return null; }
}
const daysUntil = (iso) => Math.round((Date.parse(iso) - Date.parse(today())) / 86400000);
const capWhen = (c) => `${shortDate(c.open_on)}${c.open_on.slice(0, 4) !== today().slice(0, 4) ? `（${c.open_on.slice(0, 4)}）` : ''}`;
async function hasPartnerNow() {
  if (isPartner()) return true;
  if (!usingCloud() || CloudDB.isAnonymous()) return false;
  try { return (await CloudDB.listPartners()).some((p) => p.approved !== false); } catch (e) { return true; }
}
// 下一個週年紀念日（沒填在一起的日期就沒有）
function nextAnniversary() {
  if (!NAMES.since || !DATE_RE.test(NAMES.since)) return '';
  const [, m, d] = NAMES.since.split('-');
  const y = Number(today().slice(0, 4));
  for (const yy of [y, y + 1]) {
    const iso = `${yy}-${m}-${d}`;
    if (iso > today() && !Number.isNaN(Date.parse(iso))) return iso;
  }
  return '';
}
function capsuleRow(c) {
  const left = daysUntil(c.open_on);
  if (c.sealed) {
    return `<div class="cap-row sealed" data-cap="${esc(c.id)}">
      <div class="cap-icon" aria-hidden="true">💌</div>
      <div class="grow"><div class="bold">${esc(c.author_name || otherName())}寫給你的時光膠囊</div>
      <div class="small muted">${capWhen(c)} 打開・還有 ${left} 天</div></div>
      <span class="cap-lock">${ICON.lock}</span>
    </div>`;
  }
  const who = c.mine ? `寫給${esc(otherName())}` : `${esc(c.author_name || otherName())}寫給你`;
  return `<a class="cap-row${c.opened ? ' opened' : ''}" href="#/capsule/${esc(c.id)}">
    <div class="cap-icon" aria-hidden="true">${c.opened ? '🎁' : '💌'}</div>
    <div class="grow"><div class="bold">${who}</div>
    <div class="small muted">${c.opened ? `${capWhen(c)} 打開了` : `${capWhen(c)} 打開・還有 ${left} 天・打開前都能改`}</div></div>
    <span class="nav-chev">${ICON.chevron}</span>
  </a>`;
}
async function viewCapsules() {
  app.className = 'theme-happy';
  let list;
  try { list = await Capsules.list(); } catch (e) {
    app.innerHTML = `<div class="topbar"><a class="icon-btn" href="#/together" aria-label="返回">${ICON.back}</a><h1>時光膠囊</h1></div>
      <div class="card"><div class="bold">時光膠囊暫時打不開</div><div class="small muted">${esc(e.notReady ? '這個功能要等資料庫更新後才能用。' : cloudErrorText(e))}</div></div>`;
    return;
  }
  capsuleCounts = { made: list.filter((c) => c.mine).length, opened: list.filter((c) => c.opened).length };
  const waiting = list.filter((c) => !c.opened);
  const opened = list.filter((c) => c.opened).sort((a, b) => b.open_on.localeCompare(a.open_on));
  const mineWaiting = waiting.filter((c) => c.mine).length;
  const solo = !(await hasPartnerNow());
  app.innerHTML = `
    <div class="topbar"><a class="icon-btn" href="#/together" aria-label="返回">${ICON.back}</a><h1>時光膠囊</h1></div>
    <div class="card cap-hero">
      <div class="cap-hero-icon" aria-hidden="true">💌</div>
      <div class="bold">寫一段話給未來的${esc(otherName())}</div>
      <div class="small muted">選一個打開的日子（週年、生日或任何一天）。在那之前${esc(otherName())}只會看到「有一個時光膠囊，哪天打開」，看不到內容。</div>
      ${solo ? `<div class="small cap-note">${isGuest() ? '現在是試用，膠囊存在這支手機。註冊並邀請另一半，他才收得到。' : usingCloud() ? '邀請另一半加入後，他才收得到你的膠囊。' : '現在是單人版，膠囊存在這支手機。邀請另一半一起用，他才收得到。'}</div>` : ''}
      <button class="btn" id="cap-new">寫一個時光膠囊</button>
      <div class="small muted">免費版同時可以有 ${CAPSULE_FREE} 個還沒打開的膠囊${mineWaiting ? `（你現在有 ${mineWaiting} 個）` : ''}。</div>
    </div>
    ${waiting.length ? `<h2 class="section-title">等待打開</h2><div class="card nav-list">${waiting.map(capsuleRow).join('')}</div>` : ''}
    ${opened.length ? `<h2 class="section-title">打開了</h2><div class="card nav-list">${opened.map(capsuleRow).join('')}</div>` : ''}
    ${!list.length ? '<div class="empty">還沒有時光膠囊</div>' : ''}
  `;
  document.getElementById('cap-new').addEventListener('click', () => {
    if (mineWaiting >= CAPSULE_FREE) { capsuleLimitSheet(); return; }
    go('#/capsule/new');
  });
  app.querySelectorAll('.cap-row.sealed').forEach((r) => r.addEventListener('click', () => toast(`還沒到打開的日子，${shortDate(list.find((c) => c.id === r.dataset.cap).open_on)} 見`)));
}
function capsuleLimitSheet() {
  showPlusSheet('capsule', {
    title: '想同時寫更多時光膠囊？',
    lead: `免費版同時可以有 ${CAPSULE_FREE} 個還沒打開的膠囊，等它打開就能再寫新的。Plus 可以同時寫很多個，例如週年一個、生日一個、明年的今天一個。`,
  });
}
async function viewCapsule(id) {
  app.className = 'theme-happy';
  if (id === 'new') return capsuleForm(null);
  let list;
  try { list = await Capsules.list(); } catch (e) { toast(cloudErrorText(e)); go('#/capsules'); return; }
  const c = list.find((x) => x.id === id);
  if (!c || c.sealed) { toast(c ? '還沒到打開的日子' : '找不到這個時光膠囊'); go('#/capsules'); return; }
  if (c.mine && !c.opened) return capsuleForm(c);
  try { localStorage.setItem(`capSeen:${c.id}`, '1'); } catch (e) { /* 略過 */ }
  const url = await Capsules.photoUrl(c);
  const from = c.mine ? `你寫給${esc(otherName())}` : `${esc(c.author_name || otherName())}寫給你`;
  app.innerHTML = `
    <div class="topbar"><a class="icon-btn" href="#/capsules" aria-label="返回">${ICON.back}</a><h1>時光膠囊</h1></div>
    <div class="cap-opened-head">${mascotHtml('celebrate', 120)}<div class="bold" style="font-size:18px">時光膠囊打開了</div></div>
    <div class="card cap-letter">
      <div class="small bold" style="color:var(--happy-text)">${from}・${esc(OCCASIONS[c.occasion] || '')}</div>
      <div class="small muted">寫於 ${shortDate(String(c.created_at || '').slice(0, 10))}・${capWhen(c)} 打開</div>
      ${url ? `<img class="cap-photo" src="${url}" alt="膠囊裡的照片">` : ''}
      ${c.body ? `<div class="prose">${esc(c.body)}</div>` : ''}
    </div>
    ${c.mine ? '<button class="btn small secondary" id="cap-del">刪除這個膠囊</button>' : ''}
  `;
  const del = document.getElementById('cap-del');
  if (del) del.addEventListener('click', () => {
    if (!confirm('確定要刪除這個時光膠囊嗎？刪了就救不回來。')) return;
    withBusy(del, '刪除中…', async () => { await Capsules.remove(c); toast('刪除了'); go('#/capsules'); });
  });
}
function capsuleForm(c) {
  const editing = !!c;
  const ann = nextAnniversary();
  const tomorrow = new Date(Date.parse(today()) + 86400000 + 12 * 3600000).toISOString().slice(0, 10);
  const st = { occasion: c ? c.occasion : ann ? 'anniversary' : 'custom', open_on: c ? c.open_on : ann || '', body: c ? c.body : '', blob: null, removePhoto: false };
  let dirty = false;
  formGuard = { dirty: () => dirty, leave: () => { dirty = false; } };
  const render = async () => {
    const photoUrl = st.blob ? URL.createObjectURL(st.blob) : !st.removePhoto && c ? await Capsules.photoUrl(c) : null;
    app.innerHTML = `
      <div class="topbar"><a class="icon-btn" href="#/capsules" aria-label="返回">${ICON.back}</a><h1>${editing ? '改時光膠囊' : '寫時光膠囊'}</h1></div>
      <div class="field"><div class="label">哪天打開</div>
        <div class="chips">${Object.entries(OCCASIONS).map(([k, l]) => `<button class="chip ${st.occasion === k ? 'on' : ''}" data-occ="${k}" aria-pressed="${st.occasion === k}">${l}</button>`).join('')}</div>
        ${st.occasion === 'anniversary' && !ann ? '<div class="small muted">到「我的 → 我們」填在一起的日期，就會自動帶入下一個週年。也可以直接選日期。</div>' : ''}
        <input id="cap-date" class="input" type="date" min="${tomorrow}" value="${esc(st.open_on)}" aria-label="打開日期">
        ${st.open_on ? `<div class="small muted">${longDate(st.open_on)} 打開，還有 ${daysUntil(st.open_on)} 天</div>` : ''}
      </div>
      <div class="field"><label for="cap-body">想對${esc(otherName())}說的話</label>
        <textarea id="cap-body" class="textarea" rows="7" maxlength="${CAPSULE_MAX}" placeholder="例如：寫下現在的我們，等一年後一起看">${esc(st.body)}</textarea>
        <div class="small muted" id="cap-count">${st.body.length} / ${CAPSULE_MAX}</div>
      </div>
      <div class="field"><div class="label">照片（選填，一張）</div>
        ${photoUrl ? `<img class="cap-photo" src="${photoUrl}" alt="選好的照片"><button class="btn small secondary" id="cap-photo-x">拿掉照片</button>` : '<label class="btn small secondary" for="cap-file">選一張照片</label>'}
        <input id="cap-file" type="file" accept="image/*" hidden>
      </div>
      <div class="small muted">打開之前，${esc(otherName())}只會看到「有一個時光膠囊，${st.open_on ? shortDate(st.open_on) : '○月○日'}打開」。你自己隨時可以回來看、改，到打開那天就不能改了。</div>
      <button class="btn" id="cap-save">${editing ? '儲存' : '封存膠囊'}</button>
      ${editing ? '<button class="btn small secondary" id="cap-del">刪除這個膠囊</button>' : ''}
    `;
    bind();
  };
  const bind = () => {
    app.querySelectorAll('[data-occ]').forEach((b) => b.addEventListener('click', () => {
      collect();
      st.occasion = b.dataset.occ;
      if (st.occasion === 'anniversary' && ann) st.open_on = ann;
      dirty = true;
      render();
    }));
    const d = document.getElementById('cap-date');
    d.addEventListener('change', () => { collect(); dirty = true; render(); });
    const body = document.getElementById('cap-body');
    body.addEventListener('input', () => { dirty = true; document.getElementById('cap-count').textContent = `${body.value.length} / ${CAPSULE_MAX}`; });
    document.getElementById('cap-file').addEventListener('change', async (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f) return;
      collect();
      try { st.blob = await compressImage(f); st.removePhoto = false; dirty = true; render(); } catch (e) { toast(e.message); }
    });
    const px = document.getElementById('cap-photo-x');
    if (px) px.addEventListener('click', () => { collect(); st.blob = null; st.removePhoto = true; dirty = true; render(); });
    const save = document.getElementById('cap-save');
    save.addEventListener('click', () => {
      collect();
      if (!DATE_RE.test(st.open_on) || st.open_on <= today()) { toast('打開日期要選明天以後'); return; }
      if (!st.body.trim() && !st.blob && !(c && c.photo_path && !st.removePhoto)) { toast('寫一點話，或放一張照片'); return; }
      withBusy(save, '封存中…', async () => {
        try {
          await Capsules.save({ id: c && c.id, open_on: st.open_on, occasion: st.occasion, body: st.body.trim().slice(0, CAPSULE_MAX), photo_path: c && c.photo_path }, st.blob, st.removePhoto);
        } catch (e) {
          if (e.limit || /capsule_limit/.test(e.message || '')) { capsuleLimitSheet(); return; }
          throw e;
        }
        dirty = false;
        formGuard = null;
        if (!editing) track('capsule_create', { occasion: st.occasion });
        toast(editing ? '改好了' : `封存好了，${shortDate(st.open_on)} 打開`);
        go('#/capsules');
        if (!editing) setTimeout(() => checkNewStamps().catch(() => {}), 600);
      });
    });
    const del = document.getElementById('cap-del');
    if (del) del.addEventListener('click', () => {
      if (!confirm('確定要刪除這個時光膠囊嗎？刪了就救不回來。')) return;
      withBusy(del, '刪除中…', async () => { await Capsules.remove(c); dirty = false; formGuard = null; toast('刪除了'); go('#/capsules'); });
    });
  };
  const collect = () => {
    const d = document.getElementById('cap-date');
    const b = document.getElementById('cap-body');
    if (d) st.open_on = d.value;
    if (b) st.body = b.value;
  };
  return render();
}
// 「一起」分頁的那一列
function capsuleRowNav(list) {
  let sub = '寫給未來的對方，到那天才打開';
  if (list && list.length) {
    const sealed = list.filter((c) => c.sealed).sort((a, b) => a.open_on.localeCompare(b.open_on))[0];
    const mine = list.filter((c) => c.mine && !c.opened)[0];
    if (sealed) sub = `${esc(sealed.author_name || otherName())}寫了一個給你，${shortDate(sealed.open_on)} 打開`;
    else if (mine) sub = `你的膠囊 ${shortDate(mine.open_on)} 打開`;
    else sub = `打開了 ${list.filter((c) => c.opened).length} 個`;
  }
  return navRow({ href: '#/capsules', icon: '<span class="nav-emoji" aria-hidden="true">💌</span>', title: '時光膠囊', sub });
}
// 首頁：最近 30 天打開、還沒看過的膠囊
function capsuleTipHtml(list) {
  if (!list) return '';
  const c = list.filter((x) => x.opened && daysUntil(x.open_on) >= -30 && !(() => { try { return localStorage.getItem(`capSeen:${x.id}`); } catch (e) { return true; } })())
    .sort((a, b) => b.open_on.localeCompare(a.open_on))[0];
  if (!c) return '';
  return `<a class="card" href="#/capsule/${esc(c.id)}" id="capsule-tip" style="background:var(--happy-bg);border-color:transparent;gap:4px">
    <div class="bold" style="color:var(--happy-dark)">💌 時光膠囊打開了</div>
    <div class="small" style="color:var(--happy-dark)">${c.mine ? `你寫給${esc(otherName())}的膠囊` : `${esc(c.author_name || otherName())}寫給你的膠囊`}在 ${shortDate(c.open_on)} 打開了，點這裡看看 ›</div>
  </a>`;
}

// ---------- 主題背景（存在這支手機，不影響對方） ----------
const SKINS = [
  { key: '', name: '啾啾粉', free: true, sw: ['#FBF7F2', '#A33A52', '#F6E4E8'] },
  { key: 'paper', name: '手帳紙', free: true, sw: ['#F4EEDF', '#9C4A3A', '#E6DCC6'] },
  { key: 'night', name: '夜空', sw: ['#141A33', '#E2B65A', '#2A3260'] },
  { key: 'sakura', name: '櫻花', sw: ['#FFF3F5', '#C2477A', '#FCE1EA'] },
  { key: 'xmas', name: '聖誕', sw: ['#F6F1E7', '#A3262F', '#2F6B45'] },
];
function currentSkin() { try { return localStorage.getItem('skin') || ''; } catch (e) { return ''; } }
function applySkin(k = currentSkin()) {
  const root = document.documentElement;
  if (k) root.dataset.skin = k; else delete root.dataset.skin;
  applyTheme();
}
let skinPreviewing = '';
function endSkinPreview() {
  if (!skinPreviewing) return;
  skinPreviewing = '';
  applySkin();
  const bar = document.getElementById('skin-bar');
  if (bar) bar.remove();
  document.querySelectorAll('[data-skin-pick]').forEach((x) => x.classList.toggle('on', x.dataset.skinPick === currentSkin()));
}
window.addEventListener('hashchange', endSkinPreview);
function previewSkin(s) {
  endSkinPreview();
  skinPreviewing = s.key;
  applySkin(s.key);
  notePaywallView('theme');
  const bar = document.createElement('div');
  bar.id = 'skin-bar';
  bar.className = 'skin-bar';
  bar.innerHTML = `<div class="grow"><div class="bold">預覽「${esc(s.name)}」</div><div class="small">Plus 主題・往下滑看看整頁</div></div>
    <button class="btn small" id="skin-apply">套用</button><button class="btn small secondary" id="skin-end">結束</button>`;
  document.body.appendChild(bar);
  bar.querySelector('#skin-end').addEventListener('click', endSkinPreview);
  bar.querySelector('#skin-apply').addEventListener('click', () => showPlusSheet('theme', {
    title: `「${s.name}」是 Plus 主題`,
    lead: '主題只會換你這支手機的樣子，不會影響對方。',
    single: { feature: 'theme_single', label: '只想單買這個主題 NT$30–60（即將推出）' },
    onClose: endSkinPreview,
  }));
}
function skinCard() {
  const cur = currentSkin();
  return `<div class="card" id="skin-card" style="gap:8px">
    <div class="bold">主題背景</div>
    <div class="skin-grid">${SKINS.map((s) => `<button class="skin-opt ${s.key === cur ? 'on' : ''}" data-skin-pick="${s.key}" aria-pressed="${s.key === cur}">
      <span class="skin-sw" aria-hidden="true">${s.sw.map((c) => `<i style="background:${c}"></i>`).join('')}</span>
      <span class="skin-name">${esc(s.name)}${s.free ? '' : ` <span class="skin-lock" aria-label="Plus">${ICON.lock}</span>`}</span>
    </button>`).join('')}</div>
    <div class="small muted">換整個 App 的配色和紙紋，只會改這支手機。有鎖頭的是 Plus 主題，可以先點來預覽。深色模式下會用深色配色（夜空除外）。</div>
  </div>`;
}
document.addEventListener('click', (ev) => {
  const b = ev.target.closest && ev.target.closest('[data-skin-pick]');
  if (!b) return;
  const s = SKINS.find((x) => x.key === b.dataset.skinPick);
  if (!s) return;
  if (!s.free) { previewSkin(s); return; }
  endSkinPreview();
  try { if (s.key) localStorage.setItem('skin', s.key); else localStorage.removeItem('skin'); } catch (e) { /* 存不了就只改這次 */ }
  applySkin(s.key);
  track('theme_change', { skin: s.key || 'default' });
  document.querySelectorAll('[data-skin-pick]').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
});
applySkin();

// ---------- 假門：任務範本（任務包） ----------
const TASK_TEMPLATES = [
  ['confirm', '給我一個 10 秒的擁抱'],
  ['answer', '說三個你喜歡我的地方'],
  ['confirm', '幫我按摩肩膀 5 分鐘'],
  ['photo', '拍一張你現在的自拍給我'],
  ['confirm', '寫一張小紙條，藏在我會發現的地方'],
  ['answer', '你最想跟我一起去哪裡？為什麼？'],
  ['confirm', '今天的晚餐你決定，也你去買'],
  ['answer', '分享一首最近讓你想到我的歌'],
  ['photo', '一起散步 20 分鐘，拍一張路上的風景'],
  ['answer', '我們第一次約會，你記得哪些細節？'],
];
const TASK_PACKS = [
  ['約會包', '💑', [['photo', '去一家沒去過的咖啡廳，拍下兩杯飲料'], ['confirm', '規劃一個 3 小時的小約會，行程保密到出發']]],
  ['撒嬌包', '🥺', [['confirm', '今天每次見面都要先抱一下'], ['answer', '用三個字形容今天的我，不能是「很可愛」']]],
  ['和好包', '🤝', [['answer', '這次吵架，你真正在意的是什麼？'], ['confirm', '先說一句「我剛剛那樣不對」']]],
  ['聖誕包', '🎄', [['confirm', '一起挑一份 300 元以內的交換禮物'], ['photo', '拍一張有聖誕燈的合照']]],
];
const TMODE = { confirm: '按完成', photo: '要照片', answer: '要回答' };
function taskTemplateSheet(onPick) {
  if (document.querySelector('.tpl-dlg')) return;
  const box = document.createElement('div');
  box.className = 'celebrate tpl-dlg';
  box.innerHTML = `<div class="celebrate-box tpl-box" role="dialog" aria-modal="true" aria-label="從範本選任務">
    <button class="card-x" id="tpl-x" aria-label="關閉">${ICON.x}</button>
    <h2 style="font-size:20px">從範本選任務</h2>
    <div class="small muted">點一個就會填進去，之後還能自己改。</div>
    <div class="tpl-list">${TASK_TEMPLATES.map(([m, t], i) => `<button class="tpl-item" data-tpl="${i}"><span>${esc(t)}</span><span class="tpl-mode">${TMODE[m]}</span></button>`).join('')}</div>
    <div class="section-title" style="align-self:flex-start">更多任務包 <span class="plus-tag">Plus・即將推出</span></div>
    <div class="tpl-packs">${TASK_PACKS.map(([name, icon], i) => `<button class="tpl-pack" data-pack="${i}"><span aria-hidden="true">${icon}</span>${esc(name)}<span class="skin-lock">${ICON.lock}</span></button>`).join('')}</div>
    <div id="tpl-pack-view"></div>
  </div>`;
  document.body.appendChild(box);
  const close = () => box.remove();
  box.querySelector('#tpl-x').addEventListener('click', close);
  box.addEventListener('click', (ev) => { if (ev.target === box) close(); });
  box.querySelectorAll('[data-tpl]').forEach((b) => b.addEventListener('click', () => {
    const [mode, text] = TASK_TEMPLATES[Number(b.dataset.tpl)];
    close();
    onPick({ mode, text });
  }));
  box.querySelectorAll('[data-pack]').forEach((b) => b.addEventListener('click', () => {
    const [name, icon, samples] = TASK_PACKS[Number(b.dataset.pack)];
    box.querySelectorAll('[data-pack]').forEach((x) => x.classList.toggle('on', x === b));
    notePaywallView('task_pack');
    box.querySelector('#tpl-pack-view').innerHTML = `<div class="pack-preview">
      <div class="bold">${icon} ${esc(name)}・範例</div>
      ${samples.map(([m, t]) => `<div class="pack-sample"><span>${esc(t)}</span><span class="tpl-mode">${TMODE[m]}</span></div>`).join('')}
      <div class="pack-sample more">還有 8 個任務…</div>
      <button class="btn small" id="pack-want">我想要這些任務包</button>
    </div>`;
    box.querySelector('#tpl-pack-view').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    box.querySelector('#pack-want').addEventListener('click', () => { close(); showPlusSheet('task_pack', { title: '任務包', lead: '每包 10 個主題任務：約會、撒嬌、和好、聖誕，出任務時直接選。' }); });
  }));
}

// ---------- 假門：臥底任務卡包 ----------
const MISSION_POOLS = [
  ['紀念日', '🎂', ['在今天的聊天裡，自然地提到你們第一次見面的地方', '偷偷準備一張寫了 3 個回憶的小卡，放在對方會看到的地方']],
  ['遠距離', '✈️', ['視訊時讓對方先說出「好想你」，不能直接要求', '寄一樣小東西到對方那裡，事前一個字都不能透露']],
  ['同居', '🏠', ['把對方常用的杯子洗好、裝好水，放在他的位置上', '在冰箱貼一張小紙條，等對方自己發現']],
  ['節日', '🎉', ['讓對方在不知不覺中說出想要的禮物', '幫對方安排一個 10 分鐘的小驚喜']],
];
function missionPackSheet() {
  showPlusSheet('mission_pack', {
    title: '臥底任務卡包',
    lead: '臥底任務：抽一張只有你看得到的任務卡，在對方沒發現的情況下完成，最後再一起揭曉。對方可以猜你在做什麼，猜中就算抓包。主題卡包讓任務更貼近你們的狀況。',
    preview: `<div class="mission-cards">${MISSION_POOLS.map(([name, icon, cards]) => `<div class="mission-pool"><div class="small bold">${icon} ${esc(name)}</div>${cards.map((t) => `<div class="mission-card">${esc(t)}</div>`).join('')}</div>`).join('')}</div>`,
  });
}

// ---------- 假門：主題題庫（每日一問的付費題庫） ----------
const QPACK = ['如果突然多了 10 萬元，你會怎麼用？', '你覺得兩個人的錢要分開，還是放一起？', '小時候家裡怎麼談錢？對現在的你有什麼影響？'];
function questionPackSheet() {
  if (document.querySelector('.qpack-dlg')) return;
  notePaywallView('daily_question');
  const box = document.createElement('div');
  box.className = 'celebrate qpack-dlg';
  box.innerHTML = `<div class="celebrate-box tpl-box" role="dialog" aria-modal="true" aria-label="主題題庫">
    <button class="card-x" id="qp-x" aria-label="關閉">${ICON.x}</button>
    <div class="plus-tag">啾啾 Plus・即將推出</div>
    <h2 style="font-size:20px">主題題庫</h2>
    <div class="small muted">每天一題之外，挑一個主題深聊：金錢觀、價值觀、未來規劃、家庭、親密關係…每包 30 題。這是「金錢觀」的 3 題範例，選一題試答看看。</div>
    <div class="tpl-list">${QPACK.map((q, i) => `<button class="tpl-item" data-q="${i}"><span>${esc(q)}</span></button>`).join('')}</div>
    <div id="qp-try"></div>
  </div>`;
  document.body.appendChild(box);
  const close = () => box.remove();
  box.querySelector('#qp-x').addEventListener('click', close);
  box.addEventListener('click', (ev) => { if (ev.target === box) close(); });
  box.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
    box.querySelectorAll('[data-q]').forEach((x) => x.classList.toggle('on', x === b));
    const q = QPACK[Number(b.dataset.q)];
    const t = box.querySelector('#qp-try');
    setTimeout(() => t.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 0);
    t.innerHTML = `<div class="pack-preview"><div class="bold">${esc(q)}</div>
      <textarea class="textarea" id="qp-ans" rows="3" maxlength="300" placeholder="寫下你的答案（試玩，不會存起來）"></textarea>
      <button class="btn small" id="qp-send">送出</button></div>`;
    box.querySelector('#qp-send').addEventListener('click', () => {
      if (!box.querySelector('#qp-ans').value.trim()) { toast('寫一點再送出'); return; }
      t.innerHTML = `<div class="pack-preview" style="text-align:center"><div style="font-size:30px">🔒</div>
        <div class="bold">兩個人都答了，才看得到對方的答案</div><div class="small muted">主題題庫即將推出。這題是試玩，答案沒有存起來。</div>
        <button class="btn small" id="qp-want">我有興趣</button></div>`;
      box.querySelector('#qp-want').addEventListener('click', () => { close(); showPlusSheet('daily_question', { title: '主題題庫', lead: '金錢觀、價值觀、未來規劃、家庭、親密關係…每包 30 題，兩個人都答了才揭曉。' }); });
    });
  }));
}
// ---------- 假門：啾啾的窩（兩個人一起做事掉羽毛，布置窩；免費功能，先看有沒有人想要） ----------
const NEST_LEVELS = [['🪵', '樹枝'], ['🪺', '小窩'], ['🛖', '有屋頂'], ['🌳', '樹屋'], ['🏡', '森林小屋']];
const NEST_FEATHERS = [['兩個人都答了每天一題', 3], ['完成對方出的任務', 3], ['烏雲按下「放晴」', 2], ['時光膠囊打開', 5]];
function nestSheet() {
  showPlusSheet('nest', {
    free: true,
    title: '啾啾的窩',
    lead: '兩個人一起做事會掉下羽毛，用羽毛布置啾啾的窩：盆栽、燈串、小帽子、圍巾。羽毛越多，窩會越長越大。',
    preview: `<div class="nest-preview">
      <div class="nest-bird">${mascotHtml('happy', 96)}<div class="nest-base" aria-hidden="true">🪺</div></div>
      <div class="nest-levels">${NEST_LEVELS.map(([i, n], k) => `<div class="nest-lv${k === 1 ? ' on' : ''}"><span aria-hidden="true">${i}</span>${n}</div>`).join('<span class="nest-arrow" aria-hidden="true">›</span>')}</div>
      <div class="nest-feathers">${NEST_FEATHERS.map(([t, n]) => `<div class="row between"><span>${t}</span><b>🪶 ${n}</b></div>`).join('')}</div>
      <div class="small muted">只有「一起」才會掉羽毛。啾啾不會餓、不會生病，吵架那幾天沒互動，窩只是停在原地。</div>
    </div>`,
  });
}
// 「一起」分頁：搶先看
function previewRows() {
  return [
    navRow({ href: '#/together', id: 'row-nest', icon: '<span class="nav-emoji" aria-hidden="true">🪺</span>', title: '啾啾的窩', sub: '即將推出・一起做事掉羽毛，布置啾啾的家' }),
    navRow({ href: '#/together', id: 'row-mission', icon: '<span class="nav-emoji" aria-hidden="true">🕵️</span>', title: '臥底任務卡包', sub: '即將推出・偷偷完成任務，看對方會不會發現' }),
    navRow({ href: '#/together', id: 'row-qpack', icon: '<span class="nav-emoji" aria-hidden="true">💬</span>', title: '主題題庫', sub: '即將推出・金錢觀、價值觀、未來…一起深聊' }),
  ];
}
function bindPreviewRows() {
  const n = document.getElementById('row-nest');
  if (n) n.addEventListener('click', (ev) => { ev.preventDefault(); nestSheet(); });
  const m = document.getElementById('row-mission');
  if (m) m.addEventListener('click', (ev) => { ev.preventDefault(); missionPackSheet(); });
  const q = document.getElementById('row-qpack');
  if (q) q.addEventListener('click', (ev) => { ev.preventDefault(); questionPackSheet(); });
}
