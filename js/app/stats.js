// 啾啾日記 js/app/stats.js：數據看板（只有管理員看得到，只有統計數字，沒有任何內容或 Email）
// 資料來自 Supabase 的 admin_stats()，每分鐘自動更新。

let statsTimer = null;

// 設定頁的入口：管理員才顯示
function adminCardHtml() {
  if (!usingCloud() || isPartner() || CloudDB.isAnonymous()) return '';
  return `<a class="card" id="admin-card" href="#/stats" hidden style="gap:4px">
    <div class="row between"><div class="bold">數據看板</div><div class="muted">›</div></div>
    <div class="small muted">註冊、配對、活躍情侶和留存，只有你看得到。</div>
  </a>`;
}
async function bindAdminCard() {
  const card = document.getElementById('admin-card');
  if (!card) return;
  if (await CloudDB.amIAdmin().catch(() => false)) { if (document.body.contains(card)) card.hidden = false; }
}

const STAT_TILES = [
  ['active_couples_7d', '週活躍情侶', '已配對、近 7 天有人寫', true],
  ['couples', '已配對情侶', ''],
  ['owners', '總註冊', ''],
  ['owners_today', '今天新註冊', ''],
  ['owners_7d', '近 7 天新註冊', ''],
  ['both_wrote_7d', '近 7 天兩人都寫', ''],
  ['writers_today', '今天有寫的人', ''],
  ['records_today', '今天新增紀錄', ''],
  ['edits_today', '今天改舊紀錄', ''],
  ['deleted_records_7d', '近 7 天刪除紀錄', '還在最近刪除裡的'],
  ['records_total', '紀錄總數', ''],
  ['interest', '按我有興趣', ''],
  ['accounts_deleted_7d', '近 7 天刪帳號', ''],
  ['accounts_deleted_total', '刪帳號總數', ''],
];
const STAT_LINES = [
  ['signups', '新註冊'],
  ['pairs', '新配對'],
  ['active_couples', '活躍情侶'],
  ['writers', '有寫的人'],
  ['records', '新增紀錄'],
  ['deleted', '刪除紀錄'],
  ['interest', '按我有興趣'],
  ['account_deletes', '刪帳號'],
];

const pct = (yes, n) => (n ? `${Math.round((100 * yes) / n)}%` : '—');

// 一個指標一張小折線圖（30 天），滑過或點一下看當天數字
function statLine(daily, key, label) {
  const W = 320; const H = 90; const PAD = 6; const B = 18;
  const vals = daily.map((d) => Number(d[key]) || 0);
  const max = Math.max(1, ...vals);
  const x = (i) => PAD + (i * (W - PAD * 2)) / Math.max(1, vals.length - 1);
  const y = (v) => PAD + (H - PAD - B) * (1 - v / max);
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const total = vals.reduce((a, b) => a + b, 0);
  const last = daily[daily.length - 1];
  return `<div class="stat-chart" data-key="${key}">
    <div class="row between"><span class="small bold">${label}</span><span class="small muted">30 天共 <b class="stat-ink">${total}</b>・今天 <b class="stat-ink">${vals[vals.length - 1]}</b></span></div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${label}最近 30 天，共 ${total}">
      <line x1="${PAD}" x2="${W - PAD}" y1="${y(0)}" y2="${y(0)}" class="stat-base"/>
      <line x1="${PAD}" x2="${W - PAD}" y1="${y(max)}" y2="${y(max)}" class="stat-gridline"/>
      <text x="${W - PAD}" y="${y(max) + 10}" class="stat-axis" text-anchor="end">${max}</text>
      <polyline points="${pts}" class="stat-path"/>
      <line class="stat-cross" x1="0" x2="0" y1="${PAD}" y2="${y(0)}" hidden/>
      <circle class="stat-dot" r="4" cx="0" cy="0" hidden/>
      <text x="${PAD}" y="${H - 3}" class="stat-axis">${daily[0].d.slice(5)}</text>
      <text x="${W - PAD}" y="${H - 3}" class="stat-axis" text-anchor="end">${last.d.slice(5)}</text>
      <rect x="0" y="0" width="${W}" height="${H}" fill="transparent" class="stat-hit"/>
    </svg>
    <div class="stat-tip small" hidden></div>
  </div>`;
}
function bindStatCharts(daily) {
  app.querySelectorAll('.stat-chart').forEach((box) => {
    const key = box.dataset.key;
    const svg = box.querySelector('svg'); const tip = box.querySelector('.stat-tip');
    const cross = box.querySelector('.stat-cross'); const dot = box.querySelector('.stat-dot');
    const vals = daily.map((d) => Number(d[key]) || 0);
    const W = 320; const H = 90; const PAD = 6; const B = 18; const max = Math.max(1, ...vals);
    const show = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(vals.length - 1, Math.round(((px - PAD) / (W - PAD * 2)) * (vals.length - 1))));
      const cx = PAD + (i * (W - PAD * 2)) / Math.max(1, vals.length - 1);
      const cy = PAD + (H - PAD - B) * (1 - vals[i] / max);
      cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.hidden = false;
      dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.hidden = false;
      tip.hidden = false; tip.textContent = `${daily[i].d.slice(5).replace('-', '/')}：${vals[i]}`;
    };
    const hide = () => { cross.hidden = true; dot.hidden = true; tip.hidden = true; };
    svg.addEventListener('pointermove', show);
    svg.addEventListener('pointerdown', show);
    svg.addEventListener('pointerleave', hide);
  });
}

async function viewStats() {
  clearInterval(statsTimer);
  app.className = '';
  app.innerHTML = `<div class="topbar"><a class="icon-btn" href="#/settings" aria-label="返回">${ICON.back}</a><h1>數據看板</h1></div>
    ${loaderHtml()}`;
  let s;
  try { s = await CloudDB.adminStats(); } catch (e) {
    app.innerHTML = `<div class="topbar"><a class="icon-btn" href="#/settings" aria-label="返回">${ICON.back}</a><h1>數據看板</h1></div>
      <div class="empty no-mascot">${/沒有權限/.test(e.message) ? '這一頁只有管理員看得到。' : `讀不到數據：${esc(cloudErrorText(e))}`}</div>`;
    return;
  }
  const n = s.now || {};
  const daily = s.daily || [];
  const weekly = s.weekly || [];
  const interestRate = n.owners ? `${Math.round((1000 * n.interest) / n.owners) / 10}%` : '—';
  const lastWrite = n.last_write_at ? new Date(n.last_write_at).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '還沒有';
  const updated = new Date(s.at || Date.now()).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  app.innerHTML = `
    <div class="topbar"><a class="icon-btn" href="#/settings" aria-label="返回">${ICON.back}</a><h1>數據看板</h1></div>
    <div class="small muted">台灣時間 ${updated} 更新，每分鐘自動更新。只算次數，看不到任何紀錄內容。</div>
    <div class="stat-grid">
      ${STAT_TILES.map(([k, label, note, hero]) => `<div class="stat-tile${hero ? ' hero' : ''}">
        <div class="stat-num">${Number(n[k]) || 0}</div>
        <div class="small">${label}</div>
        ${note ? `<div class="small muted">${note}</div>` : ''}
      </div>${k === 'interest' ? `<div class="stat-tile"><div class="stat-num">${interestRate}</div><div class="small">我有興趣比例</div><div class="small muted">目標 5%</div></div>` : ''}`).join('')}
    </div>
    <div class="small muted">最後有人寫：${lastWrite}</div>
    <h2 class="section-title">最近 30 天</h2>
    <div class="card" style="gap:18px">${daily.length ? STAT_LINES.map(([k, label]) => statLine(daily, k, label)).join('') : '<div class="muted">還沒有資料</div>'}</div>
    <h2 class="section-title">每週留存</h2>
    <div class="card" style="padding:0;overflow-x:auto">
      <table class="stat-table">
        <thead><tr><th>週一</th><th>新註冊</th><th>24 小時內開始寫</th><th>有配對</th><th>第 7 天還在</th><th>第 30 天還在</th><th>這週有寫</th></tr></thead>
        <tbody>${weekly.map((w) => `<tr>
          <td>${esc(w.wk.slice(5).replace('-', '/'))}</td><td>${w.signups}</td>
          <td>${w.signups ? `${w.activated}（${pct(w.activated, w.signups)}）` : '—'}</td>
          <td>${w.signups ? `${w.paired}（${pct(w.paired, w.signups)}）` : '—'}</td>
          <td>${pct(w.d7_yes, w.d7_n)}</td><td>${pct(w.d30_yes, w.d30_n)}</td><td>${w.writers}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="small muted">第 7 天還在：註冊後第 7～13 天還有寫的比例（還沒滿 14 天的週是「—」）。目標：週活躍情侶 30 對、第 7 天 40%、我有興趣 5%。</div>
  `;
  bindStatCharts(daily);
  // 每分鐘更新；離開這頁就停
  const here = location.hash;
  statsTimer = setInterval(() => {
    if (location.hash !== here || document.hidden) { if (location.hash !== here) clearInterval(statsTimer); return; }
    const y = window.scrollY;
    viewStats().then(() => window.scrollTo(0, y));
  }, 60000);
}
