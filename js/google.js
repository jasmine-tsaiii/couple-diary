// Google 官方登入按鈕（Google Identity Services）。
// 為什麼要用：原本的 Google 登入會繞到 Supabase 的網址，Google 畫面會寫「繼續使用 xxx.supabase.co」，使用者看了會怕。
// 用官方按鈕的話，登入在我們自己的網站完成，Google 畫面顯示的是 jas-soul.com。
// config.js 的 GOOGLE_CLIENT_ID 留空，或 Google 的程式載不到（例如被擋），就回到原本的做法（跳去 Google 再回來）。
const GoogleButton = (() => {
  const CLIENT_ID = (window.APP_CONFIG && window.APP_CONFIG.GOOGLE_CLIENT_ID) || '';
  let loading = null;
  function load() {
    if (!CLIENT_ID) return Promise.reject(new Error('no client id'));
    if (window.google && window.google.accounts && window.google.accounts.id) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => (window.google && window.google.accounts ? resolve() : reject(new Error('gsi missing')));
      s.onerror = () => { loading = null; reject(new Error('gsi load failed')); };
      setTimeout(() => reject(new Error('gsi timeout')), 6000);
      document.head.appendChild(s);
    });
    return loading;
  }
  async function sha256Hex(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // 把 Google 的官方按鈕放進 box；使用者選好帳號後呼叫 onToken(idToken, nonce)
  // 回傳 true 代表放好了；false 代表不能用（呼叫的地方就保留原本的按鈕）
  async function mount(box, onToken, text = 'signin_with') {
    if (!CLIENT_ID || !box || !window.crypto || !crypto.subtle) return false;
    try {
      await load();
      const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        nonce: await sha256Hex(nonce),
        callback: (res) => { if (res && res.credential) onToken(res.credential, nonce); },
        ux_mode: 'popup',
        itp_support: true,
        use_fedcm_for_button: true,
      });
      box.innerHTML = '';
      window.google.accounts.id.renderButton(box, {
        type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text, locale: 'zh-TW',
        width: Math.min(400, Math.max(200, Math.round(box.getBoundingClientRect().width || 320))),
      });
      return true;
    } catch (e) {
      return false;
    }
  }
  return { mount, enabled: () => !!CLIENT_ID };
})();
