#!/usr/bin/env node
// 跑全部的畫面測試（Playwright）。
//   node tests/run.js            全部跑
//   node tests/run.js t58 t64    只跑指定的
// 環境變數：JOBS=同時跑幾個（預設 4）、KEEP=1 保留每個測試的暫存資料夾（截圖、輸出）
//
// 每個測試是一支獨立的 node 程式，把檢查結果印成 true / false，最後印 `errors [...]`（頁面上的 JS 錯誤）。
// 判斷規則：
//   1. 程式要正常結束（沒有丟出錯誤、沒有逾時）
//   2. 有印 errors 的話必須是 errors []
//   3. 印出的 false 數量不能超過 baseline.json 記錄的數字
//      （有些 false 是故意的，例如「另一半看不到這個按鈕 false」；新寫的測試請讓通過的檢查都印 true，baseline 就是 0）
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const E2E = path.join(__dirname, 'e2e');
const FIX = path.join(__dirname, 'fixtures');
const OUT = path.join(__dirname, 'out');
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'baseline.json'), 'utf8'));
const JOBS = Number(process.env.JOBS || 4);
const TIMEOUT = 240 * 1000;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.txt': 'text/plain', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || p.startsWith('/tests/') || p.startsWith('/.git')) { res.writeHead(404); res.end(); return; }
      fs.readFile(file, (err, buf) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(buf);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function runOne(name, url) {
  return new Promise((resolve) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `diary-${name}-`));
    for (const f of fs.readdirSync(FIX)) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
    const started = Date.now();
    const child = spawn(process.execPath, [path.join(E2E, `${name}.js`)], { cwd: dir, env: { ...process.env, U: url, SHOT_DIR: dir } });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    const timer = setTimeout(() => { out += '\n[timeout]'; child.kill('SIGKILL'); }, TIMEOUT);
    child.on('close', (code) => {
      clearTimeout(timer);
      const falses = (out.match(/\bfalse\b/g) || []).length;
      const errLines = out.split('\n').filter((l) => /^errors \[/.test(l.trim()));
      const problems = [];
      if (code !== 0) problems.push(`exit ${code}`);
      if (/\[timeout\]/.test(out)) problems.push('timeout');
      if (errLines.some((l) => l.trim() !== 'errors []')) problems.push('page errors');
      const allowed = baseline[name] || 0;
      if (falses > allowed) problems.push(`false ${falses} > ${allowed}`);
      fs.mkdirSync(OUT, { recursive: true });
      fs.writeFileSync(path.join(OUT, `${name}.txt`), out);
      if (!process.env.KEEP) fs.rmSync(dir, { recursive: true, force: true });
      resolve({ name, ok: problems.length === 0, problems, falses, secs: Math.round((Date.now() - started) / 1000) });
    });
  });
}

(async () => {
  const want = process.argv.slice(2);
  const all = fs.readdirSync(E2E).filter((f) => /^t\d+\.js$/.test(f)).map((f) => f.replace(/\.js$/, ''))
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  const list = want.length ? all.filter((n) => want.includes(n)) : all;
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/`;
  console.log(`跑 ${list.length} 個測試，同時 ${JOBS} 個，網址 ${url}`);
  const queue = [...list];
  const results = [];
  await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => {
    while (queue.length) {
      const r = await runOne(queue.shift(), url);
      results.push(r);
      console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name} (${r.secs}s)${r.ok ? '' : `  ${r.problems.join(', ')}  → tests/out/${r.name}.txt`}`);
    }
  }));
  srv.close();
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${results.length - bad.length} 通過，${bad.length} 失敗`);
  if (bad.length) { console.log(`失敗：${bad.map((r) => r.name).join(' ')}`); process.exit(1); }
})();
