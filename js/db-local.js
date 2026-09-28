// 資料儲存：用瀏覽器內建的 IndexedDB，紀錄和照片都存在這支手機裡。
// 之後升級雲端版時，只要把這個檔案換成呼叫 Supabase 的版本，其他畫面不用改。
const LocalDB = (() => {
  const DB_NAME = 'couple-diary';
  const DB_VERSION = 1;
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function tx(store, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      let result;
      const r = fn(s);
      if (r) r.onsuccess = () => { result = r.result; };
      t.oncomplete = () => resolve(result);
      // Safari 有時錯誤是 null：換成看得懂的錯誤，免得按儲存沒反應
      const fail = () => reject(t.error || new Error('存到手機時失敗了，請再試一次'));
      t.onerror = fail;
      t.onabort = fail;
    });
  }

  function fromStored(p) {
    if (p && !p.blob && p.buf) { const { buf, type, ...rest } = p; return { ...rest, blob: new Blob([buf], { type: type || 'image/jpeg' }) }; }
    return p;
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  return {
    uid,
    allRecords: () => tx('records', 'readonly', (s) => s.getAll()),
    getRecord: (id) => tx('records', 'readonly', (s) => s.get(id)),
    putRecord: (rec) => tx('records', 'readwrite', (s) => s.put(rec)),
    deleteRecord: (id) => tx('records', 'readwrite', (s) => s.delete(id)),
    getPhoto: async (id) => fromStored(await tx('photos', 'readonly', (s) => s.get(id))),
    // 有些 Safari（例如無痕模式）不能把照片檔直接存進 IndexedDB：失敗時改存成位元組，讀出來再變回照片
    putPhoto: async (photo) => {
      try { return await tx('photos', 'readwrite', (s) => s.put(photo)); } catch (e) {
        if (!photo || !(photo.blob instanceof Blob)) throw e;
        const buf = await photo.blob.arrayBuffer();
        const { blob, ...rest } = photo;
        return tx('photos', 'readwrite', (s) => s.put({ ...rest, buf, type: blob.type || 'image/jpeg' }));
      }
    },
    deletePhoto: (id) => tx('photos', 'readwrite', (s) => s.delete(id)),
    allPhotos: async () => (await tx('photos', 'readonly', (s) => s.getAll())).map(fromStored),
    getSetting: async (key, fallback) => {
      const row = await tx('settings', 'readonly', (s) => s.get(key));
      return row ? row.value : fallback;
    },
    setSetting: (key, value) => tx('settings', 'readwrite', (s) => s.put({ key, value })),
    clearAll: async () => {
      await tx('records', 'readwrite', (s) => s.clear());
      await tx('photos', 'readwrite', (s) => s.clear());
      await tx('settings', 'readwrite', (s) => s.clear());
    },
  };
})();
