// 啾啾日記 js/app/piggy.js：獎勵存錢筒（2026-10-15）
// 自己定獎勵規則（運動 30 分鐘 = 50），做到就記一筆；設一個存錢目標，進度條顯示 %，存滿按「買了！」記成花費。
// Jasmine 10/15 決定：每人一個存錢筒、自己記就算（不用對方通過）、免費；每一筆都能寫備註；
// 另一半看得到，可以在每一筆按愛心、寫鼓勵、幫忙加碼，不能改。App 只記數字，不經手真的錢，也不記體重。
// 雲端（正式帳號或另一半）存在資料庫 piggy_*；試用、單機版存在這支手機（只有自己的）。

const PG_TITLE_MAX = 20;
const PG_NOTE_MAX = 100;
const PG_CHEER_MAX = 50;
const PG_AMOUNT_MAX = 100000;
const PG_TARGET_MAX = 10000000;
const PG_RULE_MAX = 30;
const PG_EMOJIS = ['🏃', '🏋️', '🧘', '🚴', '⚖️', '😴', '📚', '🥗', '💧', '🧹', '🍳', '💪', '🚭', '🎯', '⭐', '🧋', '🍰', '🛍️', '🎮', '🎧', '✈️', '👟', '💄', '🎁'];
const PG_GOAL_EMOJIS = ['🎁', '🎧', '👟', '👜', '📱', '💻', '🎮', '✈️', '🍣', '💄', '📷', '⌚', '🛋️', '🎫'];
const pgCloud = () => usingCloud() && (!CloudDB.isAnonymous() || isPartner());
const pgMoney = (n) => Number(n || 0).toLocaleString('en-US');
const pgShift = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ---------- 資料：手機版 ----------
async function pgLocal() {
  const st = await LocalDB.getSetting('piggy', null);
  if (st) return st;
  // 第一次打開：放 3 條範例規則（之後全刪掉也不會再放）
  const fresh = {
    rules: [
      { id: LocalDB.uid(), emoji: '🏃', title: '運動 30 分鐘', amount: 50, dir: 'in' },
      { id: LocalDB.uid(), emoji: '😴', title: '12 點前睡', amount: 30, dir: 'in' },
      { id: LocalDB.uid(), emoji: '📚', title: '讀書 1 小時', amount: 30, dir: 'in' },
    ],
    goals: [],
    entries: [],
  };
  await LocalDB.setSetting('piggy', fresh);
  return fresh;
}
const pgPut = (st) => LocalDB.setSetting('piggy', st);
const pgBalance = (entries) => entries.reduce((n, e) => n + (e.dir === 'in' ? e.amount : -e.amount), 0);
const pgSort = (a, b) => (a.on_date === b.on_date ? (a.created_at < b.created_at ? 1 : -1) : (a.on_date < b.on_date ? 1 : -1));
const pgActiveGoal = (st) => st.goals.filter((g) => !g.done_at).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0] || null;
function pgCheckEntry(e) {
  const title = String(e.title || '').trim();
  if (!title || title.length > PG_TITLE_MAX) throw new Error(`寫一下做了什麼（${PG_TITLE_MAX} 個字以內）`);
  if (String(e.note || '').trim().length > PG_NOTE_MAX) throw new Error(`備註最多 ${PG_NOTE_MAX} 個字`);
  if (!(e.amount >= 1 && e.amount <= PG_AMOUNT_MAX)) throw new Error('金額要在 1 到 100,000 之間');
  if (!DATE_RE.test(e.on_date || '') || e.on_date > today()) throw new Error('日期不能選未來');
}

const Piggy = {
  // who：'me' 或 'partner'；month：'YYYY-MM' 是帳本那個月，空的是最近 20 筆
  async get(who, month) {
    if (pgCloud()) return CloudDB.piggy('piggy_get', { p_who: who, p_month: month || null });
    if (who === 'partner') return { none: true };
    const st = await pgLocal();
    const all = st.entries.slice().sort(pgSort);
    const inMonth = month ? all.filter((e) => e.on_date.slice(0, 7) === month) : null;
    const deco = (e) => ({ ...e, mine: e.kind !== 'boost', hearts: [], heart_mine: false, cheers: [] });
    const sum = (list, dir) => list.filter((e) => e.dir === dir).reduce((n, e) => n + e.amount, 0);
    return {
      me: true,
      name: NAMES.me || '',
      balance: pgBalance(st.entries),
      rules: st.rules,
      goal: pgActiveGoal(st),
      done_goals: st.goals.filter((g) => g.done_at).sort((a, b) => (a.done_at < b.done_at ? 1 : -1)).slice(0, 20),
      month: inMonth ? { in: sum(inMonth, 'in'), out: sum(inMonth, 'out') } : null,
      entries: (inMonth || all.slice(0, 20)).map(deco),
    };
  },
  async ruleSave(r) {
    if (pgCloud()) return CloudDB.piggy('piggy_rule_save', { p_id: r.id || null, p_emoji: r.emoji, p_title: r.title, p_amount: r.amount, p_dir: r.dir });
    const st = await pgLocal();
    if (r.id) st.rules = st.rules.map((x) => (x.id === r.id ? { ...x, emoji: r.emoji, title: r.title, amount: r.amount, dir: r.dir } : x));
    else {
      if (st.rules.length >= PG_RULE_MAX) throw new Error(`規則最多 ${PG_RULE_MAX} 條，先刪掉一些不用的吧`);
      st.rules.push({ id: LocalDB.uid(), emoji: r.emoji, title: r.title, amount: r.amount, dir: r.dir });
    }
    await pgPut(st);
    return {};
  },
  async ruleDelete(id) {
    if (pgCloud()) return CloudDB.piggy('piggy_rule_delete', { p_id: id });
    const st = await pgLocal();
    st.rules = st.rules.filter((x) => x.id !== id);
    await pgPut(st);
    return null;
  },
  async ruleOrder(ids) {
    if (pgCloud()) return CloudDB.piggy('piggy_rule_order', { p_ids: ids });
    const st = await pgLocal();
    st.rules = ids.map((id) => st.rules.find((x) => x.id === id)).filter(Boolean);
    await pgPut(st);
    return null;
  },
  // 回傳 { id, full }：full 是這一筆讓目標存滿了
  async entrySave(e) {
    pgCheckEntry(e);
    if (pgCloud()) return CloudDB.piggy('piggy_entry_save', { p_id: e.id || null, p_dir: e.dir, p_amount: e.amount, p_emoji: e.emoji, p_title: e.title.trim(), p_note: (e.note || '').trim(), p_on_date: e.on_date });
    const st = await pgLocal();
    const before = pgBalance(st.entries);
    const now = new Date().toISOString();
    let id = e.id;
    if (id) st.entries = st.entries.map((x) => (x.id === id ? { ...x, dir: e.dir, amount: e.amount, emoji: e.emoji, title: e.title.trim(), note: (e.note || '').trim(), on_date: e.on_date, updated_at: now } : x));
    else {
      id = LocalDB.uid();
      st.entries.push({ id, kind: 'normal', dir: e.dir, amount: e.amount, emoji: e.emoji, title: e.title.trim(), note: (e.note || '').trim(), on_date: e.on_date, created_at: now });
    }
    await pgPut(st);
    const g = pgActiveGoal(st);
    const after = pgBalance(st.entries);
    return { id, full: !!(g && before < g.target && after >= g.target) };
  },
  async entryDelete(id) {
    if (pgCloud()) return CloudDB.piggy('piggy_entry_delete', { p_id: id });
    const st = await pgLocal();
    const e = st.entries.find((x) => x.id === id);
    st.entries = st.entries.filter((x) => x.id !== id);
    if (e && e.kind === 'buy' && e.goal_id && !pgActiveGoal(st)) st.goals = st.goals.map((g) => (g.id === e.goal_id ? { ...g, done_at: null } : g));
    await pgPut(st);
    return null;
  },
  async goalSave(g) {
    if (pgCloud()) return CloudDB.piggy('piggy_goal_save', { p_id: g.id || null, p_emoji: g.emoji, p_title: g.title, p_target: g.target });
    const st = await pgLocal();
    if (g.id) st.goals = st.goals.map((x) => (x.id === g.id ? { ...x, emoji: g.emoji, title: g.title, target: g.target } : x));
    else {
      if (pgActiveGoal(st)) throw new Error('一次存一個目標，先完成或刪掉現在的');
      st.goals.push({ id: LocalDB.uid(), emoji: g.emoji, title: g.title, target: g.target, done_at: null, created_at: new Date().toISOString() });
    }
    await pgPut(st);
    return {};
  },
  async goalDelete(id) {
    if (pgCloud()) return CloudDB.piggy('piggy_goal_delete', { p_id: id });
    const st = await pgLocal();
    st.goals = st.goals.filter((x) => x.id !== id || x.done_at);
    await pgPut(st);
    return null;
  },
  async goalBuy(id) {
    if (pgCloud()) return CloudDB.piggy('piggy_goal_buy', { p_id: id });
    const st = await pgLocal();
    const g = st.goals.find((x) => x.id === id && !x.done_at);
    if (!g) throw new Error('找不到這個目標');
    const now = new Date().toISOString();
    st.entries.push({ id: LocalDB.uid(), kind: 'buy', dir: 'out', amount: g.target, emoji: g.emoji, title: g.title, note: '', on_date: today(), goal_id: g.id, created_at: now });
    g.done_at = now;
    await pgPut(st);
    return null;
  },
  // 下面這幾個只有雲端版（要有另一半）
  boost: (amount, note) => CloudDB.piggy('piggy_boost', { p_amount: amount, p_note: note }),
  heart: (id) => CloudDB.piggy('piggy_heart', { p_entry: id }),
  cheer: (id, body) => CloudDB.piggy('piggy_cheer', { p_entry: id, p_body: body }),
  cheerDelete: (id) => CloudDB.piggy('piggy_cheer_delete', { p_id: id }),
};

// ---------- 「一起」分頁那一列 ----------
async function piggyRowHtml() {
  let sub = '做到目標就存一筆獎勵給自己';
  try {
    const d = await Piggy.get('me');
    if (d && d.goal) sub = `${esc(d.goal.title)}・${Math.min(100, Math.floor((Math.max(0, d.balance) / d.goal.target) * 100))}%`;
    else if (d && d.balance) sub = `存了 NT$${pgMoney(d.balance)}`;
  } catch (e) { /* 讀不到就顯示說明 */ }
  return navRow({ href: '#/piggy', id: 'row-piggy', icon: '<span class="nav-emoji" aria-hidden="true">🐷</span>', title: '獎勵存錢筒', sub });
}

// ---------- 共用的小零件 ----------
function pgPct(d) {
  if (!d.goal) return 0;
  return Math.min(100, Math.floor((Math.max(0, d.balance) / d.goal.target) * 100));
}
function pgGoalCard(d, me, who) {
  if (!d.goal) {
    return `<div class="card pg-goal">
      <div class="row between"><span class="muted small">${me ? '現在存了' : `${esc(who)}現在存了`}</span><b class="pg-bal">NT$${pgMoney(d.balance)}</b></div>
      ${me ? '<button class="btn small secondary" id="pg-goal-new">＋ 設一個存錢目標</button>' : `<div class="small muted">${esc(who)}還沒設存錢目標。</div>`}
    </div>`;
  }
  const pct = pgPct(d);
  const left = d.goal.target - d.balance;
  return `<div class="card pg-goal${pct >= 100 ? ' full' : ''}">
    <${me ? 'button' : 'div'} class="pg-goal-head" ${me ? 'id="pg-goal-edit" aria-label="改存錢目標"' : ''}>
      <span class="pg-goal-ic" aria-hidden="true">${esc(d.goal.emoji)}</span>
      <span class="grow"><span class="small muted" style="display:block">${me ? '正在存' : `${esc(who)}正在存`}</span><span class="pg-goal-title">${esc(d.goal.title)}</span></span>
      <span class="pg-pct" id="pg-pct">${pct}%</span>
    </${me ? 'button' : 'div'}>
    <div class="progress pg-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="存了 ${pct}%"><div style="width:${pct}%"></div></div>
    <div class="row between small"><span><b>NT$${pgMoney(d.balance)}</b><span class="muted"> / ${pgMoney(d.goal.target)}</span></span>
      <span class="muted">${left > 0 ? `還差 ${pgMoney(left)}` : '存滿了！'}</span></div>
    ${me && pct >= 100 ? '<button class="btn" id="pg-buy">買了！記成花費</button>' : ''}
  </div>`;
}
function pgEntryRow(e, me) {
  const sign = e.dir === 'in' ? '+' : '−';
  const byline = e.kind === 'boost' ? (e.mine ? '你加碼的' : '') : e.kind === 'buy' ? '存滿買了' : '';
  const canTap = me ? true : e.mine && e.kind === 'boost';
  const hearts = (e.hearts || []).length ? `<span class="pg-heart-got">♥ ${(e.hearts || []).map(esc).join('、')}</span>` : '';
  const cheers = (e.cheers || []).map((c) => `<div class="pg-cheer"><b>${esc(c.mine ? '你' : c.author_name || '對方')}：</b>${esc(c.body)}${c.mine ? ` <button class="link-btn pg-cheer-del" data-cheer-del="${esc(c.id)}" aria-label="刪掉這句鼓勵">刪除</button>` : ''}</div>`).join('');
  const acts = !me && !e.mine ? `<div class="pg-acts">
      <button class="pg-react${e.heart_mine ? ' on' : ''}" data-heart="${esc(e.id)}" aria-pressed="${!!e.heart_mine}">${e.heart_mine ? '♥ 已按' : '♡ 愛心'}</button>
      <button class="pg-react" data-cheer="${esc(e.id)}">💬 寫鼓勵</button></div>` : '';
  return `<div class="pg-ent" data-entry="${esc(e.id)}">
    <${canTap ? 'button' : 'div'} class="pg-ent-main" ${canTap ? `data-pe="${esc(e.id)}"` : ''}>
      <span class="pg-emo ${e.dir}${e.kind === 'boost' ? ' boost' : ''}" aria-hidden="true">${esc(e.emoji)}</span>
      <span class="pg-ent-text"><span class="bold">${esc(e.kind === 'buy' ? `花掉：${e.title}` : e.title)}</span>${byline ? `<span class="small muted">${byline}</span>` : ''}${e.note ? `<span class="pg-note">${esc(e.note)}</span>` : ''}</span>
      <span class="pg-amt ${e.dir}">${sign}${pgMoney(e.amount)}</span>
    </${canTap ? 'button' : 'div'}>
    ${hearts || cheers || acts ? `<div class="pg-ent-extra">${hearts}${cheers}${acts}</div>` : ''}
  </div>`;
}
function pgDayLabel(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}（${'日一二三四五六'[d.getDay()]}）`;
}
function pgEntriesByDay(list, me) {
  const days = [];
  for (const e of list) {
    const last = days[days.length - 1];
    if (last && last.d === e.on_date) last.list.push(e); else days.push({ d: e.on_date, list: [e] });
  }
  return days.map((x) => `<div class="pg-day">${pgDayLabel(x.d)}</div><div class="card pg-list">${x.list.map((e) => pgEntryRow(e, me)).join('')}</div>`).join('');
}
function pgEmojiPicker(list, cur, name) {
  return `<div class="pg-emojis" role="radiogroup" aria-label="圖示">${list.map((x) => `<button type="button" class="pg-emoji${x === cur ? ' on' : ''}" data-${name}="${x}" role="radio" aria-checked="${x === cur}">${x}</button>`).join('')}</div>`;
}
function pgDialog(html, label) {
  const box = document.createElement('div');
  box.className = 'celebrate wish-dlg pg-dlg';
  box.innerHTML = `<form class="celebrate-box" style="align-items:stretch;text-align:left" role="dialog" aria-modal="true" aria-label="${esc(label)}">${html}</form>`;
  document.body.appendChild(box);
  return box;
}
function pgCelebrate(title, text) {
  const box = document.createElement('div');
  box.className = 'celebrate pg-done';
  box.innerHTML = `<div class="celebrate-box" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    ${mascotHtml('celebrate', 110)}
    <h2 style="font-size:22px">${esc(title)}</h2>
    <div class="muted">${esc(text)}</div>
    <button class="btn" id="pg-done-ok">好耶</button></div>`;
  document.body.appendChild(box);
  box.querySelector('#pg-done-ok').addEventListener('click', () => box.remove());
}

// ---------- 記一筆／改一筆 ----------
function pgEntryDialog(d, entry, rule, onDone) {
  const editing = !!entry;
  const st = {
    dir: entry ? entry.dir : rule ? rule.dir : 'in',
    emoji: entry ? entry.emoji : rule ? rule.emoji : '⭐',
    title: entry ? entry.title : rule ? rule.title : '',
    amount: entry ? entry.amount : rule ? rule.amount : '',
    note: entry ? entry.note || '' : '',
    on_date: entry ? entry.on_date : today(),
    rule: rule ? rule.id : '',
  };
  const rules = d.rules || [];
  const box = pgDialog('', editing ? '改這一筆' : '記一筆');
  const form = box.querySelector('form');
  const read = () => {
    st.title = form.querySelector('#pg-title').value;
    st.amount = form.querySelector('#pg-amount').value;
    st.note = form.querySelector('#pg-note').value;
    st.on_date = form.querySelector('#pg-date').value;
  };
  const render = () => {
    form.innerHTML = `
      <div class="row between"><h2 style="font-size:20px">${editing ? '改這一筆' : '記一筆'}</h2></div>
      <div class="seg" style="grid-template-columns:1fr 1fr" role="group" aria-label="存進來或花掉">
        <button type="button" class="${st.dir === 'in' ? 'on' : ''}" data-dir="in" aria-pressed="${st.dir === 'in'}">存進來 ＋</button>
        <button type="button" class="${st.dir === 'out' ? 'on' : ''}" data-dir="out" aria-pressed="${st.dir === 'out'}">花掉 －</button></div>
      ${!editing && rules.length ? `<div class="field"><div class="label">選一個規則</div><div class="chips">${rules.map((r) => `<button type="button" class="chip${st.rule === r.id ? ' on' : ''}" data-rule="${esc(r.id)}">${esc(r.emoji)} ${esc(r.title)} <b>${r.dir === 'in' ? '+' : '−'}${pgMoney(r.amount)}</b></button>`).join('')}</div></div>` : ''}
      <div class="field"><label for="pg-title">做了什麼</label><input id="pg-title" class="input" maxlength="${PG_TITLE_MAX}" value="${esc(st.title)}" placeholder="${st.dir === 'in' ? '例如：游泳 1 小時' : '例如：獎勵自己一杯'}"></div>
      <div class="field"><div class="label">圖示</div>${pgEmojiPicker(PG_EMOJIS.includes(st.emoji) ? PG_EMOJIS : [st.emoji, ...PG_EMOJIS], st.emoji, 'emo')}</div>
      <div class="field"><label for="pg-amount">金額（NT$）</label><input id="pg-amount" class="input" type="number" inputmode="numeric" min="1" max="${PG_AMOUNT_MAX}" step="1" value="${esc(String(st.amount))}" placeholder="50"></div>
      <div class="field"><label for="pg-note">備註（可不填）</label><textarea id="pg-note" class="textarea" maxlength="${PG_NOTE_MAX}" style="min-height:64px" placeholder="例如：河堤跑了 5 公里">${esc(st.note)}</textarea>
        <div class="small muted" id="pg-note-n" style="text-align:right">${st.note.length} / ${PG_NOTE_MAX}</div></div>
      <div class="field"><label for="pg-date">日期</label><input id="pg-date" class="input" type="date" min="${pgShift(today(), -30)}" max="${today()}" value="${esc(st.on_date)}"></div>
      <button class="btn" type="submit" id="pg-save">${editing ? '儲存' : '存起來'}</button>
      ${editing ? '<button class="btn small danger" type="button" id="pg-del">刪掉這一筆</button>' : ''}
      <button class="btn secondary small" type="button" id="pg-cancel">取消</button>`;
    bind();
  };
  const bind = () => {
    form.querySelectorAll('[data-dir]').forEach((b) => b.addEventListener('click', () => { read(); st.dir = b.dataset.dir; render(); }));
    form.querySelectorAll('[data-rule]').forEach((b) => b.addEventListener('click', () => {
      read();
      const r = rules.find((x) => x.id === b.dataset.rule);
      if (!r) return;
      if (st.rule === r.id) { st.rule = ''; render(); return; }
      Object.assign(st, { rule: r.id, dir: r.dir, emoji: r.emoji, title: r.title, amount: r.amount });
      render();
    }));
    form.querySelectorAll('[data-emo]').forEach((b) => b.addEventListener('click', () => { read(); st.emoji = b.dataset.emo; render(); }));
    const note = form.querySelector('#pg-note');
    note.addEventListener('input', () => { form.querySelector('#pg-note-n').textContent = `${note.value.length} / ${PG_NOTE_MAX}`; });
    form.querySelector('#pg-cancel').addEventListener('click', () => box.remove());
    const del = form.querySelector('#pg-del');
    if (del) del.addEventListener('click', () => {
      if (!confirm(`要刪掉「${entry.title}」這一筆嗎？`)) return;
      withBusy(del, '刪除中…', async () => { await Piggy.entryDelete(entry.id); box.remove(); toast('刪掉了'); onDone(); });
    });
  };
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    read();
    const amount = Math.round(Number(st.amount));
    const title = st.title.trim();
    if (!title) { toast('寫一下做了什麼'); return; }
    if (!(amount >= 1 && amount <= PG_AMOUNT_MAX)) { toast('金額要在 1 到 100,000 之間'); return; }
    if (!DATE_RE.test(st.on_date) || st.on_date > today()) { toast('日期不能選未來'); return; }
    if (!editing && st.on_date < pgShift(today(), -30)) { toast('日期只能選最近 30 天'); return; }
    withBusy(form.querySelector('#pg-save'), '儲存中…', async () => {
      const r = await Piggy.entrySave({ id: entry && entry.id, dir: st.dir, amount, emoji: st.emoji, title: title.slice(0, PG_TITLE_MAX), note: st.note.trim().slice(0, PG_NOTE_MAX), on_date: st.on_date });
      box.remove();
      if (!editing) track('piggy_entry', { dir: st.dir, rule: st.rule ? 1 : 0, note: st.note.trim() ? 1 : 0 });
      onDone();
      if (r && r.full && d.goal) { track('piggy_full'); pgCelebrate('存滿了！100%', `「${d.goal.title}」的 NT$${pgMoney(d.goal.target)} 存到了，辛苦了！`); }
      else toast(editing ? '改好了' : st.dir === 'in' ? `存進 NT$${pgMoney(amount)}` : `記下花掉 NT$${pgMoney(amount)}`);
    });
  });
  render();
  if (!editing && !rule) form.querySelector('#pg-title').focus();
}

// ---------- 存錢目標 ----------
function pgGoalDialog(goal, onDone) {
  const st = { emoji: goal ? goal.emoji : '🎁', title: goal ? goal.title : '', target: goal ? goal.target : '' };
  const box = pgDialog('', goal ? '改存錢目標' : '設一個存錢目標');
  const form = box.querySelector('form');
  const read = () => { st.title = form.querySelector('#pg-g-title').value; st.target = form.querySelector('#pg-g-target').value; };
  const render = () => {
    form.innerHTML = `<h2 style="font-size:20px">${goal ? '改存錢目標' : '想存錢買什麼？'}</h2>
      <div class="field"><label for="pg-g-title">目標</label><input id="pg-g-title" class="input" maxlength="${PG_TITLE_MAX}" value="${esc(st.title)}" placeholder="例如：新耳機"></div>
      <div class="field"><div class="label">圖示</div>${pgEmojiPicker(PG_GOAL_EMOJIS.includes(st.emoji) ? PG_GOAL_EMOJIS : [st.emoji, ...PG_GOAL_EMOJIS], st.emoji, 'gemo')}</div>
      <div class="field"><label for="pg-g-target">要存多少（NT$）</label><input id="pg-g-target" class="input" type="number" inputmode="numeric" min="1" max="${PG_TARGET_MAX}" step="1" value="${esc(String(st.target))}" placeholder="3000"></div>
      <div class="small muted">一次存一個目標，存錢筒裡現在的錢都算進進度。</div>
      <button class="btn" type="submit" id="pg-g-save">${goal ? '儲存' : '開始存'}</button>
      ${goal ? '<button class="btn small danger" type="button" id="pg-g-del">不存這個了</button>' : ''}
      <button class="btn secondary small" type="button" id="pg-g-cancel">取消</button>`;
    form.querySelectorAll('[data-gemo]').forEach((b) => b.addEventListener('click', () => { read(); st.emoji = b.dataset.gemo; render(); }));
    form.querySelector('#pg-g-cancel').addEventListener('click', () => box.remove());
    const del = form.querySelector('#pg-g-del');
    if (del) del.addEventListener('click', () => {
      if (!confirm(`不存「${goal.title}」了嗎？存錢筒裡的錢不會變。`)) return;
      withBusy(del, '刪除中…', async () => { await Piggy.goalDelete(goal.id); box.remove(); toast('好，換一個目標吧'); onDone(); });
    });
  };
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    read();
    const title = st.title.trim();
    const target = Math.round(Number(st.target));
    if (!title) { toast('寫一下想存錢買什麼'); return; }
    if (!(target >= 1 && target <= PG_TARGET_MAX)) { toast('目標金額要在 1 到 10,000,000 之間'); return; }
    withBusy(form.querySelector('#pg-g-save'), '儲存中…', async () => {
      await Piggy.goalSave({ id: goal && goal.id, emoji: st.emoji, title: title.slice(0, PG_TITLE_MAX), target });
      box.remove();
      if (!goal) track('piggy_goal');
      toast(goal ? '改好了' : '開始存了，加油！');
      onDone();
    });
  });
  render();
}

// ---------- 加碼（另一半的存錢筒） ----------
function pgBoostDialog(who, onDone) {
  const box = pgDialog(`<h2 style="font-size:20px">幫${esc(who)}加碼</h2>
    <div class="field"><label for="pg-b-amount">加多少（NT$）</label><input id="pg-b-amount" class="input" type="number" inputmode="numeric" min="1" max="${PG_AMOUNT_MAX}" step="1" placeholder="200"></div>
    <div class="field"><label for="pg-b-note">想說的話（可不填）</label><textarea id="pg-b-note" class="textarea" maxlength="${PG_NOTE_MAX}" style="min-height:60px" placeholder="例如：看你這週每天都有動，加油！"></textarea></div>
    <div class="small muted">會記進${esc(who)}的存錢筒，${esc(who)}會收到通知。App 只記數字，不會真的轉錢。</div>
    <button class="btn" type="submit" id="pg-b-save">加碼</button>
    <button class="btn secondary small" type="button" id="pg-b-cancel">取消</button>`, `幫${who}加碼`);
  const form = box.querySelector('form');
  form.querySelector('#pg-b-cancel').addEventListener('click', () => box.remove());
  form.querySelector('#pg-b-amount').focus();
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const amount = Math.round(Number(form.querySelector('#pg-b-amount').value));
    if (!(amount >= 1 && amount <= PG_AMOUNT_MAX)) { toast('金額要在 1 到 100,000 之間'); return; }
    withBusy(form.querySelector('#pg-b-save'), '加碼中…', async () => {
      await Piggy.boost(amount, form.querySelector('#pg-b-note').value.trim().slice(0, PG_NOTE_MAX));
      box.remove();
      track('piggy_boost');
      toast(`加碼 NT$${pgMoney(amount)} 了`);
      onDone();
    });
  });
}

// ---------- 主頁（#/piggy、#/piggy/partner）和帳本（#/piggy/ledger、#/piggy/pledger） ----------
function pgMonthNow() { return today().slice(0, 7); }
function pgMonthShift(m, n) {
  const [y, mm] = m.split('-').map(Number);
  const d = new Date(y, mm - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
async function viewPiggy(arg, arg2) {
  app.className = 'theme-happy';
  if (arg === 'rules') { await viewPiggyRules(); return; }
  const partnerView = arg === 'partner' || arg === 'pledger';
  const ledger = arg === 'ledger' || arg === 'pledger';
  const month = ledger ? (/^\d{4}-\d{2}$/.test(arg2 || '') ? arg2 : pgMonthNow()) : null;
  const cloud = pgCloud();
  if (partnerView && !cloud) { go('#/piggy'); return; }
  const who = partnerView ? notifyWho(otherName()) : '';
  const back = ledger ? (partnerView ? '#/piggy/partner' : '#/piggy') : '#/together';
  let d;
  let err = null;
  try { d = await Piggy.get(partnerView ? 'partner' : 'me', month); } catch (e) { err = e; }
  const reload = () => viewPiggy(arg, arg2);
  if (err || !d) {
    app.innerHTML = `<div class="topbar"><a class="icon-btn" href="${back}" aria-label="返回" data-back>${ICON.back}</a><h1>獎勵存錢筒</h1></div>
      <div class="card"><div class="small muted">${esc(err && err.notReady ? err.message : cloudErrorText(err || new Error('讀不到存錢筒')))}</div></div>`;
    return;
  }
  const me = !partnerView;
  const seg = cloud && !ledger ? `<div class="seg pg-seg" role="tablist" aria-label="誰的存錢筒">
      <a class="seg-btn${me ? ' on' : ''}" href="#/piggy" role="tab" aria-selected="${me}">我的</a>
      <a class="seg-btn${me ? '' : ' on'}" href="#/piggy/partner" role="tab" aria-selected="${!me}">${esc(notifyWho(otherName()))}的</a></div>` : '';
  if (ledger) {
    const next = pgMonthShift(month, 1);
    const base = partnerView ? '#/piggy/pledger/' : '#/piggy/ledger/';
    const [y, m] = month.split('-').map(Number);
    app.innerHTML = `<div class="topbar"><a class="icon-btn" href="${back}" aria-label="返回" data-back>${ICON.back}</a><h1>${partnerView ? `${esc(who)}的帳本` : '帳本'}</h1></div>
      <div class="pg-month"><a class="icon-btn" href="${base}${pgMonthShift(month, -1)}" aria-label="上個月">‹</a><b>${y} 年 ${m} 月</b>
        ${next <= pgMonthNow() ? `<a class="icon-btn" href="${base}${next}" aria-label="下個月">›</a>` : '<span class="icon-btn" aria-hidden="true"></span>'}</div>
      <div class="pg-sum">
        <div><span class="small muted">這個月存進</span><b class="pg-amt in">+${pgMoney(d.month ? d.month.in : 0)}</b></div>
        <div><span class="small muted">花掉</span><b class="pg-amt out">−${pgMoney(d.month ? d.month.out : 0)}</b></div>
        <div><span class="small muted">現在有</span><b>${pgMoney(d.balance)}</b></div></div>
      ${d.entries.length ? pgEntriesByDay(d.entries, me) : `<div class="empty">${mascotHtml('empty', 80)}<div>這個月還沒有紀錄</div></div>`}`;
    pgBindEntries(d, me, who, reload);
    return;
  }
  if (d.none || d.paused) {
    app.innerHTML = `<div class="topbar"><a class="icon-btn" href="#/together" aria-label="返回" data-back>${ICON.back}</a><h1>獎勵存錢筒</h1></div>${seg}
      <div class="empty">${mascotHtml('empty', 90)}<div>${d.paused ? `${esc(who)}暫停分享中，暫時看不到${esc(who)}的存錢筒。` : '另一半加入後，就能看到對方的存錢筒，<br>在每一筆按愛心、寫鼓勵，也能幫忙加碼。'}</div></div>`;
    return;
  }
  const rules = d.rules || [];
  app.innerHTML = `
    <div class="topbar"><a class="icon-btn" href="#/together" aria-label="返回" data-back>${ICON.back}</a><h1>獎勵存錢筒</h1>
      ${me ? '<a class="btn small secondary pg-rules-btn" href="#/piggy/rules">規則</a>' : ''}</div>
    ${seg}
    ${pgGoalCard(d, me, who)}
    ${me ? `<h2 class="section-title">今天做了什麼？點一下就存</h2>
      <div class="chips pg-rules">${rules.map((r) => `<button class="chip pg-rule" data-rule="${esc(r.id)}">${esc(r.emoji)} ${esc(r.title)} <b class="pg-amt ${r.dir}">${r.dir === 'in' ? '+' : '−'}${pgMoney(r.amount)}</b></button>`).join('')}
        <button class="chip dashed" id="pg-free">＋ 自己填</button></div>
      <button class="btn" id="pg-add">＋ 記一筆</button>` : `<button class="btn" id="pg-boost">💝 幫${esc(who)}加碼</button>`}
    <div class="row between pg-recent-head"><h2 class="section-title">${me ? '最近' : `${esc(who)}最近的努力`}</h2>
      <a class="link-btn" href="${me ? '#/piggy/ledger' : '#/piggy/pledger'}" id="pg-ledger">看帳本 ›</a></div>
    ${d.entries.length ? `<div class="card pg-list">${d.entries.map((e) => pgEntryRow(e, me)).join('')}</div>`
    : `<div class="card"><div class="small muted">${me ? '還沒有紀錄。做到一件事，就點上面的規則存一筆吧。' : `${esc(who)}還沒有紀錄。`}</div></div>`}
    ${d.done_goals && d.done_goals.length ? `<h2 class="section-title">完成過的目標</h2><div class="card pg-list">${d.done_goals.map((g) => `<div class="pg-ent"><div class="pg-ent-main"><span class="pg-emo" aria-hidden="true">${esc(g.emoji)}</span>
      <span class="pg-ent-text"><span class="bold">${esc(g.title)}</span><span class="small muted">${shortDate(String(g.done_at).slice(0, 10))} 存滿</span></span><span class="pg-amt">NT$${pgMoney(g.target)}</span></div></div>`).join('')}</div>` : ''}
    ${me ? `<div class="small muted pg-foot">${cloud ? `${esc(otherName())}看得到你的存錢筒，可以按愛心、寫鼓勵、加碼，但不能改。` : ''}App 只記數字，不會真的轉錢。</div>` : ''}
  `;
  if (me) {
    app.querySelectorAll('[data-rule]').forEach((b) => b.addEventListener('click', () => {
      const r = rules.find((x) => x.id === b.dataset.rule);
      if (r) pgEntryDialog(d, null, r, reload);
    }));
    document.getElementById('pg-free').addEventListener('click', () => pgEntryDialog({ ...d, rules: [] }, null, null, reload));
    document.getElementById('pg-add').addEventListener('click', () => pgEntryDialog(d, null, null, reload));
    const gn = document.getElementById('pg-goal-new');
    if (gn) gn.addEventListener('click', () => pgGoalDialog(null, reload));
    const ge = document.getElementById('pg-goal-edit');
    if (ge) ge.addEventListener('click', () => pgGoalDialog(d.goal, reload));
    const buy = document.getElementById('pg-buy');
    if (buy) buy.addEventListener('click', () => {
      if (!confirm(`買了「${d.goal.title}」嗎？會記成一筆 NT$${pgMoney(d.goal.target)} 的花費，然後可以設下一個目標。`)) return;
      withBusy(buy, '記錄中…', async () => {
        await Piggy.goalBuy(d.goal.id);
        track('piggy_buy');
        await reload();
        pgCelebrate(`買了「${d.goal.title}」🎉`, '這是你一點一點努力換來的。下一個想存什麼？');
      });
    });
  } else {
    document.getElementById('pg-boost').addEventListener('click', () => pgBoostDialog(who, reload));
  }
  pgBindEntries(d, me, who, reload);
}

// 每一筆：點開改（自己的）、愛心、寫鼓勵、刪自己的鼓勵
function pgBindEntries(d, me, who, reload) {
  app.querySelectorAll('[data-pe]').forEach((b) => b.addEventListener('click', () => {
    const e = d.entries.find((x) => x.id === b.dataset.pe);
    if (!e) return;
    if (me && e.kind === 'normal') { pgEntryDialog(d, e, null, reload); return; }
    const msg = e.kind === 'buy' ? `刪掉「${e.title}」這筆花費嗎？${d.goal ? '' : '這個目標會回到存錢中。'}`
      : e.mine ? `刪掉你加碼的 NT$${pgMoney(e.amount)} 嗎？` : `這筆是${e.author_name || '對方'}加碼的，要刪掉嗎？`;
    if (!confirm(msg)) return;
    Piggy.entryDelete(e.id).then(() => { toast('刪掉了'); reload(); }).catch((x) => toast(cloudErrorText(x)));
  }));
  app.querySelectorAll('[data-heart]').forEach((b) => b.addEventListener('click', () => {
    withBusy(b, '…', async () => { const on = await Piggy.heart(b.dataset.heart); if (on) track('piggy_heart'); await reload(); });
  }));
  app.querySelectorAll('[data-cheer]').forEach((b) => b.addEventListener('click', () => {
    const e = d.entries.find((x) => x.id === b.dataset.cheer);
    if (!e) return;
    const text = prompt(`給「${e.title}」寫一句鼓勵（${PG_CHEER_MAX} 個字以內）`, '');
    if (text == null) return;
    const body = text.trim();
    if (!body) return;
    if (body.length > PG_CHEER_MAX) { toast(`鼓勵最多 ${PG_CHEER_MAX} 個字`); return; }
    withBusy(b, '送出中…', async () => { await Piggy.cheer(e.id, body); track('piggy_cheer'); toast(`送給${who}了`); await reload(); });
  }));
  app.querySelectorAll('[data-cheer-del]').forEach((b) => b.addEventListener('click', () => {
    if (!confirm('刪掉這句鼓勵嗎？')) return;
    withBusy(b, '…', async () => { await Piggy.cheerDelete(b.dataset.cheerDel); await reload(); });
  }));
}

// ---------- 規則（#/piggy/rules）：新增、改、排順序、刪 ----------
function pgRuleDialog(rule, onDone) {
  const st = { dir: rule ? rule.dir : 'in', emoji: rule ? rule.emoji : '🏃', title: rule ? rule.title : '', amount: rule ? rule.amount : '' };
  const box = pgDialog('', rule ? '改規則' : '新增規則');
  const form = box.querySelector('form');
  const read = () => { st.title = form.querySelector('#pg-r-title').value; st.amount = form.querySelector('#pg-r-amount').value; };
  const render = () => {
    form.innerHTML = `<h2 style="font-size:20px">${rule ? '改規則' : '新增規則'}</h2>
      <div class="seg" style="grid-template-columns:1fr 1fr" role="group" aria-label="存進來或花掉">
        <button type="button" class="${st.dir === 'in' ? 'on' : ''}" data-rdir="in" aria-pressed="${st.dir === 'in'}">存進來 ＋</button>
        <button type="button" class="${st.dir === 'out' ? 'on' : ''}" data-rdir="out" aria-pressed="${st.dir === 'out'}">花掉 －</button></div>
      <div class="field"><div class="label">圖示</div>${pgEmojiPicker(PG_EMOJIS.includes(st.emoji) ? PG_EMOJIS : [st.emoji, ...PG_EMOJIS], st.emoji, 'remo')}</div>
      <div class="field"><label for="pg-r-title">${st.dir === 'in' ? '做了什麼' : '花在什麼'}</label><input id="pg-r-title" class="input" maxlength="${PG_TITLE_MAX}" value="${esc(st.title)}" placeholder="${st.dir === 'in' ? '例如：瑜伽 20 分鐘' : '例如：喝一杯手搖'}"></div>
      <div class="field"><label for="pg-r-amount">${st.dir === 'in' ? '獎勵多少' : '扣多少'}（NT$）</label><input id="pg-r-amount" class="input" type="number" inputmode="numeric" min="1" max="${PG_AMOUNT_MAX}" step="1" value="${esc(String(st.amount))}" placeholder="${st.dir === 'in' ? '40' : '60'}"></div>
      <div class="small muted">改金額不會影響已經記的。</div>
      <button class="btn" type="submit" id="pg-r-save">${rule ? '儲存' : '存好規則'}</button>
      ${rule ? '<button class="btn small danger" type="button" id="pg-r-del">刪掉這條規則</button>' : ''}
      <button class="btn secondary small" type="button" id="pg-r-cancel">取消</button>`;
    form.querySelectorAll('[data-rdir]').forEach((b) => b.addEventListener('click', () => { read(); st.dir = b.dataset.rdir; render(); }));
    form.querySelectorAll('[data-remo]').forEach((b) => b.addEventListener('click', () => { read(); st.emoji = b.dataset.remo; render(); }));
    form.querySelector('#pg-r-cancel').addEventListener('click', () => box.remove());
    const del = form.querySelector('#pg-r-del');
    if (del) del.addEventListener('click', () => {
      if (!confirm(`刪掉「${rule.title}」這條規則嗎？已經記的不會變。`)) return;
      withBusy(del, '刪除中…', async () => { await Piggy.ruleDelete(rule.id); box.remove(); toast('刪掉了'); onDone(); });
    });
  };
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    read();
    const title = st.title.trim();
    const amount = Math.round(Number(st.amount));
    if (!title) { toast('寫一下規則的名稱'); return; }
    if (!(amount >= 1 && amount <= PG_AMOUNT_MAX)) { toast('金額要在 1 到 100,000 之間'); return; }
    withBusy(form.querySelector('#pg-r-save'), '儲存中…', async () => {
      await Piggy.ruleSave({ id: rule && rule.id, emoji: st.emoji, title: title.slice(0, PG_TITLE_MAX), amount, dir: st.dir });
      box.remove();
      if (!rule) track('piggy_rule', { dir: st.dir });
      toast(rule ? '改好了' : '新增了一條規則');
      onDone();
    });
  });
  render();
}
async function viewPiggyRules() {
  app.className = 'theme-happy';
  let d;
  try { d = await Piggy.get('me'); } catch (e) {
    app.innerHTML = `<div class="topbar"><a class="icon-btn" href="#/piggy" aria-label="返回" data-back>${ICON.back}</a><h1>我的獎勵規則</h1></div><div class="card"><div class="small muted">${esc(e.notReady ? e.message : cloudErrorText(e))}</div></div>`;
    return;
  }
  const rules = (d && d.rules) || [];
  const reload = () => viewPiggyRules();
  app.innerHTML = `<div class="topbar"><a class="icon-btn" href="#/piggy" aria-label="返回" data-back>${ICON.back}</a><h1>我的獎勵規則</h1></div>
    <div class="small muted">做到什麼事存多少，自己決定。也可以建「花掉」的規則，例如喝一杯手搖 −60。</div>
    ${rules.length ? `<div class="card pg-list">${rules.map((r, i) => `<div class="pg-rule-row">
      <button class="pg-ent-main" data-redit="${esc(r.id)}"><span class="pg-emo ${r.dir}" aria-hidden="true">${esc(r.emoji)}</span>
        <span class="pg-ent-text"><span class="bold">${esc(r.title)}</span></span><span class="pg-amt ${r.dir}">${r.dir === 'in' ? '+' : '−'}${pgMoney(r.amount)}</span></button>
      <span class="pg-move"><button class="icon-btn" data-up="${i}" aria-label="往上移" ${i === 0 ? 'disabled' : ''}>↑</button><button class="icon-btn" data-down="${i}" aria-label="往下移" ${i === rules.length - 1 ? 'disabled' : ''}>↓</button></span>
    </div>`).join('')}</div>` : '<div class="card"><div class="small muted">還沒有規則。新增一條，之後點一下就能存。</div></div>'}
    <button class="btn secondary" id="pg-r-new">＋ 新增規則</button>
    <div class="small muted">最多 ${PG_RULE_MAX} 條。</div>`;
  app.querySelectorAll('[data-redit]').forEach((b) => b.addEventListener('click', () => pgRuleDialog(rules.find((x) => x.id === b.dataset.redit), reload)));
  const move = (i, j) => {
    const ids = rules.map((r) => r.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    Piggy.ruleOrder(ids).then(reload).catch((e) => toast(cloudErrorText(e)));
  };
  app.querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => { const i = Number(b.dataset.up); if (i > 0) move(i, i - 1); }));
  app.querySelectorAll('[data-down]').forEach((b) => b.addEventListener('click', () => { const i = Number(b.dataset.down); if (i < rules.length - 1) move(i, i + 1); }));
  document.getElementById('pg-r-new').addEventListener('click', () => {
    if (rules.length >= PG_RULE_MAX) { toast(`規則最多 ${PG_RULE_MAX} 條，先刪掉一些不用的吧`); return; }
    pgRuleDialog(null, reload);
  });
}
