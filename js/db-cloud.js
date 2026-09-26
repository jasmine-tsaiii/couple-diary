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
  let partner = null; // 用分享碼加入的另一半：{ owner, name, owner_name }

  function check({ data, error }) {
    if (error) throw new Error(error.message || '雲端連線失敗');
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
  const photoPath = (id) => `${dataOwner()}/${id}.jpg`;

  async function loadPartner() {
    partner = null;
    if (!session) return;
    // 還沒更新資料表（沒有 partner_info）時就當作自己，App 照常能用
    const { data, error } = await client.rpc('partner_info');
    partner = !error && data && data.owner ? data : null;
  }

  async function listPhotoNames() {
    const names = [];
    for (let offset = 0; ; offset += 1000) {
      const page = check(await client.storage.from(BUCKET).list(userId(), { limit: 1000, offset }));
      names.push(...page.map((f) => f.name).filter((n) => !n.startsWith('task-')));
      if (page.length < 1000) return names;
    }
  }

  return {
    client,
    uid: LocalDB.uid,

    // ---- 登入 ----
    async loadSession() {
      // 從 Google 登入回來時網址會帶 ?code=，先換成登入狀態再把網址清乾淨
      const code = new URLSearchParams(location.search).get('code');
      if (code) {
        try { await client.auth.exchangeCodeForSession(code); } catch (e) { /* 可能已經自動換過了 */ }
        history.replaceState(null, '', location.pathname + (location.hash || '#/'));
      }
      session = check(await client.auth.getSession()).session;
      await loadPartner();
      return session;
    },
    async signInWithGoogle() {
      check(await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: location.origin + location.pathname },
      }));
    },
    currentEmail: () => (session ? session.user.email : null),
    isSignedIn: () => !!session,
    isAnonymous: () => !!(session && session.user.is_anonymous),
    isPartner: () => !!partner,
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
      await loadPartner();
    },
    async leaveShare() {
      check(await client.from('partners').delete().eq('uid', userId()));
      await this.signOut();
    },
    async partnerTasks() {
      return check(await client.rpc('partner_tasks')) || [];
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
    async listPartners() {
      return check(await client.from('partners').select('uid, name, joined_at').eq('owner', userId()).order('joined_at'));
    },
    async removePartner(uid) {
      check(await client.from('partners').delete().eq('uid', uid).eq('owner', userId()));
    },
    async submissions(filter = {}) {
      let q = client.from('task_submissions').select('*').eq('owner', userId());
      if (filter.recordId) q = q.eq('record_id', filter.recordId);
      if (filter.status) q = q.eq('status', filter.status);
      return check(await q.order('created_at', { ascending: false }));
    },
    async reviewSubmission(id, approve) {
      check(await client.from('task_submissions').update({ status: approve ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() }).eq('id', id));
    },
    async taskPhoto(path) {
      const { data, error } = await client.storage.from(BUCKET).download(path);
      return error ? null : data;
    },

    // ---- 紀錄 ----
    async allRecords() {
      const rows = [];
      for (let from = 0; ; from += 1000) {
        const page = check(await client.from('records').select('data').eq('owner', dataOwner()).order('created_at').range(from, from + 999));
        rows.push(...page);
        if (page.length < 1000) break;
      }
      return rows.map((r) => r.data);
    },
    async getRecord(id) {
      const row = check(await client.from('records').select('data').eq('owner', dataOwner()).eq('id', id).maybeSingle());
      return row ? row.data : undefined;
    },
    async putRecord(rec) {
      check(await client.from('records').upsert({
        id: rec.id,
        type: rec.type,
        visibility: rec.visibility || 'shared',
        unlocked: !!rec.unlocked,
        data: rec,
        updated_at: new Date().toISOString(),
      }));
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
    async putPhoto(photo) {
      check(await client.storage.from(BUCKET).upload(photoPath(photo.id), photo.blob, { contentType: 'image/jpeg', upsert: true }));
    },
    async deletePhoto(id) {
      check(await client.storage.from(BUCKET).remove([photoPath(id)]));
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
      const row = check(await client.from('settings').select('value').eq('key', key).maybeSingle());
      return row ? row.value : fallback;
    },
    async setSetting(key, value) {
      check(await client.from('settings').upsert({ owner: userId(), key, value }));
    },

    async clearAll() {
      const uid = userId();
      check(await client.from('records').delete().eq('owner', uid));
      check(await client.from('settings').delete().eq('owner', uid));
      const names = await listPhotoNames();
      for (let i = 0; i < names.length; i += 100) {
        check(await client.storage.from(BUCKET).remove(names.slice(i, i + 100).map((n) => `${uid}/${n}`)));
      }
    },
  };
})() : null;

// 畫面程式統一用 DB：有填雲端設定就用雲端，否則用手機本機
const DB = CLOUD_ENABLED ? CloudDB : LocalDB;
