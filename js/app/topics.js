// 啾啾日記 js/app/topics.js：主題題庫（2026-10-08）
// 挑一個主題深聊。每個主題先免費開前 5 題（Jasmine 10/8 決定），第 6 題以後上鎖，留「我有興趣」收集意願。
// 跟每天一題一樣：兩人各自寫，兩個人都寫了才一起揭曉，揭曉前看不到對方寫什麼，揭曉後不能改。
// 題目 id（money01…）固定不能改，只能往後加；伺服器存 q_id。題目來自行銷題庫（marketing/排程/情侶題庫.md）。

const TOPIC_FREE = 5;
const TOPIC_TOTAL = 30;
const TOPICS = [
  { key: 'money', icon: '💰', name: '金錢', qs: [
    '你是存錢派還是花錢派？',
    '最近一筆「花了但完全不後悔」的錢是什麼？',
    '約會的錢，你覺得怎麼分比較自在？',
    '多少錢以上的東西，你會想先跟對方討論？',
    '如果要一起存一筆錢，你想存來做什麼？',
  ] },
  { key: 'values', icon: '🧭', name: '價值觀', qs: [
    '什麼事情你覺得「這個不能妥協」？',
    '你覺得怎樣才算是「對一個人好」？',
    '工作和生活，你覺得怎樣的比例最剛好？',
    '你心中「很成功的人生」長什麼樣子？',
    '有什麼觀念是你長大後才改變的？',
  ] },
  { key: 'future', icon: '🌱', name: '未來', qs: [
    '五年後的今天，你希望我們在做什麼？',
    '你想住在城市、郊區，還是鄉下？',
    '老了以後，你想過什麼樣的日子？',
    '有沒有一個地方，你一定要跟我去一次？',
    '你覺得十年後的自己，會感謝現在的自己做了什麼？',
  ] },
  { key: 'family', icon: '🏠', name: '家人', qs: [
    '你覺得家裡誰跟你最像？',
    '小時候過年，你家都怎麼過？',
    '你最想從家裡帶進我們生活的一個習慣是什麼？',
    '你覺得你爸媽的相處，有什麼是你想學的？',
    '家人對你說過最暖的一句話是什麼？',
  ] },
  { key: 'memory', icon: '📷', name: '回憶', qs: [
    '你對我的第一印象是什麼？',
    '我們第一次約會，你記得最清楚的是什麼？',
    '你是什麼時候確定「就是這個人」的？',
    '我們吵過最好笑的一次架是什麼？',
    '有什麼我做過的小事，你到現在還記得？',
  ] },
];
const topicQId = (t, i) => `${t.key}${String(i + 1).padStart(2, '0')}`;
const topicCanUse = () => usingCloud() && (!CloudDB.isAnonymous() || isPartner());

// 「一起」分頁那一列：對方寫了、你還沒寫的題數
async function topicRowHtml() {
  let badge = '';
  if (topicCanUse()) {
    try {
      const st = await CloudDB.topicState();
      if (st && st.ok && st.pair) {
        const n = Object.values(st.answers || {}).filter((a) => a.other_done && !a.mine).length;
        if (n) badge = `${n} 題等你`;
      }
    } catch (e) { /* 讀不到就不顯示 */ }
  }
  return navRow({ href: '#/topics', id: 'row-topics', icon: '<span class="nav-emoji" aria-hidden="true">💬</span>', title: '主題題庫', sub: '金錢、價值觀、未來…挑一個主題深聊', badge });
}

async function viewTopics(arg) {
  app.className = 'theme-happy';
  const topic = TOPICS.find((t) => t.key === arg) || TOPICS[0];
  const top = `<div class="topbar"><a class="icon-btn" href="#/together" aria-label="返回" data-back>${ICON.back}</a><h1>主題題庫</h1></div>`;
  let st = null;
  if (topicCanUse()) {
    try { st = await CloudDB.topicState(); } catch (e) { st = { ok: false }; }
  }
  const paired = !!(st && st.ok && st.pair);
  const answers = (paired && st.answers) || {};
  const me = paired ? st.me : null;
  const other = paired ? st.members.find((m) => m !== me) : null;
  const oname = (paired && st.names && st.names[other]) || otherName();
  const doneCount = (t) => t.qs.filter((q, i) => { const a = answers[topicQId(t, i)]; return a && a.mine && a.other_done; }).length;
  const waitCount = (t) => t.qs.filter((q, i) => { const a = answers[topicQId(t, i)]; return a && a.other_done && !a.mine; }).length;
  const chips = `<div class="chips scroll topic-chips" role="tablist">${TOPICS.map((t) => {
    const w = paired ? waitCount(t) : 0;
    return `<a class="chip${t === topic ? ' on' : ''}" role="tab" aria-selected="${t === topic}" href="#/topics/${t.key}" data-topic="${t.key}">${t.icon} ${esc(t.name)}${w ? ` <span class="topic-dot">${w}</span>` : ''}</a>`;
  }).join('')}</div>`;

  let notice = '';
  if (!topicCanUse()) {
    notice = `<div class="card" style="gap:8px"><div class="muted">註冊並邀請另一半加入之後，就能一起寫。先看看題目吧。</div>
      <a class="btn small" href="#/signup" style="align-self:flex-start">註冊或登入</a></div>`;
  } else if (!st || !st.ok) {
    notice = `<div class="card"><div class="muted">${st && st.missing ? '這個功能還在準備中，過幾天再來看看。' : '現在讀不到資料，請稍後再試一次。'}</div></div>`;
  } else if (!paired) {
    notice = `<div class="card" style="gap:8px"><div class="muted">另一半加入之後就能一起寫。先看看題目吧。</div>
      ${isPartner() ? '' : '<a class="btn small" href="#/settings/share" style="align-self:flex-start">去邀請另一半</a>'}</div>`;
  }

  const both = (mineText, otherText) => `<div class="quiz-person"><div class="small bold">你</div><div class="prose">${esc(mineText)}</div></div>
      <div class="quiz-person"><div class="small bold">${esc(oname)}</div><div class="prose">${esc(otherText)}</div></div>`;
  const card = (q, i) => {
    const id = topicQId(topic, i);
    const a = answers[id] || {};
    const head = `<div class="small muted">${topic.icon} ${esc(topic.name)}・第 ${i + 1} 題</div>`;
    if (!paired) return `<div class="card" style="gap:6px">${head}<div class="bold">${esc(q)}</div></div>`;
    if (a.mine && a.other_done) return `<div class="card topic-q" style="gap:10px" data-qid="${id}">${head}<div class="bold">${esc(q)}</div>${both(a.mine, a.other)}</div>`;
    const state = a.mine ? `你寫好了，等${esc(oname)}寫完就一起揭曉。揭曉前你還可以改。`
      : a.other_done ? `${esc(oname)}寫好了，換你。你寫完就一起揭曉。` : `兩人都寫完才會一起揭曉，揭曉前看不到${esc(oname)}寫什麼。`;
    return `<div class="card topic-q" style="gap:8px" data-qid="${id}">${head}
      <label class="bold" for="tq-${id}">${esc(q)}</label>
      <textarea class="textarea" id="tq-${id}" maxlength="300" rows="3" placeholder="照你現在想的寫就好">${esc(a.mine || '')}</textarea>
      <div class="small daily-state">${state}</div>
      <button class="btn small" data-send="${id}" style="align-self:flex-start">${a.mine ? '更新答案' : '送出'}</button>
    </div>`;
  };
  const progress = paired ? `<div class="small muted" style="text-align:center">這個主題一起聊完 ${doneCount(topic)} / ${TOPIC_FREE} 題</div>` : '';
  const locked = `<div class="card topic-locked" style="gap:8px;text-align:center">
      <div style="font-size:26px" aria-hidden="true">🔒</div>
      <div class="bold">還有 ${TOPIC_TOTAL - TOPIC_FREE} 題・啾啾 Plus 即將推出</div>
      <div class="small muted">每個主題 ${TOPIC_TOTAL} 題，之後還會有遠距離、吵架後、紀念日這些主題。</div>
      <button class="btn small" id="tp-yes" style="align-self:center">我有興趣，推出時通知我</button>
    </div>`;

  app.innerHTML = `${top}
    <div class="card" style="gap:6px">
      <div class="bold">挑一個主題，慢慢聊深一點</div>
      <div class="small muted">每個主題先開放 ${TOPIC_FREE} 題。兩個人各自寫，都寫完才會一起揭曉。</div>
    </div>
    ${chips}
    ${notice}
    ${topic.qs.map(card).join('')}
    ${progress}
    ${locked}`;
  track('topic_open', { topic: topic.key });

  const yes = document.getElementById('tp-yes');
  const markDone = () => { yes.disabled = true; yes.textContent = DONE_TEXT; };
  hasInterest('daily_question').then((d) => { if (d) markDone(); });
  yes.addEventListener('click', async () => {
    notePaywallView('daily_question');
    yes.disabled = true;
    const fresh = await registerInterest('daily_question');
    markDone();
    toast(fresh ? '謝謝！推出時會通知你' : '已經登記過了，推出時通知你');
  });
  // 換主題不要一直疊歷史紀錄
  app.querySelectorAll('[data-topic]').forEach((c) => c.addEventListener('click', (ev) => {
    ev.preventDefault();
    history.replaceState(null, '', `#/topics/${c.dataset.topic}`);
    viewTopics(c.dataset.topic);
  }));
  app.querySelectorAll('[data-send]').forEach((btn) => btn.addEventListener('click', async () => {
    const id = btn.dataset.send;
    const el = document.getElementById(`tq-${id}`);
    const body = el.value.trim();
    if (!body) { toast('先寫下你的答案'); el.focus(); return; }
    await withBusy(btn, '送出中…', async () => {
      let res;
      try { res = await CloudDB.topicSave(id, body); } catch (e) { toast(e.message || '送不出去，請稍後再試一次'); return; }
      track('topic_submit', { topic: topic.key });
      if (res && res.revealed) { track('topic_reveal', { topic: topic.key }); toast('揭曉了！'); } else toast(`送出了，等${oname}寫完就一起揭曉`);
      const y = window.scrollY;
      await viewTopics(topic.key);
      window.scrollTo(0, y);
    });
  }));
}
