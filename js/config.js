// 雲端設定：把 Supabase 後台 Project Settings → API 裡的兩個值填在這裡。
// 這兩個是公開的值，本來就會出現在網頁裡，放在這裡沒關係。
// 千萬不要把 service_role（secret）key 放進來。
// 兩個都留空的話，App 會用「單人版」模式，資料只存在這支手機。
window.APP_CONFIG = {
  SUPABASE_URL: 'https://bihepkbxeqvufbbnokuw.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable__V15eMn36oW3aJ-vYR3XRw_5x8QnBaG',
};
