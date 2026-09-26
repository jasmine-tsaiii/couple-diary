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
      t.onerror = () => reject(t.error);
    });
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
    getPhoto: (id) => tx('photos', 'readonly', (s) => s.get(id)),
    putPhoto: (photo) => tx('photos', 'readwrite', (s) => s.put(photo)),
    deletePhoto: (id) => tx('photos', 'readwrite', (s) => s.delete(id)),
    allPhotos: () => tx('photos', 'readonly', (s) => s.getAll()),
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
