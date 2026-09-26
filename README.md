# 我們的紀錄

記錄情侶之間的美好時刻、烏雲時刻和吵架議題的小網頁 App，用手機瀏覽器打開就能用。

## 現在能做什麼（第 1 階段：單人版）

- **美好時刻、烏雲時刻**：各有 100 個的進度條。每則紀錄可以填標題、日期（日曆選單）、描述、多張照片、心情表情（最多 3 個，可自選任何表情）和感受標籤。沒有放照片的美好時刻會顯示預設圖和編號。
- **吵架議題**：可以填分類（能自訂）、原因、雙方的想法和狀態（未解決／處理中／已解決），還能一直補充後續。
- **誰可以看**：可以選給對方看、上鎖或任務解鎖（按完成就好／要上傳照片）。目前只是先記下這個設定，要等分享碼版本才會真正生效。
- **篩選**：美好和烏雲可以按標籤篩選，吵架議題可以按分類和狀態篩選。
- **備份**：在設定頁可以匯出「還原用備份」（.json，照片也包含在內，用來匯入還原）和「閱讀版」（.html，點開就能瀏覽和列印）。超過 14 天沒備份，首頁會提醒。

資料只存在這支手機的瀏覽器裡（IndexedDB），不會上傳到任何地方。清除瀏覽器資料或換手機之前，請記得先匯出備份。

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

## 接下來

- 第 2 階段：上鎖要輸入密碼、任務解鎖流程
- 第 3 階段：分享碼唯讀版。資料搬到雲端（Supabase），對方輸入分享碼和密碼後可以看內容、做任務、上傳任務照片，但不能修改紀錄
