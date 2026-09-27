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
