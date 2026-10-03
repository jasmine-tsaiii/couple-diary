# 畫面測試

用 Playwright 開真的瀏覽器操作 App。雲端（Supabase）用 `fixtures/mock2.js` 假的版本代替，不會碰到真的資料庫。

```bash
cd tests
npm install
npx playwright install chromium   # 第一次才需要
npm test                          # 全部跑
node run.js t58 t64               # 只跑指定的
KEEP=1 node run.js t64            # 保留截圖（路徑印在 out/t64.txt 附近的暫存資料夾）
```

- 每個測試在 `e2e/tNN.js`，印出 `true` / `false` 和最後的 `errors [...]`。
- `run.js` 會自己開一個本機網站，測試失敗時輸出存在 `out/tNN.txt`。
- `baseline.json`：舊測試裡有些 `false` 是預期的（例如「另一半看不到這個按鈕」印 false）。新測試請讓通過的檢查都印 `true`。
- GitHub 上每次推上 main 都會自動跑（`.github/workflows/test.yml`），只改 `m/` 行銷圖片時不跑。

## 手機模式（#30）
- `DEVICE=android node run.js`：用 Android 手機的瀏覽器識別、觸控跑全部測試（本機就能跑）。
- `DEVICE=iphone ENGINE=webkit SKIP="t7 t35 t46 t65" node run.js`：用 Safari 引擎跑（要先 `npx playwright install webkit`）。
- GitHub → Actions → mobile-tests → Run workflow，兩種會一起跑。

## 配對流程
- 改到邀請、加入、選身分、另一半相關的程式，一定要跑 `node run.js t97 t98`。
- t98 是「配對情境表」：沒帳號、試用中、登出過、新帳號、已有日記、點到自己的連結、等同意中、已是另一半、被移除，每一種打開邀請連結都要有清楚的下一步。新增一種身分時，在這張表加一格。
- 任何把人導走的地方（go('#/') 之類）都要說明原因，不要默默跳走。
