// 雲端資料儲存：用 Supabase 存紀錄、設定和照片。
// 提供和 LocalDB 一樣的功能，所以畫面程式不用管資料放在哪裡。
const CLOUD_ENABLED = !!(window.APP_CONFIG && window.APP_CONFIG.SUPABASE_URL && window.APP_CONFIG.SUPABASE_ANON_KEY && window.supabase);

const CloudDB = CLOUD_ENABLED ? (() => {
  const client = window.supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY, {
    // pkce：Google 登入回來時用 ?code=，不會和畫面用的 # 網址打架
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  });
  const BUCKET = 'photos';
  let session = null;
  let urlError = null;
  let partner = null; // 用分享碼加入的另一半：{ owner, name, owner_name }
  let pendingJoin = null; // 用分享碼加入、還在等主人同意：{ owner, name, owner_name }

  // ---- 離線 ----
  // 連不上網路時丟出的錯誤會帶 offline 標記，畫面顯示統一的提示
  const OFFLINE_MSG = '目前離線，連上網路後才能新增或修改';
  const netDown = (e) => !navigator.onLine || !!(e && e.offline) || /failed to fetch|networkerror|load failed|network request failed/i.test(String((e && e.message) || e || ''));
  function offlineError() { const e = new Error(OFFLINE_MSG); e.offline = true; return e; }
  // 最近讀到的資料存一份在手機裡（只存文字，不存照片），離線時拿來唯讀顯示
  const OFF_PREFIX = 'offline:';
  const offKey = (k) => `${OFF_PREFIX}${session ? session.user.id : '-'}:${k}`;
  function remember(k, v) { try { localStorage.setItem(offKey(k), JSON.stringify(v === undefined ? null : v)); } catch (e) { /* 空間不夠就算了 */ } return v; }
  function recall(k) { try { const s = localStorage.getItem(offKey(k)); return s == null ? undefined : JSON.parse(s); } catch (e) { return undefined; } }
  let usedOffline = false;
  async function cached(k, fn) {
    try { const v = await fn(); remember(k, v); return v; } catch (e) {
      if (netDown(e)) { const v = recall(k); if (v !== undefined) { usedOffline = true; return v; } throw offlineError(); }
      throw e;
    }
  }
  function forgetOffline() {
    try { Object.keys(localStorage).filter((k) => k.startsWith(OFF_PREFIX)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* 沒關係 */ }
  }
  // 沒網路時 getSession 可能因為換不到新憑證而失敗：先用手機裡存的登入資料
  function storedSession() {
    try {
      const ref = new URL(window.APP_CONFIG.SUPABASE_URL).hostname.split('.')[0];
      const raw = JSON.parse(localStorage.getItem(`sb-${ref}-auth-token`) || 'null');
      const s = raw && (raw.currentSession || raw);
      return s && s.user ? s : null;
    } catch (e) { return null; }
  }

  function check({ data, error }) {
    if (error) { if (netDown(error)) throw offlineError(); throw new Error(error.message || '雲端連線失敗'); }
    return data;
  }
  function userId() {
    if (!session) throw new Error('請先登入');
    return session.user.id;
  }
  // 紀錄和照片的主人：自己，或是（另一半模式時）分享給你的人
  function dataOwner() {
    return partner ? partner.owner : userId();
  }
  // 照片放在「寫那則紀錄的人」自己的資料夾；讀紀錄時記下每張照片在誰的資料夾
  const photoFolders = new Map();
  const noteFolders = (rec) => { if (rec && Array.isArray(rec.photoIds)) for (const pid of rec.photoIds) photoFolders.set(pid, rec.author || dataOwner()); return rec; };
  const folderOf = (id) => photoFolders.get(id) || dataOwner();
  const photoPath = (id) => `${folderOf(id)}/${id}.jpg`;
  // 列表用的小圖放在 t/ 資料夾，檔名和原圖一樣，對方的讀取權限也就跟著原圖
  const thumbPath = (id) => `${folderOf(id)}/t/${id}.jpg`;

  // 意見回饋：不用登入也能送（沒有讀取權限，送出後只有後台看得到）
  async function sendFeedback(f) {
    const uid = session ? session.user.id : null;
    const { error } = await client.from('feedback').insert({ ...f, user_id: uid });
    if (error) throw new Error(/feedback|relation/i.test(error.message) ? '回饋暫時送不出去，請稍後再試一次' : error.message);
  }

  async function loadPartner() {
    partner = null;
    pendingJoin = null;
    if (!session) return;
    // 還沒更新資料表（沒有 partner_info）時就當作自己，App 照常能用
    const { data, error } = await client.rpc('partner_info');
    let info = !error && data && data.owner ? data : null;
    if (error && netDown(error)) { const c = recall('partner'); info = c || null; usedOffline = true; } else remember('partner', info);
    // 還在等主人同意的，不算另一半（看不到紀錄）
    if (info && info.approved === false) pendingJoin = info; else partner = info;
  }

  async function listPhotoNames() {
    const names = [];
    for (let offset = 0; ; offset += 1000) {
      const page = check(await client.storage.from(BUCKET).list(userId(), { limit: 1000, offset }));
      names.push(...page.map((f) => f.name).filter((n) => n.endsWith('.jpg') && !n.startsWith('task-')));
      if (page.length < 1000) return names;
    }
  }

  return {
    client,
    uid: LocalDB.uid,
    sendFeedback,
    isOfflineError: netDown,
    // 這次畫面有沒有用到手機裡的舊資料（離線時）
    usedOfflineCache() { const u = usedOffline; usedOffline = false; return u; },

    // ---- 登入 ----
    async loadSession() {
      // 從 Google 登入回來時網址會帶 ?code=，先換成登入狀態再把網址清乾淨
      const params = new URLSearchParams(location.search);
      // 從 Google 回來但失敗時（例如這個 Google 帳號已經被別的帳號用了），錯誤會放在網址裡：先記下來再清掉
      const hashParams = new URLSearchParams(location.hash.replace(/^#\/?/, '').includes('=') ? location.hash.replace(/^#\/?/, '') : '');
      const errDesc = params.get('error_description') || hashParams.get('error_description');
      const errCode = params.get('error_code') || hashParams.get('error_code') || params.get('error') || hashParams.get('error');
      if (errDesc || errCode) {
        urlError = { code: errCode || '', message: (errDesc || '').replace(/\+/g, ' ') };
        history.replaceState(null, '', location.pathname + '#/');
      }
      const code = params.get('code');
      if (code) {
        try { await client.auth.exchangeCodeForSession(code); } catch (e) { /* 可能已經自動換過了 */ }
      }
      // 從重設密碼信回來時，直接到設定新密碼的畫面；其他情況只把 ?code= 清掉
      if (code || params.get('reset')) history.replaceState(null, '', location.pathname + (params.get('reset') ? '#/reset' : (location.hash || '#/')));
      const got = await client.auth.getSession();
      if (got.error && netDown(got.error)) session = storedSession(); else session = check(got).session;
      if (!session && !navigator.onLine) session = storedSession();
      // 臨時帳號可能已經在別的瀏覽器綁定好了（例如從 Google 回來時開在 Safari），手機裡存的還是舊狀態：重新拿一次
      if (session && session.user.is_anonymous) {
        try { const r = await client.auth.refreshSession(); if (r && r.data && r.data.session) session = r.data.session; } catch (e) { /* 沒網路就先用舊的 */ }
      }
      await loadPartner();
      return session;
    },
    async signInWithGoogle() {
      check(await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: location.origin + location.pathname },
      }));
    },
    // Google 官方按鈕拿到的 id token 直接登入（不用跳去 Google 再回來）
    async signInWithGoogleToken(token, nonce) {
      check(await client.auth.signInWithIdToken({ provider: 'google', token, nonce }));
    },
    async linkGoogleToken(token, nonce) {
      const { error } = await client.auth.linkIdentity({ provider: 'google', token, nonce });
      if (error) { const e = new Error(error.message || '連結沒有成功'); e.code = error.code || ''; throw e; }
    },
    async resetPassword(email) {
      check(await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname + '?reset=1' }));
    },
    async updatePassword(password) {
      check(await client.auth.updateUser({ password }));
    },
    currentEmail: () => (session ? session.user.email : null),
    // 這個帳號可以用哪些方式登入：{ email: 有沒有 Email 身分, google: 有沒有連結 Google }
    loginMethods: () => {
      const u = session && session.user;
      if (!u) return { email: false, google: false };
      const ids = (u.identities || []).map((i) => i.provider);
      const prov = (u.app_metadata && u.app_metadata.providers) || [];
      const has = (p) => ids.includes(p) || prov.includes(p);
      return { email: has('email'), google: has('google') };
    },
    // 拿一次從網址帶回來的錯誤（拿過就清掉）
    takeUrlError: () => { const e = urlError; urlError = null; return e; },
    isSignedIn: () => !!session,
    isAnonymous: () => !!(session && session.user.is_anonymous),
    isPartner: () => !!partner,
    myId: () => (session ? session.user.id : null),
    // 帳號建立的時間（毫秒），用來分辨剛註冊還是舊帳號登入
    createdAtMs: () => (session && session.user.created_at ? Date.parse(session.user.created_at) : 0),
    // 另一半綁定 Email / Google 之後就不是臨時帳號，可以一起寫吵架議題
    isBoundPartner: () => !!(partner && session && !session.user.is_anonymous),
    // 臨時帳號綁定 Email：先寄確認信，點信裡的連結後才算綁定
    async bindEmail(email) {
      check(await client.auth.updateUser({ email }, { emailRedirectTo: location.origin + location.pathname }));
    },
    async linkGoogle() {
      const { error } = await client.auth.linkIdentity({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
      if (error) throw new Error(/manual linking|disabled/i.test(error.message) ? 'Google 綁定暫時不能用，先用 Email 綁定吧' : error.message);
    },
    // 在別的瀏覽器點了確認信：回到這裡重新拿一次登入狀態
    async refreshUser() {
      try { await client.auth.refreshSession(); } catch (e) { /* 沒關係 */ }
      const got = await client.auth.getSession();
      if (got.error && netDown(got.error)) session = storedSession(); else session = check(got).session;
      if (!session && !navigator.onLine) session = storedSession();
      await loadPartner();
      return session;
    },
    pendingJoin: () => pendingJoin,
    async refreshPartner() { await loadPartner(); },
    partnerInfo: () => partner,
    async signIn(email, password) {
      session = check(await client.auth.signInWithPassword({ email, password })).session;
      await loadPartner();
      return session;
    },
    async signUp(email, password) {
      const data = check(await client.auth.signUp({ email, password }));
      session = data.session;
      return session; // 需要到信箱確認時會是 null
    },
    async signOut() {
      forgetOffline();
      await client.auth.signOut();
      session = null;
      partner = null;
    },

    // ---- 分享碼（另一半這一端） ----
    async joinWithCode(code, password, name) {
      if (!session) {
        const data = check(await client.auth.signInAnonymously());
        session = data.session;
      }
      const res = check(await client.rpc('join_share', { p_code: code, p_password: password, p_name: name }));
      if (!res || !res.ok) throw new Error((res && res.error) || '沒辦法加入');
      // 這段分享已經有綁定帳號的另一半：等待頁提醒「是同一個人的話請用原本的帳號登入」
      try {
        if (res.bound_partner) sessionStorage.setItem('boundPartnerHint', res.bound_partner);
        else sessionStorage.removeItem('boundPartnerHint');
      } catch (e) { /* 略過 */ }
      await loadPartner();
    },
    // 另一半結束這段關係：自己離開，主人下次打開會收到通知
    async partnerEndRelationship() {
      check(await client.rpc('partner_end_relationship'));
      partner = null;
    },
    async leaveShare() {
      check(await client.from('partners').delete().eq('uid', userId()));
      await this.signOut();
    },
    async partnerTasks() {
      // 對方寫的、出了任務的紀錄（兩個人都能做對方的任務）；舊版資料庫只有 partner_tasks
      const r = await client.rpc('member_tasks');
      if (r.error && /member_tasks|function/i.test(r.error.message || '')) return check(await client.rpc('partner_tasks')) || [];
      return check(r) || [];
    },
    async submitTask(recordId, note, blob) {
      let path = null;
      if (blob) {
        path = `${userId()}/task-${LocalDB.uid()}.jpg`;
        check(await client.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' }));
      }
      check(await client.rpc('submit_task', { p_record_id: recordId, p_note: note, p_photo_path: path }));
    },

    // ---- 分享碼（你這一端） ----
    async getShare() {
      return check(await client.from('shares').select('code, owner_name, created_at').eq('owner', userId()).maybeSingle());
    },
    async saveShare(code, password, ownerName) {
      check(await client.rpc('set_share', { p_code: code, p_password: password, p_owner_name: ownerName }));
    },
    async deleteShare() {
      check(await client.from('shares').delete().eq('owner', userId()));
    },
    // 另一半（包括等同意的人）是不是綁定帳號、是不是以前寫過紀錄的人；舊版資料庫沒有這個函式就回空的
    async partnerAccounts() {
      const r = await client.rpc('partner_accounts');
      if (r.error) return [];
      return r.data || [];
    },
    async listPartners() {
      const { data, error } = await client.from('partners').select('uid, name, joined_at, approved').eq('owner', userId()).order('joined_at');
      if (!error) return data;
      // 還沒更新資料表（沒有 approved 欄位）時，全部當作已同意
      return check(await client.from('partners').select('uid, name, joined_at').eq('owner', userId()).order('joined_at')).map((p) => ({ ...p, approved: true }));
    },
    async approvePartner(uid) {
      check(await client.rpc('approve_partner', { p_uid: uid }));
    },
    // ---- 另一半的愛心和補充 ----
    async partnerNotes(recordId) {
      const { data, error } = await client.from('partner_notes').select('*').eq('record_id', recordId).order('created_at');
      return error ? [] : data || [];
    },
    async heartedIds() {
      const { data, error } = await client.from('partner_notes').select('record_id').eq('kind', 'heart');
      return new Set(error ? [] : (data || []).map((x) => x.record_id));
    },
    async toggleHeart(recordId) {
      return check(await client.rpc('toggle_heart', { p_record_id: recordId }));
    },
    async addPartnerNote(recordId, text) {
      check(await client.rpc('add_partner_note', { p_record_id: recordId, p_text: text }));
    },
    async deletePartnerNote(id) {
      check(await client.from('partner_notes').delete().eq('id', id));
    },
    // ---- 雲端照片額度（付費功能還沒推出，先限制免費張數） ----
    async photoQuota() {
      const { data, error } = await client.rpc('photo_quota');
      return error || !data ? null : data; // 還沒更新資料表時當作不限
    },
    async noteUpgradeInterest() {
      await client.rpc('note_upgrade_interest');
    },
    // ---- 一起完成的事（主人直接寫；另一半透過資料庫函式新增、打勾、刪自己加的） ----
    async listWishes() {
      const data = await cached(`wishes:${dataOwner()}`, async () => {
        const { data: d, error } = await client.from('wishes').select('*').eq('owner', dataOwner()).order('created_at');
        if (error) { if (netDown(error)) throw offlineError(); if (/wishes/.test(error.message)) throw new Error('「一起完成的事」暫時載入不了，請稍後再試一次'); throw new Error(error.message); }
        return d;
      });
      // 封存的（上一段關係的）不顯示
      return (data || []).filter((w) => !w.archived);
    },
    async addWish(w) {
      if (partner) { check(await client.rpc('partner_add_wish', { p_title: w.title, p_note: w.note, p_category: w.category })); return; }
      check(await client.from('wishes').insert({ owner: userId(), title: w.title, note: w.note, category: w.category, created_by: 'owner', created_by_name: w.created_by_name || '' }));
    },
    async updateWish(id, patch) {
      check(await client.from('wishes').update(patch).eq('id', id).eq('owner', userId()));
    },
    async setWishDone(id, done, name) {
      if (partner) { check(await client.rpc('partner_set_wish_done', { p_id: id, p_done: done })); return; }
      check(await client.from('wishes').update({ done, done_at: done ? new Date().toISOString() : null, done_by_name: done ? name : '' }).eq('id', id).eq('owner', userId()));
    },
    async deleteWish(id) {
      if (partner) { check(await client.rpc('partner_delete_wish', { p_id: id })); return; }
      check(await client.from('wishes').delete().eq('id', id).eq('owner', userId()));
    },
    // 對方上鎖的紀錄（只有類型和編號）
    async othersLocked() {
      let { data, error } = await client.rpc('others_locked');
      if (error && partner) ({ data, error } = await client.rpc('partner_locked'));
      return error ? [] : data || [];
    },
    async partnerLocked() { return this.othersLocked(); },
    async removePartner(uid) {
      check(await client.from('partners').delete().eq('uid', uid).eq('owner', userId()));
    },
    async submissions(filter = {}) {
      // 看得到哪些由資料庫決定：自己寫的紀錄收到的任務（主人另外看得到整個空間的）
      let q = client.from('task_submissions').select('*');
      if (filter.recordId) q = q.eq('record_id', filter.recordId);
      if (filter.status) q = q.eq('status', filter.status);
      return check(await q.order('created_at', { ascending: false }));
    },
    async reviewSubmission(id, approve, note = null) {
      // 通過時資料庫會一起解鎖紀錄；退回時可以附一句原因
      check(await client.rpc('review_task', { p_id: id, p_approve: approve, p_note: note }));
    },
    async removeTaskPhoto(path) {
      check(await client.storage.from(BUCKET).remove([path]));
    },
    async taskPhoto(path) {
      const { data, error } = await client.storage.from(BUCKET).download(path);
      return error ? null : data;
    },

    // ---- 紀錄 ----
    // 目前這段關係的紀錄（封存的另外用 archivedRecords 拿）
    async allRecords() { return (await this.everyRecord()).filter((r) => !r.archivedAt); },
    async archivedRecords() { return (await this.everyRecord()).filter((r) => r.archivedAt); },
    async everyRecord() {
      const recs = await cached(`records:${dataOwner()}`, async () => {
        const rows = [];
        for (let from = 0; ; from += 1000) {
          const page = check(await client.from('records').select('data').eq('owner', dataOwner()).order('created_at').range(from, from + 999));
          rows.push(...page);
          if (page.length < 1000) break;
        }
        return rows.map((r) => r.data);
      });
      return recs.map((r) => noteFolders(r));
    },
    async getRecord(id) {
      try {
        const row = check(await client.from('records').select('data').eq('owner', dataOwner()).eq('id', id).maybeSingle());
        return row ? noteFolders(row.data) : undefined;
      } catch (e) {
        if (!netDown(e)) throw e;
        const all = recall(`records:${dataOwner()}`);
        if (!all) throw e;
        usedOffline = true;
        const r = all.find((x) => x.id === id);
        return r ? noteFolders(r) : undefined;
      }
    },
    async putRecord(rec) {
      // 另一半寫在主人的空間裡，透過資料庫函式檢查（只能改自己寫的，和分享的吵架議題）
      if (partner) {
        check(await client.rpc('partner_save_record', { p_rec: rec }));
        return;
      }
      check(await client.from('records').upsert({
        id: rec.id,
        type: rec.type,
        visibility: rec.visibility || 'shared',
        unlocked: !!rec.unlocked,
        data: rec,
        updated_at: new Date().toISOString(),
      }));
    },
    // 結束這段關係：'archive' 封存或 'delete' 刪除；另一半會被移除、分享碼作廢
    // 封存的紀錄全部還原（要先重跑 schema.sql 才有這個函式）
    async restoreArchive() {
      const { data, error } = await client.rpc('restore_archive');
      if (error) throw new Error(/restore_archive|function/i.test(error.message) ? '還原功能還沒開好，請稍後再試' : error.message);
      return data || 0;
    },
    // 通知（小鈴鐺）：還沒重跑 schema.sql 時安靜地回空的，不讓畫面壞掉
    async notifications() {
      const { data, error } = await client.rpc('my_notifications');
      return error ? null : (data || []);
    },
    async markNotificationsRead() {
      await client.rpc('mark_notifications_read');
    },
    async notifyPrefs() {
      const { data, error } = await client.rpc('notify_prefs_get');
      return error ? null : (data || { email_on: true });
    },
    async setNotifyEmail(on) {
      const { error } = await client.rpc('notify_prefs_set', { p_email_on: !!on });
      if (error) throw new Error(/notify_prefs|function/i.test(error.message) ? '通知設定還沒開好，請稍後再試' : error.message);
    },
    // 數據看板（只有管理員）：還沒重跑 schema.sql 時 amIAdmin 回 false
    async amIAdmin() {
      const { data, error } = await client.rpc('am_i_admin');
      return !error && data === true;
    },
    async adminStats() {
      const { data, error } = await client.rpc('admin_stats');
      if (error) throw new Error(/沒有權限/.test(error.message) ? '沒有權限' : error.message);
      return data;
    },
    async endRelationship(mode, keepUid = null) {
      // keepUid：結束後要讓哪個還在等同意的新對象加入（分享碼保留）
      check(await client.rpc('end_relationship', keepUid ? { p_mode: mode, p_keep: keepUid } : { p_mode: mode }));
    },
    async deleteArchive() {
      check(await client.rpc('delete_archive'));
    },
    async partnerDeleteRecord(id) {
      check(await client.rpc('partner_delete_record', { p_id: id }));
    },
    // 新紀錄的編號：兩個人共用，資料庫也會算到對方上鎖的紀錄（還沒更新資料表時回傳 null）
    async nextNo(type) {
      const { data, error } = await client.rpc('next_no', { p_type: type });
      return error ? null : data;
    },
    async renumberAll() {
      check(await client.rpc('renumber_all'));
    },
    async deleteRecord(id) {
      check(await client.from('records').delete().eq('id', id));
    },

    // ---- 照片 ----
    async getPhoto(id) {
      const { data, error } = await client.storage.from(BUCKET).download(photoPath(id));
      if (error) return undefined;
      return { id, blob: data };
    },
    // 新照片一律放自己的資料夾
    photoIsMine: (id) => folderOf(id) === userId(),
    async putPhoto(photo) {
      photoFolders.set(photo.id, userId());
      check(await client.storage.from(BUCKET).upload(photoPath(photo.id), photo.blob, { contentType: 'image/jpeg', upsert: true }));
    },
    async deletePhoto(id) {
      check(await client.storage.from(BUCKET).remove([photoPath(id), thumbPath(id)]));
    },
    async getThumb(id) {
      const { data, error } = await client.storage.from(BUCKET).download(thumbPath(id));
      return error ? undefined : { id, blob: data };
    },
    async putThumb(id, blob) {
      if (folderOf(id) !== userId()) return;
      check(await client.storage.from(BUCKET).upload(thumbPath(id), blob, { contentType: 'image/jpeg', upsert: true }));
    },
    // 自己資料夾裡、沒有任何紀錄在用的照片（例如選「刪除這段關係」後留下的）。
    // 剛傳上去不到一天的先不算，免得刪到正在存的紀錄的照片
    async unusedPhotos(usedIds) {
      const out = [];
      for (let offset = 0; ; offset += 1000) {
        const page = check(await client.storage.from(BUCKET).list(userId(), { limit: 1000, offset }));
        for (const f of page) {
          if (!f.name.endsWith('.jpg') || f.name.startsWith('task-')) continue;
          const id = f.name.replace(/\.jpg$/, '');
          const age = Date.now() - Date.parse(f.created_at || 0);
          if (!usedIds.has(id) && age > 86400000) out.push(id);
        }
        if (page.length < 1000) return out;
      }
    },
    async removePhotos(ids) {
      const uid = userId();
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        check(await client.storage.from(BUCKET).remove(batch.map((n) => `${uid}/${n}.jpg`).concat(batch.map((n) => `${uid}/t/${n}.jpg`))));
      }
    },
    async allPhotos() {
      const out = [];
      for (const name of await listPhotoNames()) {
        const id = name.replace(/\.jpg$/, '');
        const p = await this.getPhoto(id);
        if (p) out.push(p);
      }
      return out;
    },

    // ---- 設定 ----
    async getSetting(key, fallback) {
      const row = await cached(`set:${key}`, async () => check(await client.from('settings').select('value').eq('key', key).maybeSingle()));
      return row ? row.value : fallback;
    },
    async setSetting(key, value) {
      check(await client.from('settings').upsert({ owner: userId(), key, value }));
    },

    async clearAll() {
      const uid = userId();
      // 對方送來的任務照片放在對方的資料夾，要先刪（紀錄刪掉後就找不到了）
      try {
        const paths = (await this.submissions()).map((t) => t.photo_path).filter(Boolean);
        if (paths.length) check(await client.storage.from(BUCKET).remove(paths));
      } catch (e) { /* 舊版資料表沒有任務，略過 */ }
      check(await client.from('records').delete().eq('owner', uid));
      check(await client.from('settings').delete().eq('owner', uid));
      try { check(await client.from('wishes').delete().eq('owner', uid)); } catch (e) { /* 舊版資料表沒有清單 */ }
      const names = await listPhotoNames();
      for (let i = 0; i < names.length; i += 100) {
        const batch = names.slice(i, i + 100);
        check(await client.storage.from(BUCKET).remove(batch.map((n) => `${uid}/${n}`).concat(batch.map((n) => `${uid}/t/${n}`))));
      }
    },
    // 刪除帳號：資料要先清掉（clearAll），再刪登入帳號本身
    async deleteAccount() {
      check(await client.rpc('delete_account'));
      forgetOffline();
      await client.auth.signOut();
      session = null;
    },
  };
})() : null;

// 畫面程式統一用 DB：登入雲端帳號（或用分享碼加入）時用雲端，
// 還沒登入的新使用者（試用中）和沒填雲端設定時用手機本機
const usingCloud = () => CLOUD_ENABLED && CloudDB.isSignedIn();
const DB = new Proxy({}, { get: (_, key) => (usingCloud() ? CloudDB : LocalDB)[key] });
