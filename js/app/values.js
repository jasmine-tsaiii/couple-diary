// 啾啾日記 js/app/values.js：價值觀地圖（2026-10-10）
// 兩人各自做 24 題五格量表（6 個面向 × 4 題），兩個人都做完才一起揭曉：每個面向一條橫條、兩顆點，標「很像／有點不一樣／差很多」。
// 差最多的面向接到主題題庫去聊。不打分數、不貼人格標籤（Jasmine 10/10 照建議：不打分數、全部免費、叫「價值觀地圖」）。
// 題目順序固定：伺服器存 24 格的答案（1～5，0 = 還沒答），第 i 格就是 VALUES_QS[i]。只能往後加題，不能改順序。
// 揭曉前可以回頭改，揭曉後不能改。

const VALUES_DIMS = [
  { key: 'money', icon: '💰', name: '金錢', left: '先存起來才安心', right: '享受當下比較重要', topic: 'money',
    tip: '可以聊聊彼此覺得「花得值得」的錢是什麼。' },
  { key: 'work', icon: '💼', name: '工作與生活', left: '現在先拚事業', right: '生活品質優先', topic: 'values',
    tip: '可以聊聊各自心中剛好的工作和生活比例。' },
  { key: 'family', icon: '🏠', name: '家人', left: '家人常常參與', right: '兩個人的小天地', topic: 'family',
    tip: '可以聊聊彼此家裡的習慣，和你們想要的距離。' },
  { key: 'space', icon: '🫂', name: '相處距離', left: '想常常黏在一起', right: '需要自己的空間', topic: '',
    tip: '可以聊聊怎樣的相處會讓你覺得被愛、又不會喘不過氣。',
    talk: ['你覺得一個禮拜要有幾天一起過，最剛好？', '什麼時候你最需要自己一個人的時間？', '對方做什麼事，會讓你覺得被在乎？'] },
  { key: 'fight', icon: '⛈️', name: '吵架方式', left: '當下講清楚', right: '先冷靜再說', topic: '',
    tip: '下次吵架前，可以先聊聊彼此需要什麼。',
    talk: ['吵架的時候，你最希望對方先做什麼？', '你需要冷靜多久？冷靜的時候希望對方怎麼做？', '我們可以約一個「暫停」的暗號嗎？'] },
  { key: 'future', icon: '🌱', name: '未來規劃', left: '早早規劃好', right: '走一步算一步', topic: 'future',
    tip: '可以聊聊未來幾年，哪些事想先說好、哪些可以慢慢來。' },
];
// [面向, 題目, 左端, 右端]；左端 = 面向的左邊
const VALUES_QS = [
  ['money', '年終多了 5 萬，你會怎麼用？', '全部存起來', '拿去旅行'],
  ['money', '看到喜歡但有點貴的東西…', '等等再說，多半不買', '喜歡就買'],
  ['money', '每個月的薪水，你習慣…', '先存一筆，剩下才花', '先過生活，剩下才存'],
  ['money', '約會吃飯，你比較想…', '平價好吃就好', '偶爾吃頓好的很值得'],
  ['work', '有升遷機會，但要常常加班…', '先接，趁年輕拚', '不接，生活比較重要'],
  ['work', '下班後老闆傳訊息來…', '馬上回', '明天上班再說'],
  ['work', '你心中理想的工作是…', '有挑戰、能往上爬', '穩定、準時下班'],
  ['work', '存夠錢可以一年不工作，你會…', '繼續工作，存更多', '馬上去過想要的生活'],
  ['family', '週末回家吃飯，你覺得…', '每週都要回', '有空再回'],
  ['family', '買房、換工作這種大事，你會…', '一定問家人意見', '兩個人決定就好'],
  ['family', '過年過節…', '一定跟家人一起過', '可以兩個人去旅行'],
  ['family', '以後住的地方…', '離家人近一點', '遠一點也沒關係'],
  ['space', '下班後，你最想…', '一起窩著', '各做各的事'],
  ['space', '一整天沒聯絡，你會…', '想問對方在幹嘛', '很正常，不用擔心'],
  ['space', '放假的時候…', '每個假日都一起過', '留一些給自己的朋友'],
  ['space', '自己一個人出去玩…', '比較想一起去', '偶爾一個人很好'],
  ['fight', '吵到一半，對方說想靜一下…', '想馬上講完', '鬆一口氣，好'],
  ['fight', '不開心的時候，你通常…', '直接說出來', '先自己消化'],
  ['fight', '吵架那天晚上…', '一定要和好才睡', '睡一覺明天再說'],
  ['fight', '對方做了讓你介意的小事…', '當下就說', '累積一點才說'],
  ['future', '五年後住在哪裡…', '現在就想定下來', '到時候再說'],
  ['future', '結婚、小孩這些事…', '想早點聊清楚', '順其自然'],
  ['future', '出去旅行…', '行程排好排滿', '到了再決定'],
  ['future', '存錢買房…', '已經在想、在存', '還沒想那麼遠'],
];
const VALUES_N = VALUES_QS.length;
const valuesCanUse = () => usingCloud() && (!CloudDB.isAnonymous() || isPartner());
const valuesDim = (key) => VALUES_DIMS.find((d) => d.key === key);

// 每個面向的平均（1～5）
function valuesScores(ans) {
  const out = {};
  for (const d of VALUES_DIMS) {
    const v = VALUES_QS.map((q, i) => (q[0] === d.key ? ans[i] : 0)).filter((x) => x > 0);
    out[d.key] = v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }
  return out;
}
// 兩人差距：< 1 很像，1～2 有點不一樣，≥ 2 差很多
function valuesLevel(diff) {
  if (diff < 1) return { key: 'same', label: '很像' };
  if (diff < 2) return { key: 'bit', label: '有點不一樣' };
  return { key: 'far', label: '差很多' };
}
function valuesCompare(mine, other) {
  const a = valuesScores(mine); const b = valuesScores(other);
  return VALUES_DIMS.map((d) => ({ dim: d, me: a[d.key], other: b[d.key], diff: Math.abs(a[d.key] - b[d.key]), level: valuesLevel(Math.abs(a[d.key] - b[d.key])) }));
}
// 啾啾的一句話：固定文案，不用 AI
function valuesSummary(rows) {
  const same = rows.filter((r) => r.level.key === 'same').map((r) => r.dim.name);
  const top = [...rows].sort((x, y) => y.diff - x.diff)[0];
  if (same.length === rows.length) return '你們六個面向都很合拍，很少見喔！還是可以挑一個聊聊，細節不一定一樣。';
  const head = same.length ? `你們在${same.slice(0, 3).join('、')}上很合拍。` : '你們每個面向都有一點不一樣，這很正常。';
  return `${head}${top.dim.name}差最多，${top.dim.tip}`;
}
// 要推薦去聊的面向：差距 ≥ 1 的前兩名
const valuesTalkDims = (rows) => [...rows].filter((r) => r.diff >= 1).sort((x, y) => y.diff - x.diff).slice(0, 2);
const valuesPos = (score) => `${Math.round(((score - 1) / 4) * 100)}%`;

// 「一起」分頁那一列
async function valuesRowHtml() {
  let badge = '';
  let sub = '6 個人生面向，看看你們哪裡像、哪裡不一樣';
  if (valuesCanUse()) {
    try {
      const st = await CloudDB.valuesState();
      if (st && st.ok && st.pair) {
        if (st.mine_done && st.other_done) sub = '揭曉了，看看你們的地圖';
        else if (st.other_done) badge = '對方做完了';
        else if (st.mine_done) sub = '你做完了，等對方做完就揭曉';
      }
    } catch (e) { /* 讀不到就顯示說明 */ }
  }
  return navRow({ href: '#/values', id: 'row-values', icon: '<span class="nav-emoji" aria-hidden="true">🧭</span>', title: '價值觀地圖', sub, badge });
}

// 兩顆點幾乎重疊時各往旁邊挪一點，兩顆都看得到
function valuesDots(dots) {
  const close = dots.length === 2 && Math.abs(dots[0].score - dots[1].score) < 0.4;
  return dots.map((x, k) => `<span class="vm-dot ${x.cls}" style="left:calc(${valuesPos(x.score)} ${close ? (k ? '+ 8px' : '- 8px') : '+ 0px'})" title="${esc(x.who)}"></span>`).join('');
}
function valuesBar(d, dots, tag) {
  return `<div class="vm-dim" data-dim="${d.key}">
    <div class="vm-head"><span class="bold">${d.icon} ${esc(d.name)}</span>${tag ? `<span class="vm-tag vm-${tag.key}">${tag.label}</span>` : ''}</div>
    <div class="vm-track">${valuesDots(dots)}</div>
    <div class="vm-ends small muted"><span>${esc(d.left)}</span><span>${esc(d.right)}</span></div>
  </div>`;
}

async function viewValues() {
  app.className = 'theme-happy';
  const top = `<div class="topbar"><a class="icon-btn" href="#/together" aria-label="返回" data-back>${ICON.back}</a><h1>價值觀地圖</h1></div>`;
  let st = null;
  if (valuesCanUse()) {
    try { st = await CloudDB.valuesState(); } catch (e) { st = { ok: false }; }
  }
  const paired = !!(st && st.ok && st.pair);
  const other = paired ? st.members.find((m) => m !== st.me) : null;
  const oname = (paired && st.names && st.names[other]) || otherName();
  const intro = `<div class="card" style="gap:6px">
      <div class="bold">兩個人各自做，看看你們在人生大事上站在哪裡</div>
      <div class="small muted">${VALUES_N} 題，約 5 分鐘。每題沒有對錯，選最像你的就好。兩個人都做完才會一起揭曉。</div>
    </div>`;

  if (!paired) {
    let notice;
    if (!valuesCanUse()) notice = `<div class="card" style="gap:8px"><div class="muted">註冊並邀請另一半加入之後，就能一起做。</div><a class="btn small" href="#/signup" style="align-self:flex-start">註冊或登入</a></div>`;
    else if (!st || !st.ok) notice = `<div class="card"><div class="muted">${st && st.missing ? '這個功能還在準備中，過幾天再來看看。' : '現在讀不到資料，請稍後再試一次。'}</div></div>`;
    else notice = `<div class="card" style="gap:8px"><div class="muted">另一半加入之後就能一起做。</div>${isPartner() ? '' : '<a class="btn small" href="#/settings/share" style="align-self:flex-start">去邀請另一半</a>'}</div>`;
    const preview = VALUES_DIMS.map((d) => `<div class="vm-ends small"><span>${d.icon} ${esc(d.name)}</span><span class="muted">${esc(d.left)} ↔ ${esc(d.right)}</span></div>`).join('');
    app.innerHTML = `${top}${intro}${notice}<div class="card" style="gap:10px"><div class="bold">會看的 6 個面向</div>${preview}</div>`;
    track('values_open', { state: 'nopair' });
    return;
  }

  const mine = (st.mine && st.mine.length === VALUES_N) ? st.mine.slice() : new Array(VALUES_N).fill(0);
  if (st.mine_done && st.other_done && st.other) { renderValuesReveal(top, mine, st.other, oname); track('values_open', { state: 'revealed' }); return; }
  if (st.mine_done) { renderValuesWait(top, mine, oname, st.other_done); track('values_open', { state: 'waiting' }); return; }
  track('values_open', { state: mine.some((x) => x) ? 'continue' : 'start' });
  const first = mine.findIndex((x) => !x);
  if (!mine.some((x) => x)) {
    app.innerHTML = `${top}${intro}
      ${st.other_done ? `<div class="card"><div class="daily-state">${esc(oname)}已經做完了，換你。你做完就一起揭曉。</div></div>` : ''}
      <button class="btn" id="vm-start">開始</button>`;
    document.getElementById('vm-start').addEventListener('click', () => renderValuesQuestion(top, mine, 0, oname));
    return;
  }
  renderValuesQuestion(top, mine, first === -1 ? VALUES_N - 1 : first, oname);
}

// 一次一題：點一格就存，自動跳下一題
function renderValuesQuestion(top, ans, i, oname) {
  const [dk, q, l, r] = VALUES_QS[i];
  const d = valuesDim(dk);
  const done = ans.filter((x) => x).length;
  const dots = [1, 2, 3, 4, 5].map((v) => `<button class="vm-pick${ans[i] === v ? ' on' : ''}" data-v="${v}" aria-label="${v === 1 ? l : v === 5 ? r : `第 ${v} 格`}" aria-pressed="${ans[i] === v}"></button>`).join('');
  app.innerHTML = `${top}
    <div class="small muted">${d.icon} ${esc(d.name)}・第 ${i + 1} / ${VALUES_N} 題</div>
    <div class="vm-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${VALUES_N}" aria-valuenow="${done}"><i style="width:${(done / VALUES_N) * 100}%"></i></div>
    <div class="card" style="gap:16px">
      <div class="vm-q">${esc(q)}</div>
      <div class="vm-picks" role="group" aria-label="${esc(q)}">${dots}</div>
      <div class="vm-ends small"><span>${esc(l)}</span><span>${esc(r)}</span></div>
    </div>
    <div class="small muted" style="text-align:center">沒有對錯，選最像你的就好</div>
    <div class="btn-row">
      ${i > 0 ? '<button class="btn secondary" id="vm-prev">上一題</button>' : ''}
      ${ans[i] ? `<button class="btn" id="vm-next">${i === VALUES_N - 1 ? '完成' : '下一題'}</button>` : ''}
    </div>
    ${ans.every((x) => x) && i < VALUES_N - 1 ? '<button class="btn secondary" id="vm-finish">改好了，看結果</button>' : ''}`;
  const goNext = async () => {
    if (ans.every((x) => x)) {
      if (i === VALUES_N - 1) { await valuesSubmit(top, ans, oname); return; }
      renderValuesQuestion(top, ans, i + 1, oname);
    } else {
      const next = ans.findIndex((x, k) => !x && k > i);
      renderValuesQuestion(top, ans, next === -1 ? ans.findIndex((x) => !x) : next, oname);
    }
    window.scrollTo(0, 0);
  };
  const wasComplete = ans.every((x) => x);
  app.querySelectorAll('.vm-pick').forEach((b) => b.addEventListener('click', async () => {
    const before = ans[i];
    ans[i] = Number(b.dataset.v);
    app.querySelectorAll('.vm-pick').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    // 剛好答完最後一題就送出；回頭改答案時改到最後一題也送出
    if (ans.every((x) => x) && (!wasComplete || i === VALUES_N - 1)) { await valuesSubmit(top, ans, oname, () => { ans[i] = before; }); return; }
    // 中途的進度也存起來，換手機或關掉還能接著做；存不到也先往下做
    CloudDB.valuesSave(ans).catch(() => {});
    setTimeout(goNext, 180);
  }));
  const fin = document.getElementById('vm-finish');
  if (fin) fin.addEventListener('click', () => valuesSubmit(top, ans, oname));
  const prev = document.getElementById('vm-prev');
  if (prev) prev.addEventListener('click', () => renderValuesQuestion(top, ans, i - 1, oname));
  const nx = document.getElementById('vm-next');
  if (nx) nx.addEventListener('click', goNext);
}

async function valuesSubmit(top, ans, oname, undo) {
  let res;
  try { res = await CloudDB.valuesSave(ans); } catch (e) { if (undo) undo(); toast(e.message || '送不出去，請稍後再試一次'); return; }
  track('values_submit');
  if (res && res.revealed) { track('values_reveal'); toast('揭曉了！'); } else toast(`做完了，等${oname}做完就一起揭曉`);
  window.scrollTo(0, 0);
  await viewValues();
}

function renderValuesWait(top, mine, oname, otherDone) {
  const sc = valuesScores(mine);
  app.innerHTML = `${top}
    <div class="card" style="gap:6px"><div class="bold">我的價值觀地圖</div><div class="small muted">${esc(oname)}做完就會一起揭曉，揭曉前看不到對方的答案。</div></div>
    <div class="card vm-map" style="gap:14px">
      <div class="vm-legend small"><span class="vm-dot me"></span>我</div>
      ${VALUES_DIMS.map((d) => valuesBar(d, [{ cls: 'me', score: sc[d.key], who: '我' }])).join('')}
    </div>
    <div class="card" style="text-align:center;gap:6px">
      <div style="font-size:34px" aria-hidden="true">🐤</div>
      <div class="muted">${otherDone ? '對方也做完了，重新整理看看' : `${esc(oname)}還沒做完，可以跟對方說一聲`}</div>
      ${otherDone ? '' : nudgeBtnHtml('values', '#/values', oname)}
    </div>
    <button class="btn secondary" id="vm-edit">回頭改答案</button>`;
  bindNudgeBtns();
  document.getElementById('vm-edit').addEventListener('click', () => renderValuesQuestion(top, mine.slice(), 0, oname));
}

function renderValuesReveal(top, mine, other, oname) {
  const rows = valuesCompare(mine, other);
  const talk = valuesTalkDims(rows);
  const talkHtml = talk.map((r) => {
    const d = r.dim;
    if (d.topic) return `<a class="btn small secondary vm-talk" href="#/topics/${d.topic}" data-talk="${d.key}">一起聊聊${esc(d.name)} →</a>`;
    return `<details class="vm-talkbox" data-talk="${d.key}"><summary class="btn small secondary vm-talk">一起聊聊${esc(d.name)}</summary>
      <ol class="small">${d.talk.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></details>`;
  }).join('');
  const detail = VALUES_QS.map(([dk, q, l, r], i) => `<div class="vm-qrow">
      <div class="small">${valuesDim(dk).icon} ${esc(q)}</div>
      <div class="vm-track sm">${valuesDots([{ cls: 'me', score: mine[i], who: '我' }, { cls: 'you', score: other[i], who: oname }])}</div>
      <div class="vm-ends small muted"><span>${esc(l)}</span><span>${esc(r)}</span></div>
    </div>`).join('');
  app.innerHTML = `${top}
    <div class="card vm-map" style="gap:12px">
      <div class="bold" style="font-size:18px">我們的價值觀地圖</div>
      <div class="vm-legend small"><span class="vm-dot me"></span>我<span class="vm-dot you"></span>${esc(oname)}</div>
      <div class="vm-bird">🐤 ${esc(valuesSummary(rows))}</div>
    </div>
    ${rows.map((x) => `<div class="card vm-dimcard">${valuesBar(x.dim, [{ cls: 'me', score: x.me, who: '我' }, { cls: 'you', score: x.other, who: oname }], x.level)}</div>`).join('')}
    ${talkHtml ? `<div class="card" style="gap:10px"><div class="bold">差最多的，一起聊聊</div>${talkHtml}</div>` : ''}
    <details class="card vm-detail"><summary class="bold">看每一題的答案</summary>${detail}</details>
    <button class="btn secondary" id="vm-img">存成圖片</button>
    <div class="small muted" style="text-align:center">沒有誰對誰錯，不一樣的地方，就是最值得聊的地方。</div>`;
  app.querySelectorAll('[data-talk]').forEach((el) => el.addEventListener(el.tagName === 'DETAILS' ? 'toggle' : 'click', () => {
    if (el.tagName !== 'DETAILS' || el.open) track('values_talk', { dim: el.dataset.talk });
  }));
  const imgBtn = document.getElementById('vm-img');
  imgBtn.addEventListener('click', () => withBusy(imgBtn, '準備中…', async () => {
    const blob = await valuesImage(rows, oname);
    if (!blob) { toast('圖片做不出來，請稍後再試一次'); return; }
    const file = new File([blob], `jiujiu-values-${today()}.png`, { type: 'image/png' });
    track('values_image');
    if (IN_APP) { await showLongPressSave(blob); return; }
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('圖片已存好');
  }));
}

// 存成圖片：沿用回憶小卡的紙張和頁尾（方形 1080）
async function valuesImage(rows, oname) {
  // 直式（1080×1680）：每個面向一張白色小卡，兩端的字放在軸下面（Jasmine 10/11 選 A：方形太擠）
  const W = 1080; const H = 1680;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const myName = (isPartner() ? CloudDB.partnerInfo().name : NAMES.me) || '我';
  await ensureFonts(`我們的價值觀地圖${myName}${oname}${rows.map((r) => r.dim.name + r.dim.left + r.dim.right + r.level.label).join('')}Values啾啾日記`);
  const b = paper(g, W, H);
  const x = b.x + 56; const cw = b.w - 112;
  footer(g, W, H);
  let y = b.y + 96;
  kicker(g, x, y, 'Values', '價值觀地圖');
  y += 72;
  g.fillStyle = CARD_INK; g.font = `900 54px ${SERIF}`; g.fillText('我們的價值觀地圖', x, y);
  y += 54;
  const dot = (cx, cy, col) => { g.beginPath(); g.arc(cx, cy, 14, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.lineWidth = 4; g.strokeStyle = '#FFFFFF'; g.stroke(); };
  const ME = CARD_ACCENT; const YOU = '#3E4C8A';
  g.font = `500 28px ${SERIF}`;
  dot(x + 12, y - 9, ME); g.fillStyle = CARD_MUTED; g.fillText(myName, x + 34, y);
  const nx = x + 34 + g.measureText(myName).width + 36;
  dot(nx + 12, y - 9, YOU); g.fillStyle = CARD_MUTED; g.fillText(oname, nx + 34, y);
  y += 34;
  const TAG = { same: ['#E3F0E6', '#25502F'], bit: ['#FBF0D9', '#5E420E'], far: ['#FBE9E7', '#6B2A20'] };
  const ch = 150; const gap = 16;
  for (const r of rows) {
    // 白色小卡
    g.save(); g.shadowColor = 'rgba(90,64,40,0.10)'; g.shadowBlur = 10; g.shadowOffsetY = 2;
    g.fillStyle = '#FFFFFF'; roundRect(g, x, y, cw, ch, 22); g.fill(); g.restore();
    const ix = x + 30; const iw = cw - 60;
    g.textAlign = 'left'; g.fillStyle = CARD_INK; g.font = `700 32px ${SERIF}`; g.fillText(r.dim.name, ix, y + 50);
    // 很像／不一樣的小標籤
    g.font = `600 24px ${SERIF}`;
    const tw = g.measureText(r.level.label).width + 32;
    g.fillStyle = TAG[r.level.key][0]; roundRect(g, ix + iw - tw, y + 22, tw, 40, 20); g.fill();
    g.fillStyle = TAG[r.level.key][1]; g.textAlign = 'center'; g.fillText(r.level.label, ix + iw - tw / 2, y + 50);
    const tx = ix + 14; const tw2 = iw - 28; const ty = y + 88;
    g.fillStyle = '#F1E9E1'; roundRect(g, tx, ty - 5, tw2, 10, 5); g.fill();
    const close = Math.abs(r.me - r.other) < 0.4 ? 12 : 0;
    dot(tx + tw2 * ((r.me - 1) / 4) - close, ty, ME); dot(tx + tw2 * ((r.other - 1) / 4) + close, ty, YOU);
    g.fillStyle = CARD_MUTED; g.font = `400 23px ${SERIF}`;
    g.textAlign = 'left'; g.fillText(r.dim.left, ix, y + 130);
    g.textAlign = 'right'; g.fillText(r.dim.right, ix + iw, y + 130);
    g.textAlign = 'left';
    y += ch + gap;
  }
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}
