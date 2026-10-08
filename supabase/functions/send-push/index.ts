// 啾啾日記：手機推播（Supabase Edge Function：send-push）
// 有新通知時資料庫會馬上叫這裡（schema.sql 的 notifications_push_kick），早上 8 點也會叫一次（notify-cron.sql）。
// 重複叫沒關係：推過的會標記 pushed_at，不會重推。
// 規則：
// - 只推另一半做的事（PUSH_KINDS）；紀念日、烏雲回顧、寫日記提醒不推
// - 晚上 11 點到早上 8 點（台灣）不推，早上 8 點把這段時間的合成一則推出去
// - 已經在 App 裡看過（已讀）的不推；超過 12 小時的舊通知不推
// - 通知裡不放紀錄的標題和內容，只說誰做了什麼（文字在下面 TEMPLATE 那一段）
// 需要的密鑰（Supabase → Edge Functions → Secrets）：VAPID_PUBLIC_KEY、VAPID_PRIVATE_KEY
// 推播的加密和簽章自己用 Web Crypto 做（下面 WEBPUSH 那段），不用 npm 套件，整個函式只有這一個檔案。
// 部署時要關掉 Verify JWT（跟 notify-email 一樣）。
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// ===== 推播的文字 BEGIN TEMPLATE =====
const PUSH_KINDS = ['new_happy', 'new_task_record', 'task_submitted', 'task_approved', 'partner_request', 'partner_joined',
  'quiz_partner_done', 'daily_partner_done', 'daily_revealed', 'note_new'];

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
// iPhone 會在標題下面自己加「from 啾啾日記」，所以標題直接寫發生什麼事（最新的那一則）
function title(rows: Row[]) { return line(rows[rows.length - 1]); }
// 一次有好幾則：內文寫「還有 N 則新消息」；只有一則就不放內文
function body(rows: Row[]) { return rows.length === 1 ? '' : `還有 ${rows.length - 1} 則新消息`; }
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

// ===== WEBPUSH BEGIN（tests/push-crypto.mjs 會讀這一段測加密）=====
// Web Push（RFC 8291 加密 + RFC 8292 VAPID），只用 Web Crypto，不靠 npm 套件（Edge Function 裡 web-push 套件跑不起來）
const enc = new TextEncoder();
const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s: string) => {
  const t = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(t + '='.repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0));
};
const concat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}

// VAPID 簽章：Authorization 標頭
async function vapidAuth(endpoint: string, pub: string, priv: string, subject: string) {
  const p = unb64u(pub);
  const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: b64u(p.slice(1, 33)), y: b64u(p.slice(33, 65)), d: priv, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${head}.${body}`)));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${pub}`;
}

// 加密內容（aes128gcm）
async function encrypt(payload: string, p256dh: string, auth: string) {
  const ua = unb64u(p256dh);
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(unb64u(auth), shared, concat(enc.encode('WebPush: info\0'), ua, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const k = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, k, concat(enc.encode(payload), new Uint8Array([2]))));
  return concat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([asPub.length]), asPub, ct);
}

type Sub = { endpoint: string; p256dh: string; auth: string };
type Vapid = { pub: string; priv: string; subject: string };
// 送出一則；回傳推播服務的 HTTP 狀態碼（201 成功；404/410 表示這支手機的訂閱已經失效）
async function sendPush(sub: Sub, payload: string, v: Vapid, ttl = 12 * 3600) {
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuth(sub.endpoint, v.pub, v.priv, v.subject),
      'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(ttl), Urgency: 'high',
    },
    body: await encrypt(payload, sub.p256dh, sub.auth),
  });
  return { status: res.status, text: res.ok ? '' : await res.text().catch(() => '') };
}
// ===== WEBPUSH END =====

const SITE = 'https://diary.jas-soul.com/';
// 台灣時間 23:00–08:00 不推
function quietNow() { const h = (new Date().getUTCHours() + 8) % 24; return h >= 23 || h < 8; }

Deno.serve(async () => {
  try { return await run(); } catch (e) { console.error('send-push crashed', e); return new Response(`error: ${(e as Error).message}`, { status: 500 }); }
});

async function run() {
  // 貼密鑰時多了空白或換行也沒關係
  const pub = (Deno.env.get('VAPID_PUBLIC_KEY') || '').trim(); const priv = (Deno.env.get('VAPID_PRIVATE_KEY') || '').trim();
  if (!pub || !priv) return new Response('VAPID keys not set', { status: 500 });
  if (quietNow()) return new Response(JSON.stringify({ sent: 0, quiet: true }), { headers: { 'Content-Type': 'application/json' } });
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
  let sent = 0; const failed: string[] = [];
  for (const [uid, rows] of byUser) {
    const payload = JSON.stringify({ title: title(rows), body: body(rows), url: SITE + target(rows), tag: 'jiujiu' });
    for (const s of subsOf.get(uid) || []) {
      try {
        const r = await sendPush(s, payload, { pub, priv, subject: 'mailto:hello@jas-soul.com' });
        if (r.status < 300) sent++;
        // 404/410：這支手機取消了或換掉了，刪掉
        else if (r.status === 404 || r.status === 410) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        else { failed.push(`${r.status} ${r.text}`.slice(0, 200)); console.error('push failed', uid, r.status, r.text); }
      } catch (e) { failed.push(String((e as Error).message).slice(0, 200)); console.error('push error', uid, e); }
    }
  }
  return new Response(JSON.stringify({ sent, users: byUser.size, failed }), { headers: { 'Content-Type': 'application/json' } });
}
