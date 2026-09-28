// 啾啾日記 js/app/main.js：路由、密碼鎖、離線、啟動（一定要最後載入）
// 所有 js/app/*.js 共用同一個全域範圍，依 index.html 的順序載入。

// ---------- 路由 ----------
async function route() {
  const parts = (location.hash.replace(/^#\/?/, '') || '').split('/');
  const [page, arg] = parts;
  // 意見回饋會附上是從哪一頁來的（只有頁面名稱，不含紀錄內容）
  if (page !== 'feedback') { try { sessionStorage.setItem('fbFrom', page || 'home'); } catch (e) { /* 沒關係 */ } }
  app.className = '';
  app.oninput = null;
  window.scrollTo(0, 0);
  try { if (window.Analytics) window.Analytics.pageView(); } catch (e) { /* 略過 */ }
  try {
    if (isGuest()) {
      if (page === 'join') { renderTabbar(null); viewJoin('', arg); return; }
      // 登入過的手機登出後回到登入畫面；新使用者可以直接試用（資料先存在手機）
      if (page === 'login' || page === 'signup' || await hasAccountHere()) { renderTabbar(null); viewLogin(page === 'signup' ? 'signup' : 'signin'); return; }
    }
    // 已經送出加入要求、還在等主人同意
    if (CLOUD_ENABLED && CloudDB.pendingJoin() && !isPartner()) { renderTabbar(null); viewWaitingApproval(); return; }
    // 臨時帳號但不是（或已經不是）另一半：分享被停止、被移除，或加入沒成功
    if (CLOUD_ENABLED && CloudDB.isAnonymous() && !isPartner()) {
      renderTabbar(null);
      viewJoin(page === 'join' ? '' : '這段分享已經結束了，或這支手機的加入資料不見了。如果還要一起用，請對方給你分享碼和密碼，再加入一次。', page === 'join' ? arg : '');
      return;
    }
    // 用 Email / Google 登入、但還不是誰的另一半、自己也還沒開始寫：先問是主人還是另一半
    // （另一半換了瀏覽器、重新登入時，才不會變成一本新的空日記）
    if (usingCloud() && !isPartner() && !CloudDB.isAnonymous()) {
      const choose = await needsRoleChoice();
      if (page === 'join' && (rejoinNotice || choose)) {
        renderTabbar(null);
        viewJoin(rejoinNotice ? '你已經用原本的帳號登入了，但還沒連到對方的日記。再輸入一次分享碼和密碼，對方按「同意」後就回來了，之前寫的紀錄都還在。' : '輸入對方給你的分享碼和密碼，對方按「同意」後，這個帳號就會接到對方的日記。', arg);
        return;
      }
      if (choose && !['settings', 'reset', 'feedback'].includes(page)) { renderTabbar(null); viewRoleChoice(); return; }
    }
    if (!isGuest() && (page === 'login' || page === 'signup' || page === 'join')) { go('#/'); return; }
    await loadNames();
    // 離線時不整理編號、不清垃圾桶（要寫入雲端），先讓人看得到紀錄
    await ensureNumbers().catch(skipIfOffline);
    await purgeOldTrash().catch(skipIfOffline);
    if (page === 'reset' && usingCloud() && !CloudDB.isAnonymous()) { renderTabbar(null); viewResetPassword(); return; }
    if (isPartner()) {
      if (!page) { renderTabbar('home'); await viewPartnerHome(); }
      else if (page === 'list' && TYPES[arg] && arg !== 'fight') { renderTabbar(arg); await viewList(arg); }
      else if (page === 'fights') { renderTabbar('fight'); await viewFights(); }
      else if (page === 'view') { renderTabbar(null); await viewDetail(arg); }
      else if (page === 'new' && TYPES[arg]) { renderTabbar(null); await viewForm('new', arg); }
      else if (page === 'edit') { renderTabbar(null); await viewForm('edit', arg); }
      else if (page === 'bind') { renderTabbar(null); viewBind(); }
      else if (page === 'tasks') { renderTabbar('tasks'); await viewPartnerTasks(); }
      else if (page === 'wishes') { renderTabbar(null); await viewWishes(); }
      else if (page === 'cards') { renderTabbar(null); await viewCards(); }
      else if (page === 'card') { renderTabbar(null); await viewCard(arg, parts[2]); }
      else if (page === 'feedback') { renderTabbar(null); viewFeedback(); }
      else if (page === 'task') { renderTabbar(null); await viewPartnerTaskForm(arg); }
      else if (page === 'settings') { renderTabbar(null); viewPartnerSettings(); }
      else go('#/');
      return;
    }
    if (!page) { renderTabbar('home'); await viewHome(); }
    else if (page === 'list' && TYPES[arg] && arg !== 'fight') { renderTabbar(arg); await viewList(arg); }
    else if (page === 'fights') { renderTabbar('fight'); await viewFights(); }
    else if (page === 'view') { renderTabbar(null); await viewDetail(arg); }
    else if (page === 'new') { renderTabbar(null); await viewForm('new', arg); }
    else if (page === 'edit') { renderTabbar(null); await viewForm('edit', arg); }
    else if (page === 'settings') { renderTabbar(null); await viewSettings(); }
    else if (page === 'stamps') { renderTabbar(null); await viewStamps(); }
    else if (page === 'wishes') { renderTabbar(null); await viewWishes(); }
    else if (page === 'cards') { renderTabbar(null); await viewCards(); }
    else if (page === 'card') { renderTabbar(null); await viewCard(arg, parts[2]); }
    else if (page === 'feedback') { renderTabbar(null); viewFeedback(); }
    else if (page === 'tasks' && usingCloud()) { renderTabbar(null); await viewPartnerTasks(); }
    else if (page === 'end' && usingCloud()) { renderTabbar(null); await viewEnd(arg ? decodeURIComponent(arg) : ''); }
    else if (page === 'archive' && usingCloud()) { renderTabbar(null); await viewArchive(); }
    else if (page === 'task' && usingCloud()) { renderTabbar(null); await viewPartnerTaskForm(arg); }
    else go('#/');
    if (!page || page === 'view') checkNewStamps().catch(() => {});
    if (!page || page === 'view') { if (!maybeShowSignupNudge()) maybeShowA2hs(); }
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="empty no-mascot">${esc(cloudErrorText(e))}<button class="btn small" id="reload">重新整理</button></div>`;
    document.getElementById('reload').addEventListener('click', () => location.reload());
  }
}

// 向瀏覽器申請「不要自動清除這個網站的資料」
async function isPersisted() {
  try { return !!(navigator.storage && navigator.storage.persisted && await navigator.storage.persisted()); } catch (e) { return false; }
}
async function requestPersist() {
  try {
    if (navigator.storage && navigator.storage.persist && !(await isPersisted())) await navigator.storage.persist();
  } catch (e) { /* 不支援的瀏覽器就略過 */ }
}

// 連不上雲端時說清楚：資料沒有不見，可能是網路或雲端暫停（免費方案一週沒人用會暫停）
function cloudErrorText(e) {
  const m = (e && e.message) || '';
  if ((e && e.name === 'QuotaExceededError') || /quota|storage.*full|No space/i.test(m)) return '手機的儲存空間可能滿了，存不進去。先刪掉一些照片或 App，或先匯出備份，再試一次。';
  if (/fetch|network|load failed|timeout/i.test(m)) return navigator.onLine === false ? '現在沒有網路，連上網路後再試一次。' : '連不上雲端。你的紀錄沒有不見，可能是網路不穩，請過一會兒再試一次。';
  return m || '出了一點問題，請再試一次';
}
// 沒接住的錯誤（例如雲端連不上）用提示告訴使用者
window.addEventListener('unhandledrejection', (ev) => {
  toast(cloudErrorText(ev.reason));
});

// ---------- App 密碼鎖（可自己開，預設關閉）----------
// 只存在這支手機：4 位數密碼加鹽雜湊後放 localStorage。打開 App、或離開超過 1 分鐘再回來時要輸入。
// 這是防「手機借給別人看」的簡單鎖，不是加密；忘記的話雲端版登出再登入就會解除。
const PIN_KEY = 'appPin';
const PIN_RELOCK_MS = 60 * 1000;
function pinSaved() { try { return JSON.parse(localStorage.getItem(PIN_KEY) || 'null'); } catch (e) { return null; } }
async function pinHash(pin, salt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function pinSet(pin) {
  const salt = DB.uid();
  localStorage.setItem(PIN_KEY, JSON.stringify({ salt, hash: await pinHash(pin, salt) }));
}
async function pinCheck(pin) { const p = pinSaved(); return !!p && (await pinHash(pin, p.salt)) === p.hash; }
function pinClear() { try { localStorage.removeItem(PIN_KEY); } catch (e) { /* 略過 */ } }

// 輸入 4 位數的鍵盤畫面；onDone(pin) 回傳 true 代表通過（關掉畫面），false 會搖一下重來
function pinPad({ title, sub, onDone, cancelable = false, forgot = null }) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'pin-lock';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', title);
    el.innerHTML = `
      <div class="pin-box">
        ${mascotHtml('happy', 90)}
        <div class="bold" style="font-size:18px">${esc(title)}</div>
        <div class="small muted" id="pin-sub">${esc(sub || '')}</div>
        <div class="pin-dots" aria-hidden="true">${'<span></span>'.repeat(4)}</div>
        <div class="pin-keys">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-pin="${n}">${n}</button>`).join('')}
          <button data-pin-cancel ${cancelable ? '' : 'style="visibility:hidden"'}>取消</button>
          <button data-pin="0">0</button>
          <button data-pin-back aria-label="刪除一個數字">⌫</button>
        </div>
        ${forgot ? '<button class="btn small secondary" id="pin-forgot">忘記解鎖碼？</button>' : ''}
      </div>`;
    document.body.appendChild(el);
    let val = '';
    const dots = el.querySelectorAll('.pin-dots span');
    const paint = () => dots.forEach((d, i) => d.classList.toggle('on', i < val.length));
    const close = (v) => { el.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const push = async (d) => {
      if (val.length >= 4) return;
      val += d; paint();
      if (val.length < 4) return;
      const ok = await onDone(val);
      if (ok) { close(val); return; }
      el.querySelector('.pin-dots').classList.add('shake');
      setTimeout(() => { val = ''; paint(); const x = el.querySelector('.pin-dots'); if (x) x.classList.remove('shake'); }, 400);
    };
    const onKey = (ev) => {
      if (/^\d$/.test(ev.key)) push(ev.key);
      else if (ev.key === 'Backspace') { val = val.slice(0, -1); paint(); }
      else if (ev.key === 'Escape' && cancelable) close(null);
    };
    document.addEventListener('keydown', onKey);
    el.querySelectorAll('[data-pin]').forEach((b) => b.addEventListener('click', () => push(b.dataset.pin)));
    el.querySelector('[data-pin-back]').addEventListener('click', () => { val = val.slice(0, -1); paint(); });
    if (cancelable) el.querySelector('[data-pin-cancel]').addEventListener('click', () => close(null));
    if (forgot) el.querySelector('#pin-forgot').addEventListener('click', () => forgot(close));
  });
}

let pinLocked = false;
async function showPinLock() {
  if (pinLocked || !pinSaved()) return;
  pinLocked = true;
  // 猜錯太多次要等：5 次等 30 秒、10 次以上等 5 分鐘（記在這支手機，重新整理也不會歸零）
  const fails = () => { try { return JSON.parse(localStorage.getItem('pinFails') || '{"n":0,"until":0}'); } catch (e) { return { n: 0, until: 0 }; } };
  const setFails = (f) => { try { localStorage.setItem('pinFails', JSON.stringify(f)); } catch (e) { /* 略過 */ } };
  await pinPad({
    title: '輸入解鎖碼',
    sub: '這支手機設了 App 解鎖碼',
    onDone: async (pin) => {
      const sub = document.getElementById('pin-sub');
      const f = fails();
      if (f.until > Date.now()) {
        if (sub) sub.textContent = `錯太多次了，請等 ${Math.ceil((f.until - Date.now()) / 1000)} 秒再試`;
        return false;
      }
      if (await pinCheck(pin)) { setFails({ n: 0, until: 0 }); return true; }
      f.n += 1;
      f.until = f.n >= 10 ? Date.now() + 5 * 60000 : f.n % 5 === 0 ? Date.now() + 30000 : 0;
      setFails(f);
      if (sub) sub.textContent = f.until ? `錯太多次了，請等 ${f.n >= 10 ? '5 分鐘' : '30 秒'}再試。忘記的話可以按「忘記解鎖碼？」` : '解鎖碼不對，再試一次';
      return false;
    },
    forgot: (close) => {
      if (usingCloud() && CloudDB.isSignedIn() && !CloudDB.isAnonymous()) {
        if (!confirm('忘記解鎖碼的話，要登出再重新登入，登入後就不用解鎖碼了。要登出嗎？')) return;
        pinClear();
        close(null);
        CloudDB.signOut().then(() => { go('#/login'); route(); });
      } else {
        alert(usingCloud() ? '用分享碼加入的另一半忘記解鎖碼，要清除這個網站的瀏覽器資料，再用分享碼重新加入。' : '手機版的紀錄只存在這支手機，忘記解鎖碼只能清除這個網站的瀏覽器資料，紀錄也會一起不見。有匯出過備份的話，可以之後再匯入。');
      }
    },
  });
  pinLocked = false;
}
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hiddenAt = Date.now();
  else if (hiddenAt && Date.now() - hiddenAt > PIN_RELOCK_MS) showPinLock();
});

function pinCardHtml() {
  const on = !!pinSaved();
  return `<div class="card" id="pin-card">
    <div class="row between"><div class="bold">App 解鎖碼</div>
      <button class="btn small ${on ? 'secondary' : ''}" id="pin-toggle">${on ? '關閉' : '開啟'}</button></div>
    <div class="muted small">${on ? '已開啟：打開 App、或離開超過 1 分鐘再回來時，要輸入 4 位數解鎖碼。只鎖這支手機。' : '開啟後，打開 App 要先輸入 4 位數解鎖碼，手機借別人看也不怕。只鎖這支手機，預設關閉。'}</div>
    ${on ? '<button class="btn small secondary" id="pin-change">更改解鎖碼</button>' : ''}
  </div>`;
}
function bindPinCard(refresh) {
  const ask = async (title, sub) => pinPad({ title, sub, cancelable: true, onDone: async () => true });
  const toggle = document.getElementById('pin-toggle');
  if (toggle) toggle.addEventListener('click', async () => {
    if (pinSaved()) {
      const cur = await pinPad({ title: '輸入目前的解鎖碼', sub: '確認是你本人，才能關閉', cancelable: true, onDone: pinCheck });
      if (!cur) return;
      pinClear(); toast('已關閉解鎖碼'); refresh();
      return;
    }
    // 手機版忘記解鎖碼只能清掉資料，所以開啟前要先有一份最近的備份
    if (!usingCloud() && (await DB.allRecords()).length) {
      const last = await DB.getSetting('lastBackupAt', null);
      if (!last || Date.now() - last > 86400000) {
        if (!confirm('手機版的紀錄只存在這支手機，忘記解鎖碼的話只能清除瀏覽器資料，紀錄會一起不見。\n開啟解鎖碼前要先匯出一份備份，按「確定」現在匯出。')) return;
        const exp = document.getElementById('export');
        if (exp) exp.click();
        toast('備份好之後，再按一次「開啟」設定解鎖碼');
        return;
      }
    }
    const a = await ask('設定 4 位數解鎖碼', '之後打開 App 要輸入');
    if (!a) return;
    const b = await pinPad({ title: '再輸入一次', sub: '確認解鎖碼', cancelable: true, onDone: async (x) => x === a });
    if (!b) return;
    await pinSet(a); track('pin_enable'); toast('已開啟解鎖碼'); refresh();
  });
  const change = document.getElementById('pin-change');
  if (change) change.addEventListener('click', async () => {
    const cur = await pinPad({ title: '輸入目前的解鎖碼', cancelable: true, onDone: pinCheck });
    if (!cur) return;
    const a = await ask('新的 4 位數解鎖碼');
    if (!a) return;
    const b = await pinPad({ title: '再輸入一次', sub: '確認新解鎖碼', cancelable: true, onDone: async (x) => x === a });
    if (!b) return;
    await pinSet(a); toast('解鎖碼已更改'); refresh();
  });
}

// ---------- 回到頂端、從左邊滑回上一頁 ----------
const toTop = document.createElement('button');
toTop.className = 'to-top';
toTop.type = 'button';
toTop.setAttribute('aria-label', '回到最上面');
toTop.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';
toTop.hidden = true;
toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
document.body.appendChild(toTop);
window.addEventListener('scroll', () => { toTop.hidden = window.scrollY < 500; }, { passive: true });
window.addEventListener('hashchange', () => { toTop.hidden = true; });
// 從畫面左邊往右滑：等於按左上角的返回（加到主畫面後沒有瀏覽器的返回鍵，這樣比較方便）
let swipe = null;
document.addEventListener('touchstart', (ev) => {
  const t = ev.touches[0];
  swipe = ev.touches.length === 1 && t.clientX < 30 && !document.querySelector('.celebrate, .pin-lock') ? { x: t.clientX, y: t.clientY } : null;
}, { passive: true });
document.addEventListener('touchend', (ev) => {
  if (!swipe) return;
  const t = ev.changedTouches[0];
  const dx = t.clientX - swipe.x;
  const dy = Math.abs(t.clientY - swipe.y);
  swipe = null;
  if (dx < 80 || dy > 60) return;
  const back = document.querySelector('.topbar .icon-btn[aria-label="返回"]');
  if (back) back.click();
}, { passive: true });

window.addEventListener('hashchange', route);
requestPersist();

// ---------- 離線 ----------
// 沒網路也能打開 App（service worker 存了網頁本身）；雲端模式顯示手機裡最近看過的紀錄，只能看、不能改
function skipIfOffline(e) { if (usingCloud() && CloudDB.isOfflineError(e)) return; throw e; }
const offlineBar = document.createElement('div');
offlineBar.className = 'offline-bar';
offlineBar.setAttribute('role', 'status');
offlineBar.textContent = '目前離線，只能看之前的紀錄。連上網路後才能新增或修改。';
offlineBar.hidden = true;
document.body.appendChild(offlineBar);
function updateOfflineBar() { offlineBar.hidden = navigator.onLine !== false || !CLOUD_ENABLED || !usingCloud(); document.body.classList.toggle('is-offline', !offlineBar.hidden); }
window.addEventListener('offline', updateOfflineBar);
window.addEventListener('online', () => { updateOfflineBar(); if (usingCloud()) { toast('連上網路了'); route(); } });
window.addEventListener('hashchange', updateOfflineBar);
// 只在正式網站註冊（本機開發、測試時不註冊，才不會一直拿到快取的舊檔案）
if ('serviceWorker' in navigator && (location.protocol === 'https:' || localStorage.getItem('swTest'))) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
(async () => {
  // 密碼鎖最先蓋上，紀錄內容才不會先閃出來
  showPinLock();
  if (CLOUD_ENABLED) {
    try { await CloudDB.loadSession(); await afterOwnerLogin(); } catch (e) { toast(cloudErrorText(e)); }
    // 從 Google 回來：另一半綁定成功就說一聲；失敗就回到綁定頁、寫清楚原因（不然會一直繞回同一個畫面）
    let linking = false;
    try { linking = !!sessionStorage.getItem('linkPending'); sessionStorage.removeItem('linkPending'); } catch (e) { /* 略過 */ }
    const urlErr = CloudDB.takeUrlError();
    let rejoin = false;
    try { rejoin = !!sessionStorage.getItem('rejoinAfterLogin'); sessionStorage.removeItem('rejoinAfterLogin'); } catch (e) { /* 略過 */ }
    if (rejoin && CloudDB.isSignedIn() && !CloudDB.isAnonymous()) {
      if (isPartner()) toast('歡迎回來！已經回到原本的帳號');
      else if (!CloudDB.pendingJoin()) { rejoinNotice = true; go('#/join'); }
    }
    if (linking && CloudDB.isBoundPartner()) { bindError = ''; toast('帳號建立好了！'); }
    else if (linking && isPartner()) { bindError = googleBindErrorText(urlErr); go('#/bind'); }
    else if (urlErr) toast(/identity_already_exists|already/i.test(`${urlErr.code} ${urlErr.message}`) ? '這個 Google 帳號已經被用過了，換一個帳號或改用 Email。' : `Google 登入沒有成功：${urlErr.message || urlErr.code}`);
  }
  route();
  updateOfflineBar();
})();
