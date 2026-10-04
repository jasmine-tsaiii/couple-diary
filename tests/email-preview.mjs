// 產生所有通知信的預覽（標題＋內文），給人檢查文字用：node --experimental-strip-types tests/email-preview.mjs 輸出.html
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// 從 notify-email/index.ts 取出 TEMPLATE 那一段（整個函式只有一個檔，方便在 Supabase 網頁上貼上部署）
const src = fs.readFileSync(new URL('../supabase/functions/notify-email/index.ts', import.meta.url), 'utf8');
const tpl = src.split('BEGIN TEMPLATE =====')[1].split('// ===== END TEMPLATE')[0];
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mail-')), 'template.ts');
fs.writeFileSync(tmp, `${tpl}\nexport { subject, html };\n`);
const { subject, html } = await import(tmp);

const t = new Date().toISOString();
const r = (kind, extra = null, actor = '小明') => ({ id: 1, recipient: 'u', actor_name: actor, kind, record_id: 'x', extra, created_at: t });
const CASES = [
  ['另一半新增 1 則美好時刻', [r('new_happy')]],
  ['另一半一天新增 3 則', [r('new_happy'), r('new_happy'), r('new_task_record')]],
  ['另一半一天新增 2 則，還完成了 2 個任務', [r('new_happy'), r('new_happy'), r('task_submitted'), r('task_submitted')]],
  ['要完成任務才能看的紀錄', [r('new_task_record')]],
  ['對方完成任務，等你確認', [r('task_submitted')]],
  ['你的任務通過了', [r('task_approved')]],
  ['混在一起（好幾種）', [r('task_submitted'), r('new_happy'), r('new_happy')]],
  ['有人要求加入', [r('partner_request')]],
  ['主人同意加入', [r('partner_joined', null, '公主')]],
  ['在一起第 100 天', [r('anniversary', { days: 100 }, '')]],
  ['在一起滿 1 年（同一天還有新紀錄）', [r('anniversary', { years: 1 }, ''), r('new_happy')]],
  ['烏雲 3 天後回顧', [r('cloud_reflect', null, '')]],
  ['7 天沒寫的提醒', [r('write_nudge', null, '')]],
  ['重新認識你：對方交卷了', [r('quiz_partner_done')]],
  ['重新認識你：兩人都交卷，揭曉', [r('quiz_revealed')]],
  ['每天一題：對方寫好今天這一題', [r('daily_partner_done')]],
  ['每天一題：對方也寫好了，揭曉', [r('daily_revealed')]],
  ['秘密留言板：對方留了一張紙條', [r('note_new')]],
];
const unsub = 'https://diary.jas-soul.com/#/unsubscribe?u=…&t=…';
const out = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>通知信預覽</title>
<body style="margin:0;background:#eee;font-family:-apple-system,'Noto Sans TC',sans-serif">
<h1 style="font-size:20px;padding:16px 16px 0">啾啾日記通知信預覽（${CASES.length} 種）</h1>
<p style="padding:0 16px;color:#555;font-size:14px">寄件人：啾啾日記 &lt;hello@jas-soul.com&gt;・每天晚上 9 點寄，一人一天最多一封</p>
${CASES.map(([name, rows], i) => `<section style="margin:16px;background:#fff;border-radius:12px;overflow:hidden">
  <div style="padding:12px 16px;background:#2B2320;color:#fff;font-size:14px"><b>${i + 1}. ${name}</b><br>標題：${subject(rows)}</div>
  ${html(rows, unsub).replace(/<div style="display:none[^]*?<\/div>\n/, '')}
</section>`).join('')}
</body>`;
fs.writeFileSync(process.argv[2] || 'email-preview.html', out);
console.log(CASES.map(([name, rows], i) => `${i + 1}. ${name}：${subject(rows)}`).join('\n'));
