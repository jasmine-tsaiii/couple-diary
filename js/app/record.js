// 啾啾日記 js/app/record.js：詳情、新增／編輯
// 所有 js/app/*.js 共用同一個全域範圍，依 index.html 的順序載入。

// ---------- 詳情 ----------
// 挑一則紀錄（相關紀錄用）：可以搜尋標題，最近的在上面
function pickRecord(list) {
  return new Promise((resolve) => {
    const sorted = list.slice().sort(byDateDesc);
    const box = document.createElement('div');
    box.className = 'celebrate wish-dlg pick-dlg';
    box.innerHTML = `<div class="celebrate-box" style="align-items:stretch;text-align:left" role="dialog" aria-modal="true" aria-label="連結其他紀錄">
      <h2 style="font-size:20px">連結哪一則？</h2>
      <input class="input" id="pick-q" placeholder="搜尋標題" aria-label="搜尋標題">
      <div class="pick-list" id="pick-list"></div>
      <button class="btn secondary small" id="pick-cancel">取消</button>
    </div>`;
    document.body.appendChild(box);
    const done = (v) => { box.remove(); resolve(v); };
    const render = () => {
      const q = box.querySelector('#pick-q').value.trim().toLowerCase();
      const rows = sorted.filter((x) => !q || (x.title || '').toLowerCase().includes(q)).slice(0, 50);
      box.querySelector('#pick-list').innerHTML = rows.length ? rows.map((x) => `<button class="pick-item ${TYPES[x.type].theme}" data-pick="${esc(x.id)}"><span class="badge" style="background:var(--accent-bg);color:var(--accent-dark)">${TYPES[x.type].short}</span><span class="grow related-title">${esc(x.title)}</span><span class="muted small">${shortDate(x.date)}</span></button>`).join('') : '<div class="muted small">沒有可以連結的紀錄</div>';
      box.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => done(b.dataset.pick)));
    };
    box.querySelector('#pick-q').addEventListener('input', render);
    box.querySelector('#pick-cancel').addEventListener('click', () => done(null));
    render();
  });
}

async function viewDetail(id) {
  const r = await DB.getRecord(id);
  if (!r || r.deletedAt) { app.innerHTML = `<div class="empty">${r ? '這則在「最近刪除」裡，可以到設定頁救回來' : '找不到這則紀錄'}<a class="btn small" href="${r ? '#/settings' : '#/'}">${r ? '到設定頁' : '回首頁'}</a></div>`; return; }
  const all = await liveRecords();
  const conf = TYPES[r.type];
  const partner = isPartner();
  markSeen(r);
  if (usingCloud()) CloudDB.markRecordNotificationsRead(r.id).catch(() => {});
  const bound = partner && CloudDB.isBoundPartner();
  // 吵架議題兩個人都能改：主人全部都能改；另一半要綁定帳號，而且是分享給他的議題
  const fightEdit = r.type === 'fight' && (!partner || (bound && r.visibility === 'shared'));
  // 誰新增的（舊紀錄沒有記，就是主人）
  const mine = isMine(r);
  // 分類被刪掉的舊議題：標示出來（另一半沒有你的分類清單，不標）
  const catDeleted = r.type === 'fight' && r.category && !partner && mine && !(await getCategories()).includes(r.category);
  const authorText = usingCloud() && r.author ? `${authorLabel(r)}新增的` : '';
  const canDelete = partner ? bound && mine : mine;
  const backHref = r.archivedAt ? '#/archive' : r.type === 'fight' ? '#/fights' : `#/list/${r.type}`;
  // 剛存好跳過來的：底部放「完成」，回到這一類的列表（從願望清單寫的回到願望清單）
  let justSaved = null;
  try { justSaved = JSON.parse(sessionStorage.getItem('justSaved') || 'null'); sessionStorage.removeItem('justSaved'); } catch (e) { /* 略過 */ }
  const doneHref = justSaved && justSaved.id === r.id ? (justSaved.wish ? '#/wishes' : backHref) : '';
  const urls = [];
  for (const pid of r.photoIds || []) { const u = await photoUrl(pid); if (u) urls.push(u); }

  let photos = '';
  if (urls.length) photos = `<div class="detail-photos">${urls.map((u) => `<img src="${u}" alt="">`).join('')}</div>`;
  else if (r.type !== 'fight') photos = `<div class="detail-default">${r.type === 'happy' ? ICON.bigHeart : ICON.bigCloud}<div class="no" style="font-family:'Noto Serif TC',serif">No. ${numberOf(r, all)}</div></div>`;

  const visText = !mine ? '' : visLabel(r.visibility || 'shared') + (r.visibility === 'task' && r.unlocked ? '・已解鎖' : '');
  let task = '';
  if (r.visibility === 'task' && r.task && r.task.text) {
    const modeText = taskModeText(r.task.mode);
    if (!mine) {
      task = `<div class="card" style="background:var(--lock-bg);border-color:transparent"><div class="small bold" style="color:var(--lock)">你完成任務解鎖了這則</div><div>${esc(r.task.text)}</div></div>`;
    } else {
      let subs = [];
      if (usingCloud()) { try { subs = await CloudDB.submissions({ recordId: r.id }); } catch (e) { subs = []; } }
      const subCards = [];
      for (const sub of subs) {
        let img = '';
        if (sub.photo_path) {
          const blob = await CloudDB.taskPhoto(sub.photo_path);
          if (blob) img = `<img src="${URL.createObjectURL(blob)}" alt="任務照片" style="width:100%;border-radius:12px">`;
        }
        const stText = { pending: '等你確認', approved: '已通過', rejected: '已退回' }[sub.status] + (sub.status === 'rejected' && sub.review_note ? `：${esc(sub.review_note)}` : '');
        subCards.push(`<div class="card" style="gap:6px">
          <div class="row between"><span class="bold">${esc(liveOther(sub.partner_name))} 送出的任務</span><span class="small muted">${shortDate(sub.created_at.slice(0, 10))}・${stText}</span></div>
          ${sub.note ? `${r.task.mode === 'answer' ? `<div class="small bold" style="color:var(--lock)">${esc(liveOther(sub.partner_name))}的回答</div>` : ''}<div class="prose">${esc(sub.note)}</div>` : ''}
          ${img}
          ${sub.status === 'pending' ? `<div class="btn-row"><button class="btn small" data-approve="${esc(sub.id)}">通過並解鎖</button><button class="btn small secondary" data-reject="${esc(sub.id)}" data-photo="${esc(sub.photo_path || '')}">退回</button></div>` : ''}
        </div>`);
      }
      task = `<div class="card" style="background:var(--lock-bg);border-color:transparent">
        <div class="small bold" style="color:var(--lock)">解鎖任務（${modeText}）</div><div>${esc(r.task.text)}</div>
        <div class="small" style="color:var(--lock)">${r.unlocked ? '已經解鎖，對方看得到這則。' : usingCloud() ? '對方完成任務、你按「通過」之後，對方就看得到這則。' : '雲端版開啟分享碼後，對方才能做任務。'}</div>
        ${r.unlocked ? '<button class="btn small secondary" id="relock">重新上鎖</button>' : ''}
      </div>${subCards.join('')}`;
    }
  }

  // 烏雲時刻的事後反思：氣頭上寫下的，冷靜之後可以補上新的想法
  let reflectPart = '';
  if (r.type === 'cloud') {
    const rf = r.reflections || [];
    reflectPart = `
      ${!mine ? (r.clearedAt ? `<div class="card" style="background:var(--resolved-bg);border-color:transparent;color:var(--resolved-ink)">☀️ ${shortDate(dateOf(r.clearedAt))} 已經放晴了</div>` : '')
        : `<div class="card" style="background:${r.clearedAt ? 'var(--resolved-bg)' : 'var(--cloud-bg)'};border-color:transparent;gap:6px">
          <div class="bold" style="color:${r.clearedAt ? 'var(--resolved-ink)' : 'var(--cloud-dark)'}">${r.clearedAt ? `☀️ ${shortDate(dateOf(r.clearedAt))} 已放晴` : '這片烏雲還在嗎？'}</div>
          <div class="small muted">${r.clearedAt ? '心情又回來了的話，可以取消放晴。' : '心情過去了、想通了，就按「已放晴」，印章冊的「烏雲放晴」會加 1。'}</div>
          <button class="btn small ${r.clearedAt ? 'secondary' : ''}" id="clear-btn" style="align-self:flex-start">${r.clearedAt ? '取消放晴' : '☀️ 已放晴'}</button>
        </div>`}
      <div class="field"><div class="label">事後反思</div>
        <div class="timeline">
          ${rf.length ? rf.map((f, i) => `<div class="tl-item">
            <div class="tl-rail"><div class="tl-dot"></div>${i < rf.length - 1 ? '<div class="tl-line"></div>' : ''}</div>
            <div class="tl-body"><div class="muted small">${shortDate(f.date)}</div><div class="prose">${esc(f.text)}</div>${!mine ? '' : `<button class="tl-del" data-del-rf="${esc(f.id)}">刪除</button>`}</div>
          </div>`).join('') : `<div class="muted">${!mine ? '還沒有反思。' : '冷靜下來之後，想法有沒有不一樣？可以隨時回來補寫。'}</div>`}
        </div>
      </div>
      ${!mine ? '' : `<div class="field"><label for="rf-text">寫下現在的想法</label>
        <input id="rf-date" class="input" type="date" min="1970-01-01" max="${today()}" value="${today()}" aria-label="反思日期">
        <textarea id="rf-text" class="textarea" maxlength="${LIMITS.reflection}" style="min-height:70px" placeholder="例如：後來想想，他那天其實很累，我也可以先問問他"></textarea>
        <button class="btn small" id="rf-add" style="align-self:flex-start">加入反思</button>
      </div>`}`;
  }

  // 另一半的回應：美好時刻的愛心、吵架議題的補充（雲端版才有）
  let notesPart = '';
  if (usingCloud() && (r.type === 'happy' || r.type === 'fight')) {
    const notes = await CloudDB.partnerNotes(r.id);
    const hearts = notes.filter((n) => n.kind === 'heart');
    const pnotes = notes.filter((n) => n.kind === 'note');
    // 對方寫的美好時刻：按愛心讓對方知道你也喜歡（兩個人都可以按）
    if (r.type === 'happy' && !mine) {
      const myHeart = hearts.some((h) => h.partner === CloudDB.myId());
      notesPart = `<button class="btn ${myHeart ? '' : 'secondary'}" id="heart-btn">${myHeart ? '❤️ 你喜歡這則（再按一次收回）' : '🤍 按愛心，讓' + authorLabel(r) + '知道你也喜歡'}</button>`;
    } else if (r.type === 'happy' && hearts.length) {
      notesPart = `<div class="card" style="background:var(--happy-bg);border-color:transparent;flex-direction:row;align-items:center"><span style="font-size:20px">❤️</span><span class="bold" style="color:var(--happy-dark)">${esc(hearts[0].partner_name)} 按了愛心</span></div>`;
    } else if (r.type === 'fight' && ((partner && !bound) || pnotes.length)) {
      notesPart = `<div class="card theme-fight" style="gap:10px">
        <div class="bold" style="color:var(--fight-text)">${partner ? '我的補充' : `${esc(liveOther(pnotes[0].partner_name))}的補充`}</div>
        ${partner && !bound ? `<div class="muted small">${esc(ownerName())}寫的內容你不能改，但可以在這裡補充你的想法，${esc(ownerName())}看得到。</div>` : ''}
        ${pnotes.map((n) => `<div class="field" style="gap:4px">
          <div class="row between"><span class="small muted">${shortDate(n.created_at.slice(0, 10))}</span>${partner ? `<button class="btn small secondary" data-del-pn="${esc(n.id)}">刪除</button>` : ''}</div>
          <div class="prose">${esc(n.text)}</div></div>`).join('')}
        ${partner && !bound ? `<textarea id="pn-text" class="input" rows="3" maxlength="${LIMITS.fightText}" placeholder="例如：我那天其實是因為…"></textarea>
        <button class="btn small" id="pn-add">送出補充</button>` : ''}
      </div>`;
    }
  }

  let fightPart = '';
  if (r.type === 'fight') {
    const s = r.status || 'open';
    const fu = r.followUps || [];
    const myLabel = partner ? `${esc(ownerName())}的想法` : `${esc(myName())}的想法`;
    const theirLabel = partner ? `${esc(CloudDB.partnerInfo().name)}的想法` : `${esc(partnerName())}的想法`;
    fightPart = `
      ${!fightEdit
        ? `<div class="field"><div class="label">狀態</div><span class="badge ${STATUS[s].cls}" style="align-self:flex-start">${STATUS[s].label}</span></div>
           ${s === 'resolved' && r.resolution ? `<div class="card"><div class="small bold" style="color:var(--fight-text)">我們怎麼解決的</div><p class="prose">${esc(r.resolution)}</p></div>` : ''}`
        : `<div class="field"><div class="label">狀態</div>
        <div class="opts cols-3">${Object.entries(STATUS).map(([k, v]) => `<button class="opt ${k === s ? 'on' : ''}" data-status="${k}">${v.label}</button>`).join('')}</div>
        ${s === 'resolved' ? '' : '<div class="small muted">和好之後按「已解決」，印章冊的「吵架和好」就會加 1。</div>'}
      </div>
      ${s === 'resolved' ? `<div class="field"><label for="resolution">我們怎麼解決的</label><textarea id="resolution" class="textarea" maxlength="${LIMITS.resolution}" style="min-height:70px" placeholder="例如：隔週輪流陪家人">${esc(r.resolution || '')}</textarea></div>` : ''}`}
      ${r.reason ? `<div class="card"><div class="small bold" style="color:var(--fight-text)">原因</div><p class="prose">${esc(r.reason)}</p></div>` : ''}
      ${r.myView || r.theirView ? `<div class="grid2">
        <div class="card"><div class="small bold" style="color:var(--fight-text)">${myLabel}</div><p class="prose" style="font-size:14px">${esc(r.myView || '—')}</p></div>
        <div class="card"><div class="small bold" style="color:var(--fight-text)">${theirLabel}</div><p class="prose" style="font-size:14px">${esc(r.theirView || '—')}</p></div>
      </div>` : ''}
      <div class="field"><div class="label">後續</div>
        <div class="timeline">
          ${fu.length ? fu.map((f, i) => `<div class="tl-item">
            <div class="tl-rail"><div class="tl-dot"></div>${i < fu.length - 1 ? '<div class="tl-line"></div>' : ''}</div>
            <div class="tl-body"><div class="muted small">${shortDate(f.date)}${followUpBy(f) ? `・${esc(followUpBy(f))}` : ''}</div><div>${esc(f.text)}</div>${fightEdit ? `<button class="tl-del" data-del-fu="${esc(f.id)}">刪除</button>` : ''}</div>
          </div>`).join('') : `<div class="muted">${fightEdit ? '還沒有後續，發生新進展時記下來吧。' : '還沒有後續。'}</div>`}
        </div>
      </div>
      ${partner && !bound && r.visibility === 'shared' ? `<a class="card" href="#/bind" style="background:var(--fight-bg);border-color:transparent;gap:4px">
        <div class="bold" style="color:var(--fight-dark)">想一起更新狀態、寫後續？</div>
        <div class="small muted">用 Email 或 Google 建立你自己的帳號後，就能和${esc(ownerName())}一起更新吵架議題 ›</div></a>` : ''}
      ${!fightEdit ? '' : `<div class="field"><label for="fu-text">新增後續</label>
        <input id="fu-date" class="input" type="date" min="1970-01-01" max="${today()}" value="${today()}" aria-label="後續日期">
        <div class="row"><input id="fu-text" class="input grow" maxlength="${LIMITS.followUp}" placeholder="發生了什麼新進展？"><button class="btn small" id="fu-add">加入</button></div>
      </div>`}`;
  }

  // 相關紀錄：同一件事的美好、烏雲、吵架可以互相連結（連結存在自己這則，兩邊都顯示；看不到的紀錄不會出現）
  const canLink = !r.archivedAt && mine && (!partner || bound);
  const ownLinks = (r.related || []).filter((x) => x !== r.id);
  const linked = all.filter((x) => x.id !== r.id && (ownLinks.includes(x.id) || (x.related || []).includes(r.id))).sort(byDateDesc);
  const relatedPart = linked.length || canLink ? `<div class="field"><div class="label">相關紀錄</div>
    ${linked.map((x) => `<div class="row related-row">
      <a class="card related-item ${TYPES[x.type].theme}" href="#/view/${esc(x.id)}"><span class="badge" style="background:var(--accent-bg);color:var(--accent-dark)">${TYPES[x.type].short}</span><span class="grow related-title">${esc(x.title)}</span><span class="muted small">${shortDate(x.date)}</span></a>
      ${canLink && ownLinks.includes(x.id) ? `<button class="icon-btn" data-unlink="${esc(x.id)}" aria-label="取消連結 ${esc(x.title)}">${ICON.x}</button>` : ''}
    </div>`).join('')}
    ${canLink ? '<button class="btn small secondary" id="link-add" style="align-self:flex-start">＋ 連結其他紀錄</button>' : ''}
    ${!linked.length && canLink ? '<div class="small muted">同一件事有開心也有不開心的部分？把它們連起來，之後回頭看比較清楚。</div>' : ''}
  </div>` : '';

  app.className = conf.theme;
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="${backHref}" aria-label="返回">${ICON.back}</a>
      <div class="grow"></div>
      ${r.archivedAt ? '' : (mine && (!partner || bound)) || fightEdit ? `<a class="btn small secondary" href="#/edit/${esc(r.id)}">編輯</a>` : ''}
    </div>
    ${r.archivedAt ? `<div class="card" style="background:var(--lock-bg);border-color:transparent"><div class="small" style="color:var(--lock)">這是 ${shortDate(dateOf(r.archivedAt))} 封存的紀錄，只有你看得到。</div></div>` : ''}
    <div class="field" style="gap:6px">
      <div class="row meta-row">
        <span class="badge" style="background:var(--accent-bg);color:var(--accent-dark)">${r.type === 'fight' ? esc(r.category || '沒選分類') + (catDeleted ? '（已刪除的分類）' : '') : conf.label}</span>
        ${r.type === 'fight' ? `<span class="muted small">No. ${numberOf(r, all)}</span>` : ''}
        <span class="muted small">${longDate(r.date)}</span>
        ${authorText ? `<span class="muted small">・${authorText}</span>` : ''}
        ${r.editedAt ? `<span class="muted small">・${shortDate(new Date(r.editedAt - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10))} 編輯過</span>` : ''}
      </div>
      <h1 style="font-size:24px">${esc(r.title)}</h1>
      <div class="muted">${esc((r.emojis || []).join(' '))}${(r.tags || []).length ? ' · ' + esc(r.tags.map((t) => '#' + t).join(' ')) : ''}</div>
      ${visText ? `<div class="small row" style="color:var(--lock);gap:4px">${r.visibility && r.visibility !== 'shared' ? ICON.lockSmall : ''}${visText}</div>` : ''}
    </div>
    ${photos}
    ${r.description ? `<p class="prose">${esc(r.description)}</p>` : ''}
    ${task}
    ${reflectPart}
    ${fightPart}
    ${notesPart}
    ${r.type === 'happy' && !r.archivedAt && cardSafe(r) ? `<a class="btn secondary small" href="#/card/record/${esc(r.id)}" style="align-self:flex-start">做成回憶小卡</a>` : ''}
    ${relatedPart}
    ${doneHref ? `<div class="done-bar"><a class="btn" id="done" href="${doneHref}"${doneHref === backHref ? ' data-back' : ''}>完成</a></div>` : ''}
    ${canDelete ? '<button class="btn danger small del-record" id="delete">刪除這則紀錄</button>' : ''}
    ${!partner && !canDelete ? `<div class="small muted" style="text-align:center">這則是${authorLabel(r)}寫的，只有${authorLabel(r)}能${r.type === 'fight' ? '刪除' : '修改和刪除'}。</div>` : ''}
  `;
  const saveLinks = async (ids) => {
    const latest = (await DB.getRecord(r.id)) || r;
    await DB.putRecord({ ...latest, related: ids, updatedAt: Date.now() });
    viewDetail(r.id);
  };
  const linkAdd = document.getElementById('link-add');
  if (linkAdd) linkAdd.addEventListener('click', async () => {
    const picked = await pickRecord(all.filter((x) => x.id !== r.id && !linked.some((y) => y.id === x.id)));
    if (picked) await saveLinks([...ownLinks, picked]);
  });
  app.querySelectorAll('[data-unlink]').forEach((b) => b.addEventListener('click', () => saveLinks(ownLinks.filter((x) => x !== b.dataset.unlink))));
  const heartBtn = document.getElementById('heart-btn');
  if (heartBtn) heartBtn.addEventListener('click', () => withBusy(heartBtn, '', async () => {
    const on = await CloudDB.toggleHeart(r.id);
    toast(on ? `已經讓${authorLabel(r)}知道你喜歡這則` : '已收回愛心');
    viewDetail(r.id);
  }));
  const pnAdd = document.getElementById('pn-add');
  if (pnAdd) pnAdd.addEventListener('click', () => {
    const text = document.getElementById('pn-text').value.trim();
    if (!text) { toast('先寫點什麼'); return; }
    withBusy(pnAdd, '送出中…', async () => {
      await CloudDB.addPartnerNote(r.id, text);
      toast(`已送出，${ownerName()}看得到`);
      viewDetail(r.id);
    });
  });
  app.querySelectorAll('[data-del-pn]').forEach((b) => b.addEventListener('click', () => {
    if (!confirm('刪除這則補充？')) return;
    withBusy(b, '', async () => { await CloudDB.deletePartnerNote(b.dataset.delPn); viewDetail(r.id); });
  }));
  if (fightEdit) {
    app.querySelectorAll('[data-status]').forEach((b) => b.addEventListener('click', () => withBusy(b, '', async () => {
      await updateRecord(r.id, (x) => { x.status = b.dataset.status; });
      track('fight_status_change', { status: b.dataset.status });
      viewDetail(r.id);
    })));
    const res = document.getElementById('resolution');
    if (res) res.addEventListener('change', async () => {
      try { await updateRecord(r.id, (x) => { x.resolution = res.value.trim(); }); toast('已儲存'); } catch (e) { toast('沒有存成功：' + e.message); }
    });
    const fuAdd = document.getElementById('fu-add');
    fuAdd.addEventListener('click', () => {
      const text = document.getElementById('fu-text').value.trim();
      if (!text) { toast('先寫一點內容'); return; }
      const date = document.getElementById('fu-date').value || today();
      if (!dateOk(date)) { toast('日期要在今天以前'); return; }
      withBusy(fuAdd, '加入中…', async () => {
        let movedToProgress = false;
        await updateRecord(r.id, (x) => {
          const list = x.followUps || [];
          if (list.length >= LIMITS.followUpsPerFight) throw new Error(`每個議題最多 ${LIMITS.followUpsPerFight} 則後續`);
          x.followUps = list.concat({ id: DB.uid(), date, text, by: partner ? CloudDB.partnerInfo().name : myName(), ...(usingCloud() ? { byUid: CloudDB.myId() } : {}) }).sort((a, b) => a.date.localeCompare(b.date));
          // 第一次加後續時，自動從「未解決」變成「處理中」
          if ((x.status || 'open') === 'open') { x.status = 'progress'; movedToProgress = true; }
        });
        if (movedToProgress) toast('已加入後續，狀態改成「處理中」');
        viewDetail(r.id);
      });
    });
    app.querySelectorAll('[data-del-fu]').forEach((b) => b.addEventListener('click', () => {
      if (!confirm('刪除這則後續？')) return;
      withBusy(b, '', async () => {
        await updateRecord(r.id, (x) => { x.followUps = (x.followUps || []).filter((f) => f.id !== b.dataset.delFu); });
        viewDetail(r.id);
      });
    }));
  }
  if (partner && canDelete) {
    const delBtn = document.getElementById('delete');
    delBtn.addEventListener('click', () => {
      if (!confirm(r.type === 'fight' ? `要刪除這個議題嗎？${ownerName()}那邊也會看不到。` : '要刪除這則嗎？刪除後就救不回來了。')) return;
      withBusy(delBtn, '', async () => {
        await CloudDB.partnerDeleteRecord(r.id);
        track('record_delete', { type: r.type });
        // 美好、烏雲是直接刪掉，照片也一起清掉（吵架議題會先放到最近刪除，照片先留著）
        if (r.type !== 'fight') for (const pid of r.photoIds || []) { try { await DB.deletePhoto(pid); } catch (e) { /* 之後再清 */ } }
        toast('已刪除'); go(backHref);
      });
    });
  }
  if (!mine) return;

  // 封存的紀錄在「封存的回憶」頁一起刪，這裡不單獨刪（刪了會找不到）
  if (r.archivedAt) { const d = document.getElementById('delete'); if (d) d.remove(); }
  const delBtn = partner || r.archivedAt ? null : document.getElementById('delete');
  if (delBtn) delBtn.addEventListener('click', async () => {
    if (!confirm(`要刪除這則嗎？會先移到設定頁的「最近刪除」，${TRASH_DAYS} 天內都可以救回來${usingCloud() ? '，這段時間對方也看不到' : ''}。`)) return;
    await updateRecord(r.id, (x) => { x.deletedAt = Date.now(); });
    track('record_delete', { type: r.type });
    toast(`已移到最近刪除，${TRASH_DAYS} 天內可以救回來`);
    go(backHref);
  });

  app.querySelectorAll('[data-approve]').forEach((b) => b.addEventListener('click', () => withBusy(b, '解鎖中…', async () => {
    await CloudDB.reviewSubmission(b.dataset.approve, true);
    track('task_approve');
    toast('已解鎖，對方看得到這則了');
    checkNewStamps().catch(() => {});
    viewDetail(r.id);
  })));
  app.querySelectorAll('[data-reject]').forEach((b) => b.addEventListener('click', () => {
    const why = prompt('退回這次的任務？對方可以再送一次。\n想說一下原因的話寫在這裡（可以不寫，最多 200 個字）：', '');
    if (why === null) return;
    withBusy(b, '', async () => {
      await CloudDB.reviewSubmission(b.dataset.reject, false, why.trim().slice(0, 200) || null);
      track('task_reject');
      // 退回的任務照片用不到了，順便刪掉
      if (b.dataset.photo) { try { await CloudDB.removeTaskPhoto(b.dataset.photo); } catch (e) { /* 刪不掉沒關係 */ } }
      viewDetail(r.id);
    });
  }));
  const relock = document.getElementById('relock');
  if (relock) relock.addEventListener('click', () => {
    if (!confirm('重新上鎖後，對方就看不到這則，要再完成一次任務才能解鎖。')) return;
    withBusy(relock, '', async () => {
      await updateRecord(r.id, (x) => { x.unlocked = false; });
      viewDetail(r.id);
    });
  });

  if (r.type === 'cloud') {
    const clearBtn = document.getElementById('clear-btn');
    clearBtn.addEventListener('click', () => withBusy(clearBtn, '', async () => {
      // 另一半的紀錄透過資料庫函式改，要明確送出「取消放晴」
      const wasCleared = !!r.clearedAt;
      const clearing = !r.clearedAt;
      await updateRecord(r.id, (x) => { if (x.clearedAt) { if (partner) x.clearedAt = null; else delete x.clearedAt; } else x.clearedAt = Date.now(); });
      if (clearing) track('cloud_cleared');
      if (!wasCleared) showClearMascot();
      viewDetail(r.id);
    }));
    const rfAdd = document.getElementById('rf-add');
    rfAdd.addEventListener('click', () => {
      const text = document.getElementById('rf-text').value.trim();
      if (!text) { toast('先寫一點內容'); return; }
      const date = document.getElementById('rf-date').value || today();
      if (!dateOk(date)) { toast('日期要在今天以前'); return; }
      withBusy(rfAdd, '加入中…', async () => {
        await updateRecord(r.id, (x) => {
          const list = x.reflections || [];
          if (list.length >= LIMITS.reflectionsPerRecord) throw new Error(`每則最多 ${LIMITS.reflectionsPerRecord} 則反思`);
          x.reflections = list.concat({ id: DB.uid(), date, text }).sort((a, b) => a.date.localeCompare(b.date));
        });
        viewDetail(r.id);
      });
    });
    app.querySelectorAll('[data-del-rf]').forEach((b) => b.addEventListener('click', () => {
      if (!confirm('刪除這則反思？')) return;
      withBusy(b, '', async () => {
        await updateRecord(r.id, (x) => { x.reflections = (x.reflections || []).filter((f) => f.id !== b.dataset.delRf); });
        viewDetail(r.id);
      });
    }));
  }

}

// ---------- 新增／編輯 ----------
// 新增到一半的草稿只存在這支手機（照片不存），存好或放棄時清掉
const DRAFT_KEY = 'couple-diary-draft';
let draftTimer = null;
function loadDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { return null; } }
function saveDraft(rec) {
  const hasText = rec.title || rec.description || rec.reason || rec.myView || rec.theirView;
  try { if (hasText) localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), rec: { ...rec, photoIds: [] } })); } catch (e) { /* 空間不足就算了 */ }
}
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* 略過 */ } }

async function viewForm(mode, arg) {
  let rec;
  if (mode === 'edit') {
    rec = await DB.getRecord(arg);
    if (!rec) { go('#/'); return; }
    rec = JSON.parse(JSON.stringify(rec));
  } else {
    const type = TYPES[arg] ? arg : 'happy';
    rec = {
      id: DB.uid(), type, authorId: 'me', title: '', date: today(), description: '',
      photoIds: [], emojis: [], tags: [], visibility: defaultVisibility(type), task: { text: '', mode: 'confirm' },
      category: '', reason: '', myView: '', theirView: '', status: 'open', resolution: '', followUps: [],
    };
    // 從「一起完成的事」過來：帶入標題和內容，不問草稿
    const prefill = type === 'happy' ? formPrefill : null;
    formPrefill = null;
    if (prefill) { rec.title = prefill.title; rec.description = prefill.description; rec.wishId = prefill.wishId; }
    // 上次寫到一半沒存（例如 App 被關掉）：問要不要接著寫
    const draft = prefill ? null : loadDraft();
    if (draft && draft.rec && TYPES[draft.rec.type]) {
      const label = draft.rec.title ? `「${draft.rec.title.slice(0, 20)}」` : '';
      if (confirm(`有一則${TYPES[draft.rec.type].label}${label}還沒儲存（${daysAgo(draft.savedAt) === 0 ? '今天' : daysAgo(draft.savedAt) + ' 天前'}寫的，照片要重新選）。要接著寫嗎？`)) {
        rec = { ...rec, ...draft.rec, id: rec.id, photoIds: [] };
      } else clearDraft();
    }
  }
  const all = await DB.allRecords();
  const cats = await getCategories();
  const originalType = rec.type;
  const partner = isPartner();
  // 另一半要先綁定帳號才能寫；能改自己寫的紀錄和分享的吵架議題。主人不能改另一半寫的美好、烏雲
  if (partner && !CloudDB.isBoundPartner()) { go('#/bind'); return; }
  if (mode === 'edit' && rec.type !== 'fight' && !isMine(rec)) { go(`#/view/${rec.id}`); return; }
  if (partner && mode === 'edit' && rec.type === 'fight' && rec.visibility !== 'shared') { go('#/fights'); return; }
  const fightAlwaysShared = () => rec.type === 'fight' && (mode === 'new' || originalVisibility === 'shared' || originalType !== 'fight');
  const originalVisibility = rec.visibility;
  const originalUnlocked = !!rec.unlocked;
  const loadedUpdatedAt = rec.updatedAt || 0;
  const contentKey = (x) => JSON.stringify({ ...x, updatedAt: 0, editedAt: 0, v: 0 });
  const loadedContent = contentKey(rec);
  let visTouched = mode === 'edit';
  let dirty = false;
  // 這次新加、還沒儲存的照片（按取消就丟掉）
  const newPhotos = new Map();
  const removedPhotos = new Set();
  let customEmojis = rec.emojis.filter((e) => !TYPES[rec.type].emojis.includes(e));
  let extraTags = [];

  // 把「新標籤」輸入框裡打的字加進標籤。存檔時也會叫一次，打了字沒按「加入」也不會不見
  function addTypedTag() {
    const el = document.getElementById('f-tag');
    const t = el ? el.value.trim().replace(/[#\s]/g, '').slice(0, LIMITS.tag) : '';
    if (!t) return false;
    if (!rec.tags.includes(t) && rec.tags.length >= LIMITS.tagsPerRecord) { toast(`標籤最多 ${LIMITS.tagsPerRecord} 個`); return false; }
    collect();
    if (!extraTags.includes(t)) extraTags.push(t);
    if (!rec.tags.includes(t)) rec.tags.push(t);
    el.value = '';
    dirty = true;
    return true;
  }

  // 還沒有另一半（試用、單人版）時不能出任務；已經是任務解鎖的舊紀錄照常顯示
  const taskOff = !partner && !usingCloud() && rec.visibility !== 'task';

  function collect() {
    const v = (id) => { const el = document.getElementById(id); return el ? el.value : undefined; };
    if (v('f-title') !== undefined) rec.title = v('f-title');
    if (v('f-date') !== undefined) rec.date = v('f-date');
    if (v('f-desc') !== undefined) rec.description = v('f-desc');
    if (v('f-reason') !== undefined) rec.reason = v('f-reason');
    if (v('f-my') !== undefined) rec.myView = v('f-my');
    if (v('f-their') !== undefined) rec.theirView = v('f-their');
    if (v('f-task') !== undefined) rec.task.text = v('f-task');
  }

  async function render() {
    const conf = TYPES[rec.type];
    app.className = conf.theme;
    const emojiList = [...conf.emojis, ...customEmojis.filter((e) => !conf.emojis.includes(e))];
    const tagList = [...new Set([...tagSuggestions(rec.type, all), ...extraTags, ...rec.tags])];
    const catList = [...new Set([...cats, ...all.filter((x) => x.type === 'fight' && !x.deletedAt).map((x) => x.category).filter(Boolean), ...(rec.category ? [rec.category] : [])])];

    const photoCells = [];
    for (const pid of rec.photoIds) {
      const url = newPhotos.has(pid) ? newPhotos.get(pid).url : await thumbUrl(pid);
      if (url) photoCells.push(`<div class="photo"><img src="${url}" alt=""><button class="remove" data-rm-photo="${esc(pid)}" aria-label="移除照片">${ICON.x}</button></div>`);
    }

    app.innerHTML = `
      <div class="topbar">
        <a class="icon-btn" href="${mode === 'edit' ? '#/view/' + esc(rec.id) : '#/'}" aria-label="取消">${ICON.back}</a>
        <h1 style="font-size:20px;text-align:center">${mode === 'edit' ? '編輯紀錄' : '新增紀錄'}</h1>
        <div style="width:44px"></div>
      </div>
      ${!partner || mode === 'new' ? `<div class="seg" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        ${Object.entries(TYPES).map(([k, t]) => `<button class="${k === rec.type ? 'on' : ''}" data-type="${k}">${t.label}</button>`).join('')}
      </div>` : ''}
      <div class="field"><label for="f-title">${rec.type === 'fight' ? '議題' : '標題'}</label>
        <input id="f-title" class="input" value="${esc(rec.title)}" placeholder="${rec.type === 'happy' ? '例如：一起去看海' : rec.type === 'cloud' ? '例如：約好的時間又遲到了' : '例如：回訊息太慢'}" maxlength="${LIMITS.title}"></div>
      <div class="field"><label for="f-date">日期</label>
        <input id="f-date" class="input" type="date" min="1970-01-01" max="${today()}" value="${esc(rec.date)}"></div>
      ${rec.type === 'fight' ? `
        <div class="field"><div class="label">分類</div>
          <div class="chips">
            ${catList.map((c) => `<button class="chip ${c === rec.category ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
            <button class="chip dashed" id="add-cat">＋ 自訂</button>
          </div></div>
        <div class="field"><label for="f-reason">原因</label>
          <textarea id="f-reason" class="textarea" maxlength="${LIMITS.fightText}" style="min-height:70px" placeholder="這次吵架是怎麼開始的？">${esc(rec.reason)}</textarea></div>
        <div class="field"><label for="f-my">${esc(partner ? ownerName() : myName())}的想法</label>
          <textarea id="f-my" class="textarea" maxlength="${LIMITS.fightText}" style="min-height:70px">${esc(rec.myView)}</textarea></div>
        <div class="field"><label for="f-their">${esc(partner ? `${CloudDB.partnerInfo().name}（你）` : partnerName())}的想法</label>
          <textarea id="f-their" class="textarea" maxlength="${LIMITS.fightText}" style="min-height:70px">${esc(rec.theirView)}</textarea></div>
        <div class="field"><div class="label">狀態</div>
          <div class="opts cols-3">${Object.entries(STATUS).map(([k, v]) => `<button class="opt ${k === rec.status ? 'on' : ''}" data-status="${k}">${v.label}</button>`).join('')}</div></div>
      ` : `
        <div class="field"><label for="f-desc">描述</label>
          <textarea id="f-desc" class="textarea" maxlength="${LIMITS.description}" placeholder="發生了什麼？">${esc(rec.description)}</textarea></div>
      `}
      ${mode === 'edit' && !isMine(rec) ? `<div class="small muted">照片只有寫這則的${esc(otherName())}能改。</div>` : `<div class="field"><div class="label">照片${rec.type === 'happy' ? '（可不放，沒放會顯示愛心和編號）' : '（可不放）'}</div>
        <div class="photos">
          ${photoCells.join('')}
          <label class="photo-add">${ICON.camera}上傳<input type="file" accept="image/*" multiple class="visually-hidden" id="f-photos"></label>
        </div>${rec.type === 'fight' ? '<div class="small muted">上傳對話截圖前看一下：截圖裡可能有其他人的名字或訊息，需要的話先裁掉。</div>' : ''}</div>`}
      <div class="field"><div class="label">心情（最多 ${MAX_EMOJIS} 個）</div>
        <div class="emoji-row">
          ${emojiList.map((e) => `<button class="emoji ${rec.emojis.includes(e) ? 'on' : ''}" data-emoji="${esc(e)}">${esc(e)}</button>`).join('')}
          <button class="emoji add" id="add-emoji" aria-label="選其他表情">${ICON.plusSmall}</button>
        </div>
        <div id="emoji-input-row" class="row" hidden>
          <input id="emoji-input" class="input grow" placeholder="用手機的表情鍵盤輸入一個表情" aria-label="自訂表情">
          <button class="btn small" id="emoji-ok">加入</button>
        </div></div>
      <div class="field"><label for="f-tag">感受標籤</label>
        <div class="chips">
          ${tagList.map((t) => `<button class="chip ${rec.tags.includes(t) ? 'on' : ''}" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}
        </div>
        <div class="row"><input id="f-tag" class="input grow" maxlength="${LIMITS.tag}" placeholder="自己打一個新標籤" enterkeyhint="done" aria-label="新標籤">
        <button class="btn small secondary" id="f-tag-add" type="button">加入</button></div></div>
      ${fightAlwaysShared() ? `<div class="small muted">${partner ? `吵架議題是兩個人的事，${esc(ownerName())}也看得到、也能一起更新。` : usingCloud() ? `吵架議題是兩個人的事，${esc(partnerName())}也看得到、也能一起更新狀態和後續。` : '吵架議題是兩個人的事，開啟分享後兩個人都看得到。'}</div>` : `<div class="field"><div class="label">誰可以看</div>
        <div class="opts cols-3">${Object.keys(VISIBILITY).map((k) => (k === 'task' && taskOff
          ? `<button class="opt" disabled aria-disabled="true">${esc(visLabel(k))}<span class="small muted" style="display:block">${isGuest() ? '註冊後可用' : '雙人版才有'}</span></button>`
          : `<button class="opt ${k === rec.visibility ? 'on' : ''}" data-vis="${k}">${esc(visLabel(k))}</button>`)).join('')}</div>
        ${rec.visibility === 'task' ? `
          <div class="muted">完成方式</div>
          <div class="opts cols-3">
            <button class="opt ${!['photo', 'answer'].includes(rec.task.mode) ? 'on' : ''}" data-taskmode="confirm">按「完成」就好</button>
            <button class="opt ${rec.task.mode === 'photo' ? 'on' : ''}" data-taskmode="photo">要上傳照片</button>
            <button class="opt ${rec.task.mode === 'answer' ? 'on' : ''}" data-taskmode="answer">要回答問題</button>
          </div>
          <div class="row between"><label for="f-task" class="muted">${rec.task.mode === 'answer' ? `想問${esc(otherName())}的問題` : '對方要完成的任務'}</label>
            <button class="btn small secondary tpl-btn" id="task-tpl" type="button">從範本選</button></div>
          <input id="f-task" class="input" maxlength="${LIMITS.task}" value="${esc(rec.task.text)}" placeholder="${rec.task.mode === 'answer' ? '例如：你覺得那天我為什麼不開心？' : '例如：帶我去吃早午餐，拍一張合照給我'}">
          ${mode === 'edit' && originalUnlocked && originalVisibility === 'task' ? `<div class="small muted">這則已經解鎖了，改任務內容不會重新上鎖，${esc(otherName())}還是看得到。想收回的話，改成「上鎖」。</div>` : ''}` : ''}
        <div class="muted small vis-help">${partner ? `<div>給${esc(ownerName())}看：${esc(ownerName())}看得到。</div><div>上鎖：只有你看得到，${esc(ownerName())}只會看到「有一則上鎖」。</div><div>任務解鎖：${esc(ownerName())}完成你出的任務、你按通過後才看得到。</div>`
          : usingCloud() ? `<div>給${esc(otherName())}看：${esc(otherName())}看得到。</div><div>上鎖：只有你看得到。</div><div>任務解鎖：${esc(otherName())}完成你出的任務、你按通過後才看得到。</div>`
          : `<div>現在是${isGuest() ? '試用' : '單人版'}，紀錄只存在這支手機，還不會分享給任何人。</div>${isGuest() ? '<div>註冊並邀請另一半之後，「給對方看」的對方看得到，「上鎖」的只有你看得到。</div>' : ''}<div>拿到這支手機的人還是看得到所有紀錄，擔心的話可以到設定頁開「App 解鎖碼」。</div>`}</div>
      </div>`}
      <button class="btn" id="save">${partner ? '儲存' : usingCloud() && (rec.visibility === 'shared' || fightAlwaysShared()) && rec.type !== 'happy' ? `儲存並給${esc(partnerName())}看` : '儲存紀錄'}</button>
    `;
    bind();
  }

  function rerender() { collect(); render(); }

  function bind() {
    app.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
      collect();
      if (b.dataset.type === rec.type) return;
      if (mode === 'edit' && b.dataset.type !== originalType && !confirm('換成別的類型後，這則會拿到新類型的新編號。確定要換嗎？')) return;
      if (mode === 'new' && (rec.emojis.length || rec.tags.length) && !confirm('換類型後，已經選的心情和標籤會清掉（標題、描述會保留）。確定要換嗎？')) return;
      rec.type = b.dataset.type;
      if (mode === 'new') { rec.emojis = []; rec.tags = []; customEmojis = []; extraTags = []; }
      if (!visTouched) rec.visibility = defaultVisibility(rec.type);
      dirty = true;
      render();
    }));
    app.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { collect(); rec.category = rec.category === b.dataset.cat ? '' : b.dataset.cat; render(); }));
    const addCat = document.getElementById('add-cat');
    if (addCat) addCat.addEventListener('click', async () => {
      const name = (prompt(`新分類的名字（最多 ${LIMITS.category} 個字）`) || '').trim().slice(0, LIMITS.category);
      if (!name) return;
      if (cats.length >= LIMITS.categories) { toast(`分類最多 ${LIMITS.categories} 個`); return; }
      collect();
      if (!cats.includes(name)) { cats.push(name); await DB.setSetting('categories', cats); }
      rec.category = name;
      render();
    });
    app.querySelectorAll('[data-status]').forEach((b) => b.addEventListener('click', () => { collect(); rec.status = b.dataset.status; render(); }));
    app.querySelectorAll('[data-emoji]').forEach((b) => b.addEventListener('click', () => {
      const e = b.dataset.emoji;
      collect();
      if (rec.emojis.includes(e)) rec.emojis = rec.emojis.filter((x) => x !== e);
      else if (rec.emojis.length >= MAX_EMOJIS) { toast(`最多選 ${MAX_EMOJIS} 個`); return; }
      else rec.emojis.push(e);
      render();
    }));
    document.getElementById('add-emoji').addEventListener('click', () => {
      const row = document.getElementById('emoji-input-row');
      row.hidden = false;
      document.getElementById('emoji-input').focus();
    });
    const addEmoji = () => {
      const val = document.getElementById('emoji-input').value.trim();
      if (!val) return;
      // 只取第一個字元群（一個表情，包含組合表情）
      const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter('zh', { granularity: 'grapheme' }).segment(val)][0].segment : [...val][0];
      if (!/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(seg)) { toast('這裡只能加表情符號，文字可以寫在標籤或描述裡'); return; }
      collect();
      if (!customEmojis.includes(seg) && !TYPES[rec.type].emojis.includes(seg)) customEmojis.push(seg);
      if (!rec.emojis.includes(seg)) {
        if (rec.emojis.length >= MAX_EMOJIS) toast(`已加到清單；最多選 ${MAX_EMOJIS} 個`);
        else rec.emojis.push(seg);
      }
      render();
    };
    document.getElementById('emoji-ok').addEventListener('click', addEmoji);
    document.getElementById('emoji-input').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); addEmoji(); } });
    app.querySelectorAll('[data-tag]').forEach((b) => b.addEventListener('click', () => {
      const t = b.dataset.tag;
      collect();
      rec.tags = rec.tags.includes(t) ? rec.tags.filter((x) => x !== t) : rec.tags.concat(t);
      render();
    }));
    document.getElementById('f-tag').addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' || ev.isComposing) return;
      ev.preventDefault();
      if (addTypedTag()) render();
    });
    document.getElementById('f-tag-add').addEventListener('click', () => { if (addTypedTag()) render(); });
    app.querySelectorAll('[data-vis]').forEach((b) => b.addEventListener('click', () => { collect(); rec.visibility = b.dataset.vis; visTouched = true; dirty = true; render(); }));
    // 有改過內容時，按返回要先確認，免得寫一半的長文不見
    app.oninput = () => { dirty = true; if (mode === 'new') { clearTimeout(draftTimer); draftTimer = setTimeout(() => { collect(); saveDraft(rec); }, 800); } };
    app.querySelector('.topbar .icon-btn').addEventListener('click', (ev) => {
      if ((dirty || newPhotos.size) && !confirm('還沒儲存，確定要離開嗎？寫的內容會不見。')) { ev.preventDefault(); return; }
      formGuard = null;
      clearTimeout(draftTimer);
      if (mode === 'new') clearDraft();
    });
    formGuard = { dirty: () => dirty || newPhotos.size > 0, leave: () => { clearTimeout(draftTimer); if (mode === 'new') clearDraft(); } };
    app.querySelectorAll('[data-taskmode]').forEach((b) => b.addEventListener('click', () => { collect(); rec.task.mode = b.dataset.taskmode; render(); }));
    const tpl = document.getElementById('task-tpl');
    if (tpl) tpl.addEventListener('click', () => { collect(); taskTemplateSheet((t) => { rec.task.mode = t.mode; rec.task.text = t.text; dirty = true; render(); }); });
    const photoInput = document.getElementById('f-photos');
    if (photoInput) photoInput.addEventListener('change', async (ev) => {
      collect();
      let files = [...ev.target.files];
      if (!files.length) return;
      const room = LIMITS.photosPerRecord - rec.photoIds.length;
      if (room <= 0) { toast(`每則最多 ${LIMITS.photosPerRecord} 張照片`); return; }
      if (files.length > room) { toast(`每則最多 ${LIMITS.photosPerRecord} 張，只加入前 ${room} 張`); files = files.slice(0, room); }
      // 雲端免費帳號的照片額度（這次要新增的也要算進去）
      let quotaNote = '';
      if (usingCloud()) {
        const q = await CloudDB.photoQuota();
        if (q && q.limit != null) {
          const left = q.limit - q.used - newPhotos.size;
          if (left <= 0) { ev.target.value = ''; showPaywall(q); return; }
          if (files.length > left) { quotaNote = `免費帳號的雲端照片只剩 ${left} 張，先加入前 ${left} 張`; files = files.slice(0, left); }
        }
      }
      toast(quotaNote || '照片處理中…');
      for (const f of files) {
        try {
          if (f.size > LIMITS.photoFileMB * 1024 * 1024) { toast(`照片超過 ${LIMITS.photoFileMB} MB，換一張試試`); continue; }
          if (f.type && !f.type.startsWith('image/')) { toast('只能選照片'); continue; }
          const blob = await compressImage(f);
          const id = DB.uid();
          newPhotos.set(id, { blob, url: URL.createObjectURL(blob) });
          rec.photoIds.push(id);
        } catch (e) { toast(e.message); }
      }
      render();
    });
    app.querySelectorAll('[data-rm-photo]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.rmPhoto;
      collect();
      rec.photoIds = rec.photoIds.filter((x) => x !== id);
      if (newPhotos.has(id)) newPhotos.delete(id); else removedPhotos.add(id);
      render();
    }));
    const saveBtn = document.getElementById('save');
    saveBtn.addEventListener('click', () => withBusy(saveBtn, '儲存中…', async () => {
      addTypedTag();
      collect();
      rec.title = rec.title.trim();
      if (!rec.title) { toast(rec.type === 'fight' ? '請填寫議題' : '請填寫標題'); document.getElementById('f-title').focus(); return; }
      if (!rec.date) rec.date = today();
      if (!dateOk(rec.date)) { toast('日期要在 1970 年到今天之間'); return; }
      if (fightAlwaysShared()) rec.visibility = 'shared';
      if (rec.visibility === 'task' && !rec.task.text.trim()) { toast('請填寫解鎖任務'); return; }
      if (mode === 'edit' && usingCloud() && rec.type !== 'fight' && (originalVisibility === 'shared' || (originalVisibility === 'task' && originalUnlocked)) && rec.visibility !== 'shared'
        && !confirm(`這則之前${otherName()}看得到，改成不給看之後就看不到了，但${otherName()}可能已經看過內容。確定要改嗎？`)) return;
      if (mode === 'edit') {
        const latest = await DB.getRecord(rec.id);
        const byOther = latest && usingCloud() && latest.editedBy && latest.editedBy !== CloudDB.myId();
        if (latest && (latest.updatedAt || 0) !== loadedUpdatedAt
          && !confirm(`${byOther ? `${otherName()}剛剛也改了這則` : '這則剛剛在別的裝置改過了'}。要用你現在的內容覆蓋嗎？按「取消」會重新載入最新的內容。`)) {
          viewForm('edit', rec.id);
          return;
        }
        // 解鎖狀態以最新的為準（對方可能剛剛才完成任務）
        if (latest && latest.visibility === 'task' && rec.visibility === 'task') { rec.unlocked = latest.unlocked; rec.unlockedAt = latest.unlockedAt; }
      }
      // 照片先傳；傳到一半或存紀錄失敗時，把這次已經傳上去的照片刪掉，免得佔空間
      const uploaded = [];
      const cleanup = async () => { for (const id of uploaded) { try { await DB.deletePhoto(id); } catch (e) { /* 刪不掉就算了 */ } } };
      let up = 0;
      try {
        for (const [id, p] of newPhotos) {
          saveBtn.textContent = `上傳照片 ${++up} / ${newPhotos.size}…`;
          await DB.putPhoto({ id, blob: p.blob, recordId: rec.id, createdAt: Date.now() });
          uploaded.push(id);
          if (usingCloud()) { try { await CloudDB.putThumb(id, await compressImage(p.blob, THUMB_SIDE, 0.75)); } catch (e) { /* 之後列表會自動補 */ } }
        }
      } catch (e) { await cleanup(); throw e; }
      const now = Date.now();
      // 另一半新增的議題由資料庫編號
      if (!partner && (!rec.no || rec.type !== originalType)) rec.no = await nextNumber(rec.type);
      rec.v = RECORD_VERSION;
      if (mode === 'edit' && (contentKey(rec) !== loadedContent || newPhotos.size || removedPhotos.size)) rec.editedAt = Date.now();
      // 改成不是「任務解鎖」時，解鎖狀態就不再保留
      if (rec.visibility !== 'task') rec.unlocked = false;
      rec.createdAt = rec.createdAt || now;
      rec.updatedAt = now;
      // 記下最後是誰改的，兩個人同時改時可以說是誰
      if (usingCloud()) rec.editedBy = CloudDB.myId();
      try { await DB.putRecord(rec); } catch (e) { await cleanup(); throw e; }
      // 紀錄存好之後，才刪掉這次移除的舊照片
      for (const id of removedPhotos) { try { await DB.deletePhoto(id); } catch (e) { /* 之後再清 */ } photoUrlCache.delete(id); thumbUrlCache.delete(id); }
      dirty = false;
      clearTimeout(draftTimer);
      if (mode === 'new') clearDraft();
      if (mode === 'new' && rec.wishId) { try { await Wishes.update(rec.wishId, { record_id: rec.id }); } catch (e) { /* 連不到清單也沒關係 */ } }
      toast('已儲存');
      if (mode === 'new') {
        const before = (await liveRecords()).length;
        if (before === 1) track('first_record', { type: rec.type });
        track('record_create', { type: rec.type, visibility: rec.visibility || 'shared', has_photo: (rec.photoIds || []).length > 0, author: partner ? 'partner' : 'me' });
      } else track('record_edit', { type: rec.type });
      markA2hsPending();
      if (mode === 'new' && isGuest()) { try { if ((await liveRecords()).length >= (IOS_SAFARI_TAB ? 1 : 3)) sessionStorage.setItem('signupNudge', '1'); } catch (e) { /* 略過 */ } }
      formGuard = null;
      try { sessionStorage.setItem('justSaved', JSON.stringify({ id: rec.id, wish: !!(mode === 'new' && rec.wishId) })); } catch (e) { /* 略過 */ }
      // 編輯完：直接退回原本那頁紀錄（不多一層）；新增完：用 replace 換掉表單，返回不會再回到剛剛的表單
      const viewHash = `#/view/${rec.id}`;
      if (mode === 'edit' && navPrev() === viewHash) history.back();
      else replaceHash(viewHash);
    }));
  }

  render();
}
