// 匿名使用統計（Google Analytics 4）
// 規則：只記「發生了什麼事」，絕對不送紀錄的標題、內容、標籤、名字、Email 或任何 id。
// - 只有下面清單裡的事件和參數能送出，其他一律丟掉，免得不小心把內容送出去。
// - 網址只送頁面名稱（#/view/abc123 會變成 /view），網址參數只留 utm_ 開頭的。
// - 使用者可以在設定頁關掉（存在這支手機的 localStorage：analyticsOff）。
// - config.js 的 GA_MEASUREMENT_ID 留空就什麼都不做。
(function () {
  const ID = (window.APP_CONFIG && window.APP_CONFIG.GA_MEASUREMENT_ID) || '';
  const TYPES = ['happy', 'cloud', 'fight'];
  const oneOf = (list) => (v) => (list.includes(v) ? v : undefined);
  const bool = (v) => (v ? 'yes' : 'no');
  const code = (v) => (typeof v === 'string' && /^[a-z0-9_-]{1,40}$/i.test(v) ? v : undefined);
  const type = { type: oneOf(TYPES) };
  // 允許的事件 → 允許的參數（每個參數都有自己的檢查，不符合就不送）
  const EVENTS = {
    tutorial_complete: {},
    first_record: type,
    sign_up: { method: oneOf(['email', 'google']) },
    login: { method: oneOf(['email', 'google']) },
    share_invite: { how: oneOf(['share', 'copy']) },
    partner_join_request: {},
    partner_approved: {},
    add_to_home: { how: oneOf(['prompt', 'steps']) },
    record_create: { type: oneOf(TYPES), visibility: oneOf(['shared', 'locked', 'task', 'private']), has_photo: bool, author: oneOf(['me', 'partner']) },
    record_edit: type,
    record_delete: type,
    task_submit: {},
    task_approve: {},
    task_reject: {},
    fight_status_change: { status: oneOf(['open', 'progress', 'resolved']) },
    cloud_cleared: {},
    stamp_earned: { stamp: code },
    wish_create: {},
    wish_done: {},
    export_backup: { format: oneOf(['json', 'pdf']) },
    pin_enable: {},
    pause_share: {},
    end_relationship: { mode: oneOf(['archive', 'delete']) },
    upgrade_interest: { feature: oneOf(['photos']) },
    feedback_send: {},
    signup_prompt: { where: oneOf(['tour', 'share', 'third_record']) },
  };
  function off() { try { return !!localStorage.getItem('analyticsOff'); } catch (e) { return false; } }
  // 網址只留 utm_ 參數（Supabase 登入回來的 ?code= 之類都拿掉）
  function cleanSearch() {
    const q = new URLSearchParams(location.search);
    const keep = new URLSearchParams();
    q.forEach((v, k) => { if (/^utm_[a-z]+$/.test(k)) keep.set(k, v.slice(0, 100)); });
    const s = keep.toString();
    return s ? `?${s}` : '';
  }
  // 一打開時就記下 utm 參數（之後網址可能被登入流程清掉），整段使用都用這組
  const firstSearch = cleanSearch();
  function pagePath() {
    const page = (location.hash.replace(/^#\/?/, '').split('/')[0] || 'home').replace(/[^a-z-]/gi, '').slice(0, 20) || 'home';
    return `/${page}`;
  }
  let loaded = false;
  function load() {
    if (loaded || !ID || off()) return loaded;
    if (!/^G-[A-Z0-9]{4,20}$/.test(ID)) return false;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', ID, {
      send_page_view: false,
      page_location: location.origin + '/' + firstSearch,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`;
    document.head.appendChild(s);
    return true;
  }
  function track(name, params = {}) {
    const spec = EVENTS[name];
    if (!spec || off() || !load()) return;
    const out = {};
    for (const [k, check] of Object.entries(spec)) {
      if (!(k in params)) continue;
      const v = check(params[k]);
      if (v !== undefined) out[k] = v;
    }
    window.gtag('event', name, out);
  }
  let lastPath = null;
  function pageView() {
    if (off() || !load()) return;
    const path = pagePath();
    if (path === lastPath) return;
    lastPath = path;
    window.gtag('event', 'page_view', { page_location: location.origin + path + firstSearch, page_path: path, page_title: '啾啾日記' });
  }
  function setEnabled(on) {
    try { if (on) localStorage.removeItem('analyticsOff'); else localStorage.setItem('analyticsOff', '1'); } catch (e) { /* 略過 */ }
    if (!on && ID) { try { window[`ga-disable-${ID}`] = true; } catch (e) { /* 略過 */ } }
    if (on && ID) { try { window[`ga-disable-${ID}`] = false; } catch (e) { /* 略過 */ } }
  }
  if (ID && off()) window[`ga-disable-${ID}`] = true;
  window.Analytics = { track, pageView, setEnabled, enabled: () => !!ID && !off(), configured: () => !!ID, EVENTS };
})();
