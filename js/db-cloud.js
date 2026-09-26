// 雲端資料儲存：用 Supabase 存紀錄、設定和照片。
// 提供和 LocalDB 一樣的功能，所以畫面程式不用管資料放在哪裡。
const CLOUD_ENABLED = !!(window.APP_CONFIG && window.APP_CONFIG.SUPABASE_URL && window.APP_CONFIG.SUPABASE_ANON_KEY && window.supabase);

const CloudDB = CLOUD_ENABLED ? (() => {
  const client = window.supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  const BUCKET = 'photos';
  let session = null;

  function check({ data, error }) {
    if (error) throw new Error(error.message || '雲端連線失敗');
    return data;
  }
  function userId() {
    if (!session) throw new Error('請先登入');
    return session.user.id;
  }
  const photoPath = (id) => `${userId()}/${id}.jpg`;

  async function listPhotoNames() {
    const names = [];
    for (let offset = 0; ; offset += 1000) {
      const page = check(await client.storage.from(BUCKET).list(userId(), { limit: 1000, offset }));
      names.push(...page.map((f) => f.name));
      if (page.length < 1000) return names;
    }
  }

  return {
    client,
    uid: LocalDB.uid,

    // ---- 登入 ----
    async loadSession() {
      session = check(await client.auth.getSession()).session;
      return session;
    },
    currentEmail: () => (session ? session.user.email : null),
    async signIn(email, password) {
      session = check(await client.auth.signInWithPassword({ email, password })).session;
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
    },

    // ---- 紀錄 ----
    async allRecords() {
      const rows = [];
      for (let from = 0; ; from += 1000) {
        const page = check(await client.from('records').select('data').order('created_at').range(from, from + 999));
        rows.push(...page);
        if (page.length < 1000) break;
      }
      return rows.map((r) => r.data);
    },
    async getRecord(id) {
      const row = check(await client.from('records').select('data').eq('id', id).maybeSingle());
      return row ? row.data : undefined;
    },
    async putRecord(rec) {
      check(await client.from('records').upsert({
        id: rec.id,
        type: rec.type,
        visibility: rec.visibility || 'shared',
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
