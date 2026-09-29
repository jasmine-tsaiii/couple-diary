// 啾啾日記：把還沒讀的通知整理成 Email 寄出去（Supabase Edge Function：notify-email）
// 由 supabase/notify-cron.sql 設定每天晚上 9 點（台灣）呼叫一次，一人一天最多一封。重複呼叫沒關係：寄過的會標記，不會重寄。
// 規則：
// - 在 App 裡點過、或打開過通知頁看過的，不寄（人在用 App 就不吵）
// - 每個人一天最多一封，當天沒看的通知合併成一封
// - 設定頁關掉 Email、或沒有 Email 的臨時帳號，不寄
// - 信裡不放紀錄的標題和內容，只說誰新增了什麼（標題和內文在下面 TEMPLATE 那一段）
// - 每封信有一鍵取消的連結；Gmail 等信箱的「取消訂閱」按鈕也會呼叫這裡（POST ?unsub=…&t=…）
// 需要的密鑰（Supabase → Edge Functions → Secrets）：RESEND_API_KEY
// SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY 是 Supabase 自動提供的，不用設定。
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const FROM = '啾啾日記 <hello@jas-soul.com>';

// ===== 信的標題和內文（tests/email-preview.mjs 會讀這一段產生預覽）BEGIN TEMPLATE =====
const SITE = 'https://diary.jas-soul.com/';

type Row = {
  id: number; recipient: string; actor_name: string; kind: string;
  record_id: string | null; extra: { days?: number; years?: number } | null; created_at: string;
};

// 另一半做的事（信的大標題用「你不在的時候」）；其他是給自己的提醒
const FROM_PARTNER = ['new_happy', 'new_task_record', 'task_submitted', 'task_approved', 'partner_request', 'partner_joined', 'quiz_partner_done'];

function line(r: Row) {
  const who = r.actor_name || '對方';
  switch (r.kind) {
    case 'new_happy': return `${who}新增了一則美好時刻`;
    case 'new_task_record': return `${who}新增了一則美好時刻，完成任務就能看`;
    case 'task_submitted': return `${who}完成了任務，等你確認`;
    case 'task_approved': return `${who}確認了你的任務，紀錄解鎖了`;
    case 'partner_request': return `${who}想加入你們的日記，等你按同意`;
    case 'partner_joined': return `${who}同意了，你們的日記連起來了`;
    case 'anniversary': return r.extra && r.extra.years ? `今天是你們在一起滿 ${r.extra.years} 年` : `今天是你們在一起第 ${(r.extra && r.extra.days) || ''} 天`;
    case 'cloud_reflect': return '3 天前記下的烏雲，現在回頭看，有沒有新的想法？';
    case 'write_nudge': return '好幾天沒寫了，最近有什麼想記下來的嗎？';
    case 'quiz_partner_done': return `${who}寫好「重新認識你」了，換你囉`;
    case 'quiz_revealed': return '「重新認識你」兩個人都交卷了，來看答案吧';
    default: return `${who}有新的動態`;
  }
}

// 同一個人做了好幾次同樣的事，合成一句：「小明新增了 3 則美好時刻（其中 1 則完成任務就能看）」
const GROUP_OF: Record<string, string> = { new_happy: 'happy', new_task_record: 'happy', task_submitted: 'task_submitted', task_approved: 'task_approved', cloud_reflect: 'cloud_reflect' };
function groupLine(g: Row[]) {
  const r = g[0];
  const who = r.actor_name || '對方';
  const n = g.length;
  if (n === 1) return line(r);
  switch (GROUP_OF[r.kind]) {
    case 'happy': {
      const t = g.filter((x) => x.kind === 'new_task_record').length;
      return t === n ? `${who}新增了 ${n} 則美好時刻，完成任務就能看` : `${who}新增了 ${n} 則美好時刻${t ? `（其中 ${t} 則完成任務就能看）` : ''}`;
    }
    case 'task_submitted': return `${who}完成了 ${n} 個任務，等你確認`;
    case 'task_approved': return `${who}確認了你的 ${n} 個任務，紀錄解鎖了`;
    case 'cloud_reflect': return `3 天前記下的 ${n} 片烏雲，現在回頭看，有沒有新的想法？`;
    default: return line(r);
  }
}
function lines(rows: Row[]) {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = GROUP_OF[r.kind] ? `${GROUP_OF[r.kind]}|${r.actor_name}` : `${r.kind}|${r.actor_name}|${line(r)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return [...groups.values()].map(groupLine);
}

function subject(rows: Row[]) {
  const ann = rows.find((r) => r.kind === 'anniversary');
  if (ann) return `【啾啾日記】${line(ann)}`;
  const ls = lines(rows);
  if (ls.length === 1) return `【啾啾日記】${ls[0]}`;
  return `【啾啾日記】${ls[0]}，還有 ${ls.length - 1} 件新消息`;
}

function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!)); }

function html(rows: Row[], unsubUrl: string) {
  const ls = lines(rows);
  const items = ls.map((l) => `<li style="margin:0 0 6px">${esc(l)}</li>`).join('');
  const pre = esc(ls[0]);
  const title = rows.some((r) => r.kind === 'anniversary') ? '今天是特別的日子'
    : rows.every((r) => FROM_PARTNER.includes(r.kind)) ? '你不在的時候' : '今天的啾啾日記';
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${pre}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<div style="background:#FBF7F2;padding:32px 16px;font-family:-apple-system,'PingFang TC','Noto Sans TC',sans-serif;color:#2B2320">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #EFE6DD;border-radius:16px;padding:28px 24px">
    <div style="font-size:14px;color:#A33A52;font-weight:700;letter-spacing:.08em">啾啾日記</div>
    <h1 style="font-size:20px;margin:8px 0 12px">${title}</h1>
    <ul style="font-size:15px;line-height:1.7;margin:0 0 20px;padding-left:20px">${items}</ul>
    <a href="${SITE}" style="display:inline-block;background:#A33A52;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px">打開啾啾日記</a>
    <p style="font-size:13px;line-height:1.6;color:#6B5E57;margin:20px 0 0">一天最多寄一封，當天在 App 裡看過的就不會寄。</p>
    <p style="font-size:13px;line-height:1.6;color:#6B5E57;margin:6px 0 0">不想再收到這類信？<a href="${esc(unsubUrl)}" style="color:#A33A52">按這裡取消 Email 通知</a>，或到 App 的「設定 → 通知」關掉。</p>
  </div>
  <p style="text-align:center;font-size:12px;color:#6B5E57;margin:16px 0 0">啾啾日記・diary.jas-soul.com</p>
</div>`;
}

// 信裡的取消連結：打開 App 的取消頁（不用登入）
const unsubPage = (uid: string, token: string) => `${SITE}#/unsubscribe?u=${encodeURIComponent(uid)}&t=${encodeURIComponent(token)}`;
// ===== END TEMPLATE =====

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  // 一鍵取消：信箱的「取消訂閱」按鈕會 POST 到這裡；直接點連結（GET）就轉到 App 的取消頁
  const url = new URL(req.url);
  const unsub = url.searchParams.get('unsub'); const tok = url.searchParams.get('t');
  if (unsub && tok) {
    if (req.method === 'GET') return Response.redirect(unsubPage(unsub, tok), 302);
    const { error: ue } = await db.rpc('email_unsubscribe', { p_uid: unsub, p_token: tok });
    return new Response(ue ? 'error' : 'ok', { status: ue ? 400 : 200 });
  }
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return new Response('RESEND_API_KEY not set', { status: 500 });
  const now = Date.now();
  const { data, error } = await db.from('notifications')
    .select('id, recipient, space_owner, actor, actor_name, kind, record_id, extra, created_at')
    .is('emailed_at', null).is('read_at', null)
    .lt('created_at', new Date(now - 5 * 60 * 1000).toISOString())
    .gt('created_at', new Date(now - 2 * 86400 * 1000).toISOString())
    .order('created_at', { ascending: true }).limit(500);
  if (error) return new Response(error.message, { status: 500 });
  // 名字用現在的：改過名字後，信裡也是新名字
  const names = new Map<string, string>();
  for (const r of (data || []) as (Row & { space_owner: string; actor: string | null })[]) {
    if (!r.actor) continue;
    const k = `${r.space_owner}/${r.actor}`;
    if (!names.has(k)) { const { data: nm } = await db.rpc('space_member_name', { p_owner: r.space_owner, p_uid: r.actor }); names.set(k, nm && nm !== '對方' ? nm : ''); }
    if (names.get(k)) r.actor_name = names.get(k)!;
  }
  const byUser = new Map<string, Row[]>();
  for (const r of (data || []) as Row[]) byUser.set(r.recipient, [...(byUser.get(r.recipient) || []), r]);
  let sent = 0;
  for (const [uid, rows] of byUser) {
    let { data: pref } = await db.from('notify_prefs').select('email_on, last_email_at, unsub_token').eq('uid', uid).maybeSingle();
    if (!pref) {
      await db.from('notify_prefs').upsert({ uid }, { onConflict: 'uid', ignoreDuplicates: true });
      ({ data: pref } = await db.from('notify_prefs').select('email_on, last_email_at, unsub_token').eq('uid', uid).maybeSingle());
    }
    const ids = rows.map((r) => r.id);
    const markDone = () => db.from('notifications').update({ emailed_at: new Date().toISOString() }).in('id', ids);
    if (!pref) continue;
    if (pref.email_on === false) { await markDone(); continue; }
    if (pref.last_email_at && now - Date.parse(pref.last_email_at) < 20 * 60 * 60 * 1000) continue; // 一天最多一封：今天寄過就等明天合併寄
    const { data: u } = await db.auth.admin.getUserById(uid);
    const email = u && u.user && !u.user.is_anonymous ? u.user.email : null;
    if (!email) { await markDone(); continue; }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM, to: [email], subject: subject(rows), html: html(rows, unsubPage(uid, pref.unsub_token)),
        headers: {
          'List-Unsubscribe': `<${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-email?unsub=${uid}&t=${pref.unsub_token}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    });
    if (!res.ok) { console.error('resend failed', uid, res.status, await res.text()); continue; }
    await markDone();
    await db.from('notify_prefs').upsert({ uid, last_email_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'uid' });
    sent++;
  }
  return new Response(JSON.stringify({ sent, pending: byUser.size }), { headers: { 'Content-Type': 'application/json' } });
});
