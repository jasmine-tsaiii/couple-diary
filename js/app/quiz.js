// 啾啾日記 js/app/quiz.js：重新認識你（每 3 個月一回的情侶問答）
// 兩人各自作答、可以猜對方怎麼答；兩人都交卷才揭曉；揭曉後 7 天回味期，之後答案在伺服器端封存。
// 下一回兩人都交卷後，上一回的答案會一起打開，並排「上次｜這次｜對方猜」。
// 入口位置還沒定（等介面整理），目前從 #/quiz 或通知進來。

// 固定題：每一回都一樣，才看得出變化（id 不能改，改了就對不起來）
// 2026-09-30 Jasmine：一回 14 題太多，改成 8 題 = 5 固定 + 3 變動；c2/c4/c6/c7/c9 移到變動題庫（id 不變，舊答案不受影響）
const QUIZ_CORE = [
  ['c1', '最近讓你最開心的一件小事是什麼？'],
  ['c3', '最近壓力最大的來源是什麼？'],
  ['c5', '你希望我多做一點的一件事？'],
  ['c8', '你覺得一年後的我們會是什麼樣子？'],
  ['c10', '用三個詞形容現在的你自己。'],
];
// 每一回再從這裡挑幾題沒問過的
const QUIZ_POOL = [
  ['c2', '現在最想跟我一起完成的一件事？'],
  ['c4', '你覺得我們最近相處得最好的地方是？'],
  ['c6', '如果有一整天完全自由，你會怎麼過？'],
  ['c7', '你現在最珍惜的是什麼？'],
  ['c9', '最近最常掛在心上的一個心願？'],
  ['p01', '最近一次被我感動是什麼時候？'],
  ['p02', '小時候最想成為什麼樣的人？'],
  ['p03', '覺得被愛的時候，通常是因為對方做了什麼？'],
  ['p04', '最想跟我一起去的地方？'],
  ['p05', '有點不開心的時候，你最希望我怎麼做？'],
  ['p06', '錢要怎麼用，你會覺得比較安心？'],
  ['p07', '最近學會或想學的一件事？'],
  ['p08', '你心目中理想的週末早晨？'],
  ['p09', '有什麼一直想跟我說、但還沒說的話？'],
  ['p10', '你覺得我最近有什麼改變？'],
  ['p11', '哪一首歌最像現在的你？'],
  ['p12', '最近最想謝謝自己的一件事？'],
  ['p13', '如果可以改掉一個習慣，你會改哪一個？'],
  ['p14', '你心中的「家」是什麼樣子？'],
  ['p15', '很累的時候，你希望有人怎麼陪你？'],
  ['p16', '最喜歡我們之間的哪一個小習慣？'],
  ['p17', '五年後你想住在哪裡？'],
  ['p18', '最近最常吃的一樣東西？'],
  ['p19', '哪一件事讓你覺得「這個人懂我」？'],
  ['p20', '對你來說最放鬆的時刻是？'],
  ['p21', '想怎麼過下一個生日？'],
  ['p22', '如果我們是一組動物，會是什麼動物？'],
  ['p23', '如果明天放假一天，你想做什麼？'],
  ['p24', '最想被怎麼稱讚？'],
  ['p25', '還想跟我一起嘗試什麼新東西？'],
  ['p26', '最近一次大笑是因為什麼？'],
  ['p27', '理想中的老後生活是什麼樣子？'],
  ['p28', '最近最欣賞我的一個地方？'],
  ['p29', '現在最想對半年前的自己說什麼？'],
  ['p30', '最近一個讓你覺得「好想分享給我」的瞬間？'],
];
const QUIZ_NEW_PER_ROUND = 3;
const QUIZ_OPEN_DAYS = 7;

function quizPickQuestions(used) {
  const usedSet = new Set(used || []);
  let pool = QUIZ_POOL.filter(([id]) => !usedSet.has(id));
  if (pool.length < QUIZ_NEW_PER_ROUND) pool = QUIZ_POOL.slice();
  const picked = pool.map((q) => [Math.random(), q]).sort((a, b) => a[0] - b[0]).slice(0, QUIZ_NEW_PER_ROUND).map((x) => x[1]);
  return [...QUIZ_CORE.map(([id, text]) => ({ id, text, core: true })), ...picked.map(([id, text]) => ({ id, text, core: false }))];
}

const quizDay = (ts) => (Date.parse(ts) ? shortDate(dateOf(Date.parse(ts))) : '');
const quizSame = (a, b) => (a || '').trim().replace(/\s+/g, ' ') === (b || '').trim().replace(/\s+/g, ' ');

function quizTop(title = '重新認識你') {
  return `<div class="topbar">
      <a class="icon-btn" href="#/" aria-label="返回" data-back>${ICON.back}</a>
      <h1>${esc(title)}</h1>
    </div>`;
}
function quizIntroCard() {
  return `<div class="card" style="gap:6px">
      <div class="bold">每 3 個月，重新認識一次</div>
      <div class="small muted">兩個人各自回答同一組問題，還可以猜猜對方會怎麼答。兩人都交卷才一起揭曉。</div>
      <div class="small muted">揭曉後有 ${QUIZ_OPEN_DAYS} 天可以慢慢看，之後答案會封存成時光膠囊，連你自己都看不到。下一回兩人都交卷，才會跟這次的答案並排打開，看看彼此變了多少。</div>
    </div>`;
}
function quizHistoryHtml(st) {
  const done = (st.history || []).filter((h) => h.revealed_at);
  if (!done.length) return '';
  const total = done.reduce((s, h) => s + (h.hits || 0), 0);
  return `<div class="section-title">玩過的回合</div>
    <div class="card" style="gap:6px">
      ${done.map((h, i) => `<div class="row between small"><span>第 ${done.length - i} 回・${quizDay(h.started_at)}</span><span class="muted">猜中 ${h.hits || 0} 題</span></div>`).join('')}
      ${total ? `<div class="small" style="color:var(--happy-dark)">一共集了 ${total} 枚郵戳 📮</div>` : ''}
    </div>`;
}

async function viewQuiz() {
  app.className = 'theme-happy';
  let st;
  try { st = await CloudDB.quizState(); } catch (e) { st = { ok: false, error: e.message }; }
  if (!st || !st.ok) {
    app.innerHTML = `${quizTop()}${quizIntroCard()}
      <div class="card"><div class="muted">${st && st.missing ? '這個功能還在準備中，過幾天再來看看。' : '現在讀不到資料，請稍後再試一次。'}</div></div>`;
    return;
  }
  const me = st.me;
  const other = (st.members || []).find((u) => u !== me);
  const otherName = (other && st.names && st.names[other]) || (isPartner() ? ownerName() : partnerName());
  const r = st.round;

  // 還沒有另一半
  if (!other) {
    app.innerHTML = `${quizTop()}${quizIntroCard()}
      <div class="card" style="gap:8px"><div class="muted">另一半加入之後就能一起玩。</div>
      ${isPartner() ? '' : '<a class="btn small" href="#/settings" style="align-self:flex-start">去邀請另一半</a>'}</div>`;
    return;
  }
  // 可以開始新的一回
  if (st.can_start) {
    app.innerHTML = `${quizTop()}${quizIntroCard()}
      <div class="card" style="gap:8px">
        <div class="bold">${r ? '新的一回開放了' : '第一次玩'}</div>
        <div class="small muted">8 題，大約 5 分鐘，一次一題。可以先寫一部分，之後再回來寫完。</div>
        <button class="btn" id="q-start">開始這一回</button>
      </div>
      ${quizHistoryHtml(st)}`;
    const btn = document.getElementById('q-start');
    btn.addEventListener('click', () => withBusy(btn, '準備題目中…', async () => {
      try { await CloudDB.quizStart(quizPickQuestions(st.used)); } catch (e) { toast(e.message || '開不了新的一回，請稍後再試'); return; }
      track('quiz_start');
      await viewQuiz();
    }));
    return;
  }
  // 作答中
  if (r && !r.revealed_at) {
    const mine = r.mine || {};
    const otherDone = !!(r.submitted && r.submitted[other]);
    if (mine.submitted_at) {
      app.innerHTML = `${quizTop(`第 ${r.no} 回`)}
        <div class="card" style="gap:6px;text-align:center;align-items:center">
          <div style="font-size:36px">📮</div>
          <div class="bold">你交卷了</div>
          <div class="small muted">等${esc(otherName)}交卷後，就會一起揭曉。${esc(otherName)}那邊只看得到「你寫好了」，看不到內容。</div>
        </div>
        <div class="section-title">你這次的答案</div>
        ${r.questions.map((q, i) => `<div class="card" style="gap:4px"><div class="small muted">${i + 1}. ${esc(q.text)}</div><div>${esc((mine.answers || {})[q.id] || '')}</div></div>`).join('')}`;
      return;
    }
    viewQuizAnswer(r, mine, otherName, otherDone);
    return;
  }
  // 揭曉（回味期內）
  if (r && st.reveal) {
    viewQuizReveal(st, r, me, other, otherName);
    return;
  }
  // 已封存，還沒到下一回
  app.innerHTML = `${quizTop()}
    <div class="card" style="gap:6px;text-align:center;align-items:center">
      <div style="font-size:36px">🫙</div>
      <div class="bold">第 ${r ? r.no : ''} 回已經封存成時光膠囊</div>
      <div class="small muted">${st.next_at ? `${quizDay(st.next_at)} 開放下一回。` : ''}下一回兩人都交卷，才會跟這次的答案並排打開。</div>
    </div>
    ${quizHistoryHtml(st)}`;
}

// 作答：一題一頁，頂部進度條，最後總覽再交卷；作答時藏起底部選單，內容不會被 ＋ 蓋住
function viewQuizAnswer(r, mine, otherName, otherDone) {
  renderTabbar(null);
  document.body.classList.add('quiz-focus');
  const qs = r.questions;
  const n = qs.length;
  const ans = { ...(mine.answers || {}) };
  const gue = { ...(mine.guesses || {}) };
  const stepKey = `quizStep:${r.id}`;
  let step = -1;
  try { step = Number(localStorage.getItem(stepKey)); } catch (e) { step = -1; }
  if (!(step >= 0 && step <= n)) { step = qs.findIndex((q) => !(ans[q.id] || '').trim()); if (step < 0) step = n; }
  const openGuess = new Set(qs.filter((q) => (gue[q.id] || '').trim()).map((q) => q.id));

  let timer = null;
  let saving = Promise.resolve();
  const saveDraft = () => { saving = saving.then(() => CloudDB.quizSave(r.id, ans, gue, false)).then(() => { const el = document.getElementById('q-saved'); if (el) el.textContent = '已自動儲存'; }).catch(() => {}); return saving; };
  const flush = () => { if (timer) { clearTimeout(timer); timer = null; saveDraft(); } };
  const schedule = () => { clearTimeout(timer); timer = setTimeout(() => { timer = null; saveDraft(); }, 1200); };
  // 離開這頁前把還沒存的存起來（會自動存，所以不用問要不要離開）
  formGuard = { dirty: () => { flush(); document.body.classList.remove('quiz-focus'); return false; }, leave: () => {} };

  const goStep = (i) => {
    flush();
    step = i;
    try { localStorage.setItem(stepKey, String(i)); } catch (e) { /* 略過 */ }
    render();
    window.scrollTo(0, 0);
  };
  const head = () => {
    const shown = Math.min(step + 1, n);
    return `${quizTop(`第 ${r.no} 回`)}
      <div class="quiz-progress" aria-label="進度 ${shown} / ${n}">
        <div class="progress" style="height:8px;flex:1"><div style="width:${(shown / n) * 100}%"></div></div>
        <span class="small bold">${step >= n ? '總覽' : `${shown} / ${n}`}</span>
      </div>`;
  };
  const render = () => {
    if (step >= n) return renderSummary();
    const q = qs[step];
    const g = openGuess.has(q.id);
    app.innerHTML = `${head()}
      ${step === 0 ? `<div class="small quiz-hint">${otherDone ? `${esc(otherName)}已經寫好了，換你囉。` : ''}照現在的心情寫就好，沒有標準答案；離開會自動存。</div>` : ''}
      <div class="card quiz-q" style="gap:12px">
        <label class="quiz-qtext" for="qa-${esc(q.id)}">${esc(q.text)}</label>
        <textarea class="textarea" id="qa-${esc(q.id)}" data-qa="${esc(q.id)}" rows="4" maxlength="300" placeholder="你的答案">${esc(ans[q.id] || '')}</textarea>
        ${g ? `<div class="field"><label class="label" for="qg-${esc(q.id)}">猜猜${esc(otherName)}會怎麼答</label>
          <textarea class="textarea quiz-guess" id="qg-${esc(q.id)}" data-qg="${esc(q.id)}" rows="2" maxlength="300" placeholder="可以不填">${esc(gue[q.id] || '')}</textarea></div>`
    : `<button class="link-btn quiz-guess-open" id="q-guess-open" type="button">＋ 猜猜${esc(otherName)}會怎麼答（可以不填）</button>`}
      </div>
      <div class="small muted" id="q-saved" style="text-align:center"></div>
      <div class="quiz-nav">
        <button class="btn secondary" id="q-prev" ${step === 0 ? 'disabled' : ''}>上一題</button>
        <button class="btn" id="q-next">${step === n - 1 ? '看一下再交卷' : '下一題'}</button>
      </div>`;
    const ta = app.querySelector('[data-qa]');
    ta.addEventListener('input', () => { ans[q.id] = ta.value; schedule(); });
    const gg = app.querySelector('[data-qg]');
    if (gg) gg.addEventListener('input', () => { gue[q.id] = gg.value; schedule(); });
    const go = document.getElementById('q-guess-open');
    if (go) go.addEventListener('click', () => { openGuess.add(q.id); render(); const el = app.querySelector('[data-qg]'); if (el) el.focus(); });
    document.getElementById('q-prev').addEventListener('click', () => { if (step > 0) goStep(step - 1); });
    document.getElementById('q-next').addEventListener('click', () => goStep(step + 1));
  };
  const renderSummary = () => {
    const left = qs.filter((q) => !(ans[q.id] || '').trim()).length;
    app.innerHTML = `${head()}
      <div class="small quiz-hint">${left ? `還有 ${left} 題沒寫，點一下就能回去寫。` : '都寫好了。交卷後就不能改，想改的點一下回去改。'}</div>
      <div class="card nav-list">
        ${qs.map((q, i) => `<button class="quiz-sum-row" data-qgo="${i}" type="button">
          <span class="small muted">${i + 1}. ${esc(q.text)}</span>
          <span class="${(ans[q.id] || '').trim() ? '' : 'quiz-empty'}">${esc((ans[q.id] || '').trim() || '還沒寫')}</span>
          ${(gue[q.id] || '').trim() ? `<span class="small muted">猜${esc(otherName)}：${esc(gue[q.id])}</span>` : ''}
        </button>`).join('')}
      </div>
      <div class="small muted" id="q-saved" style="text-align:center"></div>
      <div class="quiz-nav">
        <button class="btn secondary" id="q-prev">上一題</button>
        <button class="btn" id="q-submit">交卷</button>
      </div>`;
    app.querySelectorAll('[data-qgo]').forEach((b) => b.addEventListener('click', () => goStep(Number(b.dataset.qgo))));
    document.getElementById('q-prev').addEventListener('click', () => goStep(n - 1));
    const sub = document.getElementById('q-submit');
    sub.addEventListener('click', () => withBusy(sub, '交卷中…', async () => {
      const i = qs.findIndex((q) => !(ans[q.id] || '').trim());
      if (i >= 0) { toast(`第 ${i + 1} 題還沒寫`); goStep(i); return; }
      if (!confirm('交卷後就不能改了，確定嗎？')) return;
      clearTimeout(timer); timer = null;
      await saving;
      let res;
      try { res = await CloudDB.quizSave(r.id, ans, gue, true); } catch (e) { toast(e.message || '交不出去，請稍後再試一次'); return; }
      formGuard = null;
      try { localStorage.removeItem(stepKey); } catch (e) { /* 略過 */ }
      document.body.classList.remove('quiz-focus');
      track('quiz_submit', { revealed: !!(res && res.revealed) });
      window.scrollTo(0, 0);
      renderTabbar('together');
      await viewQuiz();
    }));
  };
  render();
}

function viewQuizReveal(st, r, me, other, otherName) {
  const A = st.reveal.answers || {};
  const P = st.reveal.prev;
  const mineA = A[me] || { answers: {}, guesses: {}, hits: [] };
  const theirA = A[other] || { answers: {}, guesses: {}, hits: [] };
  const daysLeft = Math.max(1, Math.ceil((Date.parse(r.open_until) - Date.now()) / 86400000));
  const myName = st.names[me] || '你';
  const canRecord = !isPartner() || CloudDB.isBoundPartner();
  // 猜中：我判定對方猜「我」的答案（記在我的 hits）；對方判定我猜他的（記在他的 hits）
  const iGuessedRight = (theirA.hits || []).length;
  const theyGuessedRight = (mineA.hits || []).length;
  const block = (q, uid, who) => {
    const own = uid === me ? mineA : theirA;
    const guesser = uid === me ? theirA : mineA;
    const now = (own.answers || {})[q.id] || '';
    const before = P && P.answers && P.answers[uid] ? P.answers[uid][q.id] : undefined;
    const guess = (guesser.guesses || {})[q.id] || '';
    const hit = (own.hits || []).includes(q.id);
    return `<div class="quiz-person">
        <div class="small bold">${esc(who)}</div>
        ${before !== undefined ? `<div class="quiz-line"><span class="quiz-tag">上次</span><span class="muted">${esc(before)}</span></div>` : ''}
        <div class="quiz-line"><span class="quiz-tag now">這次</span><span>${esc(now)}</span>${before !== undefined ? `<span class="quiz-diff ${quizSame(before, now) ? '' : 'changed'}">${quizSame(before, now) ? '沒變' : '變了'}</span>` : ''}</div>
        ${guess ? `<div class="quiz-line"><span class="quiz-tag">${esc(uid === me ? otherName : myName)}猜</span><span>${esc(guess)}</span>
          ${uid === me ? `<button class="btn small ${hit ? '' : 'secondary'}" data-qhit="${esc(q.id)}" data-on="${hit ? 1 : 0}">${hit ? '猜中了 📮' : '猜中了嗎？'}</button>` : (hit ? '<span class="quiz-diff changed">猜中 📮</span>' : '')}</div>` : ''}
      </div>`;
  };
  app.innerHTML = `${quizTop(`第 ${r.no} 回揭曉`)}
    <div class="card" style="gap:4px;background:var(--happy-bg);border-color:transparent">
      <div class="bold" style="color:var(--happy-dark)">你猜中 ${iGuessedRight} 題、${esc(otherName)}猜中 ${theyGuessedRight} 題</div>
      <div class="small" style="color:var(--happy-dark)">對方猜你的答案，猜中了就幫他按「猜中了」，他會拿到一枚郵戳。</div>
      <div class="small" style="color:var(--happy-dark)">還可以看 ${daysLeft} 天，之後會封存成時光膠囊。${P ? '' : '這是第一回，下一回就能看到「上次的你」。'}</div>
    </div>
    ${r.questions.map((q, i) => `<div class="card" style="gap:8px">
        <div class="bold">${i + 1}. ${esc(q.text)}</div>
        ${block(q, me, '你')}
        ${block(q, other, otherName)}
        ${canRecord ? `<button class="btn small secondary" data-qrec="${esc(q.id)}" style="align-self:flex-start">記成美好時刻</button>` : ''}
      </div>`).join('')}
    ${quizHistoryHtml(st)}`;
  app.querySelectorAll('[data-qhit]').forEach((b) => b.addEventListener('click', () => withBusy(b, '…', async () => {
    const on = b.dataset.on !== '1';
    try { await CloudDB.quizMarkHit(r.id, b.dataset.qhit, on); } catch (e) { toast(e.message || '存不進去，請稍後再試'); return; }
    await viewQuiz();
  })));
  app.querySelectorAll('[data-qrec]').forEach((b) => b.addEventListener('click', () => {
    const q = r.questions.find((x) => x.id === b.dataset.qrec);
    const lines = [`${myName}：${(mineA.answers || {})[q.id] || ''}`, `${otherName}：${(theirA.answers || {})[q.id] || ''}`];
    formPrefill = { title: `重新認識你：${q.text}`.slice(0, LIMITS.title), description: lines.join('\n') };
    go('#/new/happy');
  }));
}
