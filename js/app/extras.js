// 啾啾日記 js/app/extras.js：一起完成的事、導覽、外觀、加到主畫面、回饋、印章冊
// 所有 js/app/*.js 共用同一個全域範圍，依 index.html 的順序載入。

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
  // 時光膠囊的章也在這時候一起算（plus.js）
  if (typeof loadCapsulesSafe === 'function') await loadCapsulesSafe();
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
  const who = (w) => (w.created_by === 'partner' ? (partner ? '你加的' : `${esc(liveOther(w.created_by_name))}加的`) : (partner ? `${esc(ownerName())}加的` : ''));
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
      ${list.length ? `<div class="count"><b style="font-size:16px;color:var(--accent-text)">${done.length}</b> / ${list.length}</div>` : ''}
    </div>
    <div class="muted small">想和${esc(partner ? ownerName() : partnerName())}一起做的事都寫在這裡。${usingCloud() ? '兩個人都能新增、打勾。' : isGuest() ? '註冊並邀請另一半之後，兩個人都能新增、打勾。' : ''}</div>
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
      { mood: 'celebrate', title: '你也可以寫', text: CloudDB.isBoundPartner() ? '在美好時刻或烏雲時刻按「＋」，就能記下你自己的。每一則都可以選要給對方看，還是先上鎖。' : '用 Email 或 Google 建立你自己的帳號之後，就能記自己的美好、烏雲時刻，也能一起寫吵架議題。首頁有「建立我的帳號」可以按。' },
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
// ---------- 外觀：跟隨系統／淺色／深色（存在這支手機） ----------
const THEMES = [['system', '跟隨手機'], ['light', '淺色'], ['dark', '深色']];
function currentTheme() { try { return localStorage.getItem('theme') || 'system'; } catch (e) { return 'system'; } }
function applyTheme(t = currentTheme()) {
  const root = document.documentElement;
  // 主題背景（plus.js）：選了手帳紙、櫻花、聖誕就用它自己的淺色配色（手機是深色模式也一樣），夜空一律是深色
  const skin = root.dataset.skin || '';
  const lightSkin = skin === 'paper' || skin === 'sakura' || skin === 'xmas';
  if (lightSkin) t = 'light';
  if (t === 'light' || t === 'dark') root.dataset.theme = t; else delete root.dataset.theme;
  const dark = t === 'dark' || (t === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.mode = dark || skin === 'night' ? 'dark' : 'light';
  const skinBg = { paper: '#F4EEDF', sakura: '#FFF3F5', xmas: '#F6F1E7' }[skin];
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', skin === 'night' ? '#141A33' : dark ? '#1C1816' : skinBg || '#FBF7F2');
}
applyTheme();
if (window.matchMedia) { try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme()); } catch (e) { /* 舊瀏覽器 */ } }
function themeCard() {
  const cur = currentTheme();
  return `<div class="card" id="theme-card" style="gap:8px">
    <div class="bold">外觀</div>
    <div class="theme-pick">${THEMES.map(([k, l]) => `<button class="chip ${k === cur ? 'on' : ''}" data-theme-pick="${k}" aria-pressed="${k === cur}">${l}</button>`).join('')}</div>
    <div class="small muted">晚上寫日記可以選深色，比較不刺眼。只會改這支手機。</div>
  </div>`;
}
document.addEventListener('click', (ev) => {
  const b = ev.target.closest && ev.target.closest('[data-theme-pick]');
  if (!b) return;
  try { localStorage.setItem('theme', b.dataset.themePick); } catch (e) { /* 存不了就只改這次 */ }
  // 手帳紙、櫻花、聖誕是淺色主題：改選深色時換回啾啾粉，不然按了看起來沒反應
  const sk = document.documentElement.dataset.skin;
  if (b.dataset.themePick !== 'light' && (sk === 'paper' || sk === 'sakura' || sk === 'xmas') && typeof endSkinPreview === 'function') {
    endSkinPreview();
    const still = document.documentElement.dataset.skin;
    if (b.dataset.themePick === 'dark' && (still === 'paper' || still === 'sakura' || still === 'xmas')) {
      try { localStorage.removeItem('skin'); } catch (e) { /* 存不了就只改這次 */ }
      delete document.documentElement.dataset.skin;
      document.querySelectorAll('[data-skin-pick]').forEach((x) => { const on = x.dataset.skinPick === ''; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
      toast('深色模式用啾啾粉配色');
    }
  }
  applyTheme(b.dataset.themePick);
  document.querySelectorAll('[data-theme-pick]').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
});

const ANALYTICS_NOTE = '你們寫的內容、照片和名字，統計完全碰不到，只有你們兩個看得到。我們只會知道「今天有人新增了一則美好」這樣的次數，用來找出哪些功能好用、哪裡還要改。留著開啟，就是在幫啾啾日記變得更好。';
function analyticsCard() {
  if (!window.Analytics || !window.Analytics.configured()) return '';
  const on = window.Analytics.enabled();
  return `<div class="card" style="gap:8px">
    <div class="row between" style="gap:12px"><div class="bold">匿名使用統計</div>
      <button class="btn small ${on ? '' : 'secondary'}" id="analytics-toggle" aria-pressed="${on}">${on ? '開啟中' : '已關閉'}</button></div>
    <div class="small muted">${ANALYTICS_NOTE}想關掉也可以隨時在這裡關。</div>
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
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
// 手機上、還沒放到主畫面、沒按過「不要再提醒」
function a2hsCanAsk() {
  const ua = navigator.userAgent;
  const mobile = /iphone|ipad|ipod|android/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  if (!mobile || isStandalone() || HOME_APP_SEEN) return false;
  try { return !localStorage.getItem('a2hsNever'); } catch (e) { return false; }
}
function a2hsEligible() {
  if (!a2hsCanAsk()) return false;
  try {
    const st = JSON.parse(localStorage.getItem('a2hsShown') || '{"n":0,"at":0}');
    return st.n < 3 && Date.now() - st.at > A2HS_GAP_MS;
  } catch (e) { return false; }
}
function markA2hsPending() { try { sessionStorage.setItem('a2hsPending', '1'); } catch (e) { /* 略過 */ } }
// 另一半送出加入要求時記一下，對方同意、第一次看到日記時提醒放到主畫面（以後不用翻 LINE 找連結）
function markA2hsPartnerJoin() { try { localStorage.setItem('a2hsPartnerJoin', '1'); } catch (e) { /* 略過 */ } }
// 等慶祝、印章、導覽這些小視窗關掉再出現，免得疊在一起
function whenNoDialog(fn) {
  let tries = 0;
  const t = setInterval(() => {
    if (++tries > 120) { clearInterval(t); return; }
    if (document.querySelector('.celebrate, .pin-lock')) return;
    clearInterval(t);
    fn();
  }, 500);
}
function maybeShowA2hs() {
  maybeAskPush();
  if (maybeWelcomeHome()) return;
  let partnerJoin = false;
  try { partnerJoin = isPartner() && !!localStorage.getItem('a2hsPartnerJoin'); } catch (e) { partnerJoin = false; }
  if (partnerJoin) {
    // 真的跳出來才清掉記號（中途重新整理或換頁的話，下次再提醒）
    if (!a2hsCanAsk()) { try { localStorage.removeItem('a2hsPartnerJoin'); } catch (e) { /* 略過 */ } return; }
    whenNoDialog(() => {
      if (!isPartner() || location.hash.replace(/^#\/?/, '')) return;
      try { localStorage.removeItem('a2hsPartnerJoin'); } catch (e) { /* 略過 */ }
      showA2hs('partner_join');
    });
    return;
  }
  try { if (!sessionStorage.getItem('a2hsPending')) return; } catch (e) { return; }
  if (!a2hsEligible()) return;
  whenNoDialog(() => {
    try { sessionStorage.removeItem('a2hsPending'); } catch (e) { /* 略過 */ }
    showA2hs();
  });
}
// 第一次從主畫面打開：說一聲放好了（每支手機一次）
function maybeWelcomeHome() {
  if (!isStandalone()) return false;
  try {
    if (localStorage.getItem('a2hsWelcomed')) return false;
    localStorage.setItem('a2hsWelcomed', '1');
    localStorage.setItem('a2hsNever', '1');
  } catch (e) { return false; }
  track('a2hs_success', { platform: /android/i.test(navigator.userAgent) ? 'android' : IS_IOS ? 'ios' : 'other' });
  whenNoDialog(() => {
    const box = document.createElement('div');
    box.className = 'celebrate a2hs-welcome';
    box.innerHTML = `<div class="celebrate-box" role="dialog" aria-modal="true" aria-label="放好了">
      ${mascotHtml('celebrate', 130)}
      <h2 style="font-size:20px">放好了！</h2>
      <div class="muted">之後點主畫面的啾啾就能寫。想起什麼就來記一筆吧。</div>
      <button class="btn" id="a2hs-welcome-ok">好</button>
    </div>`;
    document.body.appendChild(box);
    const close = () => box.remove();
    box.querySelector('#a2hs-welcome-ok').addEventListener('click', close);
    box.addEventListener('click', (ev) => { if (ev.target === box) close(); });
  });
  return true;
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
  if (IOS_SAFARI_TAB) showSignupSheet('要不要先把紀錄保存起來？', `${IOS_CLEAR_NOTE}註冊後紀錄存在雲端，就不會不見，換手機也看得到。`);
  else showSignupSheet('已經寫了 3 則，要不要保存起來？', '現在的紀錄只存在這支手機的瀏覽器，清掉資料或換手機就會不見。');
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
const ADD_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:-3px"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
const MORE_ICON = '<b style="letter-spacing:1px">⋯</b>';
// 現在是用什麼打開的：決定加到主畫面的教法
function a2hsPlatform() {
  const ua = navigator.userAgent;
  if (isStandalone()) return 'standalone';
  if (IN_APP) return /Line\//i.test(ua) ? 'line' : 'inapp';
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))) return /CriOS|FxiOS|EdgiOS/i.test(ua) ? 'ios-other' : 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}
// ---------- 教學小圖：畫手機畫面的一小塊，紅圈圈出要點的地方（自己畫的示意圖，不用截圖） ----------
const A2P = (() => {
  const frame = (inner) => `<svg class="a2p" viewBox="0 0 140 80" aria-hidden="true"><rect class="a2p-scr" x="1" y="1" width="138" height="78" rx="10"/>${inner}</svg>`;
  const ring = (x, y, r = 11) => `<circle class="a2p-ring" cx="${x}" cy="${y}" r="${r}"/>`;
  const share = (x, y) => `<g class="a2p-ico" transform="translate(${x - 7} ${y - 8}) scale(.6)"><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></g>`;
  const lines = (y) => `<rect class="a2p-line" x="14" y="${y}" width="84" height="5" rx="2.5"/><rect class="a2p-line" x="14" y="${y + 11}" width="60" height="5" rx="2.5"/>`;
  const txt = (x, y, s, cls = 'a2p-t', anchor = 'start') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`;
  const dots = (x, y, vertical) => (vertical ? [-5, 0, 5].map((d) => `<circle class="a2p-dot" cx="${x}" cy="${y + d}" r="1.6"/>`) : [-5, 0, 5].map((d) => `<circle class="a2p-dot" cx="${x + d}" cy="${y}" r="1.6"/>`)).join('');
  // 一列選單，hi = 要點的那一列
  const menu = (items, hiIdx) => items.map((s, i) => {
    const y = 10 + i * 22;
    return `<rect class="${i === hiIdx ? 'a2p-hi' : 'a2p-row'}" x="10" y="${y}" width="120" height="18" rx="5"/>${txt(18, y + 12.5, s, i === hiIdx ? 'a2p-t a2p-tb' : 'a2p-t')}${i === hiIdx ? `<rect class="a2p-ring-r" x="7" y="${y - 3}" width="126" height="24" rx="7"/>` : ''}`;
  }).join('');
  const topBar = (right) => `<rect class="a2p-bar" x="1" y="1" width="138" height="24" rx="10"/><rect class="a2p-pill" x="10" y="7" width="${right ? 98 : 120}" height="12" rx="6"/>${txt(16, 16, 'diary.jas-soul.com', 'a2p-s')}`;
  return {
    iosBar: frame(`${lines(12)}<rect class="a2p-bar" x="1" y="52" width="138" height="27" rx="10"/>
      ${txt(14, 70, '‹', 'a2p-t a2p-big')}${txt(36, 70, '›', 'a2p-t a2p-big')}${share(70, 66)}
      <rect class="a2p-ico-r" x="94" y="60" width="11" height="10" rx="2"/><rect class="a2p-ico-r" x="116" y="60" width="10" height="10" rx="2"/>${ring(70, 65)}`),
    iosSheet: frame(menu(['拷貝', '加入書籤', '加入主畫面　⊞'], 2)),
    iosAdd: frame(`<rect class="a2p-bar" x="1" y="1" width="138" height="24" rx="10"/>${txt(10, 16, '取消', 'a2p-s')}${txt(70, 16, '加入主畫面', 'a2p-t a2p-tb', 'middle')}${txt(128, 16, '新增', 'a2p-t a2p-acc', 'end')}${ring(119, 13, 12)}
      <image href="icons/icon-192.png" x="14" y="36" width="30" height="30"/>${txt(52, 55, '啾啾日記', 'a2p-t')}`),
    chromeIosBar: frame(`${topBar(true)}${share(124, 13)}${ring(124, 12)}${lines(36)}`),
    androidBar: frame(`${topBar(true)}${dots(124, 13, true)}${ring(124, 13)}${lines(36)}`),
    androidMenu: frame(menu(['新分頁', '書籤', '加到主畫面'], 2)),
    androidInstall: frame(`<rect class="a2p-row" x="14" y="10" width="112" height="60" rx="8"/>${txt(70, 30, '安裝應用程式？', 'a2p-t a2p-tb', 'middle')}
      ${txt(58, 56, '取消', 'a2p-s', 'middle')}${txt(100, 56, '安裝', 'a2p-t a2p-acc', 'middle')}${ring(100, 52, 13)}`),
    inappBar: frame(`<rect class="a2p-bar" x="1" y="1" width="138" height="24" rx="10"/>${txt(10, 17, '✕', 'a2p-t')}${txt(70, 16, 'diary.jas-soul.com', 'a2p-s', 'middle')}${dots(124, 13, false)}${ring(124, 13)}${lines(36)}`),
    inappMenu: frame(menu(['複製連結', '分享', '用瀏覽器開啟'], 2)),
    done: frame(`${[18, 50, 82, 114].map((x, i) => (i === 1 ? `<image href="icons/icon-192.png" x="${x - 2}" y="14" width="30" height="30"/>${txt(x + 13, 58, '啾啾日記', 'a2p-s', 'middle')}` : `<rect class="a2p-row" x="${x}" y="16" width="26" height="26" rx="7"/>`)).join('')}${ring(63, 29, 19)}`),
  };
})();
// 每一步 = [小圖, 說明]
function a2hsSteps(pf = a2hsPlatform()) {
  if (pf === 'line' || pf === 'inapp') {
    const where = inAppName() || 'LINE、IG';
    return [
      [A2P.inappBar, `${esc(where)} 裡面沒辦法加到主畫面，要先換到瀏覽器。點右上角的 ${MORE_ICON}`],
      [A2P.inappMenu, '選「用瀏覽器開啟」（有的寫「在外部瀏覽器開啟」）'],
      [A2P.done, '在瀏覽器打開後，會再教你加到主畫面'],
    ];
  }
  if (pf === 'ios') return [
    [A2P.iosBar, `點 Safari 最下面的分享按鈕 ${SHARE_ICON}（沒看到的話，先點右下角的 ${MORE_ICON}，再點「分享」）`],
    [A2P.iosSheet, `往下滑，點「加入主畫面」${ADD_ICON}`],
    [A2P.iosAdd, '按右上角的「新增」，主畫面就會出現啾啾的圖示'],
  ];
  if (pf === 'ios-other') return [
    [A2P.chromeIosBar, `點網址列旁邊的分享按鈕 ${SHARE_ICON}`],
    [A2P.iosSheet, `往下滑，點「加入主畫面」${ADD_ICON}（沒有的話請改用 Safari 打開）`],
    [A2P.iosAdd, '按右上角的「新增」，主畫面就會出現啾啾的圖示'],
  ];
  return [
    [A2P.androidBar, `點右上角的 ${MORE_ICON}（三個點）`],
    [A2P.androidMenu, '選「加到主畫面」或「安裝應用程式」'],
    [A2P.androidInstall, '按「安裝」或「新增」，主畫面就會出現啾啾的圖示'],
  ];
}
// 在 LINE 裡打開：直接叫外部瀏覽器；Android 的其他 App：叫 Chrome；都不行就複製網址
function openInBrowser() {
  const pf = a2hsPlatform();
  const url = location.origin + location.pathname;
  track('a2hs_open_browser', { platform: pf, app: inAppName() });
  if (pf === 'line') { location.href = `${url}?openExternalBrowser=1${location.hash}`; return; }
  if (/android/i.test(navigator.userAgent)) { location.href = `intent://${location.host}${location.pathname}#Intent;scheme=https;package=com.android.chrome;end`; return; }
  copyLink(url);
}
async function copyLink(url) {
  try { await navigator.clipboard.writeText(url); toast('網址複製好了，打開 Safari 貼上就可以'); } catch (e) { prompt('複製這個網址，貼到 Safari 或 Chrome', url); }
}
// where：after_save（存好紀錄後）、home（首頁提示卡）、settings（我的）、partner_join（另一半剛加入）
function showA2hs(where = 'after_save') {
  if (document.querySelector('.a2hs-dlg')) return;
  if (where === 'after_save') {
    try {
      const st = JSON.parse(localStorage.getItem('a2hsShown') || '{"n":0,"at":0}');
      localStorage.setItem('a2hsShown', JSON.stringify({ n: st.n + 1, at: Date.now() }));
    } catch (e) { /* 略過 */ }
  }
  const pf = a2hsPlatform();
  track('a2hs_prompt', { where, platform: pf, app: inAppName() });
  const inApp = pf === 'line' || pf === 'inapp';
  // iPhone 在 IG、Threads 裡：沒辦法直接叫 Safari，畫面右上角指給他看
  const iosInApp = pf === 'inapp' && IS_IOS;
  const oneTap = installEvt && !inApp;
  const box = document.createElement('div');
  box.className = 'celebrate a2hs-dlg';
  const steps = a2hsSteps(pf);
  const ios = pf === 'ios' || pf === 'ios-other';
  // iPhone 主畫面和 Safari 的資料是分開的：還沒登入的人先存上雲端；用分享碼加入的另一半先建立帳號，主畫面登入同一個帳號才看得到
  const guestFirst = isGuest() && ios;
  const partnerFirst = ios && isPartner() && CloudDB.isAnonymous();
  const joined = where === 'partner_join';
  const title = inApp ? (iosInApp ? '先換到 Safari，再放到主畫面' : '先換到瀏覽器，再放到主畫面')
    : joined ? '加入成功！順便把啾啾帶回家' : '把啾啾日記放到主畫面';
  const sub = joined ? `放到主畫面，以後不用翻 LINE 找連結，${esc(ownerName())}寫了什麼點開就看得到。`
    : '下次想記的時候，點主畫面的啾啾就打開了，不用再找網址或翻聊天紀錄。';
  const note = (t) => `<div class="small" style="background:var(--progress-bg);color:var(--progress-ink);border-radius:12px;padding:10px 12px;text-align:left">${t}</div>`;
  box.innerHTML = `<div class="celebrate-box" role="dialog" aria-modal="true" aria-label="加到主畫面">
    ${iosInApp ? `<div class="a2hs-corner" aria-hidden="true">點右上角的 ⋯<span>↗</span></div>` : ''}
    <div class="a2hs-preview" aria-hidden="true">
      <div class="a2hs-app"><img src="icons/icon-192.png" alt=""><span>啾啾日記</span></div>
      <div class="a2hs-app ghost"></div><div class="a2hs-app ghost"></div><div class="a2hs-app ghost"></div>
    </div>
    <h2 style="font-size:20px">${title}</h2>
    <div class="muted">${sub}</div>
    ${guestFirst ? `${note('要先註冊或登入喔！iPhone 從主畫面打開時，看不到在 Safari 裡寫的紀錄。登入後紀錄會存到雲端，兩邊登入同一個帳號就都看得到。')}<a class="btn" href="#/login" id="a2hs-login">先註冊或登入</a>` : ''}
    ${partnerFirst ? `${note(`要先建立帳號喔！iPhone 從主畫面打開時，看不到在 Safari 裡加入的日記。建立帳號後，在主畫面登入同一個帳號就好，不用再輸入分享碼。`)}<a class="btn" href="#/bind" id="a2hs-login">先建立帳號</a>` : ''}
    ${oneTap ? '<button class="btn" id="a2hs-install">一鍵加到主畫面</button>' : `<ol class="a2hs-steps">${steps.map(([pic, x], i) => `<li>${pic}<span><b class="a2hs-n">${i + 1}</b>${x}</span></li>`).join('')}</ol>`}
    ${inApp ? `<button class="btn${iosInApp ? ' secondary' : ''}" id="a2hs-browser">${pf === 'line' ? '用瀏覽器打開' : /android/i.test(navigator.userAgent) ? '用 Chrome 打開' : '找不到的話，複製網址'}</button>` : ''}
    <button class="btn ${oneTap || guestFirst || partnerFirst || (inApp && !iosInApp) ? 'secondary' : ''}" id="a2hs-ok">${iosInApp ? '我知道了，去右上角' : oneTap || inApp ? '之後再說' : '知道了'}</button>
    ${where === 'settings' ? '' : '<button class="btn secondary small" id="a2hs-never">不要再提醒</button>'}
  </div>`;
  document.body.appendChild(box);
  const close = () => box.remove();
  box.querySelector('#a2hs-ok').addEventListener('click', () => { if (!oneTap && !inApp) track('add_to_home', { how: 'steps', where }); close(); });
  box.addEventListener('click', (ev) => { if (ev.target === box) close(); });
  const lg = box.querySelector('#a2hs-login');
  if (lg) lg.addEventListener('click', close);
  const nv = box.querySelector('#a2hs-never');
  if (nv) nv.addEventListener('click', () => { try { localStorage.setItem('a2hsNever', '1'); } catch (e) { /* 略過 */ } close(); document.getElementById('a2hs-card')?.remove(); });
  const br = box.querySelector('#a2hs-browser');
  if (br) br.addEventListener('click', () => openInBrowser());
  const inst = box.querySelector('#a2hs-install');
  if (inst) inst.addEventListener('click', async () => {
    const ev = installEvt; installEvt = null; close();
    track('add_to_home', { how: 'prompt', where });
    try { ev.prompt(); await ev.userChoice; } catch (e) { /* 使用者取消 */ }
  });
}
// 電腦上：給一個 QR code，用手機掃了打開，再照手機的教學放到主畫面（QR 的程式用到才載入）
function loadQrLib() {
  if (window.qrcode) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'vendor/qrcode-generator-2.0.4.js';
    s.onload = resolve; s.onerror = () => reject(new Error('QR code 載入失敗，請重新整理再試一次'));
    document.head.appendChild(s);
  });
}
async function showPhoneQr() {
  if (document.querySelector('.a2hs-qr-dlg')) return;
  const url = `${location.origin + location.pathname}?utm_source=desktop_qr`;
  try { await loadQrLib(); } catch (e) { toast(e.message); return; }
  const qr = qrcode(0, 'M'); qr.addData(url); qr.make();
  track('a2hs_prompt', { where: 'settings', platform: 'desktop' });
  const box = document.createElement('div');
  box.className = 'celebrate a2hs-qr-dlg';
  box.innerHTML = `<div class="celebrate-box" role="dialog" aria-modal="true" aria-label="在手機上用">
    <h2 style="font-size:20px">在手機上用更方便</h2>
    <div class="muted">用手機相機掃這個 QR code，打開後照著教學放到主畫面。</div>
    <div class="a2hs-qr">${qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true, alt: '啾啾日記網址的 QR code' })}</div>
    <div class="small muted">${esc(location.host)}</div>
    <button class="btn" id="a2hs-qr-ok">好</button>
  </div>`;
  document.body.appendChild(box);
  const close = () => box.remove();
  box.querySelector('#a2hs-qr-ok').addEventListener('click', close);
  box.addEventListener('click', (ev) => { if (ev.target === box) close(); });
}
// 首頁的提示卡：手機上、還沒放到主畫面、有寫過紀錄；按叉叉 14 天後再出現，按「不要再提醒」就不出現
const A2HS_CARD_SNOOZE_DAYS = 14;
function a2hsCardEligible() {
  const pf = a2hsPlatform();
  if (pf === 'standalone' || pf === 'desktop' || HOME_APP_SEEN) return false;
  try {
    if (localStorage.getItem('a2hsNever')) return false;
    const at = Number(localStorage.getItem('a2hsCardHiddenAt') || 0);
    return Date.now() - at > A2HS_CARD_SNOOZE_DAYS * 86400000;
  } catch (e) { return false; }
}
function a2hsCardHtml() {
  const inApp = ['line', 'inapp'].includes(a2hsPlatform());
  return `<div class="card has-x" id="a2hs-card" style="background:var(--happy-bg);border-color:transparent;gap:6px">
    <button class="card-x" id="a2hs-card-x" aria-label="先不要，過幾天再提醒" style="color:var(--happy-dark)">${ICON.x}</button>
    <div class="row" style="gap:10px"><img src="icons/icon-192.png" alt="" width="40" height="40" style="border-radius:10px;flex:none">
      <div><div class="bold" style="color:var(--happy-dark)">把啾啾放到手機主畫面</div>
      <div class="small" style="color:var(--happy-dark)">${inApp ? `你現在在 ${esc(inAppName() || 'LINE／IG')} 裡面，關掉就不好找了。` : '下次點圖示就打開，不用再找網址。'}</div></div></div>
    <button class="btn small" id="a2hs-card-go" style="align-self:flex-start">教我怎麼放</button>
  </div>`;
}
function bindA2hsCard() {
  const card = document.getElementById('a2hs-card');
  if (!card) return;
  document.getElementById('a2hs-card-go').addEventListener('click', () => showA2hs('home'));
  document.getElementById('a2hs-card-x').addEventListener('click', () => {
    try { localStorage.setItem('a2hsCardHiddenAt', String(Date.now())); } catch (e) { /* 略過 */ }
    card.remove(); toast(`好，${A2HS_CARD_SNOOZE_DAYS} 天後再提醒你`);
  });
}

// 刪除這類救不回來的動作：跳一個確認視窗，按紅色按鈕才執行（不用打字，簡體輸入法打「删除」也不會卡住）
function confirmDanger(title, text, okLabel) {
  return new Promise((resolve) => {
    const box = document.createElement('div');
    box.className = 'celebrate danger-dlg';
    box.innerHTML = `<div class="celebrate-box" role="alertdialog" aria-modal="true" aria-label="${esc(title)}">
      <h2 style="font-size:20px">${esc(title)}</h2>
      <div class="muted" style="white-space:pre-line;text-align:left">${esc(text)}</div>
      <button class="btn danger-solid" id="danger-ok">${esc(okLabel)}</button>
      <button class="btn secondary" id="danger-cancel">取消</button>
    </div>`;
    const done = (v) => { box.remove(); resolve(v); };
    document.body.appendChild(box);
    box.querySelector('#danger-ok').addEventListener('click', () => done(true));
    box.querySelector('#danger-cancel').addEventListener('click', () => done(false));
    box.addEventListener('click', (ev) => { if (ev.target === box) done(false); });
    box.querySelector('#danger-cancel').focus();
  });
}

// ---------- 6 位數字的分享密碼：一個輸入框疊在 6 個格子上（可以貼上、自動填入） ----------
const SHARE_PASS_RE = /^\d{6}$/;
// 6 位數分享密碼輸入框。
// 以前是「透明輸入框疊在六個格子上」，但部分 Android（LINE、IG 內建瀏覽器、中文輸入法）點了打不進去，
// 所以改成看得到的一般輸入框，字距拉開像格子，哪台手機都能打。
function digitBoxes(id, label, button = '') {
  const input = `<input id="${id}" class="input digits-input" type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" placeholder="000000" aria-describedby="${id}-hint">`;
  return `<div class="field"><label for="${id}">${label}</label>
    ${button ? `<div class="row" style="gap:10px">${input}${button}</div>` : input}
    <div class="small muted" id="${id}-hint">6 位數字</div></div>`;
}
function bindDigitBoxes(root = document) {
  root.querySelectorAll('.digits-input').forEach((inp) => {
    if (inp.dataset.bound) return;
    inp.dataset.bound = '1';
    let composing = false;
    // 中文輸入法組字中不要改內容，不然打的字會被吃掉
    const clean = () => { if (composing) return; const v = inp.value.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xFEE0)).replace(/\D/g, '').slice(0, 6); if (v !== inp.value) inp.value = v; };
    inp.addEventListener('compositionstart', () => { composing = true; });
    inp.addEventListener('compositionend', () => { composing = false; clean(); });
    inp.addEventListener('input', clean);
    clean();
  });
}

// ---------- 意見回饋：哪裡有問題、哪裡可以更好 ----------
const FEEDBACK_KINDS = ['有問題', '建議', '喜歡的地方', '其他'];
function feedbackCard() {
  return `<a class="card" href="#/feedback" style="gap:4px">
    <div class="row between"><div class="bold">意見回饋</div><div class="muted">›</div></div>
    <div class="small muted">哪裡怪怪的、哪裡可以更好，都歡迎告訴我們</div>
  </a>
  <div class="card legal-card" style="gap:0">
    <div class="bold" style="margin-bottom:6px">隱私與條款</div>
    <a class="row between legal-row" href="privacy.html" target="_blank" rel="noopener"><span>隱私權政策</span><span class="muted">›</span></a>
    <a class="row between legal-row" href="terms.html" target="_blank" rel="noopener"><span>使用條款</span><span class="muted">›</span></a>
  </div>`;
}
// 隱私權政策、使用條款（Google 登入正式版需要公開的隱私權政策網址）
function legalLinks() {
  return '<div class="small muted legal-links"><a href="privacy.html" target="_blank" rel="noopener">隱私權政策</a>・<a href="terms.html" target="_blank" rel="noopener">使用條款</a></div>';
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
  { key: 'capsule', title: '時光膠囊', help: '在「一起 → 時光膠囊」寫一段話給對方、選一個打開的日子，就算 1 個。', unit: '個時光膠囊', u: '個', count: (c) => c.capsules,
    steps: [[1, '💌', '第一個時光膠囊']] },
  { key: 'capopen', title: '打開膠囊', help: '時光膠囊到了打開日期就會打開，你寫的、對方寫給你的都算。', unit: '個打開的時光膠囊', u: '個', count: (c) => c.capsOpened,
    steps: [[1, '🎁', '第一次打開膠囊']] },
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
    capsules: typeof capsuleCounts === 'undefined' ? 0 : capsuleCounts.made,
    capsOpened: typeof capsuleCounts === 'undefined' ? 0 : capsuleCounts.opened,
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
  const left = allStamps(all).filter((s) => !s.got && s.group.key !== 'days' && (s.group.key !== 'task' || usingCloud())).map((s) => ({ ...s, need: s.n - s.have }));
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
    <div class="small bold" style="color:var(--happy-text)">解鎖新印章！</div>
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
      <div class="count"><b style="font-size:16px;color:var(--happy-text)">${stamps.filter((x) => x.got).length}</b> / ${stamps.length}</div>
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
        ${g.key === 'task' && !usingCloud() && !list[0].have ? '<div class="small muted">要兩個人一起用：註冊並邀請另一半之後，才能開始集這組章。</div>' : ''}
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

// ---------- 通知（小鈴鐺） ----------
// 雲端帳號才有；資料庫還沒更新（沒有 my_notifications）時鈴鐺不顯示
function bellBtnHtml() {
  if (!usingCloud()) return '';
  return `<a class="icon-btn gear-btn bell-btn" href="#/notifications" id="bell" aria-label="通知" hidden>${ICON.bell}<span>通知</span><b class="bell-dot" hidden></b></a>`;
}
// 每一頁畫好後：更新小鈴鐺數字、另一半「任務」分頁的小紅點
// 小鈴鐺上的數字：打開過通知頁就歸零（只算之後新來的）；列表裡沒點過的那幾則還是會標出來
const notifySeenKey = () => `notifySeenAt:${CloudDB.myId() || ''}`;
function notifySeenAt() { try { return Number(localStorage.getItem(notifySeenKey()) || 0); } catch (e) { return 0; } }
function markNotifySeen(list) {
  const latest = Math.max(Date.now(), ...list.map((n) => Date.parse(n.created_at) || 0));
  try { localStorage.setItem(notifySeenKey(), String(latest)); } catch (e) { /* 略過 */ }
}
const notifyLocalRead = new Set();
window.addEventListener('notify-changed', () => { refreshBell().catch(() => {}); });
async function refreshBell() {
  if (!usingCloud()) return;
  const list = await CloudDB.notifications().catch(() => null);
  if (!list) return;
  const unreadList = list.filter((n) => !n.read_at && !notifyLocalRead.has(Number(n.id)));
  const btn = document.getElementById('bell');
  if (btn && document.body.contains(btn)) {
    btn.hidden = false;
    const seenAt = notifySeenAt();
    const unread = unreadList.filter((n) => (Date.parse(n.created_at) || 0) > seenAt).length;
    const dot = btn.querySelector('.bell-dot');
    dot.hidden = !unread;
    dot.textContent = unread > 9 ? '9+' : String(unread || '');
    btn.setAttribute('aria-label', unread ? `通知，${unread} 則沒看過` : '通知');
  }
  // 還沒建立帳號的另一半，中間就是「任務」分頁；其他人的任務在「一起」裡
  const taskTab = tabbar.querySelector('a.tab[data-tab="tasks"]') || tabbar.querySelector('a.tab[data-tab="together"]');
  if (taskTab) {
    const taskOn = unreadList.some((n) => n.kind === 'new_task_record' || n.kind === 'task_approved');
    taskTab.dataset.taskDot = taskOn ? '1' : '';
    // 「一起」的紅點也要算秘密留言板的新紙條（notes.js）
    setTabDot(taskTab, taskOn || (taskTab.dataset.tab === 'together' && typeof noteDotOn !== 'undefined' && noteDotOn));
  }
}
function setTabDot(tab, on) {
  tab.classList.toggle('has-new', on);
  const label = tab.querySelector('span');
  if (label) tab.setAttribute('aria-label', on ? `${label.textContent}，有新的` : label.textContent);
}
// 底部分頁的小紅點：對方寫了你還沒點開的美好、烏雲、吵架
async function refreshTabDots() {
  if (!usingCloud() || tabbar.hidden) return;
  const all = await DB.allRecords().catch(() => null);
  if (!all) return;
  initSeen(all);
  const fresh = new Set(all.filter((r) => !r.deletedAt && isNewFromOther(r)).map((r) => r.type));
  const tab = tabbar.querySelector('a.tab[data-tab="records"]');
  if (tab) setTabDot(tab, fresh.size > 0);
  // 紀錄頁上面的「美好／烏雲／吵架」切換也標出哪一種有新的
  app.querySelectorAll('[data-rec-seg]').forEach((a) => a.classList.toggle('has-new', fresh.has(a.dataset.recSeg)));
}
function notifyText(n) {
  const who = notifyWho(n.actor_name);
  const x = n.extra || {};
  switch (n.kind) {
    case 'new_happy': return `${who}新增了一則美好時刻`;
    case 'new_task_record': return `${who}新增了一則美好時刻，完成任務就能看`;
    case 'task_submitted': return `${who}完成了任務，等你確認`;
    case 'task_approved': return `${who}確認了你的任務，紀錄解鎖了`;
    case 'partner_request': return `${who}想加入你們的日記，到設定頁按同意`;
    case 'partner_joined': return `${who}同意了，你們的日記連起來了`;
    case 'anniversary': return x.years ? `今天是你們在一起滿 ${x.years} 年 🎉` : `今天是你們在一起第 ${x.days || ''} 天 🎉`;
    case 'cloud_reflect': return '3 天前記下的烏雲，現在回頭看，有沒有新的想法？';
    case 'write_nudge': return '好幾天沒寫了，最近有什麼想記下來的嗎？';
    case 'quiz_partner_done': return `${who}寫好「重新認識你」了，換你囉`;
    case 'quiz_revealed': return '「重新認識你」兩個人都交卷了，來看答案吧';
    case 'daily_partner_done': return `${who}寫好今天這一題了，換你囉`;
    case 'daily_revealed': return `${who}也寫好今天的題目了，來看看彼此的答案`;
    case 'note_new': return `${who}留了一張紙條給你`;
    case 'values_partner_done': return `${who}做完「價值觀地圖」了，換你囉`;
    case 'values_revealed': return '「價值觀地圖」兩個人都做完了，來看看你們的地圖';
    case 'countdown': return x.days ? `再 ${x.days} 天就是「${x.title || ''}」了` : `今天就是「${x.title || ''}」！`;
    default: return `${who}有新動態`;
  }
}
// 同一個人做了好幾次同樣的事，列表合成一則：「小明新增了 3 則美好時刻（其中 1 則完成任務就能看）」
const NOTIFY_GROUP = { new_happy: 'happy', new_task_record: 'happy', task_submitted: 'task_submitted', task_approved: 'task_approved', cloud_reflect: 'cloud_reflect', daily_partner_done: 'daily', daily_revealed: 'daily' };
function groupNotifications(list) {
  const groups = new Map();
  for (const n of list) {
    const key = NOTIFY_GROUP[n.kind] ? `${NOTIFY_GROUP[n.kind]}|${n.actor_name}` : `id|${n.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(n);
  }
  return [...groups.values()];
}
// 名字後面接中文：名字是 emoji 或英文時中間空一格（「🥔 新增了」「Jasmine 新增了」）
function notifyWho(name) { const w = name || '對方'; return /\p{Script=Han}$/u.test(w) ? w : `${w} `; }
function notifyGroupText(g) {
  const n = g.length;
  if (n === 1) return notifyText(g[0]);
  const who = notifyWho(g[0].actor_name);
  switch (NOTIFY_GROUP[g[0].kind]) {
    case 'happy': {
      const t = g.filter((x) => x.kind === 'new_task_record').length;
      return t === n ? `${who}新增了 ${n} 則美好時刻，完成任務就能看` : `${who}新增了 ${n} 則美好時刻${t ? `（其中 ${t} 則完成任務就能看）` : ''}`;
    }
    case 'task_submitted': return `${who}完成了 ${n} 個任務，等你確認`;
    case 'task_approved': return `${who}確認了你的 ${n} 個任務，紀錄解鎖了`;
    case 'cloud_reflect': return `3 天前記下的 ${n} 片烏雲，現在回頭看，有沒有新的想法？`;
    case 'daily': return `${who}寫了 ${n} 題每天一題，來看看吧`;
    default: return notifyText(g[0]);
  }
}
function notifyGroupHref(g) {
  if (g.length === 1) return notifyHref(g[0]);
  const k = NOTIFY_GROUP[g[0].kind];
  if (k === 'task_submitted') return '#/tasks';
  if (k === 'cloud_reflect') return '#/records/cloud';
  if (k === 'daily') return '#/daily';
  return '#/records/happy';
}
function notifyHref(n) {
  if (n.kind === 'partner_request') return '#/settings';
  if (n.kind === 'partner_joined') return '#/';
  if (n.kind === 'anniversary') return '#/cards';
  if (n.kind === 'write_nudge') return '#/new/happy';
  if (n.kind === 'quiz_partner_done' || n.kind === 'quiz_revealed') return '#/quiz';
  if (n.kind === 'daily_partner_done' || n.kind === 'daily_revealed') return '#/daily';
  if (n.kind === 'note_new') return '#/notes';
  if (n.kind === 'values_partner_done' || n.kind === 'values_revealed') return '#/values';
  if (n.kind === 'countdown') return '#/countdowns';
  if (!n.record_id) return '#/';
  if (n.kind === 'task_submitted') return '#/tasks';
  if (n.kind === 'new_task_record') return `#/task/${encodeURIComponent(n.record_id)}`;
  return `#/view/${encodeURIComponent(n.record_id)}`;
}
function notifyWhen(ts) {
  const t = new Date(ts).getTime();
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return '剛剛';
  if (min < 60) return `${min} 分鐘前`;
  if (min < 60 * 24) return `${Math.floor(min / 60)} 小時前`;
  const d = Math.floor(min / 60 / 24);
  return d < 7 ? `${d} 天前` : new Date(t).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
}
async function viewNotifications() {
  app.className = '';
  const list = await CloudDB.notifications().catch(() => null);
  const dayOf = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
  const todayKey = dayOf(Date.now());
  const item = (g) => {
    const unreadIds = g.filter((n) => !n.read_at).map((n) => Number(n.id));
    return `<a class="notify-item${unreadIds.length ? ' unread' : ''}" href="${notifyGroupHref(g)}" data-nid="${Number(g[0].id)}" data-nids="${unreadIds.join(',')}">
      <span class="notify-text">${esc(notifyGroupText(g))}</span>
      <span class="small muted">${notifyWhen(g[0].created_at)}</span>
    </a>`;
  };
  const group = (title, rows) => (rows.length ? `<h2 class="section-title">${title}</h2><div class="card notify-list">${groupNotifications(rows).map(item).join('')}</div>` : '');
  const unread = list ? list.filter((n) => !n.read_at).length : 0;
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/" aria-label="返回">${ICON.back}</a>
      <h1>通知</h1>
      ${unread ? '<button class="btn small secondary" id="notify-all-read" style="margin-left:auto">全部標成已讀</button>' : ''}
    </div>
    ${list == null ? '<div class="empty">通知功能還在準備中，過幾天再來看看。</div>'
      : !list.length ? `<div class="empty">${mascotHtml('happy', 90)}<div>還沒有通知。${esc(otherName())}新增美好時刻、任務有進度、或紀念日到了，會在這裡告訴你。</div></div>`
      : group('今天', list.filter((n) => dayOf(n.created_at) === todayKey)) + group('更早', list.filter((n) => dayOf(n.created_at) !== todayKey))}
    ${list && list.length && !CloudDB.isAnonymous() ? '<div class="small muted" style="text-align:center">想改 Email 通知，到「設定 → 通知」。</div>' : ''}
  `;
  // 看過通知頁就不另外寄 Email；點哪一則，哪一則才算已讀
  if (unread) CloudDB.notificationsSeen().catch(() => {});
  // 打開通知頁，小鈴鐺的數字就消失
  if (list) markNotifySeen(list);
  app.querySelectorAll('[data-nid]').forEach((a) => a.addEventListener('click', () => {
    if (a.classList.contains('unread')) (a.dataset.nids || '').split(',').filter(Boolean).map(Number).forEach((id) => { notifyLocalRead.add(id); CloudDB.markNotificationRead(id).catch(() => {}); });
  }));
  const all = document.getElementById('notify-all-read');
  if (all) all.addEventListener('click', async () => {
    all.disabled = true;
    try {
      await CloudDB.markNotificationsRead();
      app.querySelectorAll('.notify-item.unread').forEach((a) => a.classList.remove('unread'));
      all.remove(); toast('都標成已讀了');
    } catch (e) { all.disabled = false; toast(cloudErrorText(e)); }
  });
}
// Email 裡的「取消 Email 通知」連結打開這頁（不用登入）
async function viewUnsubscribe() {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const uid = q.get('u'); const token = q.get('t');
  const shell = (body) => `<div class="topbar"><a class="icon-btn" href="#/" aria-label="回首頁">${ICON.back}</a><h1>取消 Email 通知</h1></div>
    <div class="card" style="gap:12px">${body}</div>`;
  if (!uid || !token) { app.innerHTML = shell('<div>這個連結不完整。登入後到「設定 → 通知」也可以關掉 Email 通知。</div>'); return; }
  app.innerHTML = shell(`<div>確定不要再收到啾啾日記的通知信嗎？</div>
    <div class="small muted">App 裡的小鈴鐺還是會提醒你。之後想再收信，到「設定 → 通知」打開就好。</div>
    <div class="btn-row"><button class="btn" id="unsub-yes">不要再寄信給我</button><a class="btn secondary" href="#/">先不要</a></div>`);
  const b = document.getElementById('unsub-yes');
  b.addEventListener('click', () => withBusy(b, '處理中…', async () => {
    let ok = false;
    try { ok = await CloudDB.emailUnsubscribe(uid, token); } catch (e) { ok = false; }
    app.innerHTML = shell(ok ? '<div class="bold">已經取消了</div><div class="small muted">之後不會再寄通知信給你。想再收，到「設定 → 通知」打開就好。</div><a class="btn" href="#/">打開啾啾日記</a>'
      : '<div>這個連結已經失效了。登入後到「設定 → 通知」可以直接關掉 Email 通知。</div><a class="btn" href="#/">打開啾啾日記</a>');
    track('email_unsubscribe', { ok });
  }));
}
// 設定頁的「通知」卡片：手機通知（每個雲端帳號都有）＋ Email 開關（有 Email 的帳號才有）
function notifyCardHtml() {
  if (!usingCloud()) return '';
  const anon = CloudDB.isAnonymous();
  // 一開始就畫出來（不是讀完設定才冒出來）：iPhone 的 LINE 裡，卡片晚一點才出現會讓下面的按鈕畫錯位置
  return `<div class="card" id="notify-card">
    <div class="bold">通知</div>
    <div class="small muted">另一半新增美好時刻、任務有進度、紀念日到了，打開啾啾日記會在右上角的小鈴鐺看到。</div>
    <div class="setting-row"><div class="setting-text">手機通知<div class="small muted" id="push-sub">另一半有新動態時，手機會跳通知。晚上 11 點到早上 8 點不吵你</div></div>
      <button class="btn small secondary" id="notify-push" aria-pressed="false" disabled>…</button></div>
    ${anon ? '' : `<div class="setting-row"><div class="setting-text">收 Email 通知<div class="small muted">每天晚上 9 點最多一封，當天在 App 裡看過的不寄。不想收就按一下關掉</div></div>
      <button class="btn small" id="notify-email" aria-pressed="true" disabled>…</button></div>`}
  </div>`;
}
// 這支手機能不能收推播：unsupported（不支援）／need_home（iPhone 要先加到主畫面）／ok
function pushSupport() {
  const pf = a2hsPlatform();
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  if (ios && pf !== 'standalone') return 'need_home';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window) || !window.APP_CONFIG.VAPID_PUBLIC_KEY) return ios ? 'old_ios' : pf === 'line' || pf === 'inapp' ? 'need_home' : 'unsupported';
  return 'ok';
}
function vapidKey() {
  const b64 = window.APP_CONFIG.VAPID_PUBLIC_KEY.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
async function pushCurrent() {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}
// 開啟這支手機的推播（一定要在按鈕的 click 裡呼叫：iPhone 只在使用者按了之後才肯問權限）
async function enablePush(where) {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { toast(perm === 'denied' ? '通知被擋掉了，要到手機的「設定 → 通知」打開' : '沒有開啟通知'); track('push_denied', { perm, where }); return false; }
  const reg = await navigator.serviceWorker.ready;
  const s = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey() });
  await CloudDB.pushSubscribe(s);
  toast('開好了，另一半有新動態手機會跳通知'); track('push_on', { where });
  return true;
}
// 打開 App 時主動問一次要不要開手機通知（用啾啾自己的話，按「開啟」才跳手機的權限視窗）
// 雲端帳號、已經有另一半、這支手機收得到、還沒決定過才問；按「之後再說」7 天後再問，最多問 3 次
function maybeAskPush() {
  if (!usingCloud() || pushSupport() !== 'ok' || Notification.permission !== 'default') return false;
  let st;
  try { st = JSON.parse(localStorage.getItem('pushAsk') || '{"n":0,"at":0}'); } catch (e) { return false; }
  if (st.n >= 3 || Date.now() - st.at < 7 * 86400000) return false;
  whenNoDialog(async () => {
    if (location.hash.replace(/^#\/?/, '') || !(await hasPartnerNow()) || await pushCurrent().catch(() => null)) return;
    if (document.querySelector('.celebrate, .pin-lock')) return;
    try { localStorage.setItem('pushAsk', JSON.stringify({ n: st.n + 1, at: Date.now() })); } catch (e) { /* 略過 */ }
    track('push_ask', { n: st.n + 1 });
    const who = isPartner() ? esc(ownerName()) : '另一半';
    const box = document.createElement('div');
    box.className = 'celebrate push-ask';
    box.innerHTML = `<div class="celebrate-box" role="dialog" aria-modal="true" aria-label="開啟手機通知">
      ${mascotHtml('happy', 120)}
      <h2 style="font-size:20px">${who}寫了新東西，要第一時間知道嗎？</h2>
      <div class="muted">開啟後，${who}新增美好時刻、留紙條給你時，手機會跳通知。晚上 11 點到早上 8 點不吵你。</div>
      <button class="btn" id="push-ask-ok">開啟通知</button>
      <button class="btn secondary" id="push-ask-later">之後再說</button>
    </div>`;
    document.body.appendChild(box);
    const close = () => box.remove();
    box.querySelector('#push-ask-later').addEventListener('click', () => { track('push_ask_later'); close(); });
    box.querySelector('#push-ask-ok').addEventListener('click', async (ev) => {
      ev.target.disabled = true;
      try { await enablePush('ask'); } catch (e) { toast(e && e.message ? e.message : '開不起來，請稍後再試'); }
      close();
    });
  });
  return true;
}
async function bindPushRow() {
  const b = document.getElementById('notify-push');
  if (!b) return;
  const sub = document.getElementById('push-sub');
  const show = (on) => { b.setAttribute('aria-pressed', String(on)); b.textContent = on ? '開啟中' : '開啟'; b.classList.toggle('secondary', !on); };
  const support = pushSupport();
  if (support === 'unsupported' || support === 'old_ios') {
    sub.textContent = support === 'old_ios' ? 'iPhone 要更新到 iOS 16.4 以上才收得到手機通知' : '這個瀏覽器收不到手機通知，換成手機的 Chrome 或 Safari 再試試看';
    b.remove(); return;
  }
  if (support === 'need_home') {
    sub.textContent = 'iPhone 要先把啾啾日記加到主畫面，從主畫面打開才能開手機通知';
    b.disabled = false; b.textContent = '怎麼加'; b.classList.add('secondary');
    b.addEventListener('click', () => showA2hs('push'));
    return;
  }
  let on = false;
  try { on = Notification.permission === 'granted' && !!(await pushCurrent()); } catch (e) { /* 略過 */ }
  if (!document.body.contains(b)) return;
  show(on);
  if (Notification.permission === 'denied') sub.textContent = '手機的設定裡把啾啾日記的通知關掉了，要到手機的「設定 → 通知」打開';
  b.disabled = false;
  b.addEventListener('click', async () => {
    const next = b.getAttribute('aria-pressed') !== 'true';
    b.disabled = true;
    try {
      if (next) {
        if (await enablePush('settings')) show(true);
      } else {
        const s = await pushCurrent();
        if (s) { await CloudDB.pushUnsubscribe(s.endpoint).catch(() => {}); await s.unsubscribe().catch(() => {}); }
        show(false); toast('這支手機不跳通知了，小鈴鐺還是會有'); track('push_off');
      }
    } catch (e) { toast(e && e.message ? e.message : '開不起來，請稍後再試'); }
    b.disabled = false;
  });
}
async function bindNotifyCard() {
  const card = document.getElementById('notify-card');
  if (!card) return;
  bindPushRow().catch(() => {});
  const b = document.getElementById('notify-email');
  if (!b) return;
  const prefs = await CloudDB.notifyPrefs().catch(() => null);
  if (!document.body.contains(card)) return;
  // 資料庫還沒更新：只留小鈴鐺的說明，拿掉 Email 開關
  if (!prefs) { b.closest('.setting-row').remove(); return; }
  b.disabled = false;
  const show = (on) => { b.setAttribute('aria-pressed', String(on)); b.textContent = on ? '開啟中' : '已關閉'; b.classList.toggle('secondary', !on); };
  show(prefs.email_on !== false);
  b.addEventListener('click', async () => {
    const next = b.getAttribute('aria-pressed') !== 'true';
    b.disabled = true;
    try { await CloudDB.setNotifyEmail(next); show(next); toast(next ? '會寄 Email 通知你' : '不寄 Email 了，小鈴鐺還是會有'); }
    catch (e) { toast(cloudErrorText(e)); }
    b.disabled = false;
  });
}
