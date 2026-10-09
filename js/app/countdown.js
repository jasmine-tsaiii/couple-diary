// 啾啾日記 js/app/countdown.js：倒數日（2026-10-08）
// 去旅行、生日、見面這些大事件還有幾天。兩個人共用一份清單，都能新增、修改、刪除（Jasmine 10/8 決定）。
// 週年、第 N00 天用「在一起的日期」自動算出來，不存起來；不想看可以隱藏（存在這支手機）。
// 首頁不加卡片，標題右邊放一張小日曆（10/9 改）：當天的 > 釘在首頁的 > 最近的一個；昨天的會在下面問要不要記下來。
// 雲端（正式帳號或另一半）存在資料庫 countdowns；試用、單機版存在這支手機。小鈴鐺提醒在 notify_daily()。

const CD_TITLE_MAX = 20;
const CD_MAX = 50;
const CD_KINDS = { trip: '旅行', birthday: '生日', date: '約會', meet: '見面', move: '搬家' };
const cdCloud = () => usingCloud() && (!CloudDB.isAnonymous() || isPartner());
const Countdowns = {
  async list() {
    if (cdCloud()) return (await CloudDB.countdownList()).map((c) => ({ ...c, on_date: String(c.on_date).slice(0, 10) }));
    return (await LocalDB.getSetting('countdowns', [])).map((c) => ({ ...c, mine: true }));
  },
  // c：{ id?, title, on_date, kind, yearly }
  async save(c) {
    if (cdCloud()) { const r = await CloudDB.countdownSave(c); return r && r.id; }
    const list = await LocalDB.getSetting('countdowns', []);
    const old = c.id ? list.find((x) => x.id === c.id) : null;
    if (!old && list.length >= CD_MAX) throw new Error(`倒數日最多 ${CD_MAX} 個，先刪掉一些過了的吧`);
    const rec = { id: (old && old.id) || LocalDB.uid(), title: c.title, on_date: c.on_date, kind: c.kind, yearly: !!c.yearly, pinned: !!(old && old.pinned), created_at: (old && old.created_at) || new Date().toISOString() };
    await LocalDB.setSetting('countdowns', [...list.filter((x) => x.id !== rec.id), rec]);
    return rec.id;
  },
  // 放在首頁：一次只能一個（Jasmine 10/9 決定），兩個人看到的一樣
  async pin(id, on) {
    if (cdCloud()) { await CloudDB.countdownPin(id, on); return; }
    const list = await LocalDB.getSetting('countdowns', []);
    await LocalDB.setSetting('countdowns', list.map((x) => ({ ...x, pinned: on ? x.id === id : (x.id === id ? false : !!x.pinned) })));
  },
  async remove(id) {
    if (cdCloud()) { await CloudDB.countdownDelete(id); return; }
    const list = await LocalDB.getSetting('countdowns', []);
    await LocalDB.setSetting('countdowns', list.filter((x) => x.id !== id));
  },
};

// 日期加減幾天（用中午算，避開日光節約時間）
const cdShift = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const cdDays = (iso) => Math.round((Date.parse(`${iso}T12:00:00`) - Date.parse(`${today()}T12:00:00`)) / 86400000);
// 某年的這一天；2/29 遇到平年就用 2/28
function cdInYear(iso, y) {
  const md = iso.slice(5);
  const t = `${y}-${md}`;
  return md === '02-29' && new Date(`${t}T12:00:00`).getMonth() !== 1 ? `${y}-02-28` : t;
}
// 每年重複的：下一次（今天也算）；last：上一次（今天以前）
function cdNext(iso, from) {
  const y = Number(from.slice(0, 4));
  const t = cdInYear(iso, y);
  return t >= from ? t : cdInYear(iso, y + 1);
}
function cdLast(iso, before) {
  const y = Number(before.slice(0, 4));
  const t = cdInYear(iso, y);
  return t < before ? t : cdInYear(iso, y - 1);
}
const cdHidden = () => { try { return JSON.parse(localStorage.getItem('cdHideAuto') || '[]'); } catch (e) { return []; } };
const cdSetHidden = (v) => { try { localStorage.setItem('cdHideAuto', JSON.stringify(v)); } catch (e) { /* 略過 */ } };
// 自動的兩個：下一個週年、下一個第 N00 天
function cdAutoItems() {
  if (!NAMES.since || !DATE_RE.test(NAMES.since) || NAMES.since > today()) return [];
  const hidden = cdHidden();
  const out = [];
  const ann = cdNext(NAMES.since, cdShift(today(), 1));
  const years = Number(ann.slice(0, 4)) - Number(NAMES.since.slice(0, 4));
  const yearText = ['', '一', '兩', '三', '四', '五', '六', '七', '八', '九', '十'][years] || String(years);
  if (!hidden.includes('ann')) out.push({ id: 'auto-ann', auto: 'ann', title: `在一起${yearText}週年`, date: ann, kind: 'auto' });
  const n = togetherDays();
  const next100 = (Math.floor(n / 100) + 1) * 100;
  if (!hidden.includes('days')) out.push({ id: 'auto-days', auto: 'days', title: `在一起第 ${next100} 天`, date: cdShift(today(), next100 - n), kind: 'auto' });
  return out;
}
// 全部整理好：date 是下一次（或已經過了的那天），days 是還有幾天（負的是過了）
function cdItems(list) {
  const t = today();
  const own = (list || []).filter((c) => DATE_RE.test(c.on_date || '')).map((c) => {
    const date = c.yearly ? cdNext(c.on_date, t) : c.on_date;
    return { ...c, date, days: cdDays(date) };
  });
  const auto = cdAutoItems().map((c) => ({ ...c, days: cdDays(c.date) }));
  const all = [...own, ...auto];
  return {
    upcoming: all.filter((c) => c.days >= 0).sort((a, b) => a.days - b.days || (a.auto ? 1 : 0) - (b.auto ? 1 : 0)),
    past: own.filter((c) => c.days < 0).sort((a, b) => b.date.localeCompare(a.date)),
  };
}
// 首頁小日曆顯示哪一個：當天的 > 釘在首頁的（還沒過）> 最近的
function cdHomePick(upcoming) {
  return upcoming.find((c) => c.days === 0) || upcoming.find((c) => c.pinned) || upcoming[0] || null;
}
async function cdLoad() {
  try { return { list: await Countdowns.list(), err: null }; } catch (e) { return { list: [], err: e }; }
}
const cdAskedKey = (c, date) => `cdAsked:${c.id}:${date}`;
const cdAsked = (c, date) => { try { return !!localStorage.getItem(cdAskedKey(c, date)); } catch (e) { return true; } };
const cdMarkAsked = (c, date) => { try { localStorage.setItem(cdAskedKey(c, date), '1'); } catch (e) { /* 略過 */ } };
// 昨天的大事件（自己新增的，每年重複的看上一次），還沒問過要不要記下來
function cdYesterday(list) {
  const y = cdShift(today(), -1);
  return (list || []).filter((c) => DATE_RE.test(c.on_date || '')).map((c) => ({ ...c, date: c.yearly ? cdLast(c.on_date, today()) : c.on_date }))
    .find((c) => c.date === y && !cdAsked(c, c.date)) || null;
}
// 記成美好時刻：帶入標題
function cdRecord(c) {
  cdMarkAsked(c, c.date);
  formPrefill = { title: c.title.slice(0, LIMITS.title), description: '' };
  track('countdown_record');
  go('#/new/happy');
}

// ---------- 首頁的小日曆（2026-10-09 換成 C）：標題右邊一張撕頁日曆，只放最近的那一個 ----------
const CD_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
const CD_STAR = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/></svg>';
let cdHomeCache = null;
async function countdownHome() {
  const { list } = await cdLoad();
  cdHomeCache = list;
  const next = cdHomePick(cdItems(list).upcoming);
  let tile = '';
  if (next) {
    const isToday = next.days === 0;
    const label = isToday ? `今天就是「${next.title}」` : `距離「${next.title}」還有 ${next.days} 天`;
    tile = `<a class="cd-cal${isToday ? ' today' : ''}" href="#/countdowns" id="cd-pill" aria-label="${esc(label)}">
      <span class="cd-cal-top">${esc(next.auto === 'days' ? next.title.replace('在一起', '') : next.auto === 'ann' ? next.title.replace('在一起', '') : next.title)}</span>
      <span class="cd-cal-num${isToday ? ' word' : ''}">${isToday ? '今天' : next.days}</span>
      <span class="cd-cal-unit">${isToday ? '就是今天' : '天後'}</span></a>`;
  }
  const y = cdYesterday(list);
  const ask = y ? `<div class="cd-pill ask" id="cd-ask-row"><span class="grow">「${esc(y.title)}」${y.kind === 'trip' || y.kind === 'date' ? '好玩嗎？' : '還好嗎？'}</span>
    <button class="cd-ask-btn" id="cd-ask" data-id="${esc(y.id)}">記成美好時刻</button>
    <button class="cd-ask-x" id="cd-ask-x" aria-label="不用了">${ICON.x}</button></div>` : '';
  return { tile, ask };
}
function bindCountdownPill() {
  const ask = document.getElementById('cd-ask');
  if (!ask) return;
  const y = cdYesterday(cdHomeCache);
  if (!y) return;
  ask.addEventListener('click', () => cdRecord(y));
  document.getElementById('cd-ask-x').addEventListener('click', () => {
    cdMarkAsked(y, y.date);
    const row = document.getElementById('cd-ask-row');
    if (row) row.parentElement.remove();
  });
}

// ---------- 「一起」分頁那一列 ----------
async function countdownRowHtml() {
  const { list } = await cdLoad();
  const next = cdItems(list).upcoming[0];
  const sub = !next ? '旅行、生日、見面，還有幾天' : next.days === 0 ? `今天就是「${esc(next.title)}」` : `${esc(next.title)} 還有 ${next.days} 天`;
  return navRow({ href: '#/countdowns', id: 'row-countdowns', icon: CD_ICON.replace(/18/g, '24'), title: '倒數日', sub });
}

// ---------- 倒數日列表（#/countdowns） ----------
function cdWhen(c) {
  const y = c.date.slice(0, 4) !== today().slice(0, 4) ? `${c.date.slice(0, 4)} 年 ` : '';
  const [, m, d] = c.date.split('-').map(Number);
  return `${y}${m} 月 ${d} 日`;
}
function cdByline(c) {
  if (c.auto) return '自動';
  const parts = [];
  if (c.yearly) parts.push('每年');
  if (c.pinned) parts.push('放在首頁');
  if (cdCloud() && c.author_name) parts.push(`${c.mine ? '你' : esc(c.author_name)}新增`);
  return parts.join('・');
}
async function viewCountdowns() {
  app.className = 'theme-happy';
  const { list, err } = await cdLoad();
  const { upcoming, past } = cdItems(list);
  const hidden = cdHidden();
  const top = `<div class="topbar"><a class="icon-btn" href="#/together" aria-label="返回" data-back>${ICON.back}</a><h1>倒數日</h1>
    ${err && err.notReady ? '' : '<a class="btn small cd-add" href="#/countdown/new" id="cd-new">＋ 新增</a>'}</div>`;
  const hero = upcoming[0];
  const row = (c) => {
    const by = cdByline(c);
    return `<button class="nav-row cd-row" data-cd="${esc(c.id)}">
      <span class="nav-text"><span class="bold">${esc(c.title)}</span><span class="small muted">${cdWhen(c)}${by ? `・${by}` : ''}</span></span>
      <span class="cd-num">${c.days === 0 ? '<b>今天</b>' : `<b>${c.days}</b><span class="small muted"> 天</span>`}</span>
    </button>`;
  };
  const pastRow = (c) => `<div class="nav-row cd-row past">
      <button class="nav-text cd-past-open" data-cd="${esc(c.id)}"><span class="bold">${esc(c.title)}</span><span class="small muted">${cdWhen(c)}・${-c.days} 天前</span></button>
      <button class="link-btn cd-rec" data-rec="${esc(c.id)}">記成美好時刻 ›</button>
    </div>`;
  app.innerHTML = `${top}
    ${err ? `<div class="card"><div class="small muted">${esc(err.notReady ? '倒數日還在準備中，暫時不能新增。先看看自動算的週年。' : cloudErrorText(err))}</div></div>` : ''}
    ${hero ? `<div class="card cd-hero">
      <div class="grow"><div class="small">${hero.days === 0 ? '就是今天' : '最近的大事件'}</div>
        <div class="cd-hero-title">${esc(hero.title)}</div>
        <div class="small">${longDate(hero.date)}${cdByline(hero) ? `・${cdByline(hero)}` : ''}</div></div>
      <div class="cd-hero-num">${hero.days === 0 ? `${CD_STAR.replace(/18/g, '40')}` : `<b>${hero.days}</b><div class="small">天後</div>`}</div>
    </div>` : `<div class="empty">${mascotHtml('happy', 90)}<div>還沒有倒數日。<br>下一次旅行、生日、見面是哪天？</div>${err && err.notReady ? '' : '<a class="btn small" href="#/countdown/new">新增第一個</a>'}</div>`}
    ${upcoming.length > 1 ? `<h2 class="section-title">接下來</h2><div class="card nav-list">${upcoming.slice(1).map(row).join('')}</div>` : ''}
    ${past.length ? `<h2 class="section-title">已經過了</h2><div class="card nav-list">${past.map(pastRow).join('')}</div>` : ''}
    <div class="small muted cd-foot">${cdCloud() ? '你們兩個都可以新增和修改。' : ''}週年和第 N00 天會自動出現${NAMES.since ? '，按一下可以隱藏' : '，到「我的 → 我們」填在一起的日期就有'}。
      ${hidden.length ? '<button class="link-btn" id="cd-unhide">把隱藏的週年倒數顯示回來</button>' : ''}</div>
  `;
  const all = [...upcoming, ...past];
  app.querySelectorAll('[data-cd]').forEach((b) => b.addEventListener('click', () => {
    const c = all.find((x) => x.id === b.dataset.cd);
    if (!c) return;
    if (c.auto) {
      if (!confirm(`要隱藏「${c.title.replace(/第 \d+ 天/, '第 N00 天')}」的倒數嗎？之後在這頁最下面可以再顯示回來。`)) return;
      cdSetHidden([...new Set([...cdHidden(), c.auto])]);
      viewCountdowns();
      return;
    }
    go(`#/countdown/${encodeURIComponent(c.id)}`);
  }));
  app.querySelectorAll('[data-rec]').forEach((b) => b.addEventListener('click', () => {
    const c = past.find((x) => x.id === b.dataset.rec);
    if (c) cdRecord(c);
  }));
  const un = document.getElementById('cd-unhide');
  if (un) un.addEventListener('click', () => { cdSetHidden([]); viewCountdowns(); });
  const nb = document.getElementById('cd-new');
  if (nb && list.length >= CD_MAX) nb.addEventListener('click', (ev) => { ev.preventDefault(); toast(`倒數日最多 ${CD_MAX} 個，先刪掉一些過了的吧`); });
}

// ---------- 新增／修改（#/countdown/new、#/countdown/<id>） ----------
async function viewCountdownForm(id) {
  app.className = 'theme-happy';
  let c = null;
  const first = await cdLoad();
  if (first.err && first.err.notReady) { toast(first.err.message); go('#/countdowns'); return; }
  if (id && id !== 'new') {
    const { list } = first;
    c = list.find((x) => x.id === id) || null;
    if (!c) { toast('找不到這個倒數日，可能已經被刪掉了'); go('#/countdowns'); return; }
  }
  const editing = !!c;
  const st = { title: c ? c.title : '', on_date: c ? c.on_date : '', kind: c ? c.kind : 'custom', yearly: c ? !!c.yearly : false, pinned: c ? !!c.pinned : false };
  const otherPinned = first.list.find((x) => x.pinned && (!c || x.id !== c.id));
  let dirty = false;
  formGuard = { dirty: () => dirty, leave: () => { dirty = false; } };
  const collect = () => {
    const t = document.getElementById('cd-title');
    const d = document.getElementById('cd-date');
    const y = document.getElementById('cd-yearly');
    const pn = document.getElementById('cd-pin');
    if (pn) st.pinned = pn.checked;
    if (t) st.title = t.value;
    if (d) st.on_date = d.value;
    if (y) st.yearly = y.checked;
  };
  const left = () => {
    if (!DATE_RE.test(st.on_date)) return '';
    const n = cdDays(st.yearly ? cdNext(st.on_date, today()) : st.on_date);
    if (n < 0) return '<span style="color:var(--danger)">這天已經過了，選今天以後的日子</span>';
    return n === 0 ? '就是今天' : `還有 ${n} 天`;
  };
  const render = () => {
    app.innerHTML = `
      <div class="topbar"><a class="icon-btn" href="#/countdowns" aria-label="返回" data-back>${ICON.back}</a><h1>${editing ? '改倒數日' : '新增倒數日'}</h1></div>
      ${editing && cdCloud() && c.author_name ? `<div class="small muted">${c.mine ? '你' : esc(c.author_name)}新增的</div>` : ''}
      <div class="card" style="gap:16px">
        <div class="field"><label for="cd-title">要倒數什麼？</label>
          <input id="cd-title" class="input" maxlength="${CD_TITLE_MAX}" placeholder="例如：去京都、他的生日" value="${esc(st.title)}">
          <div class="small muted" id="cd-count" style="text-align:right">${st.title.length} / ${CD_TITLE_MAX}</div>
        </div>
        <div class="field"><div class="label">快速選</div>
          <div class="chips">${Object.entries(CD_KINDS).map(([k, l]) => `<button class="chip ${st.kind === k ? 'on' : ''}" data-kind="${k}" aria-pressed="${st.kind === k}">${l}</button>`).join('')}</div>
        </div>
        <div class="field"><label for="cd-date">哪一天</label>
          <input id="cd-date" class="input" type="date" ${st.yearly ? '' : `min="${today()}"`} value="${esc(st.on_date)}">
          <div class="small" id="cd-left" style="color:var(--happy-text)">${left()}</div>
        </div>
        <label class="row cd-yearly" for="cd-yearly"><span class="grow"><span class="bold" style="display:block">每年都重複</span><span class="small muted">生日、紀念日這類每年都有的</span></span>
          <input type="checkbox" id="cd-yearly" class="cd-switch" ${st.yearly ? 'checked' : ''}></label>
        <label class="row cd-yearly" for="cd-pin"><span class="grow"><span class="bold" style="display:block">放在首頁</span><span class="small muted">${otherPinned ? `會取代「${esc(otherPinned.title)}」。` : ''}首頁的小日曆固定顯示這個，過了就換回最近的</span></span>
          <input type="checkbox" id="cd-pin" class="cd-switch" ${st.pinned ? 'checked' : ''}></label>
      </div>
      ${cdCloud() ? '<div class="small muted">前 3 天和當天，你們兩個的小鈴鐺都會提醒。</div>' : ''}
      <button class="btn" id="cd-save">${editing ? '儲存' : '存起來'}</button>
      ${editing ? '<button class="btn small secondary" id="cd-del">刪除這個倒數日</button>' : ''}
    `;
    bind();
  };
  const bind = () => {
    const t = document.getElementById('cd-title');
    t.addEventListener('input', () => { dirty = true; document.getElementById('cd-count').textContent = `${t.value.length} / ${CD_TITLE_MAX}`; });
    app.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => {
      collect();
      st.kind = st.kind === b.dataset.kind ? 'custom' : b.dataset.kind;
      if (st.kind === 'birthday') st.yearly = true;
      if (!st.title.trim() && st.kind !== 'custom') st.title = CD_KINDS[st.kind];
      dirty = true;
      render();
    }));
    document.getElementById('cd-date').addEventListener('change', () => { collect(); dirty = true; document.getElementById('cd-left').innerHTML = left(); });
    document.getElementById('cd-yearly').addEventListener('change', () => { collect(); dirty = true; render(); });
    document.getElementById('cd-pin').addEventListener('change', () => { collect(); dirty = true; });
    const save = document.getElementById('cd-save');
    save.addEventListener('click', () => {
      collect();
      const title = st.title.trim().slice(0, CD_TITLE_MAX);
      if (!title) { toast('寫一下要倒數什麼'); return; }
      if (!DATE_RE.test(st.on_date)) { toast('選一個日期'); return; }
      if (!st.yearly && st.on_date < today()) { toast('日期要選今天以後'); return; }
      withBusy(save, '儲存中…', async () => {
        const savedId = await Countdowns.save({ id: c && c.id, title, on_date: st.on_date, kind: st.kind, yearly: st.yearly });
        let pinNote = '';
        if (st.pinned !== !!(c && c.pinned) && (savedId || (c && c.id))) {
          try { await Countdowns.pin(savedId || c.id, st.pinned); if (st.pinned) track('countdown_pin'); } catch (e) { pinNote = e.notReady ? '，「放在首頁」要等一下才能用' : '，但「放在首頁」沒設定成功'; }
        }
        dirty = false;
        formGuard = null;
        if (!editing) track('countdown_create', { kind: st.kind, yearly: st.yearly ? 1 : 0 });
        const n = cdDays(st.yearly ? cdNext(st.on_date, today()) : st.on_date);
        toast((editing ? '改好了' : n === 0 ? '存好了，就是今天！' : `存好了，還有 ${n} 天`) + pinNote);
        go('#/countdowns');
      });
    });
    const del = document.getElementById('cd-del');
    if (del) del.addEventListener('click', () => {
      if (!confirm(`確定要刪除「${c.title}」嗎？${cdCloud() ? '兩個人都會看不到。' : ''}`)) return;
      withBusy(del, '刪除中…', async () => { await Countdowns.remove(c.id); dirty = false; formGuard = null; toast('刪除了'); go('#/countdowns'); });
    });
  };
  render();
}
