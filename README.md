# 我們的紀錄

記錄情侶之間的美好時刻、烏雲時刻和吵架議題的小網頁 App，用手機瀏覽器打開就能用。

## 現在能做什麼

- **美好時刻、烏雲時刻**：各有 100 個的進度條。每則紀錄可以填標題、日期（日曆選單）、描述、多張照片、心情表情（最多 3 個，可自選任何表情）和感受標籤。沒有放照片的美好時刻會顯示預設圖和編號。
- **事後反思**：烏雲時刻可以隨時補寫「事後反思」，記下冷靜之後想法怎麼改變，會依日期排成時間軸（每則 500 字，最多 50 則）。
- **吵架議題**：可以填分類（能自訂）、原因、雙方的想法和狀態（未解決／處理中／已解決），還能一直補充後續。
- **誰可以看**：可以選給對方看、上鎖或任務解鎖（按完成就好／要上傳照片）。雲端版開啟分享碼後就會生效。
- **名字**：第一次打開會請你填自己和伴侶的名字，標題會變成「Jasmine和小明的紀錄」，吵架議題也會顯示「某某的想法」。設定頁可以改。
- **上限**：標題 60 字、描述 2000 字、吵架的原因和想法各 1000 字、解法 500 字、每則後續 300 字且每個議題最多 100 則、標籤每個 12 字且每則最多 10 個、照片每則最多 9 張（原檔最大 20 MB，自動壓縮，雲端每張上限 5 MB）、日期要在 1970 年到今天之間、分類每個 12 字且最多 30 個、名字 20 字、任務 100 字、任務留言 500 字、分享密碼 6 到 72 個字元。
- **編號**：每則紀錄的 No. 在新增時就固定，改日期不會變；刪除後號碼留空，不會補位。設定頁可以依日期重新編號。
- **不用登入就能先用**：新使用者打開就能直接記錄，資料先存在手機。註冊或登入後會自動把這些紀錄搬上雲端。登入過的手機登出後會回到登入畫面。
- **分享碼（雲端版）**：在設定頁填你的名字和分享密碼，產生一組分享碼。你可以複製邀請連結傳給對方（分享碼已經帶在連結裡），對方點開，輸入分享碼、密碼和自己的名字，就能看「給對方看」的紀錄和做任務，不能修改任何東西。對方送出任務後，你在那則紀錄裡按「通過並解鎖」，對方就看得到。你隨時可以移除對方、換新分享碼或停止分享。
- **篩選**：美好和烏雲可以按標籤篩選，吵架議題可以按分類和狀態篩選。
- **備份**：在設定頁可以匯出「還原用備份」（.json，照片也包含在內，用來匯入還原）和「閱讀版」（.html，點開就能瀏覽和列印）。超過 14 天沒備份，首頁會提醒。

沒有填雲端設定時，資料只存在這支手機的瀏覽器裡（IndexedDB）。清除瀏覽器資料或換手機之前，請記得先匯出備份。

## 放上網路（GitHub Pages）

1. 到倉庫的 **Settings → Pages**
2. Source 選 **Deploy from a branch**，Branch 選 `main`，資料夾選 `/ (root)`，然後按 Save
3. 等一兩分鐘，網址會是 `https://<你的帳號>.github.io/couple-diary/`
4. 用手機打開網址，接著：iPhone 在 Safari 按「分享 → 加入主畫面」，Android 在 Chrome 按「⋮ → 加到主畫面」，之後就能像 App 一樣從主畫面打開

## 雲端版（Supabase）

填好 `js/config.js` 之後，App 會改成雲端模式：要用 email 和密碼登入，紀錄和照片都存在 Supabase，換手機只要登入就能看到。設定頁可以把手機裡原本的紀錄一鍵搬上雲端。

設定步驟：
1. 在 Supabase 建立專案
2. 到 **SQL Editor** 貼上 `supabase/schema.sql` 的內容並按 Run，這一步會建立資料表、照片空間和安全規則（每個人只能讀寫自己的資料）
3. 到 **Authentication → URL Configuration**，把 Site URL 設成 `https://jasmine-tsaiii.github.io/couple-diary/`，這樣確認信的連結才會回到 App
4. 把 **Project Settings → API** 裡的 Project URL 和 anon public key 填進 `js/config.js`

想用 Google 登入的話，還要：
- 在 Google Cloud Console 建立 OAuth 用戶端（網頁應用程式），「已授權的重新導向 URI」填 `https://<專案>.supabase.co/auth/v1/callback`
- 在 Supabase 的 **Authentication → Sign In / Providers → Google** 開啟，貼上 Client ID 和 Client secret
- 在 **Authentication → URL Configuration → Redirect URLs** 加上 `https://jasmine-tsaiii.github.io/couple-diary/`

要開放分享碼，還要：
- 在 **SQL Editor** 重新貼上最新的 `supabase/schema.sql` 並按 Run（會新增分享碼、對方名單和任務的資料表）
- 在 **Authentication → Sign In / Providers** 打開 **Allow anonymous sign-ins**（對方加入時用的是不需要 email 的臨時帳號）
- **Allow new users to sign up** 要保持開著，臨時帳號也算新註冊

`js/config.js` 裡的兩個值是公開的，放進程式沒關係。service_role（secret）key 千萬不要放進來。

## 在電腦上試用

在這個資料夾執行 `python3 -m http.server`，再打開 http://localhost:8000 就可以了。

## 檔案說明

- `index.html`：頁面骨架
- `css/style.css`：外觀
- `js/config.js`：雲端設定（Supabase 網址和公開金鑰）
- `js/db-local.js`：單人模式的資料儲存（手機瀏覽器的 IndexedDB）
- `js/db-cloud.js`：雲端模式的資料儲存（Supabase），功能和單人模式一樣
- `supabase/schema.sql`：雲端資料表和安全規則
- `vendor/`：Supabase 官方的瀏覽器套件（2.117.2 版），放在這裡就不用靠外部 CDN
- `js/app.js`：所有畫面和操作

## 資料存在哪裡

- 帳號密碼：Supabase 的登入系統，只存加密雜湊；用 Google 登入的話不存密碼
- 紀錄、設定、分享碼、對方名單、任務：Supabase 資料庫，每個人只讀寫得到自己的（分享碼密碼也只存加密雜湊）
- 照片：Supabase Storage 不公開的 photos 空間
- 手機：只存登入狀態，不存密碼

## 接下來

- 上鎖的紀錄自己看也要輸入密碼
- 統計和紀念日
