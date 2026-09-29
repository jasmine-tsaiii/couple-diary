// 啾啾日記：把還沒讀的通知整理成 Email 寄出去（Supabase Edge Function：notify-email）
// 由 supabase/notify-cron.sql 設定每天晚上 9 點（台灣）呼叫一次，一人一天最多一封。重複呼叫沒關係：寄過的會標記，不會重寄。
// 規則：
// - 通知出現 5 分鐘後還沒在 App 裡看過，才寄 Email（人在用 App 就不吵）
// - 每個人一天最多一封，當天沒看的通知合併成一封
// - 設定頁關掉 Email、或沒有 Email 的臨時帳號，不寄
// - 信裡不放紀錄的標題和內容，只說誰新增了什麼
// 需要的密鑰（Supabase → Edge Functions → Secrets）：RESEND_API_KEY
// SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY 是 Supabase 自動提供的，不用設定。
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SITE = 'https://diary.jas-soul.com/';
const FROM = '啾啾日記 <hello@jas-soul.com>';

type Row = { id: number; recipient: string; actor_name: string; kind: string; record_id: string | null; created_at: string };

function line(r: Row) {
  const who = r.actor_name || '對方';
  if (r.kind === 'new_happy') return `${who}新增了一則美好時刻`;
  if (r.kind === 'new_task_record') return `${who}新增了一則美好時刻，完成任務就能看`;
  if (r.kind === 'task_submitted') return `${who}完成了任務，等你確認`;
  if (r.kind === 'task_approved') return `${who}確認了你的任務，紀錄解鎖了`;
  return `${who}有新的動態`;
}

function subject(rows: Row[]) {
  const happy = rows.filter((r) => r.kind === 'new_happy' || r.kind === 'new_task_record');
  const who = rows[0].actor_name || '對方';
  if (rows.length === 1) return `【啾啾日記】${line(rows[0])}`;
  if (happy.length === rows.length) return `【啾啾日記】${who}新增了 ${happy.length} 則美好時刻`;
  return `【啾啾日記】${who}有 ${rows.length} 則新動態`;
}

function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!)); }

function html(rows: Row[]) {
  const items = rows.map((r) => `<li style="margin:0 0 6px">${esc(line(r))}</li>`).join('');
  const pre = esc(line(rows[0]));
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${pre}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<div style="background:#FBF7F2;padding:32px 16px;font-family:-apple-system,'PingFang TC','Noto Sans TC',sans-serif;color:#2B2320">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #EFE6DD;border-radius:16px;padding:28px 24px">
    <div style="font-size:14px;color:#A33A52;font-weight:700;letter-spacing:.08em">啾啾日記</div>
    <h1 style="font-size:20px;margin:8px 0 12px">你不在的時候</h1>
    <ul style="font-size:15px;line-height:1.7;margin:0 0 20px;padding-left:20px">${items}</ul>
    <a href="${SITE}" style="display:inline-block;background:#A33A52;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px">打開啾啾日記</a>
    <p style="font-size:13px;line-height:1.6;color:#6B5E57;margin:20px 0 0">不想收到這類信？打開啾啾日記 → 設定 → 通知，把 Email 通知關掉。</p>
  </div>
  <p style="text-align:center;font-size:12px;color:#6B5E57;margin:16px 0 0">啾啾日記・diary.jas-soul.com</p>
</div>`;
}

Deno.serve(async () => {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return new Response('RESEND_API_KEY not set', { status: 500 });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const now = Date.now();
  const { data, error } = await db.from('notifications')
    .select('id, recipient, actor_name, kind, record_id, created_at')
    .is('emailed_at', null).is('read_at', null)
    .lt('created_at', new Date(now - 5 * 60 * 1000).toISOString())
    .gt('created_at', new Date(now - 2 * 86400 * 1000).toISOString())
    .order('created_at', { ascending: true }).limit(500);
  if (error) return new Response(error.message, { status: 500 });
  const byUser = new Map<string, Row[]>();
  for (const r of (data || []) as Row[]) byUser.set(r.recipient, [...(byUser.get(r.recipient) || []), r]);
  let sent = 0;
  for (const [uid, rows] of byUser) {
    const { data: pref } = await db.from('notify_prefs').select('email_on, last_email_at').eq('uid', uid).maybeSingle();
    const ids = rows.map((r) => r.id);
    const markDone = () => db.from('notifications').update({ emailed_at: new Date().toISOString() }).in('id', ids);
    if (pref && pref.email_on === false) { await markDone(); continue; }
    if (pref && pref.last_email_at && now - Date.parse(pref.last_email_at) < 20 * 60 * 60 * 1000) continue; // 一天最多一封：今天寄過就等明天合併寄
    const { data: u } = await db.auth.admin.getUserById(uid);
    const email = u && u.user && !u.user.is_anonymous ? u.user.email : null;
    if (!email) { await markDone(); continue; }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [email], subject: subject(rows), html: html(rows) }),
    });
    if (!res.ok) { console.error('resend failed', uid, res.status, await res.text()); continue; }
    await markDone();
    await db.from('notify_prefs').upsert({ uid, last_email_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'uid' });
    sent++;
  }
  return new Response(JSON.stringify({ sent, pending: byUser.size }), { headers: { 'Content-Type': 'application/json' } });
});
