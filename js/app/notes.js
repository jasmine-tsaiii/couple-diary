// 啾啾日記 js/app/notes.js：秘密留言板（2026-10-04）
// 寫一張紙條給另一半（手寫或打字），對方打開 App 時整張跳出來一次。舊紙條都留著，可以往回翻；寫的人可以刪掉自己的。
// 紙一律是米白色（深色模式也一樣），手寫存成透明底的 PNG，墨水顏色固定，換主題也看得清楚。

const NOTE_PENS = { ink: '#2B2320', red: '#A33A52', blue: '#3E4C8A' };
const NOTE_TEXT_MAX = 120;
const NOTE_IMG_W = 600; // 存下來的手寫圖寬度（像素）

const noteCloud = () => usingCloud() && (!CloudDB.isAnonymous() || isPartner());
function noteWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const day = (x) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  const now = new Date();
  const y = new Date(now.getTime() - 864e5);
  if (day(d) === day(now)) return `今天 ${hm}`;
  if (day(d) === day(y)) return `昨天 ${hm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

// 狀態（給「一起」那一列、底部紅點、打開 App 跳出來用）；20 秒內重複問就用上一次的
let noteCache = null;
async function noteStatus(fresh) {
  if (!noteCloud()) return null;
  if (!fresh && noteCache && Date.now() - noteCache.at < 20000) return noteCache.v;
  let st;
  try { st = await CloudDB.noteState(); } catch (e) { return null; }
  if (!st || !st.ok) return null;
  const other = st.pair ? (st.members || []).find((m) => m !== st.me) : null;
  const v = { st, pair: !!st.pair, inbox: st.inbox, sent: st.sent, unseen: st.unseen || 0, otherName: (other && st.names && st.names[other]) || otherName() };
  noteCache = { at: Date.now(), v };
  return v;
}
const noteForget = () => { noteCache = null; };
let noteDotOn = false; // 有沒看過的新紙條（「一起」的紅點；任務的紅點在 refreshBell）

// 一張紙條（大張或小張）
function notePaperHtml(n, cls = '') {
  if (!n) return '';
  const inner = n.kind === 'draw' && /^data:image\/png;base64,/.test(n.image || '')
    ? `<img src="${esc(n.image)}" alt="手寫的紙條">`
    : `<div class="note-text" style="color:${NOTE_PENS[n.pen] || NOTE_PENS.ink}">${esc(n.body)}</div>`;
  return `<div class="note-paper ${cls}">${inner}</div>`;
}

// 「一起」分頁的那一列
function noteRowHtml(s) {
  let sub = '手寫或打字，留一張紙條給對方';
  let badge = '';
  if (s && s.pair) {
    if (s.unseen) { sub = `${esc(s.otherName)}留了一張紙條給你`; badge = '新紙條'; }
    else if (s.inbox) sub = `${esc(s.otherName)}最近一張：${noteWhen(s.inbox.created_at)}`;
  }
  return navRow({ href: '#/notes', id: 'row-notes', icon: TILE_ICON.note, title: '秘密留言板', sub, badge });
}

// 底部「一起」的小紅點
async function refreshNoteDot() {
  if (!noteCloud() || tabbar.hidden) return;
  const s = await noteStatus();
  const tab = tabbar.querySelector('a.tab[data-tab="together"]');
  noteDotOn = !!(s && s.unseen);
  if (tab) setTabDot(tab, noteDotOn || tab.dataset.taskDot === '1');
}

// 打開 App（今天頁）時：有沒看過的新紙條就整張跳出來，每張只跳一次
async function maybeShowNotePop() {
  const s = await noteStatus(true);
  if (!s || !s.unseen || !s.inbox) return;
  const id = s.inbox.id;
  try { if (localStorage.getItem('notePopShown') === String(id)) return; } catch (e) { /* 略過 */ }
  whenNoDialog(() => {
    if (location.hash.replace(/^#\/?/, '') || document.querySelector('.note-pop')) return;
    try { localStorage.setItem('notePopShown', String(id)); } catch (e) { /* 略過 */ }
    const box = document.createElement('div');
    box.className = 'celebrate note-pop';
    box.innerHTML = `<div class="note-pop-box" role="dialog" aria-modal="true" aria-label="${esc(s.otherName)}留給你的紙條">
      <div class="note-pop-hint">${esc(s.otherName)}${esc(noteWhen(s.inbox.created_at))}留了一張紙條</div>
      ${notePaperHtml(s.inbox, 'big')}
      <a class="btn" href="#/notes/new" id="note-pop-reply">回一張紙條</a>
      <button class="btn secondary" id="note-pop-close">收起來</button>
    </div>`;
    document.body.appendChild(box);
    track('note_pop');
    CloudDB.noteSeen(id).then(() => { noteForget(); refreshNoteDot().catch(() => {}); }).catch(() => {});
    const close = () => box.remove();
    box.querySelector('#note-pop-close').addEventListener('click', close);
    box.querySelector('#note-pop-reply').addEventListener('click', close);
    box.addEventListener('click', (ev) => { if (ev.target === box) close(); });
  });
}

// ---------- 留言板（#/notes） ----------
async function viewNotes() {
  app.className = 'theme-happy';
  const top = `<div class="topbar"><a class="icon-btn" href="#/together" aria-label="返回" data-back>${ICON.back}</a><h1>秘密留言板</h1></div>`;
  const intro = '<div class="small muted">寫一張紙條給另一半，手寫或打字都可以。只有你們兩個看得到，對方打開 App 就會看到。</div>';
  if (!noteCloud()) {
    app.innerHTML = `${top}<div class="card" style="gap:8px">${intro}<div class="muted">註冊並邀請另一半加入之後，就能寫紙條給對方。</div>
      <a class="btn small" href="#/signup" style="align-self:flex-start">註冊或登入</a></div>`;
    return;
  }
  let st;
  try { st = await CloudDB.noteState(); } catch (e) { st = { ok: false }; }
  if (!st || !st.ok) {
    app.innerHTML = `${top}<div class="card"><div class="muted">${st && st.missing ? '這個功能還在準備中，過幾天再來看看。' : '現在讀不到資料，請稍後再試一次。'}</div></div>`;
    return;
  }
  if (!st.pair) {
    app.innerHTML = `${top}<div class="card" style="gap:8px">${intro}<div class="muted">另一半加入之後就能寫紙條給對方。</div>
      ${isPartner() ? '' : '<a class="btn small" href="#/settings/share" style="align-self:flex-start">去邀請另一半</a>'}</div>`;
    return;
  }
  track('note_open');
  const me = st.me;
  const other = (st.members || []).find((m) => m !== me);
  const oname = (st.names && st.names[other]) || otherName();
  const inbox = st.inbox;
  const sent = st.sent;
  if (inbox && !inbox.seen_at) CloudDB.noteSeen(inbox.id).then(() => { noteForget(); refreshNoteDot().catch(() => {}); }).catch(() => {});
  const inboxHtml = inbox
    ? `<div class="note-main">${notePaperHtml(inbox, 'big')}<div class="small muted">${esc(oname)}・${esc(noteWhen(inbox.created_at))}</div></div>`
    : `<div class="note-main">${notePaperHtml({ kind: 'text', body: `${oname}還沒留紙條給你。\n先寫一張給${oname}吧！`, pen: 'ink' }, 'big empty')}</div>`;
  const sentHtml = sent ? `<div class="small muted" style="text-align:center">你上一張是${esc(noteWhen(sent.created_at))}寫的，${sent.seen_at ? `${esc(oname)}看過了` : `${esc(oname)}還沒看`}</div>` : '';
  app.innerHTML = `${top}
    <h2 class="section-title">${esc(oname)}寫給你的</h2>
    ${inboxHtml}
    <a class="btn" href="#/notes/new" id="note-write">寫一張給${esc(oname)}</a>
    ${sentHtml}
    <div id="note-hist"></div>`;

  // 以前的紙條：兩個人寫的都有，由新到舊；最上面那張已經大大地放在上面了就不重複
  const box = document.getElementById('note-hist');
  let before = null;
  const loadMore = async () => {
    let rows = [];
    try { rows = await CloudDB.noteHistory(before, 12); } catch (e) { rows = []; }
    const show = rows.filter((n) => !inbox || n.id !== inbox.id);
    if (!before && !show.length) return;
    if (!before) box.innerHTML = '<h2 class="section-title">以前的紙條</h2><div class="note-wall" id="note-wall"></div>';
    const wall = document.getElementById('note-wall');
    for (const n of show) {
      const mine = n.author === me;
      const el = document.createElement('div');
      el.className = `note-mini${mine ? ' mine' : ''}`;
      el.innerHTML = `${notePaperHtml(n)}<div class="note-meta"><span class="small muted">${mine ? '你' : esc(oname)}・${esc(noteWhen(n.created_at))}</span>
        ${mine ? `<button class="link-btn small" data-del="${n.id}">刪掉</button>` : ''}</div>`;
      wall.appendChild(el);
    }
    document.getElementById('note-more')?.remove();
    if (rows.length === 12) {
      before = rows[rows.length - 1].id;
      box.insertAdjacentHTML('beforeend', '<button class="btn small secondary" id="note-more" style="display:block;margin:10px auto 0">再看更早的</button>');
      document.getElementById('note-more').addEventListener('click', loadMore);
    }
  };
  box.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-del]');
    if (!b) return;
    if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = '確定刪掉？'; return; }
    try { await CloudDB.noteDelete(Number(b.dataset.del)); } catch (e) { toast(e.message || '刪不掉，請稍後再試一次'); return; }
    track('note_delete');
    b.closest('.note-mini').remove();
    toast('刪掉了');
  });
  await loadMore();
}

// ---------- 寫紙條（#/notes/new） ----------
async function viewNoteNew() {
  app.className = 'theme-happy';
  const s = await noteStatus(true);
  if (!s || !s.pair) { go('#/notes'); return; }
  const oname = s.otherName;
  let draft = '';
  try { draft = localStorage.getItem('noteDraft') || ''; } catch (e) { draft = ''; }
  let mode = 'draw';
  try { if (localStorage.getItem('noteMode') === 'text') mode = 'text'; } catch (e) { /* 略過 */ }
  app.innerHTML = `<div class="topbar"><a class="icon-btn" href="#/notes" aria-label="返回" data-back>${ICON.back}</a><h1>寫給${esc(oname)}</h1></div>
    <div class="seg note-seg" role="group" aria-label="寫法">
      <button type="button" class="seg-btn" data-mode="draw">手寫</button>
      <button type="button" class="seg-btn" data-mode="text">打字</button>
    </div>
    <div class="note-paper big note-pad" id="note-pad">
      <canvas id="note-cv" aria-label="手寫區，用手指寫字或畫畫"></canvas>
      <textarea id="note-ta" maxlength="${NOTE_TEXT_MAX}" aria-label="打字留言" placeholder="想對${esc(oname)}說什麼？">${esc(draft)}</textarea>
    </div>
    <div class="note-tools">
      ${Object.entries(NOTE_PENS).map(([k, c]) => `<button type="button" class="note-pen" data-pen="${k}" style="background:${c}" aria-label="${{ ink: '黑筆', red: '紅筆', blue: '藍筆' }[k]}"></button>`).join('')}
      <span class="note-count small muted" id="note-count"></span>
      <span style="flex:1"></span>
      <button type="button" class="link-btn small" id="note-undo">復原</button>
      <button type="button" class="link-btn small" id="note-clear">清空</button>
    </div>
    <button class="btn" id="note-send">放到${esc(oname)}的留言板</button>
    <div class="small muted" style="text-align:center">只有你們兩個看得到。${esc(oname)}下次打開 App 就會看到。</div>`;

  const pad = document.getElementById('note-pad');
  const cv = document.getElementById('note-cv');
  const ta = document.getElementById('note-ta');
  const count = document.getElementById('note-count');
  const ctx = cv.getContext('2d');
  let strokes = [];
  let cur = null;
  let pen = 'ink';
  const width = () => Math.max(2.5, pad.clientWidth / 110);
  const paint = (c, scale) => {
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const s of strokes) {
      c.strokeStyle = NOTE_PENS[s.pen]; c.lineWidth = s.w * scale;
      c.beginPath();
      s.p.forEach(([x, y], i) => (i ? c.lineTo(x * scale, y * scale) : c.moveTo(x * scale, y * scale)));
      if (s.p.length === 1) c.lineTo(s.p[0][0] * scale + 0.1, s.p[0][1] * scale);
      c.stroke();
    }
  };
  const resize = () => {
    const r = pad.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    paint(ctx, 1);
  };
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); cur = { pen, w: width(), p: [pos(e)] }; strokes.push(cur); resize(); });
  cv.addEventListener('pointermove', (e) => { if (!cur) return; e.preventDefault(); cur.p.push(pos(e)); resize(); });
  const end = () => { cur = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);

  const setCount = () => { count.textContent = mode === 'text' ? `${ta.value.length} / ${NOTE_TEXT_MAX}` : ''; };
  const setMode = (m) => {
    mode = m;
    try { localStorage.setItem('noteMode', m); } catch (e) { /* 略過 */ }
    app.querySelectorAll('.note-seg .seg-btn').forEach((b) => { const on = b.dataset.mode === m; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    cv.hidden = m !== 'draw'; ta.hidden = m !== 'text';
    document.getElementById('note-undo').hidden = m !== 'draw';
    if (m === 'draw') resize(); else ta.focus();
    setCount();
  };
  const setPen = (k) => {
    pen = k;
    app.querySelectorAll('.note-pen').forEach((b) => b.setAttribute('aria-pressed', b.dataset.pen === k));
    ta.style.color = NOTE_PENS[k];
  };
  app.querySelectorAll('.note-seg .seg-btn').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  app.querySelectorAll('.note-pen').forEach((b) => b.addEventListener('click', () => setPen(b.dataset.pen)));
  document.getElementById('note-undo').addEventListener('click', () => { strokes.pop(); resize(); });
  document.getElementById('note-clear').addEventListener('click', () => { if (mode === 'draw') { strokes = []; resize(); } else { ta.value = ''; setCount(); try { localStorage.removeItem('noteDraft'); } catch (e) { /* 略過 */ } } });
  ta.addEventListener('input', () => { setCount(); try { localStorage.setItem('noteDraft', ta.value); } catch (e) { /* 略過 */ } });
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => { if (mode === 'draw') resize(); }).observe(pad);
  setPen('ink');
  setMode(mode);

  const send = document.getElementById('note-send');
  send.addEventListener('click', () => withBusy(send, '放上去中…', async () => {
    let image = null;
    const body = ta.value.trim();
    if (mode === 'draw') {
      if (!strokes.length) { toast('先在紙上寫點什麼'); return; }
      const r = pad.getBoundingClientRect();
      const scale = NOTE_IMG_W / r.width;
      const out = document.createElement('canvas');
      out.width = NOTE_IMG_W; out.height = Math.round(r.height * scale);
      paint(out.getContext('2d'), scale);
      image = out.toDataURL('image/png');
    } else if (!body) { toast('先寫下想說的話'); ta.focus(); return; }
    try { await CloudDB.noteSend(mode, mode === 'text' ? body : '', image, pen); } catch (e) { toast(e.message || '放不上去，請稍後再試一次'); return; }
    track('note_send', { mode });
    if (mode === 'text') { try { localStorage.removeItem('noteDraft'); } catch (e) { /* 略過 */ } }
    noteForget();
    toast(`放到${oname}的留言板了`);
    go('#/notes');
  }));
}
