// 啾啾日記 js/app/partner.js：另一半模式、分享給另一半
// 所有 js/app/*.js 共用同一個全域範圍，依 index.html 的順序載入。

// ---------- 另一半模式 ----------
async function viewPartnerHome() {
  const info = CloudDB.partnerInfo();
  const all = await liveRecords();
  const count = (t) => all.filter((r) => r.type === t).length;
  const fights = all.filter((r) => r.type === 'fight');
  const recent = all.slice().sort(byDateDesc).slice(0, 5);
  const tasks = await CloudDB.partnerTasks();
  const todo = tasks.filter((t) => !t.submission || t.submission.status !== 'pending').length;
  const locked = await CloudDB.partnerLocked();
  const lockedOf = (t) => locked.filter((x) => x.type === t).length;
  let pending = [];
  if (CloudDB.isBoundPartner()) { try { pending = (await CloudDB.submissions({ status: 'pending' })).filter((t) => all.some((r) => r.id === t.record_id && isMine(r))); } catch (e) { pending = []; } }

  const bound = CloudDB.isBoundPartner();
  const typeTile = (type, icon, color, sub) => homeTile({ href: `#/list/${type}`, icon, color, title: TYPES[type].label, sub,
    extra: `${lockedOf(type) ? `<span class="small row" style="color:var(--lock);gap:4px">${ICON.lockSmall}另有 ${lockedOf(type)} 則上鎖</span>` : ''}${bound ? splitLine(count(type) + lockedOf(type), all.filter((r) => r.type === type && isMine(r)).length) : ''}` });
  const tilesHtml = [
    typeTile('happy', ICON.heart, 'var(--happy)', `${count('happy') + lockedOf('happy')} / ${TYPES.happy.goal}`),
    typeTile('cloud', ICON.cloud, 'var(--cloud)', `${count('cloud')} 則`),
    homeTile({ href: '#/fights', icon: ICON.bolt, color: 'var(--fight)', title: '吵架議題', sub: fightSub(fights) }),
    wishTile(await loadWishesSafe()),
    homeTile({ href: '#/cards', icon: TILE_ICON.card, color: 'var(--happy)', title: '回憶小卡', sub: '做成圖分享出去' }),
    homeTile({ href: '#/tasks', icon: ICON.lock, color: 'var(--lock)', title: '解鎖任務', sub: pending.length ? `${pending.length} 個等你確認` : todo ? `${todo} 個可以解鎖` : tasks.length ? `等${esc(ownerName())}確認中` : '目前沒有任務' }),
  ].join('');

  app.innerHTML = `
    <div class="row between">
      <div>
        <div class="hello">嗨，${esc(info.name)}</div>
        <h1 class="title-xl">${bound ? `${esc(ownerName())}和${esc(info.name)}的紀錄` : `${esc(ownerName())}的紀錄`}</h1>
      </div>
      <a class="icon-btn gear-btn" href="#/settings" aria-label="設定">${ICON.gear}<span>設定</span></a>
    </div>
    ${bound ? quickRecord('今天想記下什麼？') : `<div class="mascot-hello">${mascotHtml('happy', 110)}<div class="small muted">看看${esc(ownerName())}分享了什麼</div></div>`}
    ${info.paused ? `<div class="card" id="paused-note" style="background:var(--lock-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--lock)">${esc(ownerName())}暫時停止分享</div>
      <div class="small" style="color:var(--lock)">這段時間看不到${esc(ownerName())}寫的紀錄，你自己寫的照舊。${esc(ownerName())}恢復之後就會回來，什麼都不會不見。</div>
    </div>` : ''}
    ${tasks.length ? `<a class="card" href="#/tasks" style="background:var(--lock-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--lock)">${todo ? `有 ${todo} 個任務可以解鎖` : '任務都送出了'}</div>
      <div class="small" style="color:var(--lock)">${todo ? `完成任務、${esc(ownerName())}確認之後，就能看到上鎖的紀錄。` : `等${esc(ownerName())}確認中。`}</div>
    </a>` : ''}
    ${newFromOtherCard(all)}
    ${pending.length ? `<a class="card" href="#/view/${esc(pending[0].record_id)}" style="background:var(--lock-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--lock)">有 ${pending.length} 個任務等你確認</div>
      <div class="small" style="color:var(--lock)">${esc(ownerName())}完成了你出的任務，點這裡去看看，確認後那則紀錄就會解鎖給${esc(ownerName())}看。</div>
    </a>` : ''}
    ${CloudDB.isAnonymous() ? `<a class="card" href="#/bind" style="background:var(--fight-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--fight-dark)">建立我的帳號，你也可以寫紀錄</div>
      <div class="small muted">你現在是用分享碼加入的，還沒有自己的帳號：只能看、做任務。用 Email 或 Google 建立帳號後，就能寫自己的美好和烏雲，也能一起寫吵架議題，換手機也不會不見 ›</div>
    </a>` : ''}
    <div class="section-title">所有功能</div>
    <div class="home-tiles">${tilesHtml}</div>
    <div class="section-title">${bound ? '最近的紀錄' : '最近分享的紀錄'}</div>
    <div class="list" id="recent">${recent.length ? '' : bound ? `<div class="empty">還沒有紀錄<a class="btn small" href="#/new/happy">寫下第一個美好時刻</a></div>` : `<div class="empty">${esc(ownerName())}還沒有分享紀錄給你</div>`}</div>
  `;
  const box = document.getElementById('recent');
  for (const r of recent) box.appendChild(await listItem(r));
  if (!tourDone('partner')) showTour('partner');
}

async function viewPartnerTasks() {
  const tasks = await CloudDB.partnerTasks();
  app.className = '';
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/" aria-label="返回">${ICON.back}</a>
      <h1>解鎖任務</h1>
    </div>
    <div class="muted">完成任務、${esc(otherName())}按「通過」之後，那則紀錄就會出現在你的列表裡。</div>
    <div class="list">
      ${tasks.map((t) => {
        const s = t.submission && t.submission.status;
        const sentAgo = t.submission && t.submission.created_at ? daysAgo(new Date(t.submission.created_at).getTime()) : null;
        const state = s === 'pending' ? `<span class="badge st-progress">已送出${sentAgo == null ? '' : sentAgo === 0 ? '・今天' : `・${sentAgo} 天前`}，等${esc(otherName())}確認</span>`
          : s === 'rejected' ? `<span class="badge st-open">被退回了，可以再試一次</span>${t.submission.review_note ? `<div class="small" style="color:var(--open-ink, var(--accent))">${esc(otherName())}說：「${esc(t.submission.review_note)}」</div>` : ''}` : '';
        return `<div class="card ${TYPES[t.type].theme}" style="gap:8px">
          <div class="row between"><span class="small bold" style="color:var(--accent-text)">${ICON.lockSmall} 一則${TYPES[t.type].label}</span>
          <span class="small muted">${t.task.mode === 'photo' ? '要上傳照片' : '按完成就好'}</span></div>
          <div class="bold" style="font-size:16px">${esc(t.task.text)}</div>
          ${state}
          ${s === 'pending' ? '' : `<a class="btn small" href="#/task/${esc(t.id)}">去完成</a>`}
        </div>`;
      }).join('')}
    </div>
    ${tasks.length ? '' : `<div class="empty">目前沒有任務</div>`}
  `;
}

async function viewPartnerTaskForm(id) {
  const t = (await CloudDB.partnerTasks()).find((x) => x.id === id);
  if (!t) { go('#/tasks'); return; }
  const needPhoto = t.task.mode === 'photo';
  let photo = null;
  app.className = TYPES[t.type].theme;
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/tasks" aria-label="返回">${ICON.back}</a>
      <h1>完成任務</h1>
    </div>
    <div class="card" style="background:var(--lock-bg);border-color:transparent">
      <div class="small bold" style="color:var(--lock)">任務</div>
      <div class="bold" style="font-size:17px">${esc(t.task.text)}</div>
    </div>
    ${needPhoto ? `<div class="field"><div class="label">任務照片（必填）</div>
      <div class="photos" id="task-photo-box">
        <label class="photo-add">${ICON.camera}上傳<input type="file" accept="image/*" class="visually-hidden" id="task-photo"></label>
      </div></div>` : ''}
    <div class="field"><label for="task-note">想說的話（可不填）</label>
      <textarea id="task-note" class="textarea" maxlength="500" placeholder="例如：早午餐超好吃！"></textarea></div>
    <button class="btn" id="task-send">${needPhoto ? '送出給' : '完成了，通知'}${esc(otherName())}</button>
  `;
  if (needPhoto) {
    document.getElementById('task-photo').addEventListener('change', async (ev) => {
      const f = ev.target.files[0];
      if (!f) return;
      if (f.size > LIMITS.photoFileMB * 1024 * 1024) { toast(`照片超過 ${LIMITS.photoFileMB} MB，換一張試試`); return; }
      try {
        photo = await compressImage(f);
        const box = document.getElementById('task-photo-box');
        box.querySelector('.photo')?.remove();
        box.insertAdjacentHTML('afterbegin', `<div class="photo"><img src="${URL.createObjectURL(photo)}" alt=""></div>`);
      } catch (e) { toast(e.message); }
    });
  }
  document.getElementById('task-send').addEventListener('click', async (ev) => {
    if (needPhoto && !photo) { toast('這個任務要上傳照片'); return; }
    ev.target.disabled = true;
    try {
      await CloudDB.submitTask(t.id, document.getElementById('task-note').value.trim(), photo);
      track('task_submit');
      toast(`已送出，等${otherName()}確認`);
      go('#/tasks');
    } catch (e) {
      ev.target.disabled = false;
      toast(e.message);
    }
  });
}

// 另一半綁定 Email / Google：臨時帳號變成正式帳號（同一個身分，不用重新加入）
// Google 綁定失敗的原因，換成看得懂的說明
let bindError = '';
let bindErrorExists = false;
let rejoinNotice = false;
function googleBindErrorText(err) {
  const t = `${(err && err.code) || ''} ${(err && err.message) || ''}`;
  bindErrorExists = false;
  if (/identity_already_exists|already linked|already (been )?registered|already exists|already in use/i.test(t)) {
    bindErrorExists = true;
    return '這個 Google 帳號已經有啾啾日記的帳號了（如果你之前用它建立過帳號，就是它）。按下面的「改用這個 Google 帳號登入」回到原本的帳號就好，不用再建立一次；之前寫的紀錄都還在。如果登入後又要你輸入分享碼，再輸入一次、等對方按同意就好。';
  }
  if (/manual_linking_disabled|manual linking|linking is disabled|綁定暫時不能用/i.test(t)) { console.warn('Google 綁定：Supabase 要開啟 Allow manual linking', t); return '用 Google 建立帳號現在暫時不能用。先用下面的 Email 建立，效果一樣。'; }
  if (/access_denied|not.*test user|unverified|blocked/i.test(t)) { console.warn('Google 綁定被擋：OAuth 同意畫面可能還在測試模式', t); return 'Google 沒有讓這次通過（可能是按了取消，或 Google 擋下來了）。可以再試一次，或改用下面的 Email 建立。'; }
  if (!err) { console.warn('Google 綁定沒完成：檢查 Supabase Redirect URLs'); return '從 Google 回來了，但帳號沒有建立完成。可以再試一次，或改用下面的 Email 建立。'; }
  console.warn('Google 綁定失敗', t); return '用 Google 建立帳號沒有成功。可以再試一次，或改用下面的 Email 建立。';
}
function viewBind(sentTo = '') {
  app.className = 'theme-fight';
  const bound = CloudDB.isBoundPartner();
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/" aria-label="返回">${ICON.back}</a>
      <h1>建立我的帳號</h1>
    </div>
    ${bound ? `<div class="card" style="gap:6px">
      <div class="bold">帳號建立好了：${esc(CloudDB.currentEmail() || '')}</div>
      <div class="muted">現在可以寫自己的美好和烏雲，也能和${esc(ownerName())}一起寫吵架議題。換手機時用這個帳號登入就好，不用再輸入分享碼。</div>
      <a class="btn small" href="#/" style="align-self:flex-start">回首頁開始寫</a>
    </div>
    <form class="card" id="pw-form" style="gap:10px">
      <div class="bold">設定帳號密碼</div>
      <div class="small muted">用 Email 建立帳號的話，設定帳號密碼後就能在別的手機用 Email 和密碼登入。這和加入時的 6 位數分享密碼不一樣。用 Google 建立的可以略過。</div>
      <input id="b-pass" class="input" type="password" autocomplete="new-password" minlength="8" maxlength="72" required placeholder="至少 8 個字" aria-label="新密碼">
      <button class="btn small" id="b-pass-save" type="submit">儲存密碼</button>
    </form>` : `
    <div class="muted">你現在是用分享碼加入的，還沒有自己的帳號，身分只存在這個瀏覽器裡，所以只能看、做任務。用 Email 或 Google 建立帳號之後：</div>
    <div class="card" style="gap:6px">
      <div>・可以寫自己的美好和烏雲時刻</div>
      <div>・可以和${esc(ownerName())}一起寫吵架議題</div>
      <div>・換手機或清掉瀏覽器資料，登入就回來了，不用${esc(ownerName())}再同意一次</div>
    </div>
    ${sentTo ? `<div class="card" style="background:var(--resolved-bg);border-color:transparent;gap:8px">
      <div class="bold" style="color:var(--resolved-ink)">確認信已經寄到 ${esc(sentTo)}</div>
      <div class="small">到信箱點信裡的連結就完成了。如果是在別的 App 或瀏覽器打開連結，回到這裡按下面的按鈕。</div>
      <button class="btn small secondary" id="b-check" style="align-self:flex-start">我已經點了連結</button>
    </div>` : ''}
    ${bindError ? `<div class="card" id="bind-error" role="alert" style="background:var(--open-bg);border-color:transparent;gap:4px">
      <div class="bold" style="color:var(--open-ink)">用 Google 建立帳號沒有成功</div>
      <div class="small" style="color:var(--open-ink)">${bindError}</div>
      ${bindErrorExists ? '<button class="btn small" id="b-login-google" style="align-self:flex-start">改用這個 Google 帳號登入</button>' : ''}
    </div>` : ''}
    <button class="btn secondary" id="b-google"${IN_APP ? ' hidden' : ''}>用 Google 建立</button>
    <form class="card" id="b-form" style="gap:10px">
      <label for="b-email" class="bold">用 Email 建立</label>
      <input id="b-email" class="input" type="email" autocomplete="email" required placeholder="you@example.com">
      <button class="btn" id="b-send" type="submit">寄確認信</button>
    </form>`}
  `;
  const pw = document.getElementById('pw-form');
  if (pw) pw.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const v = document.getElementById('b-pass').value;
    if (v.length < 8) { toast('密碼至少 8 個字'); return; }
    withBusy(document.getElementById('b-pass-save'), '儲存中…', async () => { await CloudDB.updatePassword(v); toast('密碼已設定'); document.getElementById('b-pass').value = ''; });
  });
  if (bound) return;
  const lg = document.getElementById('b-login-google');
  if (lg) lg.addEventListener('click', () => withBusy(lg, '前往 Google…', async () => {
    // 臨時身分登出，改用已經綁好的 Google 帳號登入；沒連到對方的話，回來後帶去輸入分享碼
    try { sessionStorage.setItem('rejoinAfterLogin', '1'); } catch (e) { /* 略過 */ }
    await CloudDB.signOut();
    bindError = ''; bindErrorExists = false;
    await CloudDB.signInWithGoogle();
  }));
  const g = document.getElementById('b-google');
  g.addEventListener('click', () => withBusy(g, '前往 Google…', async () => {
    try { sessionStorage.setItem('linkPending', '1'); } catch (e) { /* 略過 */ }
    try { await CloudDB.linkGoogle(); } catch (e) {
      try { sessionStorage.removeItem('linkPending'); } catch (x) { /* 略過 */ }
      bindError = googleBindErrorText({ code: '', message: e.message });
      viewBind();
      return;
    }
    await CloudDB.refreshUser(); viewBind();
  }));
  // Google 官方按鈕：在這個網站上直接完成，不用跳走
  if (!IN_APP && typeof GoogleButton !== 'undefined' && GoogleButton.enabled()) {
    const box = document.createElement('div'); box.className = 'gsi-box';
    g.after(box);
    GoogleButton.mount(box, async (token, nonce) => {
      try { await CloudDB.linkGoogleToken(token, nonce); } catch (e) {
        bindError = googleBindErrorText({ code: e.code || '', message: e.message });
        viewBind();
        return;
      }
      try { sessionStorage.setItem('linkPending', '1'); } catch (e) { /* 略過 */ }
      location.reload();
    }, 'signup_with').then((ok) => { if (ok) g.hidden = true; else box.remove(); });
    if (lg) {
      const box2 = document.createElement('div'); box2.className = 'gsi-box';
      lg.after(box2);
      GoogleButton.mount(box2, async (token, nonce) => {
        try { sessionStorage.setItem('rejoinAfterLogin', '1'); } catch (e) { /* 略過 */ }
        await CloudDB.signOut();
        bindError = ''; bindErrorExists = false;
        try { await CloudDB.signInWithGoogleToken(token, nonce); } catch (e) { toast('Google 登入沒有成功，請再試一次'); }
        location.reload();
      }).then((ok) => { if (ok) lg.hidden = true; else box2.remove(); });
    }
  }
  document.getElementById('b-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const email = document.getElementById('b-email').value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('Email 格式不對'); return; }
    withBusy(document.getElementById('b-send'), '寄送中…', async () => { await CloudDB.bindEmail(email); viewBind(email); });
  });
  const chk = document.getElementById('b-check');
  if (chk) chk.addEventListener('click', () => withBusy(chk, '確認中…', async () => {
    await CloudDB.refreshUser();
    if (CloudDB.isBoundPartner()) { toast('帳號建立好了！'); viewBind(); } else toast('還沒收到確認，請到信箱點連結（也看看垃圾信件匣）');
  }));
}

function viewPartnerSettings() {
  const info = CloudDB.partnerInfo();
  app.className = '';
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/" aria-label="返回">${ICON.back}</a>
      <h1>設定</h1>
    </div>
    <div class="card">
      <div class="bold">你的身分</div>
      <div class="muted">你用「${esc(info.name)}」這個名字加入，可以看${esc(ownerName())}分享給你的紀錄、做任務${CloudDB.isBoundPartner() ? '，也能一起新增、更新吵架議題' : ''}。</div>
    </div>
    <a class="card" href="#/bind" style="gap:4px">
      <div class="row between"><div class="bold">帳號</div><div class="muted">›</div></div>
      <div class="small muted">${CloudDB.isBoundPartner() ? `已建立帳號：${esc(CloudDB.currentEmail() || '')}` : '還沒建立帳號：建立後可以寫自己的美好和烏雲，也能一起寫吵架議題，換手機也不會不見'}</div>
    </a>
    ${CloudDB.isBoundPartner() ? `<div class="card">
      <div class="bold">登出</div>
      <div class="muted">登出後用你的帳號登入就能回來。</div>
      <button class="btn small secondary" id="logout">登出</button>
    </div>` : ''}
    ${pinCardHtml()}
    ${CloudDB.isBoundPartner() ? `<div class="card">
      <div class="bold">匯出我寫的紀錄</div>
      <div class="muted">把你自己寫的紀錄和照片存成備份檔。之後用自己的帳號或手機版「匯入備份」就能還原。</div>
      <button class="btn small secondary" id="export-mine">匯出我寫的紀錄</button>
    </div>` : ''}
    ${tourCard()}
    ${themeCard()}
    ${analyticsCard()}
    ${feedbackCard()}
    <div class="card">
      <div class="bold">離開</div>
      <div class="muted">只是不想在這支手機上看，選「這支手機登出」；要分開了，選「結束這段關係」，${esc(ownerName())}下次打開 App 會收到通知。</div>
      ${CloudDB.isBoundPartner() ? '' : '<div class="small muted">還沒建立帳號的話，登出後要重新用分享碼加入。</div>'}
      <button class="btn small secondary" id="leave">這支手機登出</button>
      <button class="btn small danger" id="end-rel">結束這段關係</button>
    </div>
  `;
  const logout = document.getElementById('logout');
  bindPinCard(viewPartnerSettings);
  if (logout) logout.addEventListener('click', async () => { await CloudDB.signOut(); photoUrlCache.clear(); go('#/login'); });

  document.getElementById('leave').addEventListener('click', async () => {
    if (CloudDB.isBoundPartner()) {
      if (!confirm('登出這支手機？之後用你的帳號登入就能回來。')) return;
      await CloudDB.signOut(); photoUrlCache.clear(); go('#/login');
      return;
    }
    if (!confirm(`確定要登出嗎？還沒建立帳號，登出後要重新用分享碼加入、等${ownerName()}同意。`)) return;
    await CloudDB.leaveShare();
    photoUrlCache.clear();
    go('#/join');
  });
  const exportMine = document.getElementById('export-mine');
  if (exportMine) exportMine.addEventListener('click', () => withBusy(exportMine, '準備中…', () => exportMyRecords()));
  document.getElementById('end-rel').addEventListener('click', async () => {
    const mineCount = (await DB.allRecords()).filter((r) => isMine(r) && !r.deletedAt).length;
    const bound = CloudDB.isBoundPartner();
    const msg = `結束和${ownerName()}的這段關係？你會看不到${ownerName()}的紀錄，${ownerName()}會收到通知。`
      + (mineCount ? `\n你寫的 ${mineCount} 則紀錄會留在${ownerName()}那邊、之後你就看不到了${bound ? '，建議先按「匯出我寫的紀錄」' : ''}。` : '');
    if (!confirm(msg)) return;
    const name = ownerName();
    await CloudDB.partnerEndRelationship();
    try { localStorage.setItem(`endedWith:${CloudDB.myId()}`, name); } catch (e) { /* 略過 */ }
    photoUrlCache.clear(); thumbUrlCache.clear();
    if (bound) { location.hash = '#/'; location.reload(); } else { await CloudDB.signOut(); go('#/login'); }
  });
}

function viewJoin(notice, code = '') {
  app.className = '';
  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;margin-top:40px">
      <div class="thumb" style="width:72px;height:72px;border-radius:99px">${ICON.lock}</div>
      <h1 class="title-xl">用分享碼加入</h1>
      <div class="muted">輸入對方給你的分享碼和分享密碼，對方按「同意」後就能看對方分享的紀錄、做任務。之後建立自己的帳號，也能一起寫。</div>
    </div>
    ${notice ? `<div class="card" style="background:var(--progress-bg);border-color:transparent;color:var(--progress-ink)">${esc(notice)}</div>` : ''}
    <form id="join-form" style="display:flex;flex-direction:column;gap:14px">
      <div class="field"><label for="j-code">分享碼</label>
        <input id="j-code" class="input" autocapitalize="characters" autocomplete="off" required value="${esc(/^[A-Za-z0-9]{6,12}$/.test(code) ? code.toUpperCase() : '')}" style="letter-spacing:4px;text-transform:uppercase"></div>
      ${digitBoxes('j-pass', '分享密碼（對方告訴你的 6 位數字）')}
      <div class="field"><label for="j-name">你的名字</label>
        <input id="j-name" class="input" maxlength="20" required placeholder="對方會看到這個名字"></div>
      <button class="btn" type="submit" id="join-btn">加入</button>
    </form>
    <div id="join-msg" class="muted" style="text-align:center"></div>
    <a class="btn secondary small" href="#/login" id="to-login">${rejoinNotice ? '回到首頁' : '我已經有帳號了，去登入'}</a>
  `;
  bindDigitBoxes(app);
  document.getElementById('to-login').addEventListener('click', async (ev) => {
    rejoinNotice = false;
    // 臨時帳號登出，才會回到登入畫面
    if (CloudDB.isSignedIn() && CloudDB.isAnonymous()) { ev.preventDefault(); await CloudDB.signOut(); go('#/login'); route(); }
  });
  document.getElementById('join-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = document.getElementById('join-btn');
    const msg = document.getElementById('join-msg');
    // 錯誤訊息放在按鈕旁邊也用小提示跳出來，手機鍵盤擋住時也看得到
    const fail = (t) => { msg.textContent = t; toast(t); msg.scrollIntoView({ block: 'center' }); };
    if (!SHARE_PASS_RE.test(document.getElementById('j-pass').value)) { fail('分享密碼是 6 位數字，再檢查一下'); return; }
    if (document.activeElement) document.activeElement.blur();
    btn.disabled = true;
    btn.textContent = '加入中…';
    msg.textContent = '';
    try {
      const slow = new Promise((_, rej) => setTimeout(() => rej(new Error('連線太久沒有回應，請確認網路後再按一次「加入」')), 20000));
      await Promise.race([slow, CloudDB.joinWithCode(
        document.getElementById('j-code').value.trim().toUpperCase(),
        document.getElementById('j-pass').value,
        document.getElementById('j-name').value.trim(),
      )]);
      track('partner_join_request');
      rejoinNotice = false;
      if (CloudDB.pendingJoin()) toast('已送出，等對方同意');
      go('#/');
      route();
    } catch (e) {
      btn.disabled = false;
      btn.textContent = '加入';
      fail(/anonymous sign-ins are disabled|signups not allowed/i.test(e.message)
        ? '分享碼加入暫時不能用，請稍後再試。一直不行的話，請對方到設定頁的「意見回饋」告訴我們。'
        : /captcha/i.test(e.message) ? '加入時被安全驗證擋住了，請把這個畫面截圖給對方。'
        : cloudErrorText(e));
    }
  });
}

// 另一半送出加入要求後，等主人同意
// 新登入的正式帳號：還沒選過身分、沒有紀錄、沒有分享碼，就要先選（結果記在雲端設定 role）
const roleCache = new Map();
async function needsRoleChoice() {
  const uid = CloudDB.myId();
  if (roleCache.has(uid)) return roleCache.get(uid);
  let need = false;
  try {
    const role = await DB.getSetting('role', null);
    let fresh = '';
    try { fresh = localStorage.getItem('newOwnerEmail') || ''; } catch (e) { fresh = ''; }
    if (!role && fresh && fresh === (CloudDB.currentEmail() || '').toLowerCase()) {
      await DB.setSetting('role', 'owner');
      try { localStorage.removeItem('newOwnerEmail'); } catch (e) { /* 略過 */ }
    } else if (!role) {
      const [recs, share] = await Promise.all([DB.allRecords(), CloudDB.getShare().catch(() => null)]);
      need = !recs.length && !share;
      if (!need) await DB.setSetting('role', 'owner');
    }
  } catch (e) { need = false; }
  roleCache.set(uid, need);
  return need;
}
function viewRoleChoice() {
  app.className = '';
  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;margin-top:32px">
      ${mascotHtml('happy', 120)}
      <h1 class="title-xl">歡迎！你是哪一位？</h1>
      <div class="muted">${esc(CloudDB.currentEmail() || '')}</div>
    </div>
    <button class="card role-card" id="role-owner">
      <div class="bold" style="font-size:17px">我要開始寫我們的日記</div>
      <div class="small muted">你會是這本日記的主人，之後可以邀請另一半加入。</div>
    </button>
    <button class="card role-card" id="role-partner">
      <div class="bold" style="font-size:17px">我是另一半，要加入對方的日記</div>
      <div class="small muted">對方已經在用啾啾日記、給了你分享碼。之前在對方的日記建立過帳號的話，選這個再輸入一次分享碼，之前寫的紀錄都會回來。</div>
    </button>
    <button class="text-link small" id="role-logout" style="background:none;border:none;cursor:pointer">登出，換別的帳號</button>
  `;
  document.getElementById('role-owner').addEventListener('click', async () => {
    await DB.setSetting('role', 'owner');
    roleCache.set(CloudDB.myId(), false);
    go('#/'); route();
  });
  document.getElementById('role-partner').addEventListener('click', () => { go('#/join'); });
  document.getElementById('role-logout').addEventListener('click', async () => { await CloudDB.signOut(); roleCache.clear(); go('#/login'); route(); });
}

function viewWaitingApproval() {
  const info = CloudDB.pendingJoin();
  let boundHint = '';
  try { boundHint = sessionStorage.getItem('boundPartnerHint') || ''; } catch (e) { boundHint = ''; }
  app.className = '';
  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;margin-top:40px">
      <div class="thumb" style="width:72px;height:72px;border-radius:99px">${ICON.heart}</div>
      <h1 class="title-xl">等 ${esc(info.owner_name || '對方')} 同意</h1>
      <div class="muted">已經送出加入要求了。請 ${esc(info.owner_name || '對方')} 打開 App，首頁就會看到你的加入要求，按「同意」之後你就看得到分享的紀錄。</div>
    </div>
    ${boundHint ? `<div class="card" id="bound-hint" style="background:var(--progress-bg);border-color:transparent;gap:8px">
      <div class="bold" style="color:var(--progress-ink)">你是「${esc(boundHint)}」嗎？</div>
      <div class="small" style="color:var(--progress-ink)">這本日記已經有一位建立過帳號的「${esc(boundHint)}」。如果那就是你，請改用原本的 Google 或 Email 登入，之前寫的紀錄才接得回來。用現在這樣加入的話，對方同意後，原本的帳號就不能再寫了。</div>
      <button class="btn small" id="w-use-account">我是${esc(boundHint)}，改用原本的帳號登入</button>
    </div>` : ''}
    <button class="btn${boundHint ? ' secondary' : ''}" id="w-check">對方同意了，重新看看</button>
    <button class="btn secondary small" id="w-leave">取消加入</button>
  `;
  const useAcc = document.getElementById('w-use-account');
  if (useAcc) useAcc.addEventListener('click', () => withBusy(useAcc, '', async () => {
    try { sessionStorage.removeItem('boundPartnerHint'); } catch (e) { /* 略過 */ }
    await CloudDB.leaveShare();
    go('#/login'); route();
  }));
  const check = document.getElementById('w-check');
  check.addEventListener('click', () => withBusy(check, '檢查中…', async () => {
    await CloudDB.refreshPartner();
    if (CloudDB.pendingJoin()) { toast('還沒同意，晚點再試試'); return; }
    route();
  }));
  document.getElementById('w-leave').addEventListener('click', async () => {
    if (!confirm('取消加入要求？')) return;
    await CloudDB.leaveShare();
    go('#/login');
  });
}

// ---------- 設定：分享給另一半（紀錄主人） ----------
async function shareCardHtml() {
  let share = null;
  let partners = [];
  let paused = false;
  try {
    share = await CloudDB.getShare();
    if (share) partners = await CloudDB.listPartners();
    if (share) paused = (await DB.getSetting('sharePaused', false)) === true;
  } catch (e) {
    return `<div class="card"><div class="bold">分享給另一半</div>
      <div class="muted">分享功能暫時載入不了，請稍後再打開一次。一直不行的話，可以到下面的「意見回饋」告訴我們。</div></div>`;
  }
  if (!share) {
    return `<div class="card" id="share-card">
      <div class="bold">分享給另一半</div>
      <div class="muted">產生分享碼和密碼給對方，對方就能看你「給對方看」和任務解鎖後的紀錄、做任務。對方用 Email 或 Google 建立自己的帳號後，還能寫自己的美好和烏雲，也能和你一起寫吵架議題；你寫的美好和烏雲，對方不能改。</div>
      <div class="field"><label for="s-name">你的名字（對方會看到）</label><input id="s-name" class="input" maxlength="${LIMITS.name}" value="${esc(NAMES.me)}"></div>
      ${digitBoxes('s-pass', '分享密碼（自己設 6 位數字，再告訴對方）')}
      <button class="btn small" id="s-create">產生分享碼</button>
    </div>`;
  }
  const joined = partners.filter((p) => p.approved !== false);
  const waiting = partners.filter((p) => p.approved === false);
  return `<div class="card" id="share-card">
    <div class="bold">分享給另一半</div>
    <div class="muted">按下面的按鈕把邀請連結傳給對方，6 位數分享密碼另外告訴對方。對方點連結就會看到加入畫面，分享碼已經幫忙填好。</div>
    <div class="share-code">${esc(share.code)}</div>
    <button class="btn small secondary" id="s-copy">分享邀請連結（不含密碼）</button>
    <div class="field"><label for="s-name">你的名字（對方會看到）</label>
      <div class="row"><input id="s-name" class="input grow" maxlength="20" value="${esc(share.owner_name)}"><button class="btn small" id="s-save-name">儲存</button></div></div>
    ${digitBoxes('s-pass', '改分享密碼（6 位數字）')}
    <button class="btn small secondary" id="s-save-pass">更改分享密碼</button>
    ${waiting.length ? `<div class="field" id="join-requests"><div class="label">想加入的人（要你同意）</div>
      <div class="muted small">另一半換手機或清掉瀏覽器重新加入時，也會出現在這裡；是同一個人的話，同意後會接回原本分享的紀錄。按「同意」時會再問你是同一個人還是新的對象。</div>
      ${waiting.map((p) => `<div class="row between"><span>${esc(p.name)}<span class="muted small">・${shortDate(p.joined_at.slice(0, 10))} 送出</span></span>
        <span class="row" style="gap:6px"><button class="btn small" data-approve-partner="${esc(p.uid)}" data-name="${esc(p.name)}">同意</button>
        <button class="btn small secondary" data-rm-partner="${esc(p.uid)}" data-name="${esc(p.name)}" data-pending="1">拒絕</button></span></div>`).join('')}
    </div>` : ''}
    <div class="field"><div class="label">已加入的人</div>
      ${joined.length ? joined.map((p) => `<div class="row between"><span>${esc(p.name)}<span class="muted small">・${shortDate(p.joined_at.slice(0, 10))} 加入</span></span>
        <button class="btn small secondary" data-rm-partner="${esc(p.uid)}" data-name="${esc(p.name)}">移除</button></div>`).join('') : '<div class="muted">還沒有人加入</div>'}
    </div>
    ${joined.length ? `<div class="field" id="pause-box" style="background:${paused ? 'var(--lock-bg)' : 'transparent'};border-radius:12px;padding:${paused ? '10px' : '0'}">
      <div class="row between"><div class="label" style="margin:0">暫停分享</div>
        <button class="btn small ${paused ? '' : 'secondary'}" id="s-pause" aria-pressed="${paused}">${paused ? '恢復分享' : '暫停'}</button></div>
      <div class="small muted">${paused ? `暫停中：${esc(joined[0].name)}現在看不到你寫的任何紀錄、照片和任務，對方自己寫的照舊。按「恢復分享」就回來，資料都不會動。` : `想先冷靜一下時可以暫停，${esc(joined[0].name)}會暫時看不到你寫的紀錄，隨時可以恢復。`}</div>
    </div>` : ''}
    <div class="btn-row">
      <button class="btn small secondary" id="s-renew">換新分享碼</button>
      <button class="btn small danger" id="s-stop">停止分享</button>
    </div>
  </div>`;
}

function bindShareCard() {
  const $ = (id) => document.getElementById(id);
  const saveWithNewCode = async (password, name) => {
    // 分享碼剛好重複時換一組再試
    for (let i = 0; i < 3; i++) {
      try { await CloudDB.saveShare(newShareCode(), password, name); return; } catch (e) {
        if (!/duplicate|unique/i.test(e.message)) throw e;
      }
    }
    throw new Error('產生分享碼失敗，請再試一次');
  };
  if ($('s-create')) $('s-create').addEventListener('click', async () => {
    const name = $('s-name').value.trim();
    const pass = $('s-pass').value;
    if (!name) { toast('請填你的名字'); return; }
    if (!SHARE_PASS_RE.test(pass)) { toast('分享密碼要 6 位數字'); return; }
    const visible = (await DB.allRecords()).filter((r) => !r.deletedAt && (r.visibility === 'shared' || (r.visibility === 'task' && r.unlocked))).length;
    if (visible && !confirm(`對方加入後，會看到 ${visible} 則「給對方看」的紀錄（包含以前寫的）。不想給這個人看的，請先改成上鎖。要繼續產生分享碼嗎？`)) return;
    await saveWithNewCode(pass, name);
    toast('分享碼產生好了');
    viewSettings();
  });
  if ($('s-copy')) $('s-copy').addEventListener('click', async () => {
    const code = document.querySelector('.share-code').textContent;
    const url = `${location.origin + location.pathname}?utm_source=invite&utm_medium=share#/join/${code}`;
    const text = `點這個連結，一起用啾啾日記：${url}（6 位數分享密碼我另外告訴你）`;
    // 手機會跳出分享畫面（LINE、訊息…）。要在按下的當下馬上叫出來，先做別的事 iPhone 會擋掉；不支援或失敗時改成複製
    if (navigator.share) {
      try { await navigator.share({ title: '一起用啾啾日記', text }); track('share_invite', { how: 'share' }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    track('share_invite', { how: 'copy' });
    try { await navigator.clipboard.writeText(text); toast('已複製，貼給另一半就可以了'); } catch (e) { prompt('複製下面這段文字', text); }
  });
  if ($('s-save-name')) $('s-save-name').addEventListener('click', async () => {
    const name = $('s-name').value.trim();
    if (!name) { toast('請填你的名字'); return; }
    await CloudDB.saveShare(document.querySelector('.share-code').textContent, null, name);
    toast('已儲存');
  });
  if ($('s-save-pass')) $('s-save-pass').addEventListener('click', async () => {
    const pass = $('s-pass').value;
    if (!SHARE_PASS_RE.test(pass)) { toast('分享密碼要 6 位數字'); return; }
    await CloudDB.saveShare(document.querySelector('.share-code').textContent, pass, $('s-name').value.trim());
    $('s-pass').value = ''; $('s-pass').dispatchEvent(new Event('input'));
    const joined = document.querySelectorAll('[data-rm-partner]');
    if (joined.length && confirm('分享密碼已更改。要不要順便移除目前已加入的人？\n（如果是擔心分享密碼外流就按「確定」；按「取消」對方會照常看得到）')) {
      for (const b of joined) await CloudDB.removePartner(b.dataset.rmPartner);
      toast('分享密碼已更改，也移除了已加入的人');
      viewSettings();
      return;
    }
    toast('分享密碼已更改，已加入的人不受影響');
  });
  if ($('s-pause')) $('s-pause').addEventListener('click', () => withBusy($('s-pause'), '', async () => {
    const next = $('s-pause').getAttribute('aria-pressed') !== 'true';
    if (next && !confirm('暫停分享？對方會暫時看不到你寫的紀錄、照片和任務，你隨時可以恢復。')) return;
    await DB.setSetting('sharePaused', next);
    if (next) track('pause_share');
    toast(next ? '已暫停分享' : '已恢復分享');
    viewSettings();
  }));
  if ($('s-renew')) $('s-renew').addEventListener('click', async () => {
    if (!confirm('換一組新的分享碼？舊的分享碼就不能再用來加入，已加入的人不受影響。')) return;
    await saveWithNewCode(null, $('s-name').value.trim());
    viewSettings();
  });
  if ($('s-stop')) $('s-stop').addEventListener('click', async () => {
    if (!confirm('停止分享後，所有已加入的人都會馬上看不到你的紀錄。確定嗎？')) return;
    await CloudDB.deleteShare();
    toast('已停止分享');
    viewSettings();
  });
  document.querySelectorAll('[data-approve-partner]').forEach((b) => b.addEventListener('click', async () => {
    if (await approveJoin(b, b.dataset.approvePartner, b.dataset.name)) viewSettings();
  }));
  document.querySelectorAll('[data-rm-partner]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm(b.dataset.pending ? `拒絕「${b.dataset.name}」加入？` : `移除「${b.dataset.name}」？對方會馬上看不到你的紀錄。`)) return;
    await CloudDB.removePartner(b.dataset.rmPartner);
    viewSettings();
  }));
}

// 同意有人用分享碼加入（首頁和設定頁共用）。已經有另一半、或已經有紀錄時，
// 先分清楚是「同一個人換手機」還是「新的對象」：新的對象要先結束上一段（封存或刪除），不然他會看到之前所有分享的紀錄
async function approveJoin(btn, uid, name) {
  const current = (await CloudDB.listPartners()).find((p) => p.approved !== false && p.uid !== uid);
  const hasRecords = (await liveRecords()).length > 0;
  const accounts = await CloudDB.partnerAccounts();
  const acc = (u) => accounts.find((a) => a.uid === u) || {};
  const joiner = acc(uid);
  if (joiner.bound && joiner.returning) {
    // 以前就在這本日記寫過紀錄的帳號回來了：不用再分同一個人還是新對象
    if (!(await choose(`${name} 回來了`, `這是之前一起寫日記的帳號，同意後${current ? `會取代目前的「${current.name}」，` : ''}之前寫的紀錄都會接回來。`, [
      { key: 'ok', label: `同意 ${name} 回來`, primary: true },
    ]))) return false;
  } else if (current && acc(current.uid).bound && !joiner.bound) {
    // 目前的另一半已經綁定帳號，新的是臨時身分：多半是同一個人換了瀏覽器，請他用原本的帳號登入，不要擠掉帳號
    const pick = await choose(`${name} 想加入`, `這可能是「${current.name}」換了手機或瀏覽器。建議先拒絕，請${current.name}用原本的 Email 或 Google 登入再加入，之前寫的紀錄才接得回來。`, [
      { key: 'reject', label: `先拒絕，請${current.name}用原本的帳號登入`, hint: `${current.name}照舊看得到，不受影響`, primary: true },
      { key: 'new', label: '是新的對象', hint: '先把之前的紀錄封存或刪除，新的人才看不到' },
      { key: 'replace', label: `還是同意，取代「${current.name}」的帳號`, hint: '原本帳號寫的紀錄會留著，但那個帳號就不能再寫了' },
    ]);
    if (!pick) return false;
    if (pick === 'reject') { await CloudDB.removePartner(uid); toast(`已拒絕，請${current.name}用原本的帳號登入再加入`); return true; }
    if (pick === 'new') { go(`#/end/${encodeURIComponent(uid)}`); return false; }
  } else if (current || hasRecords) {
    const before = current ? current.name : (NAMES.partner || '');
    const same = before && before === name;
    const pick = await choose(`${name} 想加入`, current ? `目前的另一半是「${before}」。如果是${before}換手機，同意後會接回原本分享的紀錄；如果是新的對象，請選下面的「是新的對象」。` : '你已經有一些紀錄了。', [
      { key: 'same', label: `是${before || '同一個人'}換手機或重新加入`, hint: '照舊看得到之前分享的紀錄', primary: same },
      { key: 'new', label: '是新的對象', hint: '先把之前的紀錄封存或刪除，新的人才看不到', primary: !same },
    ]);
    if (!pick) return false;
    if (pick === 'new') { go(`#/end/${encodeURIComponent(uid)}`); return false; }
  }
  let ok = false;
  await withBusy(btn, '', async () => {
    await CloudDB.approvePartner(uid);
    track('partner_approved');
    toast(`已同意 ${name} 加入，現在可以一起用了`);
    ok = true;
  });
  return ok;
}

// 把手機裡（試用時）的紀錄和照片搬上雲端；同一則紀錄重搬只會覆蓋，不會重複
// 匯入、搬上雲端時存一則紀錄：紀錄 id 在雲端是全部帳號共用的，
// 同一份備份匯入第二個帳號時 id 會撞到，就換一個新的 id 再存
async function putImportedRecord(r) {
  if (!usingCloud()) { await DB.putRecord(r); return r.id; }
  try { await CloudDB.putRecord(r); return r.id; } catch (e) {
    if (!/row-level security|duplicate|violates/i.test(e.message)) throw e;
    const copy = { ...r, id: DB.uid() };
    await CloudDB.putRecord(copy);
    return copy.id;
  }
}

// since：只搬這個時間之後新增或改過的（登入過又登出、在手機裡寫了新的，下次登入時補搬）
async function migrateLocalToCloud(progress = () => {}, since = 0) {
  const records = (await LocalDB.allRecords()).filter((r) => (r.updatedAt || r.createdAt || 0) > since);
  const ids = new Set(records.map((r) => r.id));
  const photos = (await LocalDB.allPhotos()).filter((p) => ids.has(p.recordId) || (p.createdAt || 0) > since);
  let done = 0;
  let skipped = 0;
  for (const p of photos) {
    // 超過免費帳號的雲端照片額度時，剩下的照片留在手機裡，紀錄照樣搬
    if (skipped) { skipped++; continue; }
    try { await CloudDB.putPhoto(p); } catch (e) {
      if (!/row-level security|policy|quota/i.test(e.message)) throw e;
      skipped = 1;
      continue;
    }
    progress(`搬照片中… ${++done} / ${photos.length}`);
  }
  done = 0;
  for (const r of records) {
    await putImportedRecord(r);
    progress(`搬紀錄中… ${++done} / ${records.length}`);
  }
  const localNames = await LocalDB.getSetting('names', null);
  if (localNames && (localNames.me || localNames.partner) && !(await CloudDB.getSetting('names', null))) await CloudDB.setSetting('names', localNames);
  const localCats = await LocalDB.getSetting('categories', null);
  if (localCats) await CloudDB.setSetting('categories', [...new Set([...(await getCategories()), ...localCats])]);
  await LocalDB.setSetting('migratedAt', Date.now());
  return { records: records.length, photos: photos.length - skipped, skipped };
}

// 自己的帳號登入後：記住這支手機登入過，第一次登入時自動把試用的紀錄搬上雲端
async function afterOwnerLogin() {
  if (!usingCloud() || CloudDB.isAnonymous() || isPartner()) return;
  // Google 登入回來時記一次：帳號 10 分鐘內建立的算註冊，其他算登入
  try {
    if (sessionStorage.getItem('googlePending')) {
      sessionStorage.removeItem('googlePending');
      track(Date.now() - CloudDB.createdAtMs() < 600000 ? 'sign_up' : 'login', { method: 'google' });
    }
  } catch (e) { /* 略過 */ }
  await LocalDB.setSetting('hasAccount', true);
  numbersChecked = false; // 換成雲端資料後重新檢查舊紀錄的編號
  // 第一次登入搬全部；之後登出時在手機裡寫的新紀錄，下次登入也會自動補搬
  const since = (await LocalDB.getSetting('migratedAt', null)) || 0;
  const count = (await LocalDB.allRecords()).filter((r) => (r.updatedAt || r.createdAt || 0) > since).length;
  if (!count) { await LocalDB.setSetting('migratedAt', Date.now()); return; }
  toast(`正在把手機裡的 ${count} 則紀錄搬上雲端…`);
  try {
    const n = await migrateLocalToCloud(() => {}, since);
    toast(`已搬上雲端：${n.records} 則紀錄、${n.photos} 張照片${n.skipped ? `；另外 ${n.skipped} 張超過免費雲端額度，還留在這支手機裡` : ''}`);
  } catch (e) {
    toast('搬上雲端失敗，可以到設定頁再試一次：' + e.message);
  }
}

// 從重設密碼信回來：設定新密碼
function viewResetPassword() {
  app.className = '';
  app.innerHTML = `
    <div class="topbar"><h1>設定新密碼</h1></div>
    <form id="reset-form" style="display:flex;flex-direction:column;gap:14px">
      <div class="field"><label for="new-pass">新密碼（至少 8 個字）</label>
        <input id="new-pass" class="input" type="password" autocomplete="new-password" minlength="8" maxlength="72" required></div>
      <button class="btn" type="submit" id="reset-btn">更新密碼</button>
    </form>
  `;
  document.getElementById('reset-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const btn = document.getElementById('reset-btn');
    withBusy(btn, '更新中…', async () => {
      await CloudDB.updatePassword(document.getElementById('new-pass').value);
      toast('密碼已更新');
      go('#/');
    });
  });
}
