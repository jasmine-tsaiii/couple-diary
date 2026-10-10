// 啾啾日記 js/app/daily.js：每天一題（2026-09-30）
// 每天一題開放式問題，兩人各自寫，不猜對方、不計分；兩人都寫完才一起揭曉。對方寫了你還沒寫的舊題目可以補寫。
// 題庫在這裡，id d001… 固定不能改，只能往後加。伺服器存 q_id，以存下來的為準。

const DAILY_QS = [
  ['d001', '今天最想吃的一樣東西？'],
  ['d002', '最近一次笑到停不下來是因為什麼？'],
  ['d003', '今天有沒有一個小瞬間讓你心情變好？'],
  ['d004', '你最近在追的劇、節目或 YouTuber？'],
  ['d005', '如果今天可以請一天假，你會做什麼？'],
  ['d006', '你小時候最愛的零食是什麼？'],
  ['d007', '最近手機相簿裡最新的一張照片是什麼？'],
  ['d008', '你現在最想去的一家餐廳？'],
  ['d009', '今天穿的衣服裡，你最喜歡哪一件？'],
  ['d010', '你覺得自己最好笑的一個小習慣？'],
  ['d011', '最近聽最多次的一首歌？'],
  ['d012', '有什麼東西是你一買再買的？'],
  ['d013', '你的完美早餐長什麼樣子？'],
  ['d014', '最近一次覺得自己很厲害是什麼時候？'],
  ['d015', '你最常用的一個貼圖是哪一個？'],
  ['d016', '小時候被罵最多次的是什麼事？'],
  ['d017', '如果你開一家店，會賣什麼？'],
  ['d018', '你最喜歡的季節和原因？'],
  ['d019', '最近一個讓你很療癒的東西？'],
  ['d020', '你覺得我們第一次見面時你在想什麼？'],
  ['d021', '有什麼事情是你做起來會忘記時間的？'],
  ['d022', '如果可以換一個名字，你想叫什麼？'],
  ['d023', '你最喜歡的一種天氣？'],
  ['d024', '最近一次覺得「好想睡」是在做什麼？'],
  ['d025', '你最拿手的一道菜或一種飲料？'],
  ['d026', '你心中第一名的甜點？'],
  ['d027', '最近在煩惱的一件小事？'],
  ['d028', '你覺得自己最像哪一種鳥？'],
  ['d029', '如果中午可以瞬間移動去吃一餐，想去哪？'],
  ['d030', '最近一個讓你覺得「好可愛」的東西？'],
  ['d031', '你一個人的時候最喜歡做什麼？'],
  ['d032', '學生時期最難忘的一堂課或一位老師？'],
  ['d033', '最近一次被陌生人暖到是什麼事？'],
  ['d034', '你最想學會的一項技能？'],
  ['d035', '你覺得今天的自己幾分？為什麼？'],
  ['d036', '如果我們一起養一隻寵物，要取什麼名字？'],
  ['d037', '最喜歡我們一起做過的哪件小事？'],
  ['d038', '你最怕的一種蟲或動物？'],
  ['d039', '手機桌布現在是什麼？'],
  ['d040', '最近一次為自己買的小禮物？'],
  ['d041', '你心目中最好吃的泡麵口味？'],
  ['d042', '你現在的煩惱，一年後還會在意嗎？'],
  ['d043', '小時候的夢想職業是什麼？現在還想嗎？'],
  ['d044', '你睡前最後做的一件事通常是什麼？'],
  ['d045', '最近一次哭是因為什麼？（不想說可以寫「秘密」）'],
  ['d046', '如果今天是世界末日前一天，晚餐想吃什麼？'],
  ['d047', '你覺得我哪個表情最好笑？'],
  ['d048', '最想跟我一起去體驗的一件事？'],
  ['d049', '你最喜歡家裡（或房間）的哪個角落？'],
  ['d050', '一句最近很有感的話？'],
  ['d051', '你的壓力解方是什麼？'],
  ['d052', '最近一次做了很勇敢的事？'],
  ['d053', '如果可以跟任何人吃一頓飯，你想選誰？'],
  ['d054', '你覺得自己最被低估的優點？'],
  ['d055', '最近讓你生氣的一件小事？（可以只寫一半）'],
  ['d056', '你最常點的外送？'],
  ['d057', '如果我們去露營，你負責什麼？'],
  ['d058', '你最喜歡的一部動畫或卡通？'],
  ['d059', '你覺得最浪漫的一件小事是什麼？'],
  ['d060', '今天最想對我說的一句話？'],
  ['d061', '你最近有沒有很想買但還在猶豫的東西？'],
  ['d062', '你覺得我們最像哪一對卡通角色？'],
  ['d063', '最近一次覺得時間過超快是在做什麼？'],
  ['d064', '你最喜歡的一個節日？'],
  ['d065', '你有什麼奇怪但很準的直覺？'],
  ['d066', '小時候住的地方，你最想念什麼？'],
  ['d067', '你最不能接受的食物？'],
  ['d068', '最近一次覺得「還好有你」是什麼時候？'],
  ['d069', '如果明天醒來變成我，你第一件事做什麼？'],
  ['d070', '你的理想旅行是計畫派還是隨興派？'],
  ['d071', '最近一次運動是什麼時候、做什麼？'],
  ['d072', '你覺得自己幾歲的時候最快樂？'],
  ['d073', '最近很想念的一個人？'],
  ['d074', '你覺得我們的共同點是什麼？'],
  ['d075', '如果只能留一個 App，你會留哪一個？'],
  ['d076', '一個你很喜歡的氣味？'],
  ['d077', '最近學到的一個冷知識？'],
  ['d078', '你理想中的下雨天怎麼過？'],
  ['d079', '你最想重看一次的電影？'],
  ['d080', '最近一個讓你期待的計畫？'],
  ['d081', '如果可以回到過去一天，你想回哪一天？'],
  ['d082', '你覺得我最近最辛苦的是什麼？'],
  ['d083', '什麼事會讓你瞬間心情變差？'],
  ['d084', '你最喜歡的一件衣服是哪一件？為什麼？'],
  ['d085', '最近一次覺得自己長大了是什麼時候？'],
  ['d086', '你覺得完美的約會要有哪三樣東西？'],
  ['d087', '你有沒有一直收著捨不得丟的東西？'],
  ['d088', '你最想擁有的一個超能力？會拿來做什麼？'],
  ['d089', '最近有什麼新發現的好吃小店？'],
  ['d090', '你心情好的時候會做什麼小動作？'],
  ['d091', '如果我們一起拍一支影片，主題是什麼？'],
  ['d092', '你最喜歡的一種花或植物？'],
  ['d093', '你有什麼一定要遵守的小規矩？'],
  ['d094', '最近一次想要大聲唱歌是什麼歌？'],
  ['d095', '你覺得十年後的自己會在做什麼？'],
  ['d096', '小時候最想要但沒得到的玩具？'],
  ['d097', '你最喜歡我穿哪一種風格？'],
  ['d098', '如果有一整個月的假，你會怎麼安排？'],
  ['d099', '你最近對自己最滿意的一件事？'],
  ['d100', '你覺得最適合我們的一個 emoji？'],
  ['d101', '今天最累的時刻是什麼時候？'],
  ['d102', '你最想跟我一起完成的一個小挑戰？'],
  ['d103', '你小時候的綽號？'],
  ['d104', '最近一次被逗笑的訊息或貼文？'],
  ['d105', '你覺得自己是早鳥還是夜貓？'],
  ['d106', '最近哪一餐吃得最滿足？'],
  ['d107', '你理想中的星期天晚上？'],
  ['d108', '你最想對一年前的我們說什麼？'],
  ['d109', '如果我們有一首主題曲，會是哪一首？'],
  ['d110', '你覺得自己最近哪裡變了？'],
  ['d111', '最想再去一次的地方？'],
  ['d112', '你現在最想被抱一下嗎？為什麼？'],
  ['d113', '如果可以取消一個世界上的東西，你想取消什麼？'],
  ['d114', '你覺得今天的天氣像什麼心情？'],
  ['d115', '最近一次覺得我很可愛是什麼時候？'],
  ['d116', '你最常在哪裡發呆？'],
  ['d117', '你人生中最幸運的一件事？'],
  ['d118', '如果寫一本關於我們的書，書名叫什麼？'],
  ['d119', '今天有什麼想謝謝我的嗎？'],
  ['d120', '明天最想做的一件事？']
];
const DAILY_Q = Object.fromEntries(DAILY_QS);
const dailyText = (id) => DAILY_Q[id] || '（這一題的題目找不到了）';

// 同一對情侶同一天拿到同一題：用兩人的 id 當種子把題庫固定洗牌，第 n 天用第 n 題；用完再換一種洗法
function dailyHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function dailyQId(pair, n) {
  const len = DAILY_QS.length;
  const cycle = Math.floor(n / len);
  let seed = dailyHash(`${pair}:${cycle}`);
  const rand = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ids = DAILY_QS.map(([id]) => id);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return ids[((n % len) + len) % len];
}

// 今天的狀態（給「一起」那一列和今天頁的提示卡用）
async function dailyStatus() {
  if (!usingCloud() || CloudDB.isAnonymous() && !isPartner()) return null;
  let st;
  try { st = await CloudDB.dailyState(); } catch (e) { return null; }
  if (!st || !st.ok || !st.pair) return st && st.ok ? { st, noPair: true } : null;
  const other = st.members.find((m) => m !== st.me);
  const qId = st.q_id || dailyQId(st.pair, st.n);
  return { st, qId, text: dailyText(qId), mine: !!st.mine, otherDone: !!st.other_done, revealed: !!st.revealed, otherName: (st.names && st.names[other]) || otherName() };
}

// 今天頁的提示卡：今天自己還沒寫才出現，排在所有提示卡最後；按叉叉今天不再出現
function dailyTipHtml(d) {
  if (!d || d.noPair || d.mine) return '';
  try { if (localStorage.getItem('dailyTipHidden') === d.st.today) return ''; } catch (e) { /* 略過 */ }
  return `<div class="card has-x" id="daily-tip" style="background:var(--happy-bg);border-color:transparent;gap:6px">
    <button class="card-x" id="daily-tip-x" aria-label="今天先不要" style="color:var(--happy-dark)">${ICON.x}</button>
    <div class="small bold" style="color:var(--happy-dark)">今天這一題${d.otherDone ? `・${esc(d.otherName)}寫好了` : ''}</div>
    <div class="bold">${esc(d.text)}</div>
    <a class="btn small" href="#/daily" style="align-self:flex-start">去寫</a>
  </div>`;
}
function bindDailyTip(d) {
  const x = document.getElementById('daily-tip-x');
  if (x) x.addEventListener('click', (e) => {
    e.preventDefault();
    try { localStorage.setItem('dailyTipHidden', d.st.today); } catch (err) { /* 略過 */ }
    document.getElementById('daily-tip').remove();
  });
}

// 「一起」分頁的那一列
function dailyRowHtml(d) {
  let sub = '每天一題，兩人都寫完才一起揭曉';
  let badge = '';
  if (d && !d.noPair) {
    const t = d.text.length > 14 ? `${d.text.slice(0, 14)}…` : d.text;
    sub = `今天：${esc(t)}`;
    if (!d.mine) badge = d.otherDone ? `${esc(d.otherName)}寫好了` : '還沒寫';
  }
  return navRow({ href: '#/daily', id: 'row-daily', icon: TILE_ICON.daily, title: '每天一題', sub, badge });
}

const dailyDraftKey = (pair, day) => `dailyDraft:${pair}:${day}`;
const dailyDay = (day) => shortDate(day);

async function viewDaily() {
  app.className = 'theme-happy';
  const top = `<div class="topbar"><a class="icon-btn" href="#/together" aria-label="返回" data-back>${ICON.back}</a><h1>每天一題</h1></div>`;
  const intro = `<div class="card" style="gap:6px">
      <div class="bold">每天一題，慢慢認識對方</div>
      <div class="small muted">每天一個小問題，兩個人各自寫，沒有標準答案，也不用猜。兩人都寫完才會一起揭曉，揭曉前看不到對方寫什麼。</div>
    </div>`;
  const quizRow = async () => {
    const q = usingCloud() ? await quizStatus() : null;
    return q ? `<div class="section-title">每 3 個月</div><div class="card nav-list">${navRow({ href: '#/quiz', id: 'row-quiz', icon: TILE_ICON.quiz, title: '重新認識你', sub: esc(q.sub || ''), badge: q.label })}</div>` : '';
  };
  if (!usingCloud() || CloudDB.isAnonymous() && !isPartner()) {
    app.innerHTML = `${top}${intro}<div class="card" style="gap:8px"><div class="muted">註冊並邀請另一半加入之後，就能一起寫。</div>
      <a class="btn small" href="#/signup" style="align-self:flex-start">註冊或登入</a></div>`;
    return;
  }
  let st;
  try { st = await CloudDB.dailyState(); } catch (e) { st = { ok: false }; }
  if (!st || !st.ok) {
    app.innerHTML = `${top}${intro}<div class="card"><div class="muted">${st && st.missing ? '這個功能還在準備中，過幾天再來看看。' : '現在讀不到資料，請稍後再試一次。'}</div></div>`;
    return;
  }
  if (!st.pair) {
    app.innerHTML = `${top}${intro}<div class="card" style="gap:8px"><div class="muted">另一半加入之後就能一起寫。</div>
      ${isPartner() ? '' : '<a class="btn small" href="#/settings/share" style="align-self:flex-start">去邀請另一半</a>'}</div>${await quizRow()}`;
    return;
  }
  track('daily_open');
  const me = st.me;
  const other = st.members.find((m) => m !== me);
  const oname = (st.names && st.names[other]) || otherName();
  const qId = st.q_id || dailyQId(st.pair, st.n);
  let draft = '';
  try { draft = localStorage.getItem(dailyDraftKey(st.pair, st.today)) || ''; } catch (e) { draft = ''; }
  const both = (mineText, otherText) => `<div class="quiz-person"><div class="small bold">你</div><div class="prose">${esc(mineText)}</div></div>
      <div class="quiz-person"><div class="small bold">${esc(oname)}</div><div class="prose">${esc(otherText)}</div></div>`;
  const todayCard = st.revealed
    ? `<div class="card daily-today" style="gap:10px">
        <div class="small muted">今天・${dailyDay(st.today)}・揭曉了</div>
        <div class="quiz-qtext">${esc(dailyText(qId))}</div>
        ${both(st.mine, st.other)}
      </div>`
    : `<div class="card daily-today" style="gap:10px">
        <div class="small muted">今天・${dailyDay(st.today)}</div>
        <label class="quiz-qtext" for="d-today">${esc(dailyText(qId))}</label>
        <textarea class="textarea" id="d-today" maxlength="300" rows="4" placeholder="照你現在想的寫就好">${esc(st.mine || draft)}</textarea>
        <div class="small daily-state">${st.mine ? `你寫好了，等${esc(oname)}寫完就一起揭曉。揭曉前你還可以改。` : st.other_done ? `${esc(oname)}寫好了，換你。你寫完就一起揭曉。` : `兩人都寫完才會一起揭曉，揭曉前看不到${esc(oname)}寫什麼。`}</div>
        <button class="btn" id="d-send" data-day="${esc(st.today)}" data-q="${esc(qId)}">${st.mine ? '更新答案' : '送出'}</button>
        ${st.mine && !st.other_done ? nudgeBtnHtml('daily', '#/daily', oname, `邀請${oname}來寫`) : ''}
      </div>`;
  const pend = st.pending || [];
  const pendHtml = pend.length ? `<div class="section-title">等你寫</div>
    <div class="small muted" style="margin-top:-6px">${esc(oname)}寫好了、你還沒寫的題目，寫完就一起揭曉。</div>
    ${pend.slice(0, 5).map((p) => `<div class="card" style="gap:8px" data-late-card="${esc(p.day)}">
      <div class="small muted">${dailyDay(p.day)}</div>
      <label class="bold" for="d-late-${esc(p.day)}">${esc(dailyText(p.q_id))}</label>
      <textarea class="textarea" id="d-late-${esc(p.day)}" maxlength="300" rows="3" placeholder="你的答案"></textarea>
      <button class="btn small" data-late="${esc(p.day)}" data-q="${esc(p.q_id)}" style="align-self:flex-start">送出</button>
    </div>`).join('')}
    ${pend.length > 5 ? `<div class="small muted" style="text-align:center">還有 ${pend.length - 5} 題，寫完上面的就會出現</div>` : ''}` : '';
  app.innerHTML = `${top}
    ${todayCard}
    ${pendHtml}
    <div class="small muted" style="text-align:center">這個月一起寫了 ${st.month_days || 0} 天</div>
    <div id="d-history"></div>
    ${await quizRow()}`;
  bindNudgeBtns();

  const save = async (btn, day, q, el, late) => {
    const body = el.value.trim();
    if (!body) { toast('先寫下你的答案'); el.focus(); return; }
    await withBusy(btn, '送出中…', async () => {
      let res;
      try { res = await CloudDB.dailySave(day, q, body); } catch (e) { toast(e.message || '送不出去，請稍後再試一次'); return; }
      try { localStorage.removeItem(dailyDraftKey(st.pair, day)); } catch (e) { /* 略過 */ }
      track('daily_submit', { late: !!late });
      if (res && res.revealed) { track('daily_reveal'); toast('揭曉了！'); } else toast(`送出了，等${oname}寫完就一起揭曉`);
      await viewDaily();
    });
  };
  const ta = document.getElementById('d-today');
  if (ta) ta.addEventListener('input', () => { try { localStorage.setItem(dailyDraftKey(st.pair, st.today), ta.value); } catch (e) { /* 略過 */ } });
  const send = document.getElementById('d-send');
  if (send) send.addEventListener('click', () => save(send, send.dataset.day, send.dataset.q, ta, false));
  app.querySelectorAll('[data-late]').forEach((b) => b.addEventListener('click', () => save(b, b.dataset.late, b.dataset.q, document.getElementById(`d-late-${b.dataset.late}`), true)));

  // 以前的題目：兩人都寫完的，由新到舊，一次 20 筆
  const box = document.getElementById('d-history');
  let before = null;
  let opened = false;
  const loadMore = async () => {
    let rows = [];
    try { rows = await CloudDB.dailyHistory(before, 20); } catch (e) { rows = []; }
    if (!before && !rows.length) return;
    if (!before) box.innerHTML = '<div class="section-title">以前的題目</div><div class="list" id="d-hist-list"></div>';
    const list = document.getElementById('d-hist-list');
    for (const r of rows) {
      const d = document.createElement('details');
      d.className = 'card daily-past';
      d.innerHTML = `<summary><span class="small muted">${dailyDay(r.day)}</span><span class="bold">${esc(dailyText(r.q_id))}</span></summary>
        <div class="daily-past-body">${both((r.answers || {})[me] || '', (r.answers || {})[other] || '')}</div>`;
      d.addEventListener('toggle', () => { if (d.open && !opened) { opened = true; track('daily_history_open'); } });
      list.appendChild(d);
    }
    document.getElementById('d-more')?.remove();
    if (rows.length === 20) {
      before = rows[rows.length - 1].day;
      box.insertAdjacentHTML('beforeend', '<button class="btn small secondary" id="d-more" style="display:block;margin:10px auto 0">再看更早的</button>');
      document.getElementById('d-more').addEventListener('click', loadMore);
    }
  };
  await loadMore();
}
