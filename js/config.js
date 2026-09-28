// 雲端設定：把 Supabase 後台 Project Settings → API 裡的兩個值填在這裡。
// 這兩個是公開的值，本來就會出現在網頁裡，放在這裡沒關係。
// 千萬不要把 service_role（secret）key 放進來。
// 換成別的 Supabase 專案時，index.html 裡安全設定（Content-Security-Policy）的網址也要一起改。
// 兩個都留空的話，App 會用「單人版」模式，資料只存在這支手機。
window.APP_CONFIG = {
  SUPABASE_URL: 'https://bihepkbxeqvufbbnokuw.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable__V15eMn36oW3aJ-vYR3XRw_5x8QnBaG',
  // Google Analytics 4 的評估 ID（G- 開頭）。留空就完全不追蹤、也不會載入 Google 的程式。
  GA_MEASUREMENT_ID: 'G-GNF8K7HB29',
  // Google 登入的「用戶端 ID」（xxxx.apps.googleusercontent.com，公開的值，不是密碼）。
  // 填了就用 Google 官方登入按鈕，Google 畫面會顯示我們的網址；留空就用原本跳去 Google 再回來的方式。
  GOOGLE_CLIENT_ID: '625276631279-so2ntvms2avugj2le1m5aea5rkr1tele.apps.googleusercontent.com',
};
