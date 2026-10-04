// 啾啾日記 js/app/settings.js：設定、結束這段關係
// 所有 js/app/*.js 共用同一個全域範圍，依 index.html 的順序載入。

// ---------- 設定：備份、分類 ----------
function blobToDataUrl(blob) {
  return new Promise((resolve) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.readAsDataURL(blob); });
}
// 只接受備份檔裡的圖片資料（data:image/...），不去抓外部網址
async function dataUrlToBlob(url) {
  if (typeof url !== 'string' || !/^data:image\/[a-z+]+;base64,/i.test(url)) throw new Error('備份檔裡的照片格式不對');
  return (await fetch(url)).blob();
}
// 備份檔裡的 id 只能是英數字，避免被拿來組出奇怪的網址或雲端路徑
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
function checkBackup(data) {
  if (!data || data.app !== 'couple-diary' || !Array.isArray(data.records)) throw new Error('這不是啾啾日記的備份檔');
  for (const r of data.records) {
    if (!r || !SAFE_ID.test(r.id) || !TYPES[r.type]) throw new Error('備份檔內容不對，沒有匯入');
    if (r.photoIds && (!Array.isArray(r.photoIds) || !r.photoIds.every((x) => SAFE_ID.test(x)))) throw new Error('備份檔內容不對，沒有匯入');
    if (r.visibility && !VISIBILITY[r.visibility]) r.visibility = 'locked';
    if (r.status && !STATUS[r.status]) r.status = 'open';
    if (r.deletedAt != null && typeof r.deletedAt !== 'number') delete r.deletedAt;
    if (r.clearedAt != null && typeof r.clearedAt !== 'number') delete r.clearedAt;
    if (r.date && !DATE_RE.test(r.date)) throw new Error('備份檔內容不對，沒有匯入');
    if (r.reflections && (!Array.isArray(r.reflections) || !r.reflections.every((f) => f && DATE_RE.test(f.date) && SAFE_ID.test(String(f.id))))) throw new Error('備份檔內容不對，沒有匯入');
    if (r.followUps && (!Array.isArray(r.followUps) || !r.followUps.every((f) => f && DATE_RE.test(f.date) && SAFE_ID.test(String(f.id))))) throw new Error('備份檔內容不對，沒有匯入');
  }
  for (const p of data.photos || []) if (!p || !SAFE_ID.test(p.id)) throw new Error('備份檔內容不對，沒有匯入');
}

function downloadFile(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// 閱讀版在 App 裡打開，按「存成 PDF」用手機的列印功能存檔（iPhone、Android 都內建）
function showReadView(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const css = [...doc.querySelectorAll('style')].map((x) => x.textContent).join('\n').replace(/(^|\})\s*body\s*\{/g, '$1:host{display:block;');
  const view = document.createElement('div');
  view.className = 'read-view';
  const isIOS = /iphone|ipad|ipod|Macintosh/i.test(navigator.userAgent);
  view.innerHTML = `<div class="read-toolbar">
      <button class="btn small secondary" id="read-close">關閉</button>
      <button class="btn small" id="read-print">存成 PDF</button>
    </div>
    <div class="read-hint small muted">${isIOS ? '按「存成 PDF」後，在列印畫面點右上角的分享按鈕，選「儲存到檔案」或直接傳給對方。' : '按「存成 PDF」後，印表機選「另存為 PDF」再按下載。'}</div>
    <div class="read-body"></div>`;
  const root = view.querySelector('.read-body').attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${css}</style>${doc.body.innerHTML}`;
  document.body.appendChild(view);
  document.body.classList.add('reading');
  const close = () => { view.remove(); document.body.classList.remove('reading'); document.title = oldTitle; };
  const oldTitle = document.title;
  document.title = doc.title || oldTitle; // 存 PDF 時的檔名
  view.querySelector('#read-close').addEventListener('click', close);
  view.querySelector('#read-print').addEventListener('click', () => window.print());
}

// 閱讀版：一個自己就能打開的網頁檔，照片直接包在裡面
async function buildReadableExport(onlyShared = false) {
  const all = (await liveRecords()).filter((r) => !onlyShared || r.visibility === 'shared' || (r.visibility === 'task' && r.unlocked)).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || 0) - (b.createdAt || 0));
  const photoData = {};
  // 只放要匯出的紀錄用到的照片
  for (const pid of all.flatMap((r) => r.photoIds || [])) {
    const ph = await DB.getPhoto(pid);
    if (ph) photoData[pid] = await blobToDataUrl(ph.blob);
  }
  const colors = { happy: '#A33A52', cloud: '#8A5A12', fight: '#3E4C8A' };

  const card = (r, i) => {
    const imgs = (r.photoIds || []).map((id) => photoData[id]).filter(Boolean);
    const vis = r.visibility && r.visibility !== 'shared' ? `<span class="lock">${VISIBILITY[r.visibility]}</span>` : '';
    let fight = '';
    if (r.type === 'fight') {
      const st = STATUS[r.status || 'open'].label;
      fight = `<div class="meta">分類：${esc(r.category || '沒選分類')}・狀態：${st}</div>
        ${r.reason ? `<h4>原因</h4><p>${esc(r.reason)}</p>` : ''}
        ${r.myView ? `<h4>${esc(myName())}的想法</h4><p>${esc(r.myView)}</p>` : ''}
        ${r.theirView ? `<h4>${esc(partnerName())}的想法</h4><p>${esc(r.theirView)}</p>` : ''}
        ${r.resolution ? `<h4>我們怎麼解決的</h4><p>${esc(r.resolution)}</p>` : ''}
        ${(r.followUps || []).length ? `<h4>後續</h4><ul>${r.followUps.map((f) => `<li><b>${shortDate(f.date)}</b> ${esc(f.text)}</li>`).join('')}</ul>` : ''}`;
    }
    return `<article>
      <div class="meta">${r.type === 'fight' ? '' : `No. ${numberOf(r, all)}・`}${longDate(r.date)} ${vis}</div>
      <h3>${esc(r.title)} <span class="emo">${esc((r.emojis || []).join(''))}</span></h3>
      ${(r.tags || []).length ? `<div class="tags">${esc(r.tags.map((t) => '#' + t).join(' '))}</div>` : ''}
      ${r.description ? `<p>${esc(r.description)}</p>` : ''}
      ${(r.reflections || []).length ? `<h4>事後反思</h4><ul>${r.reflections.map((f) => `<li><b>${shortDate(f.date)}</b> ${esc(f.text)}</li>`).join('')}</ul>` : ''}
      ${fight}
      ${imgs.length ? `<div class="imgs">${imgs.map((u) => `<img src="${u}" alt="">`).join('')}</div>` : ''}
    </article>`;
  };

  const section = (type) => {
    const list = all.filter((r) => r.type === type);
    if (!list.length) return '';
    const goal = TYPES[type].goal ? ` ${list.length} / ${TYPES[type].goal}` : ` 共 ${list.length} 則`;
    return `<section style="--c:${colors[type]}"><h2>${TYPES[type].label}<small>${goal}</small></h2>${list.map(card).join('')}</section>`;
  };

  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'">
<title>啾啾日記（閱讀版 ${today()}）</title>
<style>
body{margin:0;background:#FBF7F2;color:#2B2320;font-family:"Noto Sans TC",-apple-system,"PingFang TC","Microsoft JhengHei",sans-serif;line-height:1.7}
main{max-width:720px;margin:0 auto;padding:32px 20px 64px}
h1{font-family:"Noto Serif TC",serif;font-size:32px;margin:0 0 4px}
.sub{color:#6B5E57;font-size:14px;margin-bottom:24px}
h2{color:var(--c);font-family:"Noto Serif TC",serif;border-bottom:2px solid var(--c);padding-bottom:6px;margin:36px 0 16px}
h2 small{font-family:sans-serif;font-size:14px;color:#6B5E57;margin-left:8px;font-weight:400}
article{background:#fff;border:1px solid #EFE6DD;border-radius:16px;padding:16px 18px;margin-bottom:14px;break-inside:avoid}
h3{margin:2px 0 4px;font-size:18px}.emo{font-weight:400}
h4{margin:10px 0 0;font-size:13px;color:var(--c)}
p{margin:6px 0;white-space:pre-wrap}ul{margin:4px 0;padding-left:20px}
.meta{font-size:13px;color:#6B5E57}.tags{font-size:13px;color:var(--c)}
.lock{display:inline-block;background:#EDE6F2;color:#4B3A66;border-radius:99px;padding:0 8px;font-size:12px;margin-left:4px}
.imgs{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.imgs img{width:calc(50% - 4px);border-radius:12px;object-fit:cover;max-height:320px}
@media print{body{background:#fff}article{border-color:#ddd}}
</style></head><body><main>
<h1>${esc(diaryTitle())}</h1>
<div class="sub">匯出於 ${longDate(today())}・共 ${all.length} 則紀錄</div>
${section('happy')}${section('cloud')}${section('fight')}
${all.length ? '' : '<p>還沒有任何紀錄。</p>'}
</main></body></html>`;
}

// 設定頁分成幾區，上方有捷徑可以直接跳過去
const SETTING_SECTIONS = [['share', '分享'], ['us', '我們'], ['records', '整理紀錄'], ['backup', '備份'], ['account', '帳號與安全'], ['other', '其他']];
let settingsJumped = false;
window.addEventListener('hashchange', () => { settingsJumped = false; });
async function viewSettings() {
  const cats = await getCategories();
  const everything = await DB.allRecords();
  const quota = usingCloud() ? await CloudDB.photoQuota() : null;
  let archivedCount = 0;
  if (usingCloud()) { try { archivedCount = (await CloudDB.archivedRecords()).length; } catch (e) { archivedCount = 0; } }
  const all = everything.filter((r) => !r.deletedAt);
  const trash = everything.filter((r) => r.deletedAt).sort((a, b) => b.deletedAt - a.deletedAt);
  const tagCount = new Map();
  everything.forEach((r) => (r.tags || []).forEach((t) => tagCount.set(t, (tagCount.get(t) || 0) + 1)));
  const usedTags = [...tagCount].sort((a, b) => b[1] - a[1]);
  const lastBackup = await DB.getSetting('lastBackupAt', null);
  const persisted = await isPersisted();
  // 雲端模式下，看看這支手機裡有沒有還沒搬上去的舊紀錄
  let localCount = 0;
  if (usingCloud()) { try { localCount = (await LocalDB.allRecords()).length; } catch (e) { localCount = 0; } }
  const migratedAt = usingCloud() ? await LocalDB.getSetting('migratedAt', null) : null;
  const shareCard = usingCloud() ? await shareCardHtml() : '';
  app.className = '';
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/me" aria-label="返回">${ICON.back}</a>
      <h1>設定</h1>
    </div>
    <nav class="set-nav" aria-label="設定分類">${SETTING_SECTIONS.map(([id, label]) => `<button class="chip" data-jump="set-${id}">${label}</button>`).join('')}</nav>
    <h2 class="section-title set-sec" id="set-share">分享給另一半</h2>
    ${isGuest() ? `<div class="card" style="background:var(--happy-bg);border-color:transparent">
      <div class="bold" style="color:var(--happy-dark)">註冊或登入</div>
      <div class="small" style="color:var(--happy-dark)">現在的紀錄只存在這支手機。在這支手機註冊或登入後會自動搬上雲端，換手機不會不見，也能產生分享碼給另一半。</div>
      <a class="btn small" href="#/login">註冊／登入</a>
    </div>` : ''}
    ${shareCard}
    ${!usingCloud() && !isGuest() ? '<div class="card small muted">分享給另一半要用雲端帳號。</div>' : ''}
    <h2 class="section-title set-sec" id="set-us">我們</h2>
    <div class="card">
      <div class="bold">我們的名字</div>
      <div class="grid2">
        <div class="field"><label for="set-me">你的名字</label><input id="set-me" class="input" maxlength="${LIMITS.name}" value="${esc(NAMES.me)}"></div>
        <div class="field"><label for="set-partner">伴侶的名字</label><input id="set-partner" class="input" maxlength="${LIMITS.name}" value="${esc(NAMES.partner)}"></div>
      </div>
      <div class="field"><label for="set-since">在一起的日期（可不填，首頁會顯示在一起第幾天）</label><input id="set-since" class="input" type="date" min="1970-01-01" max="${today()}" value="${esc(NAMES.since || '')}"></div>
      <button class="btn small" id="save-names">儲存</button>
    </div>
    <div class="card" style="gap:10px">
      <div class="bold">吉祥物顏色</div>
      <div class="small muted">首頁的兩隻小鳥叫啾啾（左）和啵啵（右），代表你們兩個，顏色可以自己挑${usingCloud() ? `，${esc(partnerName())}看到的也是這個顏色` : ''}。</div>
      <div id="mascot-preview" style="align-self:center">${mascotHtml('happy', 150)}</div>
      ${[['left', '左邊（啾啾）'], ['right', '右邊（啵啵）']].map(([side, label]) => `<div class="field" style="gap:6px"><div class="label">${label}</div>
        <div class="swatches">${(window.Mascot ? window.Mascot.COLORS : []).map(([n, body]) => {
          const on = ((MASCOT_PICK || (window.Mascot && window.Mascot.DEFAULT) || {})[side]) === n;
          return `<button class="swatch ${on ? 'on' : ''}" data-mside="${side}" data-mcolor="${esc(n)}" aria-pressed="${on}" title="${esc(n)}"><span style="background:${body}"></span>${esc(n)}</button>`;
        }).join('')}</div></div>`).join('')}
    </div>
    <h2 class="section-title set-sec" id="set-records">整理紀錄</h2>
    <div class="card">
      <div class="bold">吵架議題分類</div>
      <div class="small muted">點分類名字可以改名，用這個分類的議題會一起改。</div>
      <div class="chips">${cats.map((c) => `<span class="chip" style="display:inline-flex;align-items:center;gap:6px"><button data-edit-cat="${esc(c)}" aria-label="改名 ${esc(c)}" style="border:none;background:none;padding:0;font:inherit;color:inherit">${esc(c)}</button><button data-rm-cat="${esc(c)}" aria-label="刪除 ${esc(c)}" style="border:none;background:none;padding:0;display:flex">${ICON.x}</button></span>`).join('')}</div>
      <div class="row"><input id="new-cat" class="input grow" maxlength="${LIMITS.category}" placeholder="新增分類"><button class="btn small" id="add-cat">加入</button></div>
    </div>
    ${usedTags.length ? `<div class="card">
      <div class="bold">管理標籤</div>
      <div class="muted small">點一個標籤可以改名或刪除，所有用到它的紀錄會一起改。</div>
      <div class="chips">${usedTags.map(([t, n]) => `<button class="chip" data-edit-tag="${esc(t)}">#${esc(t)} <span class="muted">${n}</span></button>`).join('')}</div>
    </div>` : ''}
    ${trash.length ? `<div class="card">
      <div class="bold">最近刪除（${trash.length}）</div>
      <div class="muted">刪除的紀錄會在這裡放 ${TRASH_DAYS} 天，之後連照片一起自動清掉。</div>
      ${trash.map((r) => `<div class="row between" style="gap:8px">
        <div class="grow" style="min-width:0"><div class="bold" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.title || '（沒有標題）')}</div>
          <div class="small muted">${esc(TYPES[r.type].label)}・還剩 ${Math.max(0, TRASH_DAYS - daysAgo(r.deletedAt))} 天</div></div>
        <button class="btn small secondary" data-restore="${esc(r.id)}">救回來</button>
        <button class="btn small danger" data-purge="${esc(r.id)}">永久刪除</button>
      </div>`).join('')}
    </div>` : ''}
    <div class="card">
      <div class="bold">重新編號</div>
      <div class="muted">每則紀錄的 No. 在新增時就固定，刪除後會留下空號。想讓號碼重新連續的話，可以依日期從 1 重新排一次${usingCloud() ? '，另一半看到的號碼也會一起更新' : ''}。</div>
      <button class="btn small secondary" id="renumber">依日期重新編號</button>
    </div>
    <h2 class="section-title set-sec" id="set-backup">備份與匯出</h2>
    ${inAppNotice()}
    <div class="card">
      <div class="bold">備份</div>
      ${usingCloud()
        ? '<div class="muted">資料已經在雲端了，想多一份保險的話，也可以匯出備份存起來。</div>'
        : `<div class="muted">紀錄和照片只存在這支手機的瀏覽器裡。清除瀏覽器資料或換手機前，記得先匯出備份。目前共 ${all.length} 則紀錄。</div>
      <div class="small">${lastBackup ? `上次備份：${daysAgo(lastBackup) === 0 ? '今天' : daysAgo(lastBackup) + ' 天前'}` : '還沒有備份過'}</div>
      <div class="small" style="color:${persisted ? 'var(--resolved-ink)' : 'var(--muted)'}">${persisted ? '瀏覽器已同意不自動清除這裡的資料。' : '瀏覽器還沒同意「不自動清除」，請加到主畫面後從主畫面打開，並記得定期備份。'}</div>`}
      <div class="btn-row">
        <button class="btn small" id="export">匯出還原用備份</button>
        <label class="btn small secondary" style="cursor:pointer">匯入備份<input type="file" accept="application/json,.json" class="visually-hidden" id="import"></label>
      </div>
      <div class="small muted">還原用備份是 .json 檔，打開會是看不懂的文字，這是正常的，只要用「匯入備份」就能還原。</div>
    </div>
    <div class="card">
      <div class="bold">匯出閱讀版</div>
      <div class="muted">把所有紀錄和照片排成一本小冊子，可以存成 PDF 或列印，傳給對方也很方便。閱讀版不能用來還原。</div>
      <label class="row small" style="gap:8px"><input type="checkbox" id="read-shared-only"> 只匯出「給對方看」和已解鎖的紀錄（適合直接傳給對方）</label>
      <button class="btn small secondary" id="export-read">製作閱讀版（PDF）</button>
    </div>
    <h2 class="section-title set-sec" id="set-account">帳號與安全</h2>
    ${usingCloud() ? `<div class="card">
      <div class="bold">雲端帳號</div>
      <div class="muted">已登入 ${esc(CloudDB.currentEmail())}，紀錄和照片都存在雲端，換手機只要登入同一個帳號就能看到。目前共 ${all.length} 則紀錄。</div>
      ${quota ? `<div class="small">雲端照片：${quota.used}${quota.limit != null ? ` / ${quota.limit} 張（免費帳號，兩個人共用）` : ' 張（不限張數）'}${quota.mine != null && quota.used > quota.mine ? `・你 ${quota.mine} 張、${esc(partnerName())} ${quota.used - quota.mine} 張` : ''}</div>
        ${quota.limit != null ? `<div class="progress" style="height:6px"><div style="width:${Math.min(100, (quota.used / quota.limit) * 100)}%"></div></div>
        <button class="btn small secondary" id="more-photos">${ICON.lockSmall} 想放更多照片？</button>` : ''}` : ''}
      ${isPartner() ? '' : '<button class="btn small secondary" id="clean-photos">整理雲端照片</button>'}
      <button class="btn small secondary" id="logout">登出</button>
    </div>
    ${usingCloud() && !CloudDB.isAnonymous() ? loginMethodsCard() : ''}
    ${notifyCardHtml()}
    ${adminCardHtml()}
    ${localCount ? `<div class="card" style="background:var(--progress-bg);border-color:transparent">
      <div class="bold" style="color:var(--progress-ink)">把這支手機裡的紀錄搬上雲端</div>
      <div class="small" style="color:var(--progress-ink)">這支手機裡還有 ${localCount} 則以前存的紀錄。${migratedAt ? `上次搬的時間是 ${daysAgo(migratedAt) === 0 ? '今天' : daysAgo(migratedAt) + ' 天前'}，再搬一次也不會重複。` : '搬上去之後，手機裡的也會留著當備份。'}</div>
      <button class="btn small" id="migrate">搬上雲端</button>
    </div>` : ''}` : ''}
    ${pinCardHtml()}
    ${usingCloud() ? `<div class="card" id="end-card">
      <div class="bold">結束這段關係</div>
      <div class="muted">分開了、或要和新的對象開始，可以把目前的紀錄封存（收起來，只有你看得到）或刪除。另一半會被移除，分享碼也會作廢。</div>
      <a class="btn small secondary" href="#/end">結束這段關係…</a>
      ${archivedCount ? `<a class="btn small secondary" href="#/archive">封存的回憶（${archivedCount} 則）</a>` : ''}
    </div>` : ''}
    <div class="card">
      <div class="bold" style="color:var(--danger)">清除所有資料</div>
      <div class="muted">${usingCloud() ? '會刪掉雲端上你所有的紀錄和照片，也會停止分享、移除另一半，沒辦法復原。' : '會刪掉這支手機上所有紀錄和照片，沒辦法復原。'}</div>
      <button class="btn small danger" id="wipe">全部清除</button>
      ${usingCloud() ? '<button class="btn small secondary" id="delete-account">刪除帳號</button>' : ''}
    </div>
    <h2 class="section-title set-sec" id="set-other">其他</h2>
    ${tourCard()}
    ${themeCard()}
    ${skinCard()}
    ${analyticsCard()}
    ${feedbackCard()}
  `;

  app.querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', () => {
    const el = document.getElementById(b.dataset.jump);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: 'smooth' });
  }));
  // 從「我的」點進來：#/settings/<區塊> 直接捲到那一段
  const sec = (location.hash.split('/')[2] || '').split('?')[0];
  let jump = { notify: 'notify-card', theme: 'theme-card' }[sec] || (sec ? `set-${sec}` : '');
  if (location.hash.includes('#share') || sessionStorage.getItem('jumpShare')) { jump = 'set-share'; try { sessionStorage.removeItem('jumpShare'); } catch (e) { /* 略過 */ } }
  // 只在剛進來時捲一次；在這頁按了按鈕重畫時留在原位
  if (jump && !settingsJumped) { settingsJumped = true; const el = document.getElementById(jump); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64 }); }
  if (usingCloud()) bindShareCard();
  bindPinCard(viewSettings);
  app.querySelectorAll('[data-mside]').forEach((b) => b.addEventListener('click', async () => {
    const pick = { ...(MASCOT_PICK || window.Mascot.DEFAULT), [b.dataset.mside]: b.dataset.mcolor };
    MASCOT_PICK = pick;
    document.getElementById('mascot-preview').innerHTML = mascotHtml('happy', 150);
    app.querySelectorAll(`[data-mside="${b.dataset.mside}"]`).forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    try { await DB.setSetting('mascot', pick); } catch (e) { toast('顏色沒有存成功：' + cloudErrorText(e)); }
  }));
  const more = document.getElementById('more-photos');
  if (more) more.addEventListener('click', () => showPaywall(quota));
  app.querySelectorAll('[data-restore]').forEach((b) => b.addEventListener('click', () => withBusy(b, '', async () => {
    await restoreRecord(b.dataset.restore);
    toast('已救回來');
    viewSettings();
  })));
  app.querySelectorAll('[data-purge]').forEach((b) => b.addEventListener('click', () => {
    if (!confirm('永久刪除後就救不回來了，照片也會一起刪掉。確定嗎？')) return;
    withBusy(b, '', async () => {
      const r = trash.find((x) => x.id === b.dataset.purge);
      if (r) await purgeRecord(r);
      toast('已永久刪除');
      viewSettings();
    });
  }));
  document.getElementById('renumber').addEventListener('click', async () => {
    if (!confirm('每個類型都會依日期從 No. 1 重新排，原本的號碼會改變。確定嗎？')) return;
    await renumberAll();
    toast('已重新編號');
  });
  document.getElementById('save-names').addEventListener('click', async () => {
    const since = document.getElementById('set-since').value;
    if (since && !dateOk(since)) { toast('日期要在 1970 年到今天之間'); return; }
    await saveNames({ me: document.getElementById('set-me').value.trim(), partner: document.getElementById('set-partner').value.trim(), since });
    await loadNames();
    toast('已儲存');
  });
  document.getElementById('export').addEventListener('click', async () => {
    if (inAppCantSave('備份檔')) return;
    toast('準備備份中…');
    const photos = await DB.allPhotos();
    const data = {
      app: 'couple-diary', version: 1, exportedAt: new Date().toISOString(),
      records: await DB.allRecords(),
      categories: await getCategories(),
      photos: await Promise.all(photos.map(async (p) => ({ id: p.id, recordId: p.recordId, data: await blobToDataUrl(p.blob) }))),
    };
    const file = new Blob([JSON.stringify(data)], { type: 'application/json' });
    downloadFile(file, `our-records-RESTORE-backup-${today()}.json`);
    track('export_backup', { format: 'json' });
    await DB.setSetting('lastBackupAt', Date.now());
    toast(`備份好了：${data.records.length} 則紀錄、${data.photos.length} 張照片，檔案約 ${Math.max(1, Math.round(file.size / 1048576))} MB`);
    setTimeout(viewSettings, 500);
  });

  document.getElementById('export-read').addEventListener('click', async () => {
    toast('製作閱讀版中…');
    showReadView(await buildReadableExport(document.getElementById('read-shared-only').checked));
    track('export_backup', { format: 'pdf' });
  });

  document.getElementById('import').addEventListener('change', async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1048576 && !confirm(`這個備份檔約 ${Math.round(file.size / 1048576)} MB，比較大，匯入可能要一段時間，手機空間也要夠。匯入時先不要關掉畫面。要繼續嗎？`)) { ev.target.value = ''; return; }
    try {
      const data = JSON.parse(await file.text());
      checkBackup(data);
      if (!confirm(`要匯入 ${data.records.length} 則紀錄嗎？同一則紀錄會被備份裡的版本取代。`)) return;
      for (const p of data.photos || []) await DB.putPhoto({ id: p.id, recordId: p.recordId, blob: await dataUrlToBlob(p.data), createdAt: Date.now() });
      // 另一半寫的紀錄屬於他自己，雲端版匯入時略過（他那邊還在）
      let skippedOthers = 0;
      for (const r of data.records) {
        if (usingCloud() && r.author && r.author !== CloudDB.myId()) { skippedOthers++; continue; }
        await putImportedRecord(r);
      }
      if (skippedOthers) toast(`另外 ${skippedOthers} 則是對方寫的，沒有匯入`);
      if (Array.isArray(data.categories)) {
        const merged = [...new Set([...(await getCategories()), ...data.categories])];
        await DB.setSetting('categories', merged);
      }
      if (!skippedOthers) toast('匯入完成');
      viewSettings();
    } catch (e) {
      toast(e.message || '匯入失敗');
    }
  });

  const addCat = async () => {
    const name = document.getElementById('new-cat').value.trim().slice(0, LIMITS.category);
    if (!name || cats.includes(name)) return;
    if (cats.length >= LIMITS.categories) { toast(`分類最多 ${LIMITS.categories} 個`); return; }
    cats.push(name);
    await DB.setSetting('categories', cats);
    viewSettings();
  };
  document.getElementById('add-cat').addEventListener('click', addCat);
  document.getElementById('new-cat').addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.isComposing) addCat(); });
  app.querySelectorAll('[data-edit-tag]').forEach((b) => b.addEventListener('click', async () => {
    const old = b.dataset.editTag;
    const input = prompt(`把「#${old}」改成什麼？（最多 ${LIMITS.tag} 個字；清空再按確定就是刪除這個標籤）`, old);
    if (input === null) return;
    const name = input.trim().replace(/[#\s]/g, '').slice(0, LIMITS.tag);
    if (name === old) return;
    if (!name && !confirm(`要從所有紀錄拿掉「#${old}」嗎？`)) return;
    let n = 0;
    // 另一半寫的美好、烏雲不能改，只改自己的和吵架議題
    for (const r of everything.filter((x) => (x.tags || []).includes(old) && (isMine(x) || x.type === 'fight'))) {
      await updateRecord(r.id, (x) => {
        const tags = (x.tags || []).map((t) => (t === old ? name : t)).filter(Boolean);
        x.tags = [...new Set(tags)];
      });
      n += 1;
    }
    toast(name ? `已把 ${n} 則紀錄的標籤改成 #${name}` : `已從 ${n} 則紀錄拿掉這個標籤`);
    viewSettings();
  }));
  app.querySelectorAll('[data-edit-cat]').forEach((b) => b.addEventListener('click', async () => {
    const old = b.dataset.editCat;
    const input = prompt(`把分類「${old}」改成什麼？（最多 ${LIMITS.category} 個字）`, old);
    if (input === null) return;
    const name = input.trim().slice(0, LIMITS.category);
    if (!name || name === old) return;
    const used = everything.filter((x) => x.type === 'fight' && x.category === old);
    if (!confirm(`改成「${name}」？${used.length ? `用這個分類的 ${used.length} 個議題也會一起改。` : ''}`)) return;
    await DB.setSetting('categories', [...new Set(cats.map((c) => (c === old ? name : c)))]);
    let failed = 0;
    for (const r of used) { try { await updateRecord(r.id, (x) => { if (x.category === old) x.category = name; }); } catch (e) { failed += 1; } }
    toast(failed ? `已改名，但有 ${failed} 個議題沒改到，請再試一次` : `已改成「${name}」${used.length ? `，${used.length} 個議題一起更新了` : ''}`);
    viewSettings();
  }));
  app.querySelectorAll('[data-rm-cat]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm(`刪除分類「${b.dataset.rmCat}」？已經用這個分類的議題會保留原本的分類，並標示「已刪除的分類」。`)) return;
    await DB.setSetting('categories', cats.filter((c) => c !== b.dataset.rmCat));
    viewSettings();
  }));
  // 找出雲端上沒有任何紀錄在用的照片，確認後刪掉，空出免費額度
  const cleanBtn = document.getElementById('clean-photos');
  if (cleanBtn) cleanBtn.addEventListener('click', () => withBusy(cleanBtn, '檢查中…', async () => {
    const used = new Set();
    const recs = [...await DB.allRecords(), ...await CloudDB.archivedRecords().catch(() => [])];
    for (const r of recs) for (const id of r.photoIds || []) used.add(id);
    const unused = await CloudDB.unusedPhotos(used);
    if (!unused.length) { toast('雲端照片都有紀錄在用，不用整理'); return; }
    if (!(await confirmDanger('刪除用不到的照片？', `找到 ${unused.length} 張沒有任何紀錄在用的照片（例如刪掉的紀錄或結束關係後留下的）。刪掉可以空出雲端照片的額度，刪了就救不回來。`, `刪除 ${unused.length} 張照片`))) return;
    await CloudDB.removePhotos(unused);
    toast(`已刪除 ${unused.length} 張用不到的照片`);
    viewSettings();
  }));
  const linkG = document.getElementById('link-google');
  if (linkG) linkG.addEventListener('click', () => withBusy(linkG, '前往 Google…', async () => {
    try { sessionStorage.setItem('linkPending', '1'); } catch (e) { /* 略過 */ }
    try { await CloudDB.linkGoogle(); } catch (e) {
      try { sessionStorage.removeItem('linkPending'); } catch (x) { /* 略過 */ }
      toast(/暫時不能用/.test(e.message) ? 'Google 連結功能還沒開好，晚點再試，或先用 Email 和密碼登入' : `連結 Google 沒有成功：${e.message}`);
    }
  }));
  if (linkG && typeof GoogleButton !== 'undefined' && GoogleButton.enabled()) {
    const box = document.createElement('div'); box.className = 'gsi-box';
    linkG.after(box);
    GoogleButton.mount(box, async (token, nonce) => {
      try { await CloudDB.linkGoogleToken(token, nonce); } catch (e) {
        toast(/already|exists/i.test(`${e.code} ${e.message}`) ? '這個 Google 帳號已經是另一個啾啾日記帳號了，沒辦法連結。換一個 Google 帳號試試。'
          : /manual linking|disabled/i.test(e.message) ? 'Google 連結功能還沒開好，晚點再試' : `連結 Google 沒有成功：${e.message}`);
        return;
      }
      try { sessionStorage.setItem('linkPending', '1'); } catch (e) { /* 略過 */ }
      location.reload();
    }, 'continue_with').then((ok) => { if (ok) linkG.hidden = true; else box.remove(); });
  }
  const pwForm = document.getElementById('set-password');
  if (pwForm) pwForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const pw = pwForm.querySelector('input').value;
    if (pw.length < 6) { toast('密碼至少要 6 個字'); return; }
    const btn = pwForm.querySelector('button');
    withBusy(btn, '設定中…', async () => {
      try { await CloudDB.updatePassword(pw); toast('密碼設好了，之後也能用 Email 和密碼登入'); viewSettings(); } catch (e) { toast(cloudErrorText(e)); }
    });
  });
  const logout = document.getElementById('logout');
  if (logout) logout.addEventListener('click', async () => {
    if (!confirm('要登出嗎？雲端的資料不會不見，之後登入就能看到。')) return;
    clearDraft();
    await CloudDB.signOut();
    photoUrlCache.clear();
    go('#/login');
  });
  const migrate = document.getElementById('migrate');
  if (migrate) migrate.addEventListener('click', async () => {
    migrate.disabled = true;
    try {
      const n = await migrateLocalToCloud((t) => { migrate.textContent = t; });
      toast(`已搬上雲端：${n.records} 則紀錄、${n.photos} 張照片${n.skipped ? `；另外 ${n.skipped} 張超過免費雲端額度，還留在這支手機裡` : ''}`);
      viewSettings();
    } catch (e) {
      migrate.disabled = false;
      migrate.textContent = '再試一次';
      toast('搬移失敗：' + e.message);
    }
  });
  document.getElementById('wipe').addEventListener('click', async () => {
    if (!confirm('真的要清除所有紀錄和照片嗎？')) return;
    if (!confirm('再確認一次：清除後無法復原。')) return;
    if (usingCloud()) { try { await CloudDB.deleteShare(); } catch (e) { /* 沒有分享碼就略過 */ } }
    clearDraft();
    await DB.clearAll();
    photoUrlCache.clear();
    toast('已清除');
    go('#/');
  });
  const delAcc = document.getElementById('delete-account');
  if (delAcc) delAcc.addEventListener('click', async () => {
    // 另一半寫的紀錄也存在你的空間裡，刪帳號會一起刪掉，先講清楚
    let others = 0;
    try { others = (await DB.allRecords()).filter((r) => !isMine(r)).length; } catch (e) { others = 0; }
    if (!(await confirmDanger('永久刪除帳號？', `會刪掉雲端上所有紀錄、照片、分享和這個帳號本身，沒辦法復原。建議先匯出備份。${others ? `\n\n${partnerName()}寫的 ${others} 則紀錄也會一起刪掉，可以先請${partnerName()}到設定頁「匯出我寫的紀錄」。` : ''}`, '永久刪除帳號'))) return;
    withBusy(delAcc, '刪除中…', async () => {
      try { await CloudDB.deleteShare(); } catch (e) { /* 沒有分享碼就略過 */ }
      clearDraft();
      await CloudDB.clearAll();
      await CloudDB.deleteAccount();
      track('account_delete');
      await LocalDB.setSetting('hasAccount', false);
      photoUrlCache.clear(); thumbUrlCache.clear();
      toast('帳號已刪除');
      go('#/login');
    });
  });
}

// 另一半匯出自己寫的紀錄（格式和「匯出還原用備份」一樣，可以匯入自己的帳號或手機版）
async function exportMyRecords() {
  if (inAppCantSave('備份檔')) return;
  const records = (await DB.allRecords()).filter((r) => isMine(r) && !r.deletedAt);
  const photos = [];
  for (const r of records) for (const pid of r.photoIds || []) {
    const ph = await DB.getPhoto(pid);
    if (ph) photos.push({ id: pid, recordId: r.id, data: await blobToDataUrl(ph.blob) });
  }
  const data = { app: 'couple-diary', version: 1, exportedAt: new Date().toISOString(), records, categories: [], photos };
  downloadFile(new Blob([JSON.stringify(data)], { type: 'application/json' }), `our-records-MINE-backup-${today()}.json`);
  toast(`匯出好了：${records.length} 則紀錄、${photos.length} 張照片`);
}

// ---------- 結束這段關係 ----------
async function viewEnd(keepUid = '') {
  const all = await liveRecords();
  const other = partnerName();
  let keepName = '';
  if (keepUid) {
    try { const p = (await CloudDB.listPartners()).find((x) => x.uid === keepUid && x.approved === false); keepName = p ? p.name : ''; } catch (e) { keepName = ''; }
    if (!keepName) keepUid = '';
  }
  app.className = '';
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/settings" aria-label="返回">${ICON.back}</a>
      <h1>結束這段關係</h1>
    </div>
    <div class="muted">${keepUid ? `讓「${esc(keepName)}」加入之前，先處理之前的 ${all.length} 則紀錄。兩種做法都會移除之前的另一半，首頁的數字和編號會從頭開始；${esc(keepName)}看不到之前的任何紀錄。處理完就會讓${esc(keepName)}加入。` : `目前這段關係有 ${all.length} 則紀錄。兩種做法都會移除${esc(other)}、讓分享碼作廢，首頁的數字和編號會從頭開始；之後分享給新的人，對方看不到這段的任何紀錄。`}</div>
    <div class="card" style="gap:8px">
      <div class="bold">封存（建議）</div>
      <div class="small muted">紀錄、照片、一起完成的事都收進設定頁的「封存的回憶」，只有你看得到，之後想刪再刪。${esc(other)}寫的、上鎖的紀錄你還是看不到。</div>
      <button class="btn small" id="end-archive">封存並結束</button>
    </div>
    <div class="card" style="gap:8px">
      <div class="bold" style="color:var(--danger)">全部刪除</div>
      <div class="small muted">這段關係的紀錄（包含${esc(other)}寫的）、照片和一起完成的事全部刪掉，沒辦法復原。建議先到設定頁匯出備份。之前封存的不會動。</div>
      <button class="btn small danger" id="end-delete">刪除並結束</button>
    </div>
  `;
  const done = async (msg) => {
    if (keepUid) { await CloudDB.approvePartner(keepUid); msg += `，也讓 ${keepName} 加入了`; }
    photoUrlCache.clear(); thumbUrlCache.clear();
    await loadNames();
    toast(msg);
    go('#/');
  };
  const archiveBtn = document.getElementById('end-archive');
  archiveBtn.addEventListener('click', () => {
    if (!confirm(`封存目前的 ${all.length} 則紀錄，並移除${other}？封存的紀錄只有你看得到。`)) return;
    withBusy(archiveBtn, '封存中…', async () => {
      await CloudDB.endRelationship('archive', keepUid || null);
      track('end_relationship', { mode: 'archive' });
      await done('已封存，這段回憶收在設定頁的「封存的回憶」');
    });
  });
  const delBtn = document.getElementById('end-delete');
  delBtn.addEventListener('click', async () => {
    if (!(await confirmDanger('刪除這段關係的紀錄？', `會刪掉這段關係的 ${all.length} 則紀錄和照片（包含${other}寫的），沒辦法復原。`, '永久刪除'))) return;
    withBusy(delBtn, '刪除中…', async () => {
      // 先刪你資料夾裡的照片和任務照片（紀錄刪掉後就找不到了）
      for (const r of await DB.allRecords()) {
        for (const pid of r.photoIds || []) if (CloudDB.photoIsMine(pid)) { try { await DB.deletePhoto(pid); } catch (e) { /* 之後再清 */ } }
      }
      try { for (const sub of await CloudDB.submissions()) if (sub.photo_path) await CloudDB.removeTaskPhoto(sub.photo_path); } catch (e) { /* 略過 */ }
      await CloudDB.endRelationship('delete', keepUid || null);
      track('end_relationship', { mode: 'delete' });
      await done('已刪除這段關係的紀錄');
    });
  });
}

async function viewArchive() {
  const list = (await CloudDB.archivedRecords()).filter((r) => !r.deletedAt).sort(byDateDesc);
  app.className = '';
  app.innerHTML = `
    <div class="topbar">
      <a class="icon-btn" href="#/settings" aria-label="返回">${ICON.back}</a>
      <h1>封存的回憶</h1>
    </div>
    <div class="muted">結束上一段關係時封存的紀錄，只有你看得到，不算在首頁的數字裡。</div>
    <div class="list" id="archive-list"></div>
    ${list.length ? `<div class="btn-row"><button class="btn small" id="restore-archive">全部還原</button><button class="btn small danger" id="purge-archive">永久刪除全部封存</button></div>
      <div class="small muted">還原後會回到首頁和列表，另一半也會照原本的設定看得到；編號會依日期重新排。</div>` : '<div class="empty">沒有封存的紀錄</div>'}
  `;
  const box = document.getElementById('archive-list');
  for (const r of list) box.appendChild(await listItem(r));
  const restore = document.getElementById('restore-archive');
  if (restore) restore.addEventListener('click', async () => {
    if (!confirm(`把 ${list.length} 則封存的紀錄全部還原？還原後會回到首頁，另一半也看得到你原本設定給對方看的紀錄。`)) return;
    withBusy(restore, '還原中…', async () => {
      const n = await CloudDB.restoreArchive();
      numbersChecked = false;
      toast(`已還原 ${n} 則紀錄`);
      go('#/');
    });
  });
  const purge = document.getElementById('purge-archive');
  if (purge) purge.addEventListener('click', async () => {
    if (!(await confirmDanger('刪除封存的回憶？', `會永久刪除 ${list.length} 則封存的紀錄和照片，沒辦法復原。`, '永久刪除'))) return;
    withBusy(purge, '刪除中…', async () => {
      for (const r of list) for (const pid of r.photoIds || []) if (CloudDB.photoIsMine(pid)) { try { await DB.deletePhoto(pid); } catch (e) { /* 之後再清 */ } }
      await CloudDB.deleteArchive();
      toast('已刪除封存的紀錄');
      go('#/settings');
    });
  });
}

// 登入方式：同一個帳號可以同時用 Email 密碼和 Google 登入
function loginMethodsCard() {
  const m = CloudDB.loginMethods();
  const email = CloudDB.currentEmail() || '';
  const row = (name, on, note) => `<div class="legal-row login-method-row"><span>${name}</span><span class="small ${on ? '' : 'muted'}">${on ? '已可以用' : '還沒設定'}${note ? `・${note}` : ''}</span></div>`;
  return `<div class="card login-methods">
    <div class="bold">登入方式</div>
    <div class="small muted">同一個帳號可以同時用 Email 密碼和 Google 登入，紀錄都是同一份。</div>
    ${row('Email 和密碼', m.email, m.email ? esc(email) : '')}
    ${row('Google', m.google, '')}
    ${m.google ? '' : `<div class="small muted">如果你的 Google 信箱就是 ${esc(email) || '註冊的信箱'}，直接按 Google 登入也會進到同一個帳號。信箱不一樣的話，按下面連結起來：</div>
      <button class="btn small secondary" id="link-google">連結 Google 帳號</button>`}
    ${m.email ? '' : `<form id="set-password" class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px">
      <input type="password" class="input" autocomplete="new-password" placeholder="新密碼（至少 6 個字）" aria-label="設定一組密碼，至少 6 個字" maxlength="72" style="flex:1;min-width:0">
      <button class="btn small secondary" type="submit">設定密碼</button>
    </form>
    <div class="small muted">設好之後，也可以用 ${esc(email)} 加這組密碼登入。</div>`}
  </div>`;
}
