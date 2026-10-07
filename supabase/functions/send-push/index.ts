// 啾啾日記：手機推播（Supabase Edge Function：send-push）
// 有新通知時資料庫會馬上叫這裡（schema.sql 的 notifications_push_kick），早上 8 點也會叫一次（notify-cron.sql）。
// 重複叫沒關係：推過的會標記 pushed_at，不會重推。
// 規則：
// - 只推另一半做的事（PUSH_KINDS）；紀念日、烏雲回顧、寫日記提醒不推
// - 晚上 11 點到早上 8 點（台灣）不推，早上 8 點把這段時間的合成一則推出去
// - 已經在 App 裡看過（已讀）的不推；超過 12 小時的舊通知不推
// - 通知裡不放紀錄的標題和內容，只說誰做了什麼（文字在下面 TEMPLATE 那一段）
// 需要的密鑰（Supabase → Edge Functions → Secrets）：VAPID_PUBLIC_KEY、VAPID_PRIVATE_KEY
// 部署時要關掉 Verify JWT（跟 notify-email 一樣）。
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import webpush from 'npm:web-push@3.6.7';

// ===== 推播的文字 BEGIN TEMPLATE =====
const PUSH_KINDS = ['new_happy', 'new_task_record', 'task_submitted', 'task_approved', 'partner_request', 'partner_joined',
  'quiz_partner_done', 'daily_partner_done', 'daily_revealed', 'note_new'];
const TITLE = '啾啾日記';

type Row = { id: number; recipient: string; space_owner: string; actor: string | null; actor_name: string; kind: string; created_at: string };

function line(r: Row) {
  const who = r.actor_name || '對方';
  switch (r.kind) {
    case 'new_happy': return `${who}新增了一則美好時刻`;
    case 'new_task_record': return `${who}新增了一則美好時刻，完成任務就能看`;
    case 'task_submitted': return `${who}完成了任務，等你確認`;
    case 'task_approved': return `${who}確認了你的任務，紀錄解鎖了`;
    case 'partner_request': return `${who}想加入你們的日記，等你按同意`;
    case 'partner_joined': return `${who}同意了，你們的日記連起來了`;
    case 'quiz_partner_done': return `${who}寫好「重新認識你」了，換你囉`;
    case 'daily_partner_done': return `${who}寫好今天這一題了，換你囉`;
    case 'daily_revealed': return `${who}也寫好了，每天一題揭曉了`;
    case 'note_new': return `${who}留了一張紙條給你`;
    default: return `${who}有新的動態`;
  }
}
// 一次有好幾則：第一則 +「還有 N 則新消息」
function body(rows: Row[]) {
  const first = line(rows[rows.length - 1]);
  return rows.length === 1 ? first : `${first}，還有 ${rows.length - 1} 則新消息`;
}
// 點通知打開哪一頁
function target(rows: Row[]) {
  if (rows.length > 1) return '#/notifications';
  const k = rows[0].kind;
  if (k === 'note_new') return '#/notes';
  if (k === 'daily_partner_done' || k === 'daily_revealed') return '#/daily';
  if (k === 'quiz_partner_done') return '#/quiz';
  return '#/notifications';
}
// ===== END TEMPLATE =====

const SITE = 'https://diary.jas-soul.com/';
// 台灣時間 23:00–08:00 不推
function quietNow() { const h = (new Date().getUTCHours() + 8) % 24; return h >= 23 || h < 8; }

Deno.serve(async () => {
  const pub = Deno.env.get('VAPID_PUBLIC_KEY'); const priv = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!pub || !priv) return new Response('VAPID keys not set', { status: 500 });
  if (quietNow()) return new Response(JSON.stringify({ sent: 0, quiet: true }), { headers: { 'Content-Type': 'application/json' } });
  webpush.setVapidDetails('mailto:hello@jas-soul.com', pub, priv);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: subs, error: se } = await db.from('push_subscriptions').select('endpoint, uid, p256dh, auth');
  if (se) return new Response(se.message, { status: 500 });
  const subsOf = new Map<string, { endpoint: string; p256dh: string; auth: string }[]>();
  for (const s of subs || []) subsOf.set(s.uid, [...(subsOf.get(s.uid) || []), s]);
  if (!subsOf.size) return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });
  // 先標記再推：同時被叫兩次也只有一次拿得到
  const { data, error } = await db.from('notifications')
    .update({ pushed_at: new Date().toISOString() })
    .is('pushed_at', null).is('read_at', null)
    .in('kind', PUSH_KINDS).in('recipient', [...subsOf.keys()])
    .gt('created_at', new Date(Date.now() - 12 * 3600 * 1000).toISOString())
    .select('id, recipient, space_owner, actor, actor_name, kind, created_at');
  if (error) return new Response(error.message, { status: 500 });
  // 名字用現在的（跟 Email 一樣）
  const names = new Map<string, string>();
  for (const r of (data || []) as Row[]) {
    if (!r.actor) continue;
    const k = `${r.space_owner}/${r.actor}`;
    if (!names.has(k)) { const { data: nm } = await db.rpc('space_member_name', { p_owner: r.space_owner, p_uid: r.actor }); names.set(k, nm && nm !== '對方' ? nm : ''); }
    if (names.get(k)) r.actor_name = names.get(k)!;
  }
  const byUser = new Map<string, Row[]>();
  for (const r of ((data || []) as Row[]).sort((a, b) => a.created_at.localeCompare(b.created_at))) byUser.set(r.recipient, [...(byUser.get(r.recipient) || []), r]);
  let sent = 0;
  for (const [uid, rows] of byUser) {
    const payload = JSON.stringify({ title: TITLE, body: body(rows), url: SITE + target(rows), tag: 'jiujiu' });
    for (const s of subsOf.get(uid) || []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 12 * 3600 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        // 404/410：這支手機取消了或換掉了，刪掉
        if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        else console.error('push failed', uid, code, (e as Error).message);
      }
    }
  }
  return new Response(JSON.stringify({ sent, users: byUser.size }), { headers: { 'Content-Type': 'application/json' } });
});
