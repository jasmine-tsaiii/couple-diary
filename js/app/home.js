// 啾啾日記 js/app/home.js：首頁、範例紀錄、列表
// 所有 js/app/*.js 共用同一個全域範圍，依 index.html 的順序載入。

// ---------- 首頁 ----------
// 首頁上方的「今天想記下什麼？」：三個大按鈕直接開始寫
function quickRecord(text) {
  return `<div class="card quick-rec">
    <div class="quick-head">${mascotHtml('happy', 64)}<div class="bold">${text}</div></div>
    <div class="quick-btns">
      <a class="quick-btn theme-happy" href="#/new/happy">${ICON.heart}<span>記美好</span></a>
      <a class="quick-btn theme-cloud" href="#/new/cloud">${ICON.cloud}<span>記烏雲</span></a>
      <a class="quick-btn theme-fight" href="#/new/fight">${ICON.bolt}<span>記吵架</span></a>
    </div>
  </div>`;
}
const TILE_ICON = {
  card: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M12 15.5s-3.5-2.1-3.5-4.4A1.9 1.9 0 0 1 12 10a1.9 1.9 0 0 1 3.5 1.1c0 2.3-3.5 4.4-3.5 4.4z"/></svg>',
  wish: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>',
  stamp: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/></svg>',
  quiz: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12z"/><path d="M9.8 9.5a2.3 2.3 0 0 1 4.4.8c0 1.5-2.2 2-2.2 3.2"/><path d="M12 16.5h.01"/></svg>',
  note: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h10l4 4v14H5z"/><path d="M14 3v5h5"/><path d="M8.5 15.5c1.2-1.6 2.4-1.6 3 0s1.8 1.6 3 0"/></svg>',
  daily: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="M9 15h6"/></svg>',
  backup: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
  theme: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  chart: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  info: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg>',
  share: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/></svg>',
};
async function viewHome() {
  const all = await liveRecords();
  // 另一半上鎖的紀錄你看不到內容，但數量要算進去（100 個目標是兩個人一起的）
  const lockedOthers = usingCloud() ? [...await CloudDB.othersLocked(), ...await othersTaskRecords()] : [];
  const count = (t) => all.filter((r) => r.type === t).length + lockedOthers.filter((x) => x.type === t).length;
  const fights = all.filter((r) => r.type === 'fight');
  const recent = all.slice().sort(byDateDesc).slice(0, 5);
  const examples = await showExamples(all);
  const cardPending = typeof pendingCard === 'function' ? await pendingCard(all) : null;
  const lastBackup = await DB.getSetting('lastBackupAt', null);
  // 手機版 14 天提醒一次；雲端版免費方案沒有自動備份，30 天提醒一次
  const remindDays = usingCloud() ? CLOUD_BACKUP_REMIND_DAYS : BACKUP_REMIND_DAYS;
  // 試用中（還沒註冊）不提備份，只留「註冊」一條路，免得兩種說法打架
  // 按叉叉關掉的話，7 天後再提醒
  const backupSnooze = await DB.getSetting('backupSnoozeAt', null);
  const wantBackup = !isGuest() && all.length > 0 && (!lastBackup || Date.now() - lastBackup > remindDays * 86400000)
    && !(backupSnooze && Date.now() - backupSnooze < BACKUP_SNOOZE_DAYS * 86400000);
  const wantNames = !NAMES.me && !NAMES.partner && !(await DB.getSetting('namesSkipped', false));
  // 首頁一次只放一張提醒卡：先填名字，再來是註冊（試用中）或備份
  const askNames = wantNames;
  const showGuestCard = isGuest() && (!askNames || (IOS_SAFARI_TAB && all.length > 0));
  const needBackup = wantBackup && !askNames;
  // 放到主畫面：沒有其他提醒卡時才出現（首頁一次只放一張）
  const showA2hsCard = !askNames && !needBackup && !showGuestCard && all.length > 0 && a2hsCardEligible();
  let pending = [];
  if (usingCloud()) { try { pending = (await CloudDB.submissions({ status: 'pending' })).filter((t) => all.some((r) => r.id === t.record_id && isMine(r))); } catch (e) { pending = []; } }
  let myTasks = [];
  if (usingCloud()) { try { myTasks = await CloudDB.partnerTasks(); } catch (e) { myTasks = []; } }
  const myTodo = myTasks.filter((t) => !t.submission || t.submission.status !== 'pending').length;
  let partnerLeft = null;
  let endedWith = null;
  if (usingCloud()) {
    try { partnerLeft = await DB.getSetting('partnerLeft', null); } catch (e) { partnerLeft = null; }
    try { endedWith = localStorage.getItem(`endedWith:${CloudDB.myId()}`); } catch (e) { endedWith = null; }
  }
  let joinReqs = [];
  let hasPartner = true;
  if (usingCloud()) {
    try { const ps = await CloudDB.listPartners(); joinReqs = ps.filter((p) => p.approved === false); hasPartner = ps.some((p) => p.approved !== false); } catch (e) { joinReqs = []; }
  }
  let inviteHidden = false;
  try { inviteHidden = !!localStorage.getItem('inviteCardHidden'); } catch (e) { /* 略過 */ }
  const showInvite = usingCloud() && !hasPartner && !joinReqs.length && !inviteHidden;
  // 「一年前的今天」只挑美好時刻，免得一打開就看到舊的烏雲
  const memory = all.filter((r) => r.type === 'happy' && DATE_RE.test(r.date || '') && r.date.slice(5) === today().slice(5) && r.date < today()).sort(byDateDesc)[0];
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  // 烏雲不當成要集滿的目標，改看「美好：烏雲」的比例（研究說幸福的情侶大約是 5 : 1）
  const ratioText = () => {
    const h = count('happy');
    const c = count('cloud');
    const ratio = c ? h / c : 0;
    if (!c) return h ? '還沒有烏雲，繼續保持 ☀️' : '記下不開心的時刻';
    const r = ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10;
    return `${c} 則・每片烏雲有 ${r} 個美好${ratio >= 5 ? '，達標了！' : '（目標 5 個）'}`;
  };
  // 重新認識你：對方交卷了換我、或可以開始新的一回
  const quizQ = hasPartner && usingCloud() && !CloudDB.isAnonymous() ? await quizStatus() : null;
  const dailyQ = hasPartner && usingCloud() && !CloudDB.isAnonymous() ? await dailyStatus() : null;
  const caps = await loadCapsulesSafe();

  const guestCard = `<div class="card" id="guest-account" style="background:var(--happy-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--happy-dark)">${all.length ? '註冊，把紀錄存到雲端' : '免費註冊，保存你們的紀錄'}</div>
      <div class="small" style="color:var(--happy-dark)">${all.length ? `目前 ${all.length} 則紀錄只存在這支手機。` : '現在是試用，紀錄只存在這支手機。'}在這支手機註冊或登入後會自動搬上雲端，換手機不會不見，也能分享給另一半。</div>
      ${all.length && IOS_SAFARI_TAB ? `<div class="small bold" style="color:var(--happy-dark)">${IOS_CLEAR_NOTE}</div>` : ''}
      ${all.length ? '<div class="small bold" style="color:var(--happy-dark)">建議先註冊再多寫，東西才不會遺失。註冊確認信如果在別的 App 打開，記得回到這裡再登入一次，試用寫的紀錄才會搬上去。</div>' : ''}
      ${isIOS && standalone && !all.length ? '<div class="small" style="color:var(--happy-dark)">之前在 Safari 寫過的話：從主畫面打開的和 Safari 是分開存的。請回 Safari 打開網址、註冊或登入，紀錄就會搬上雲端，再回來這裡登入同一個帳號就看得到。</div>' : ''}
    <div class="btn-row"><a class="btn small" href="#/signup" id="guest-signup">免費註冊</a><a class="btn small secondary" href="#/login" id="guest-login">已經有帳號？登入</a></div>
    </div>`;
  // 提示卡一次最多一張，照順序取第一個符合的（前面那張處理或關掉，下一張才出現）
  const tips = [
    partnerLeft ? `<div class="card" id="partner-left" style="background:var(--lock-bg);border-color:transparent;gap:6px">
      <div class="bold" style="color:var(--lock)">${esc(partnerLeft.name)}結束了這段關係</div>
      <div class="small" style="color:var(--lock)">${esc(partnerLeft.name)}已經看不到你的紀錄了。之前的紀錄要封存（收起來，只有你看得到）還是刪除？之後分享給新的人，對方就看不到這些。</div>
      <div class="btn-row"><a class="btn small" href="#/end">封存或刪除</a><button class="btn small secondary" id="partner-left-ok">先保留</button></div>
    </div>` : '',
    endedWith ? `<div class="card" id="ended-with" style="gap:6px">
      <div class="bold">和${esc(endedWith)}的分享已經結束了</div>
      <div class="small muted">這裡是你自己的空間，可以開始記自己的紀錄，也可以匯入之前匯出的備份。</div>
      <button class="btn small secondary" id="ended-with-ok" style="align-self:flex-start">知道了</button>
    </div>` : '',
    joinReqs.slice(0, 1).map((j) => `<div class="card join-req" style="background:var(--lock-bg);border-color:transparent;gap:8px">
      <div class="bold" style="color:var(--lock)">${esc(j.name)} 想加入你們的日記</div>
      <div class="small" style="color:var(--lock)">是你的另一半就按「同意」，同意後對方就能看到分享的紀錄、一起寫。不認識的人請按「拒絕」。</div>
      <div class="btn-row"><button class="btn small" data-home-approve="${esc(j.uid)}" data-name="${esc(j.name)}">同意</button><button class="btn small secondary" data-home-reject="${esc(j.uid)}" data-name="${esc(j.name)}">拒絕</button></div>
    </div>`).join(''),
    quizTipHtml(quizQ, 'urgent'),
    capsuleTipHtml(caps),
    pending.length ? `<a class="card" href="#/view/${esc(pending[0].record_id)}" style="background:var(--lock-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--lock)">有 ${pending.length} 個任務等你確認</div>
      <div class="small" style="color:var(--lock)">${esc(liveOther(pending[0].partner_name))} 完成了任務，點這裡去看看，確認後那則紀錄就會解鎖給對方看。</div>
    </a>` : '',
    myTodo ? `<a class="card" href="#/tasks" id="my-tasks-card" style="background:var(--lock-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--lock)">${esc(partnerName())}出了 ${myTodo} 個任務給你</div>
      <div class="small" style="color:var(--lock)">完成任務、${esc(partnerName())}確認之後，就能看到那則上鎖的紀錄 ›</div>
    </a>` : '',
    newFromOtherCard(all),
    // 試用中：在 LINE/IG 裡打開的警告、iPhone Safari 分頁有紀錄時的註冊提醒，比填名字更要緊
    isGuest() ? inAppNotice() : '',
    showGuestCard && IOS_SAFARI_TAB && all.length ? guestCard : '',
    askNames ? `<div class="card" id="names-card" style="gap:10px">
      <div class="bold">先認識一下你們</div>
      <div class="small muted">填上名字，紀錄裡就會用你們的名字，例如「${'小美'}的想法」。之後也可以在「我的」改。</div>
      <div class="grid2">
        <div class="field"><label for="n-me">你的名字</label><input id="n-me" class="input" maxlength="${LIMITS.name}"></div>
        <div class="field"><label for="n-partner">伴侶的名字</label><input id="n-partner" class="input" maxlength="${LIMITS.name}"></div>
      </div>
      <div class="btn-row"><button class="btn small" id="n-save">儲存</button><button class="btn small secondary" id="n-skip">之後再說</button></div>
    </div>` : '',
    showInvite ? `<div class="card" id="invite-card" style="background:var(--happy-bg);border-color:transparent;gap:8px">
      <div class="bold" style="color:var(--happy-dark)">邀請另一半一起寫</div>
      <div class="small" style="color:var(--happy-dark)">傳邀請連結給另一半，對方加入後就能看你分享的紀錄，也能寫自己的美好時刻。</div>
      <div class="btn-row"><a class="btn small" href="#/settings/share" id="invite-go">去邀請</a><button class="btn small secondary" id="invite-hide">之後再說</button></div>
      <div class="small" style="color:var(--happy-dark)">另一半已經先在用了？<a class="text-link" href="#/join" id="invite-join">輸入對方的分享碼加入</a></div>
    </div>` : '',
    quizTipHtml(quizQ, 'start'),
    cardBanner(cardPending),
    memory ? `<a class="card theme-happy" href="#/view/${esc(memory.id)}" style="background:var(--happy-bg);border-color:transparent;gap:4px">
      <div class="small bold" style="color:var(--happy-dark)">${Number(today().slice(0, 4)) - Number(memory.date.slice(0, 4))} 年前的今天</div>
      <div class="bold">${esc(memory.title)}</div>
    </a>` : '',
    needBackup ? `<a class="card has-x" id="backup-card" href="#/settings/backup" style="background:var(--progress-bg);border-color:transparent;gap:4px">
      <button class="card-x" id="backup-snooze" aria-label="先不要，過幾天再提醒" style="color:var(--progress-ink)">${ICON.x}</button>
      <div class="bold" style="color:var(--progress-ink)">${usingCloud() ? '要不要多存一份備份？' : '該備份囉'}</div>
      <div class="small" style="color:var(--progress-ink)">${usingCloud() ? `紀錄已經存在雲端${lastBackup ? `，上次另外備份是 ${daysAgo(lastBackup)} 天前` : ''}。想多一份保險，可以到「我的 → 備份與匯出」匯出一份，存在自己的手機或雲端硬碟。` : `${lastBackup ? `上次備份是 ${daysAgo(lastBackup)} 天前` : '還沒有備份過'}。紀錄只存在這支手機，點這裡匯出備份，再存到 iCloud 雲碟或 Google 雲端硬碟。`}</div>
    </a>` : '',
    showA2hsCard ? a2hsCardHtml() : '',
    showGuestCard ? guestCard : '',

    dailyTipHtml(dailyQ),
  ];
  const tipHtml = tips.find((t) => t && t.trim()) || '';
  // 倒數日：首頁不加卡片，標題右邊放一張小日曆（最近的那一個）
  const cd = typeof countdownHome === 'function' ? await countdownHome() : { tile: '', ask: '' };

  app.innerHTML = `
    <div class="home-head${cd.tile ? ' has-cd' : ''}">
      <div class="hello">${NAMES.me ? `嗨，${esc(NAMES.me)}・` : ''}${cd.tile ? `<span class="nowrap">${longDate(today()).replace(/^\d+ 年 /, '')}</span>` : `今天是 <span class="nowrap">${longDate(today())}</span>`}</div>
      <h1 class="title-xl">${esc(diaryTitle())}</h1>
      ${togetherDays() ? `<div class="small muted home-days">在一起第 ${togetherDays()} 天</div>` : ''}
      ${cd.tile}
      ${cd.ask ? `<div class="home-cd">${cd.ask}</div>` : ''}
      <div class="row home-actions" style="gap:8px">
        ${isGuest() ? '<a class="btn small secondary" href="#/login" id="home-login">登入</a>' : ''}
        ${bellBtnHtml()}
      </div>
    </div>
    ${quickRecord('今天想記下什麼？')}
    ${tipHtml}
    <div class="row between section-head"><div class="section-title">最近的紀錄</div>${recent.length ? '<a class="small see-all" href="#/records">看全部 ›</a>' : ''}</div>
    <div class="list" id="recent">${recent.length ? '' : examples ? examplesBlock(['happy', 'cloud', 'fight']) : `<div class="empty">還沒有任何紀錄<a class="btn small" href="#/new/happy">寫下第一個美好時刻</a></div>`}</div>
  `;
  if (document.getElementById('names-card')) {
    document.getElementById('n-save').addEventListener('click', async () => {
      const me = document.getElementById('n-me').value.trim();
      const partner = document.getElementById('n-partner').value.trim();
      if (!me || !partner) { toast('兩個名字都填一下'); return; }
      await saveNames({ ...NAMES, me, partner });
      await loadNames();
      viewHome();
    });
    document.getElementById('n-skip').addEventListener('click', async () => {
      await DB.setSetting('namesSkipped', true);
      viewHome();
    });
  }
  bindA2hsCard();
  bindQuizTip();
  bindDailyTip(dailyQ);
  if (cd.ask) bindCountdownPill();
  const bs = document.getElementById('backup-snooze');
  if (bs) bs.addEventListener('click', async (e) => {
    e.preventDefault(); e.stopPropagation();
    document.getElementById('backup-card').remove();
    toast(`好，${BACKUP_SNOOZE_DAYS} 天後再提醒你`);
    try { await DB.setSetting('backupSnoozeAt', Date.now()); } catch (err) { /* 略過 */ }
  });
  const ih = document.getElementById('invite-hide');
  if (ih) ih.addEventListener('click', () => { try { localStorage.setItem('inviteCardHidden', '1'); } catch (e) { /* 略過 */ } document.getElementById('invite-card').remove(); });
  app.querySelectorAll('[data-home-approve]').forEach((b) => b.addEventListener('click', async () => {
    if (await approveJoin(b, b.dataset.homeApprove, b.dataset.name)) viewHome();
  }));
  app.querySelectorAll('[data-home-reject]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm(`拒絕「${b.dataset.name}」加入？`)) return;
    await CloudDB.removePartner(b.dataset.homeReject);
    toast('已拒絕');
    viewHome();
  }));
  const plOk = document.getElementById('partner-left-ok');
  if (plOk) plOk.addEventListener('click', () => withBusy(plOk, '', async () => { await DB.setSetting('partnerLeft', null); document.getElementById('partner-left').remove(); }));
  const ewOk = document.getElementById('ended-with-ok');
  if (ewOk) ewOk.addEventListener('click', () => { try { localStorage.removeItem(`endedWith:${CloudDB.myId()}`); } catch (e) { /* 略過 */ } document.getElementById('ended-with').remove(); });
  const box = document.getElementById('recent');
  for (const r of recent) box.appendChild(await listItem(r));
  if (!all.length && !tourDone('owner')) showTour('owner');
}

// 對方新寫的紀錄：記在這支手機上「看過了沒」，列表加小點、首頁提示。
// 第一次用這個功能時，現有的都當作看過，免得一次冒出一大堆
let seenCache = null;
let seenFor = null;
const seenKey = () => `seenOthers:${CloudDB.myId()}`;
function seenSet() {
  if (seenFor !== seenKey()) { seenCache = null; seenFor = seenKey(); }
  if (seenCache) return seenCache;
  try { const raw = localStorage.getItem(seenKey()); seenCache = raw ? new Set(JSON.parse(raw)) : null; } catch (e) { seenCache = null; }
  return seenCache;
}
function saveSeen() { try { localStorage.setItem(seenKey(), JSON.stringify([...seenCache].slice(-3000))); } catch (e) { /* 略過 */ } }
function initSeen(all) {
  if (!usingCloud() || seenSet()) return;
  seenCache = new Set(all.filter((r) => !isMine(r)).map((r) => r.id));
  saveSeen();
}
const isNewFromOther = (r) => usingCloud() && !isMine(r) && !!seenSet() && !seenSet().has(r.id);
function markSeen(r) { if (!usingCloud() || isMine(r) || !seenSet() || seenCache.has(r.id)) return; seenCache.add(r.id); saveSeen(); }
function newFromOtherCard(all) {
  initSeen(all);
  const fresh = all.filter(isNewFromOther).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (!fresh.length) return '';
  return `<a class="card" id="new-from-other" href="#/view/${esc(fresh[0].id)}" style="gap:4px">
    <div class="row" style="gap:8px"><span class="new-dot" aria-hidden="true"></span><span class="bold">${esc(otherName())}最近寫了 ${fresh.length} 則新的</span></div>
    <div class="small muted">${fresh.slice(0, 3).map((r) => `${TYPES[r.type].short}「${esc(r.title)}」`).join('、')}${fresh.length > 3 ? '…' : ''}，點這裡從最新的開始看 ›</div>
  </a>`;
}

// ---------- 新帳號的範例紀錄：還沒寫過任何一則時顯示，寫下第一則後就不再出現 ----------
const EXAMPLES = {
  happy: { title: '一起去淡水看夕陽', date: '範例', text: '對方偷偷買了我最愛的雞蛋糕，坐在河堤邊吃，風很大但很開心。', tags: ['驚喜', '幸福'], emoji: '🥰' },
  cloud: { title: '約好的時間又遲到 40 分鐘', date: '範例', text: '等到手機快沒電，對方只說塞車。其實我只是希望能早點說一聲。', tags: ['被忽略'], emoji: '😮‍💨', extra: '心情過去之後按「已放晴」，還可以補寫反思。' },
  fight: { title: '回訊息太慢', date: '範例', category: '溝通', status: 'progress', text: '我覺得被忽略；對方覺得上班時不方便看手機。', extra: '後續：約好忙的時候先回一個貼圖。', emoji: '🤔' },
};
async function showExamples(all) {
  if (isPartner()) return false;
  try {
    if (await DB.getSetting('examplesGone', false)) return false;
    if (all.length) { await DB.setSetting('examplesGone', true); return false; }
  } catch (e) { return false; }
  return true;
}
function exampleCard(type) {
  const x = EXAMPLES[type];
  const st = x.status ? STATUS[x.status] : null;
  return `<a class="card example-card ${TYPES[type].theme}" href="#/new/${type}" data-example="${type}">
    <div class="row between"><span class="badge example-badge">範例・${TYPES[type].short}</span>${st ? `<span class="badge ${st.cls}">${st.label}</span>` : ''}</div>
    <div class="bold" style="font-size:16px">${x.category ? `<span class="small" style="color:var(--fight-text)">${esc(x.category)}・</span>` : ''}${esc(x.title)} ${esc(x.emoji)}</div>
    <div class="small muted">${esc(x.text)}</div>
    ${x.extra ? `<div class="small" style="color:var(--accent-dark)">${esc(x.extra)}</div>` : ''}
    ${x.tags ? `<div class="small muted">${x.tags.map((t) => '#' + esc(t)).join(' ')}</div>` : ''}
    <div class="small bold" style="color:var(--accent-text)">寫一則自己的 ›</div>
  </a>`;
}
function examplesBlock(types) {
  return `<div class="example-note small muted">這些是範例，看看可以怎麼寫。寫下你的第一則之後，範例就會自動消失。</div>${types.map(exampleCard).join('')}`;
}

async function listItem(r) {
  recordTheme.set(r.id, TYPES[r.type].theme);
  const a = document.createElement('a');
  a.className = `card item ${TYPES[r.type].theme}`;
  a.href = `#/view/${r.id}`;
  let thumb = `<div class="thumb">${r.type === 'happy' ? ICON.heart : r.type === 'cloud' ? ICON.cloud : ICON.bolt}</div>`;
  if (r.photoIds && r.photoIds.length) {
    const url = await thumbUrl(r.photoIds[0]);
    if (url) thumb = `<img class="thumb" src="${url}" alt="">`;
  }
  const tags = (r.tags || []).map((t) => '#' + t).join(' ');
  a.innerHTML = `${thumb}
    <div class="grow">
      <div style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.title)}</div>
      <div class="muted small">${shortDate(r.date)} · ${TYPES[r.type].short}${tags ? ' · ' + esc(tags) : ''}</div>
    </div>
    <div class="item-emoji">${esc((r.emojis || [])[0] || '')}</div>${isNewFromOther(r) ? '<span class="new-dot" aria-label="新的"></span>' : ''}`;
  return a;
}

// 對方出了任務、還沒解鎖的紀錄（你要做任務的那些）；舊版資料庫或沒有另一半時是空的
async function othersTaskRecords() {
  if (!usingCloud()) return [];
  try { return await CloudDB.partnerTasks(); } catch (e) { return []; }
}
function taskStateText(t) {
  const s = t.submission && t.submission.status;
  return s === 'pending' ? `已送出，等${esc(otherName())}確認` : s === 'rejected' ? '被退回了，可以再試一次' : '完成任務就能看';
}
function taskLockTile(t) {
  const a = document.createElement('a');
  a.className = 'card tile task-lock';
  a.href = `#/task/${encodeURIComponent(t.id)}`;
  a.innerHTML = `<div class="tile-default tile-lock">${ICON.lock}<div class="no">任務</div></div>
    <div class="tile-body"><div class="bold small" style="color:var(--lock)">${esc(otherName())}出了任務</div>
    <div class="small task-lock-text">${esc(t.task.text || '')}</div>
    <div class="small row" style="color:var(--lock);gap:4px">${ICON.lockSmall}${taskStateText(t)}</div></div>`;
  return a;
}

// ---------- 紀錄分頁（#/records）：上面切換美好／烏雲／吵架，下面是那一種的列表 ----------
function recordCounts(all, lockedAll) {
  const n = (t) => all.filter((r) => r.type === t).length + (lockedAll || []).filter((x) => x.type === t).length;
  return { happy: n('happy'), cloud: n('cloud'), fight: n('fight') };
}
function recordsHead(type, counts, right = '') {
  return `<div class="topbar"><h1>紀錄</h1>${right}</div>
    <div class="seg rec-seg" role="tablist" aria-label="紀錄種類">${REC_TYPES.map((t) => `<a class="seg-btn${t === type ? ' on' : ''}" href="#/records/${t}" data-rec-seg="${t}" role="tab" aria-selected="${t === type}">${TYPES[t].short}<span class="seg-n">${counts[t]}</span></a>`).join('')}</div>`;
}
async function viewRecords(type) {
  const t = REC_TYPES.includes(type) ? type : currentRecType();
  setRecType(t);
  renderTabbar('records'); // 中間的＋跟著目前這種
  if (t === 'fight') await viewFights(); else await viewList(t);
}
// 切換種類不多一層返回
function bindRecSeg() {
  app.querySelectorAll('[data-rec-seg]').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); replaceHash(`#/records/${a.dataset.recSeg}`); }));
}

// ---------- 美好／烏雲列表 ----------
// 列表要看誰寫的：全部／我的／對方的（兩個人都有寫紀錄時才顯示）
let listWho = 'all';
async function viewList(type, tagFilter) {
  const conf = TYPES[type];
  const all = await liveRecords();
  const partner = isPartner();
  const ofType = all.filter((r) => r.type === type).sort(byDateDesc);
  // 對方上鎖的紀錄：只知道有幾則、編號，看不到內容
  const lockedPlain = usingCloud() ? await CloudDB.othersLocked() : [];
  const taskAll = await othersTaskRecords();
  const lockedAll = [...lockedPlain, ...taskAll];
  const lockedOthers = lockedAll.filter((x) => x.type === type);
  const taskOthers = taskAll.filter((x) => x.type === type);
  const total = ofType.length + lockedOthers.length;
  const twoAuthors = usingCloud() && (lockedOthers.length > 0 || ofType.some((r) => !isMine(r))) && ofType.some((r) => isMine(r));
  const who = twoAuthors ? listWho : 'all';
  const mine = ofType.filter((r) => who === 'all' || (who === 'mine') === isMine(r));
  const tags = [...new Set(mine.flatMap((r) => r.tags || []))];
  const shown = tagFilter ? mine.filter((r) => (r.tags || []).includes(tagFilter)) : mine;
  const pct = Math.min(100, (total / conf.goal) * 100);
  const examples = await showExamples(all);

  app.className = conf.theme;
  app.innerHTML = `
    ${recordsHead(type, recordCounts(all, lockedAll), `<div class="count"><b style="font-size:16px;color:var(--accent-text)">${total}</b>${type === 'cloud' ? ' 則' : ` / ${conf.goal}`}</div>`)}
    ${type === 'cloud' ? `<div class="card mascot-hello" style="background:var(--cloud-bg);border-color:transparent">${mascotHtml('cloud', 120)}<div class="small" style="color:var(--cloud-dark)">不開心的時刻也值得記下來，心情過去了就按「已放晴」。</div></div>` : `<div class="progress" style="height:8px"><div style="width:${pct}%"></div></div>`}
    ${twoAuthors ? `<div class="chips">
      ${[['all', '全部', total], ['mine', '我的', ofType.filter(isMine).length], ['other', `${esc(otherName())}的`, total - ofType.filter(isMine).length]].map(([k, l, n]) => `<button class="chip ${k === who ? 'on' : ''}" data-who="${k}">${l} ${n}</button>`).join('')}
    </div>` : ''}
    ${tags.length ? `<div class="chips scroll">
      <button class="chip dark ${!tagFilter ? 'on' : ''}" data-tag="">全部</button>
      ${tags.map((t) => `<button class="chip ${t === tagFilter ? 'on' : ''}" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}
    </div>` : ''}
    <div class="grid2" id="grid"></div>
    ${!mine.length && examples ? examplesBlock([type]) : mine.length || (who !== 'mine' && lockedOthers.length) ? '' : partner && !CloudDB.isBoundPartner() ? `<div class="empty">${esc(ownerName())}還沒有分享${conf.label}<a class="btn small secondary" href="#/bind">建立帳號，自己也來寫</a></div>` : `<div class="empty">還沒有${who === 'other' ? `${esc(otherName())}分享的` : ''}${conf.label}${who === 'other' ? '' : `<a class="btn small" href="#/new/${type}">新增第一則</a>`}</div>`}
  `;
  app.querySelectorAll('[data-tag]').forEach((b) => b.addEventListener('click', () => keepPlace(() => viewList(type, b.dataset.tag || null))));
  app.querySelectorAll('[data-who]').forEach((b) => b.addEventListener('click', () => { listWho = b.dataset.who; viewList(type, tagFilter); }));
  bindRecSeg();

  const grid = document.getElementById('grid');
  const hearted = usingCloud() && type === 'happy' ? await CloudDB.heartedIds() : new Set();
  for (const r of shown) {
    const a = document.createElement('a');
    a.className = 'card tile';
    a.href = `#/view/${r.id}`;
    let top;
    if (r.photoIds && r.photoIds.length) {
      const url = await thumbUrl(r.photoIds[0]);
      top = url ? `<img class="tile-img" src="${url}" alt="">` : '';
    }
    if (!top) {
      top = `<div class="tile-default">${type === 'happy' ? ICON.bigHeart : ICON.bigCloud}<div class="no">No. ${numberOf(r, all)}</div></div>`;
    }
    const lockNote = !isMine(r) ? (r.visibility === 'task' ? (justUnlocked(r) ? '剛解鎖！' : '任務解鎖的') : '')
      : r.visibility === 'locked' ? '上鎖・只有你看得到' : r.visibility === 'task' ? (r.unlocked ? '任務已解鎖' : '任務解鎖') : '';
    a.innerHTML = `${top}
      <div class="tile-body">
        <div class="bold" style="font-size:14px">${isNewFromOther(r) ? '<span class="new-dot" aria-label="新的"></span> ' : ''}${esc(r.title)}</div>
        <div class="muted small">${shortDate(r.date)} · ${esc((r.emojis || []).join(''))}</div>
        ${(r.tags || []).length ? `<div class="tile-tags">${esc(r.tags.map((t) => '#' + t).join(' '))}</div>` : ''}
        ${(r.reflections || []).length ? `<div class="small muted">💭 ${r.reflections.length} 則反思</div>` : ''}
        ${r.clearedAt ? '<div class="small" style="color:var(--resolved-ink)">☀️ 已放晴</div>' : ''}
        ${twoAuthors && who === 'all' ? `<div class="small muted">${isMine(r) ? '你寫的' : `${esc(liveOther(r.authorName))}寫的`}</div>` : ''}
        ${hearted.has(r.id) ? `<div class="small" style="color:var(--happy-dark)">❤️ ${isMine(r) ? `${esc(otherName())}按了愛心` : '你按了愛心'}</div>` : ''}
        ${lockNote ? `<div class="small row" style="color:var(--lock);gap:4px">${ICON.lockSmall}${lockNote}</div>` : ''}
      </div>`;
    grid.appendChild(a);
  }
  // 對方上鎖的紀錄只顯示「這一則上鎖了」，看不到內容
  if (!tagFilter && who !== 'mine') {
    // 對方出了任務的：可以點進去做任務，排在最前面比較好找
    for (const t of [...taskOthers].reverse()) grid.insertBefore(taskLockTile(t), grid.firstChild);
    for (const l of lockedPlain.filter((x) => x.type === type)) {
      const d = document.createElement('div');
      d.className = 'card tile';
      d.innerHTML = `<div class="tile-default tile-lock">${ICON.lock}<div class="no">${l.no ? `No. ${Number(l.no)}` : ''}</div></div>
        <div class="tile-body"><div class="bold small" style="color:var(--lock)">上鎖的紀錄</div><div class="muted small">${esc(otherName())}還沒有打開這一則</div></div>`;
      grid.appendChild(d);
    }
  }
}

// ---------- 吵架議題列表 ----------
async function viewFights(catFilter, statusFilter) {
  const all = await liveRecords();
  const fights = all.filter((r) => r.type === 'fight').sort(byDateDesc);
  const examples = await showExamples(all);
  const cats = await getCategories();
  const usedCats = [...new Set([...cats, ...fights.map((f) => f.category).filter(Boolean)])];
  const counts = usedCats.map((c) => ({
    c,
    n: fights.filter((f) => f.category === c).length,
    done: fights.filter((f) => f.category === c && f.status === 'resolved').length,
  })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...counts.map((x) => x.n));
  const shown = fights.filter((f) => (!catFilter || f.category === catFilter) && (!statusFilter || (f.status || 'open') === statusFilter));

  const lockedFights = isPartner() && !catFilter && !statusFilter ? (await CloudDB.partnerLocked()).filter((x) => x.type === 'fight').length : 0;
  const partner = isPartner();
  const myId = usingCloud() ? CloudDB.myId() : null;
  const byOther = (f) => usingCloud() && f.author && f.author !== myId;
  const openCount = fights.filter((f) => (f.status || 'open') !== 'resolved').length;
  const taskAll = await othersTaskRecords();
  const fightTasks = !catFilter && !statusFilter ? taskAll.filter((x) => x.type === 'fight') : [];
  const lockedAll = usingCloud() ? [...await CloudDB.othersLocked().catch(() => []), ...taskAll] : [];
  app.className = 'theme-fight';
  app.innerHTML = `
    ${recordsHead('fight', recordCounts(all, lockedAll))}
    ${openCount ? `<div class="card mascot-hello" style="background:var(--fight-bg);border-color:transparent">${mascotHtml('fight', 120)}<div class="small" style="color:var(--fight-dark)">還有 ${openCount} 個沒解決。先深呼吸，再慢慢聊。</div></div>` : ''}
    ${partner ? `<a class="btn" href="${CloudDB.isBoundPartner() ? '#/new/fight' : '#/bind'}">＋ 新增議題</a>
      ${CloudDB.isBoundPartner() ? '' : `<div class="small muted">建立你自己的帳號後，就能寫自己的美好和烏雲，也能和${esc(ownerName())}一起寫吵架議題。</div>`}` : ''}
    ${counts.length ? `<div class="card">
      <div class="muted bold">按分類看</div>
      ${counts.map((x) => `<div class="bar-row"><div class="label">${esc(x.c)}</div><div class="bar"><div style="width:${(x.n / max) * 100}%"></div></div><div class="num">${x.n} 次・解決 ${x.done}</div></div>`).join('')}
    </div>` : ''}
    <div class="chips scroll">
      <button class="chip dark ${!catFilter ? 'on' : ''}" data-cat="">全部分類</button>
      ${usedCats.map((c) => `<button class="chip ${c === catFilter ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
    </div>
    <div class="chips">
      <button class="chip dark ${!statusFilter ? 'on' : ''}" data-st="">全部狀態</button>
      ${Object.entries(STATUS).map(([k, v]) => `<button class="chip ${k === statusFilter ? 'on' : ''}" data-st="${k}">${v.label}</button>`).join('')}
    </div>
    <div class="list">
      ${shown.map((f) => {
        const s = STATUS[f.status || 'open'];
        const n = (f.followUps || []).length;
        const extra = f.status === 'resolved' && f.resolution ? `解法：${esc(f.resolution)}` : (n ? `${n} 則後續進展` : '還沒有後續進展');
        return `<a class="card" href="#/view/${esc(f.id)}" style="gap:6px">
          <div class="row between"><span class="small bold" style="color:var(--fight-text)">${esc(f.category || '沒選分類')}</span><span class="badge ${s.cls}">${s.label}</span></div>
          <div class="bold" style="font-size:16px">${isNewFromOther(f) ? '<span class="new-dot" aria-label="新的"></span> ' : ''}${esc(f.title)}</div>
          <div class="muted small">${shortDate(f.date)} · ${extra} ${esc((f.emojis || []).join(''))}${byOther(f) ? ` · ${esc(liveOther(f.authorName))}新增` : ''}</div>
        </a>`;
      }).join('')}
    </div>
    ${fightTasks.map((t) => `<a class="card task-lock" href="#/task/${encodeURIComponent(t.id)}" style="gap:6px;background:var(--lock-bg);border-color:transparent">
      <div class="row" style="gap:4px;color:var(--lock)">${ICON.lockSmall}<span class="small bold">${esc(otherName())}出了任務・${taskStateText(t)}</span></div>
      <div class="bold" style="font-size:15px">${esc(t.task.text || '')}</div>
    </a>`).join('')}
    ${lockedFights ? `<div class="card" style="background:var(--lock-bg);border-color:transparent;gap:4px;flex-direction:row;align-items:center">${ICON.lockSmall}<span class="small" style="color:var(--lock)">另外還有 ${lockedFights} 則上鎖的吵架議題</span></div>` : ''}
    ${!fights.length && examples ? examplesBlock(['fight']) : fights.length ? (shown.length ? '' : '<div class="empty">這個條件下沒有議題</div>') : isPartner() ? (lockedFights || fightTasks.length ? '' : '<div class="empty">還沒有吵架議題</div>') : `<div class="empty">還沒有吵架議題，很棒！<a class="btn small" href="#/new/fight">新增一個議題</a></div>`}
  `;
  app.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => keepPlace(() => viewFights(b.dataset.cat || null, statusFilter))));
  app.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => keepPlace(() => viewFights(catFilter, b.dataset.st || null))));
  bindRecSeg();
}
