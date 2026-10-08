// 測 send-push 裡自己寫的推播加密和簽章（不用連網路）：
// 用 http_ece 解得開、VAPID 簽章用公鑰驗得過，就代表手機收到的推播格式是對的。
// 執行：cd tests && node push-crypto.mjs
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const src = fs.readFileSync(new URL('../supabase/functions/send-push/index.ts', import.meta.url), 'utf8');
const block = src.split('// ===== WEBPUSH BEGIN')[1].split('// ===== WEBPUSH END')[0].replace(/^[^\n]*\n/, '');
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wp-')), 'wp.ts');
fs.writeFileSync(tmp, block + '\nexport { encrypt, vapidAuth, sendPush, b64u, unb64u };\n');
const { encrypt, vapidAuth, b64u, unb64u } = await import(tmp);
const ece = require('http_ece');
const ecdh = require('crypto').createECDH('prime256v1'); ecdh.generateKeys();
const authSecret = require('crypto').randomBytes(16);
const msg = JSON.stringify({ title: '啾啾日記', body: '小明留了一張紙條給你' });
const body = await encrypt(msg, b64u(ecdh.getPublicKey()), b64u(authSecret));
const plain = ece.decrypt(Buffer.from(body), { version: 'aes128gcm', privateKey: ecdh, authSecret });
console.log('decrypts', plain.toString() === msg);
// VAPID：用一組新金鑰簽，再用公鑰驗
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
const pub = b64u(new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey)));
const h = await vapidAuth('https://web.push.apple.com/abc', pub, jwk.d, 'mailto:hello@jas-soul.com');
const [, t, k] = h.match(/^vapid t=([^,]+), k=(.+)$/);
const [a, b, s] = t.split('.');
const claims = JSON.parse(Buffer.from(b, 'base64url').toString());
const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, kp.publicKey, unb64u(s), new TextEncoder().encode(`${a}.${b}`));
console.log('vapid signature valid', ok && k === pub && claims.aud === 'https://web.push.apple.com' && claims.exp > Date.now() / 1000);
