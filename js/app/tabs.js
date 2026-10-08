// 啾啾日記 js/app/tabs.js：「一起」和「我的」兩個分頁、今天頁的「重新認識你」提示卡
// 2026-09-29 介面整理 B 方案：新功能先決定住哪（記錄類→紀錄；兩人互動類→一起；設定類→我的），今天頁不加新磁磚。

// 一列：圖示（中性色）、名稱、一行說明、右邊狀態
function navRow({ href, icon, title, sub = '', badge = '', id = '' }) {
  return `<a class="nav-row" href="${href}"${id ? ` id="${id}"` : ''}>
    <span class="nav-icon">${icon}</span>
    <span class="nav-text"><span class="bold">${title}</span>${sub ? `<span class="small muted">${sub}</span>` : ''}</span>
    ${badge ? `<span class="nav-badge">${badge}</span>` : ''}
    <span class="nav-chev">${ICON.chevron}</span>
  </a>`;
}
const navGroup = (title, rows) => {
  const body = rows.filter(Boolean).join('');
  return body ? `<h2 class="section-title">${title}</h2><div class="card nav-list">${body}</div>` : '';
};

// ---------- 重新認識你：狀態 ----------
// 回傳 { label, due, text }：due 代表「該我作答」（對方交卷了而我還沒，或可以開新的一回）
async function quizStatus() {
  if (!usingCloud() || CloudDB.isAnonymous() && !isPartner()) return null;
  let st;
  try { st = await CloudDB.quizState(); } catch (e) { return null; }
  if (!st || !st.ok) return null;
  const me = st.me;
  const other = (st.members || []).find((u) => u !== me);
  if (!other) return { label: '', due: false, sub: '另一半加入後就能一起玩', st };
  const oname = (st.names && st.names[other]) || otherName();
  const r = st.round;
  if (st.can_start) return { label: '該作答', due: true, sub: r ? '新的一回開放了' : '每 3 個月，重新認識一次', first: !r, st, otherName: oname };
  if (r && !r.revealed_at) {
    const mine = !!(r.submitted && r.submitted[me]);
    const theirs = !!(r.submitted && r.submitted[other]);
    if (!mine && theirs) return { label: '該作答', due: true, sub: `${oname}寫好了，換你`, st, otherName: oname, partnerDone: true };
    if (!mine) return { label: '', due: false, sub: `第 ${r.no} 回作答中`, st, otherName: oname };
    return { label: '', due: false, sub: `等${oname}交卷`, st, otherName: oname };
  }
  if (r && st.reveal) return { label: '揭曉了', due: false, sub: `第 ${r.no} 回的答案可以看了`, st, otherName: oname };
  return { label: '', due: false, sub: st.next_at ? `下一回 ${shortDate(dateOf(Date.parse(st.next_at)))} 開放` : '', st, otherName: oname };
}

// 今天頁的提示卡：對方交卷了換我（一定出現），或可以開新的一回（按叉叉 14 天後再提醒）
const QUIZ_TIP_SNOOZE_DAYS = 14;
// which：'urgent' 只在對方交卷了換我時出現；'start' 只在可以開新的一回時出現（排在任務、對方新寫的紀錄後面）
function quizTipHtml(q, which) {
  if (!q || !q.due) return '';
  if (which === 'urgent' && !q.partnerDone) return '';
  if (which === 'start' && q.partnerDone) return '';
  if (!q.partnerDone) {
    try { if (Date.now() - Number(localStorage.getItem('quizTipHiddenAt') || 0) < QUIZ_TIP_SNOOZE_DAYS * 86400000) return ''; } catch (e) { /* 略過 */ }
  }
  const title = q.partnerDone ? `${esc(q.otherName)}寫好「重新認識你」了，換你囉` : q.first ? '一起玩「重新認識你」' : '該重新認識對方了';
  const text = q.partnerDone ? '兩個人都交卷才會一起揭曉。' : '兩個人各自回答同一組問題，猜猜對方會怎麼答，兩人都寫完才一起揭曉。8 題，大約 5 分鐘。';
  return `<div class="card${q.partnerDone ? '' : ' has-x'}" id="quiz-tip" style="background:var(--happy-bg);border-color:transparent;gap:6px">
    ${q.partnerDone ? '' : `<button class="card-x" id="quiz-tip-x" aria-label="先不要，過幾天再提醒" style="color:var(--happy-dark)">${ICON.x}</button>`}
    <div class="bold" style="color:var(--happy-dark)">${title}</div>
    <div class="small" style="color:var(--happy-dark)">${text}</div>
    <a class="btn small" href="#/quiz" style="align-self:flex-start">${q.partnerDone ? '去作答' : '看看怎麼玩'}</a>
  </div>`;
}
function bindQuizTip() {
  const x = document.getElementById('quiz-tip-x');
  if (x) x.addEventListener('click', (e) => {
    e.preventDefault();
    try { localStorage.setItem('quizTipHiddenAt', String(Date.now())); } catch (err) { /* 略過 */ }
    document.getElementById('quiz-tip').remove();
    toast(`好，${QUIZ_TIP_SNOOZE_DAYS} 天後再提醒你`);
  });
}

// ---------- 一起（#/together） ----------
async function viewTogether() {
  app.className = '';
  const partner = isPartner();
  const guest = isGuest();
  const cloud = usingCloud();
  const all = await liveRecords();
  const wishes = await loadWishesSafe();
  const wishDone = wishes ? wishes.filter((w) => w.done).length : 0;
  const daily = cloud ? await dailyStatus() : null;
  // 新舊版本交接時 notes.js 可能還沒載入（舊的 index.html），就先不顯示這一列
  const hasNotes = typeof noteStatus === 'function';
  const notes = cloud && hasNotes ? await noteStatus(true) : null;
  const caps = await loadCapsulesSafe();
  // 新舊版本交接時 topics.js 可能還沒載入，就先不顯示這一列
  const topicRow = typeof topicRowHtml === 'function' ? await topicRowHtml() : '';
  let taskSub = '上鎖紀錄的解鎖任務';
  let taskBadge = '';
  if (cloud) {
    try {
      const mine = await CloudDB.partnerTasks();
      const todo = mine.filter((t) => !t.submission || t.submission.status !== 'pending').length;
      let waiting = 0;
      if (!partner || CloudDB.isBoundPartner()) {
        try { waiting = (await CloudDB.submissions({ status: 'pending' })).filter((t) => all.some((r) => r.id === t.record_id && isMine(r))).length; } catch (e) { waiting = 0; }
      }
      if (waiting) { taskSub = `${waiting} 個等你確認`; taskBadge = `${waiting} 個等你`; }
      else if (todo) { taskSub = `${esc(otherName())}出了 ${todo} 個給你`; taskBadge = `${todo} 個等你`; }
    } catch (e) { /* 讀不到就顯示說明 */ }
  }
  const stamps = partner ? null : allStamps(all);
  const doRows = guest
    ? [
      navRow({ href: '#/wishes', icon: TILE_ICON.wish, title: '一起完成的事', sub: wishes && wishes.length ? `情侶待辦・${wishDone} / ${wishes.length}` : '情侶待辦清單' }),
      capsuleRowNav(caps),
      topicRow,
      navRow({ href: '#/signup', id: 'row-signup', icon: TILE_ICON.share, title: '註冊後可以和另一半一起玩', sub: '秘密留言板、每天一題、解鎖任務' }),
    ]
    : [
      cloud && hasNotes && (!CloudDB.isAnonymous() || partner) ? noteRowHtml(notes) : '',
      cloud && (!CloudDB.isAnonymous() || partner) ? dailyRowHtml(daily) : '',
      topicRow,
      navRow({ href: '#/wishes', icon: TILE_ICON.wish, title: '一起完成的事', sub: wishes && wishes.length ? `情侶待辦・${wishDone} / ${wishes.length}` : '情侶待辦清單' }),
      cloud ? navRow({ href: '#/tasks', icon: ICON.lock, title: '解鎖任務', sub: taskSub, badge: taskBadge }) : '',
      capsuleRowNav(caps),
    ];
  app.innerHTML = `
    <div class="topbar"><h1>一起</h1></div>
    ${navGroup('一起做', doRows)}
    ${navGroup('收藏', [
      stamps ? navRow({ href: '#/stamps', icon: TILE_ICON.stamp, title: '印章冊', sub: `已集 ${stamps.filter((x) => x.got).length} / ${stamps.length}` }) : '',
      navRow({ href: '#/cards', icon: TILE_ICON.card, title: '回憶小卡', sub: '做成圖分享出去' }),
    ])}
    ${navGroup('搶先看', previewRows())}
  `;
  bindPreviewRows();
  const su = document.getElementById('row-signup');
  if (su) su.addEventListener('click', (ev) => { ev.preventDefault(); track('signup_prompt', { where: 'together' }); showSignupSheet('註冊後就能和另一半一起玩', '秘密留言板、每天一題、解鎖任務都要兩個人一起用。現在試用寫的紀錄，註冊後會自動搬上雲端。'); });
}

// 我的最上面：還沒放到主畫面就放一個入口；電腦上給 QR code 用手機掃
function a2hsMeRow() {
  const pf = a2hsPlatform();
  if (pf === 'standalone') return '';
  const desk = pf === 'desktop';
  return `<button class="card" id="a2hs-settings" style="gap:4px;text-align:left;width:100%;font:inherit;color:inherit;cursor:pointer;background:var(--happy-bg);border-color:transparent">
    <div class="row between"><div class="row" style="gap:10px"><img src="icons/icon-192.png" alt="" width="36" height="36" style="border-radius:9px;flex:none">
      <div><div class="bold" style="color:var(--happy-dark)">${desk ? '在手機上用' : '放到手機主畫面'}</div>
      <div class="small" style="color:var(--happy-dark)">${desk ? '用手機掃 QR code 打開，再放到主畫面' : '像 App 一樣點圖示就打開，看圖照做 3 步就好'}</div></div></div>
      <div style="color:var(--happy-dark)">›</div></div>
  </button>`;
}
// ---------- 我的（#/me）：設定的一層目錄，點進去是設定頁的那一段 ----------
async function viewMe() {
  app.className = '';
  const cloud = usingCloud();
  let shareSub = '註冊後就能邀請對方一起寫';
  if (cloud && !CloudDB.isAnonymous()) {
    try {
      const ps = await CloudDB.listPartners();
      const joined = ps.find((p) => p.approved !== false);
      shareSub = joined ? `${esc(joined.name || partnerName())}已加入` : ps.length ? '有人想加入，等你同意' : '還沒邀請・也能加入對方的';
    } catch (e) { shareSub = '邀請、暫停分享'; }
  }
  let admin = false;
  if (cloud && !CloudDB.isAnonymous()) { try { admin = await CloudDB.amIAdmin(); } catch (e) { admin = false; } }
  const who = [NAMES.me, NAMES.partner].filter(Boolean).map(esc).join(' 和 ');
  app.innerHTML = `
    <div class="topbar"><h1>我的</h1></div>
    ${isGuest() ? `<a class="card" href="#/signup" id="me-signup" style="background:var(--happy-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--happy-dark)">註冊或登入</div>
      <div class="small" style="color:var(--happy-dark)">現在的紀錄只存在這支手機。註冊後會自動搬上雲端，也能分享給另一半 ›</div>
    </a>` : ''}
    ${a2hsMeRow()}
    ${navGroup('我們', [
      navRow({ href: '#/settings/share', id: 'row-share', icon: TILE_ICON.share, title: '分享給另一半', sub: shareSub }),
      navRow({ href: '#/settings/us', icon: ICON.heart, title: '我們', sub: who || '名字、紀念日、吉祥物' }),
    ])}
    ${navGroup('設定', [
      cloud ? navRow({ href: '#/settings/notify', icon: ICON.bell, title: '通知', sub: CloudDB.isAnonymous() ? '小鈴鐺、手機通知' : '小鈴鐺、手機通知、Email' }) : '',
      navRow({ href: '#/settings/records', icon: ICON.book, title: '整理紀錄', sub: '分類、標籤、最近刪除、重新編號' }),
      navRow({ href: '#/settings/backup', icon: TILE_ICON.backup, title: '備份與匯出', sub: '匯出備份、閱讀版' }),
      navRow({ href: '#/settings/account', icon: ICON.lock, title: '帳號與安全', sub: '登入方式、App 解鎖碼、結束這段關係' }),
      navRow({ href: '#/settings/theme', icon: TILE_ICON.theme, title: '外觀', sub: '淺色、深色、主題背景' }),
      admin ? navRow({ href: '#/stats', icon: TILE_ICON.chart, title: '數據看板', sub: '只有你看得到' }) : '',
    ])}
    ${navGroup('更多', [
      navRow({ href: '#/settings/other', icon: TILE_ICON.info, title: '其他', sub: '使用導覽、意見回饋、匿名統計' }),
    ])}
  `;
  const a2 = document.getElementById('a2hs-settings');
  if (a2) a2.addEventListener('click', () => (a2hsPlatform() === 'desktop' ? showPhoneQr() : showA2hs('settings')));
  const rs = document.getElementById('row-share');
  if (rs && isGuest()) rs.addEventListener('click', (ev) => { ev.preventDefault(); track('signup_prompt', { where: 'share' }); showSignupSheet('註冊後就能分享給另一半', '傳一個邀請連結給對方，兩個人就能一起看、一起寫。現在試用寫的紀錄，註冊後會自動搬上雲端。'); });
}
