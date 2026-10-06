// 啾啾日記 js/app/auth.js：登入
// 所有 js/app/*.js 共用同一個全域範圍，依 index.html 的順序載入。

// ---------- 登入（雲端模式） ----------
// 登入頁下方的介紹：第一次來的人知道這個 App 能做什麼
const INTRO = [
  ['❤️', '美好時刻', '把約會、驚喜、小確幸記下來，目標是一起集滿 100 個。'],
  ['☁️', '烏雲時刻', '不開心的時刻也記下來，事後寫反思，心情過去了就按「放晴」。'],
  ['⚡', '吵架議題', '分類、原因、後續進度，和好了就標成已解決，不再重複吵同一件事。'],
  ['✅', '一起完成的事', '寫下想一起做的事，兩個人都能打勾，完成後變成美好時刻。'],
  ['🔒', '上鎖與任務', '想給對方看的可以分享，也可以上鎖，出一個任務讓對方完成才解鎖。'],
  ['🏅', '印章冊', '美好時刻、和好、放晴達到里程碑就蓋一個章，像集點卡一樣。'],
];
// 註冊的好處（登入頁、試用提醒共用）
const SIGNUP_BENEFITS = [
  ['紀錄存在雲端，換手機、清掉瀏覽器也不會不見'],
  ['分享給另一半，兩個人一起寫'],
  ['出任務解鎖紀錄、一起完成的待辦清單'],
  ['照片跟著帳號走，在哪支手機都看得到'],
];
function introFeatures() {
  return `<section class="card" style="gap:12px;margin-top:8px" aria-labelledby="intro-h">
    <h2 id="intro-h" class="bold" style="font-size:17px;font-family:inherit;margin:0">這個 App 可以做什麼</h2>
    ${INTRO.map(([icon, t, d]) => `<div class="row" style="align-items:flex-start;gap:12px"><div style="font-size:22px;line-height:1.2" aria-hidden="true">${icon}</div><div style="display:flex;flex-direction:column;gap:2px"><div class="bold">${t}</div><div class="small muted">${d}</div></div></div>`).join('')}
    <div class="small muted">紀錄只有你和你分享的人看得到。${window.Analytics && window.Analytics.configured() ? ANALYTICS_NOTE : ''}</div>
  </section>`;
}
// 記住上次用哪種方式登入，避免 Google 和 Email 各註冊一個帳號、以為資料不見
function rememberLogin(kind) {
  try {
    localStorage.setItem('lastLogin', kind);
    const em = kind === 'email' && document.getElementById('email');
    if (em && em.value) localStorage.setItem('lastLoginEmail', em.value.trim());
  } catch (e) { /* 不能存就算了 */ }
}
function lastLogin() { try { return localStorage.getItem('lastLogin'); } catch (e) { return null; } }
function viewLogin(mode = 'signin') {
  app.className = 'login-page';
  const isUp = mode === 'signup';
  const last = lastLogin();
  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;margin-top:40px">
      ${mascotHtml('happy', 140)}
      <h1 class="title-xl">啾啾日記</h1>
      <div class="bold" style="font-size:17px">兩個人一起記下 100 個美好時刻</div>
      <div class="muted">也記下烏雲、整理吵架，讓感情越來越好</div>
    </div>
    ${last ? '' : `<section class="card benefits-card" aria-labelledby="ben-h">
      <div id="ben-h" class="bold">免費註冊，你們就可以：</div>
      <ul class="benefits">${SIGNUP_BENEFITS.map(([t]) => `<li>${t}</li>`).join('')}</ul>
    </section>`}
    ${inAppNotice()}
    <button class="btn secondary" id="google-btn" style="gap:10px"${IN_APP ? ' hidden' : ''}>
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>
      ${isUp ? '用 Google 註冊／登入' : '用 Google 登入'}
    </button>
    <div class="or-divider"${IN_APP ? ' hidden' : ''}><span>或用 Email</span></div>
    <form id="login-form" style="display:flex;flex-direction:column;gap:14px">
      <div class="field"><label for="email">Email</label>
        <input id="email" class="input" type="email" autocomplete="email" required></div>
      <div class="field"><label for="password">帳號密碼${isUp ? '（至少 8 個字）' : ''}</label>
        <input id="password" class="input" type="password" autocomplete="${isUp ? 'new-password' : 'current-password'}" minlength="${isUp ? 8 : 6}" maxlength="72" required>
        ${isUp ? '' : '<button type="button" class="link-btn small" id="forgot">忘記密碼？</button>'}</div>
      <button class="btn" type="submit" id="login-btn">${isUp ? '免費註冊，開始我們的日記' : '登入'}</button>
    </form>
    <div id="login-msg" class="muted" style="text-align:center"></div>
    <div class="login-more">
      ${isUp ? '<button type="button" class="link-btn" id="switch">已經有帳號？<b>登入</b></button>' : '<button class="btn secondary" id="switch">第一次使用？免費註冊</button>'}
      <a class="link-btn" href="#/join">我是另一半，<b>用分享碼加入</b></a>
    </div>
    <a class="text-link small" href="#/" id="try-first" hidden>先看看，之後再註冊</a>
    ${isUp || !last ? introFeatures() : ''}
    <div class="small muted legal-links">${isUp ? '註冊就代表你同意' : ''}<a href="terms.html" target="_blank" rel="noopener">使用條款</a>${isUp ? '和' : '・'}<a href="privacy.html" target="_blank" rel="noopener">隱私權政策</a></div>
  `;
  if (!isUp && last) {
    const hint = document.createElement('div');
    hint.className = 'small muted'; hint.style.textAlign = 'center'; hint.id = 'last-login';
    hint.textContent = last === 'google' ? '你上次是用 Google 登入的' : '你上次是用 Email 登入的';
    const anchor = document.getElementById(last === 'google' && !IN_APP ? 'google-btn' : 'login-form');
    anchor.parentNode.insertBefore(hint, anchor);
    if (last === 'email') { try { const em = localStorage.getItem('lastLoginEmail'); if (em) document.getElementById('email').value = em; } catch (e) { /* 略過 */ } }
  }
  hasAccountHere().then((has) => { const b = document.getElementById('try-first'); if (b && !has) b.hidden = false; });
  document.getElementById('try-first').addEventListener('click', (ev) => {
    ev.preventDefault();
    if (location.hash === '#/') route(); else go('#/');
  });
  document.getElementById('switch').addEventListener('click', () => viewLogin(isUp ? 'signin' : 'signup'));
  const forgot = document.getElementById('forgot');
  if (forgot) forgot.addEventListener('click', () => {
    const email = document.getElementById('email').value.trim();
    const msg = document.getElementById('login-msg');
    if (!/^[^@\s]+@[^@\s]+$/.test(email)) { msg.textContent = '先在上面填你的 Email，再按「忘記密碼」。'; document.getElementById('email').focus(); return; }
    withBusy(forgot, '寄送中…', async () => {
      try { await CloudDB.resetPassword(email); } catch (e) { msg.textContent = authErrorText(e); return; }
      msg.textContent = `如果 ${email} 有註冊過，會收到一封重設密碼的信，點信裡的連結就能設定新密碼。`;
    });
  });
  document.getElementById('google-btn').addEventListener('click', async () => {
    rememberLogin('google');
    try { sessionStorage.setItem('googlePending', '1'); } catch (e) { /* 略過 */ }
    try { await CloudDB.signInWithGoogle(); } catch (e) {
      document.getElementById('login-msg').textContent = /provider is not enabled|Unsupported provider/i.test(e.message)
        ? 'Google 登入暫時不能用，先用 Email 登入吧。' : 'Google 登入沒有成功，請再試一次，或先用 Email 登入。';
    }
  });
  // 有設定 Google 用戶端 ID 就換成 Google 官方按鈕（Google 畫面會顯示我們的網址，不是 supabase.co）
  if (!IN_APP && typeof GoogleButton !== 'undefined' && GoogleButton.enabled()) {
    const oldBtn = document.getElementById('google-btn');
    const box = document.createElement('div'); box.className = 'gsi-box';
    oldBtn.after(box);
    GoogleButton.mount(box, async (token, nonce) => {
      rememberLogin('google');
      try { sessionStorage.setItem('googlePending', '1'); } catch (e) { /* 略過 */ }
      try { await CloudDB.signInWithGoogleToken(token, nonce); location.reload(); } catch (e) {
        try { sessionStorage.removeItem('googlePending'); } catch (x) { /* 略過 */ }
        document.getElementById('login-msg').textContent = 'Google 登入沒有成功，請再試一次，或先用 Email 登入。';
      }
    }, isUp ? 'signup_with' : 'signin_with').then((ok) => { if (ok) oldBtn.hidden = true; else box.remove(); });
  }
  document.getElementById('login-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('login-btn');
    const msg = document.getElementById('login-msg');
    btn.disabled = true;
    msg.textContent = '';
    try {
      if (isUp) {
        const session = await CloudDB.signUp(email, password);
        track('sign_up', { method: 'email' });
        // 註冊後和 Google 一樣先問身分（另一半自己按了註冊，才不會變成另一本空日記）；試用時寫過紀錄的會直接當主人
        if (!session) {
          btn.disabled = false;
          viewLoginAfterSignup(email);
          return;
        }
      } else {
        await CloudDB.signIn(email, password);
        track('login', { method: 'email' });
      }
      rememberLogin('email');
      await afterOwnerLogin();
      go('#/');
      route();
    } catch (e) {
      btn.disabled = false;
      msg.textContent = authErrorText(e);
    }
  });
}
function viewLoginAfterSignup(email) {
  viewLogin('signin');
  document.getElementById('email').value = email;
  document.getElementById('login-msg').textContent = SIGNUP_SENT_TEXT;
}
// 註冊後要收信確認。已經註冊過的 Email 再註冊一次，Supabase 不會報錯、也不會寄信，所以提醒一下
const SIGNUP_SENT_TEXT = '帳號建立好了！請到信箱點確認連結，確認後在這裡登入。幾分鐘內都沒收到信（也看看垃圾信件匣）的話，可能這個 Email 之前就註冊過了，請直接登入，或按「忘記密碼？」。';
// Supabase 登入、註冊的英文錯誤翻成中文；看不懂的就給一般的說法，不把英文原文丟給使用者
function authErrorText(e) {
  const m = (e && e.message) || '';
  if ((e && e.offline) || /fetch|network|load failed|timeout/i.test(m)) return navigator.onLine === false ? '現在沒有網路，連上網路後再試一次。' : '連不上網路，請確認網路後再試一次。';
  if (/invalid login|invalid credentials/i.test(m)) return 'Email 或密碼不對，再試一次。如果你是用分享碼加入、後來用 Email 建立帳號，可能還沒設過密碼：在上面填 Email、按「忘記密碼？」設一組就能登入，之前的紀錄都還在。';
  if (/not confirmed/i.test(m)) return '這個帳號還沒確認，請先到信箱點確認連結（也看看垃圾信件匣）。';
  if (/already registered|already exists|already been registered/i.test(m)) return '這個 Email 已經註冊過了，請直接登入。忘記密碼的話，按「忘記密碼？」。';
  if (/password.*(at least|short|characters|weak)|weak password/i.test(m)) return '密碼太短或太簡單，請用至少 8 個字，混合英文和數字。';
  if (/rate limit|too many|only request this after|security purposes/i.test(m)) return '短時間內試太多次了，請過幾分鐘再試一次。';
  if (/valid.*email|email.*invalid|invalid.*email|email address/i.test(m)) return 'Email 格式好像不對，再檢查一下。';
  if (/signups? not allowed|signup.*disabled/i.test(m)) return '目前暫停開放註冊，請稍後再試。';
  console.warn('登入／註冊錯誤', m);
  return '沒有成功，請再試一次。一直不行的話，可以到「意見回饋」告訴我們。';
}
