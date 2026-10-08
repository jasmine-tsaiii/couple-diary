// 有狀態的假 Supabase：伺服器資料放在 localStorage，模擬安全規則，用來測兩個人的流程
(function () {
  const load = () => JSON.parse(localStorage.getItem('mockServer') || '{"users":{},"t":{"records":[],"settings":[],"shares":[],"partners":[],"task_submissions":[],"partner_notes":[]},"files":{},"n":0}');
  const save = (S) => localStorage.setItem('mockServer', JSON.stringify(S));
  const me = () => { const u = sessionStorage.getItem('mockUid'); const S = load(); return u && S.users[u] ? S.users[u] : null; };
  const real = (u) => u && !u.is_anonymous;
  const myOwner = (S, u) => { const p = u && S.t.partners.find((x) => x.uid === u.id && x.approved !== false); return p ? p.owner : null; };
  const pausedSp = (S, o) => S.t.settings.some((x) => x.owner === o && x.key === 'sharePaused' && x.value === true);
  const recVisibleToPartner = (S, u, r) => r.owner === myOwner(S, u) && !r.archived && (r.author === u.id || (!pausedSp(S, r.owner) && !(r.data && r.data.deletedAt) && (r.visibility === 'shared' || (r.visibility === 'task' && r.unlocked))));
  const ownerSees = (u, r) => r.owner === u.id && real(u) && (!r.author || r.author === u.id || (!(r.data && r.data.deletedAt) && (r.visibility === 'shared' || (r.visibility === 'task' && r.unlocked))) || (r.type === 'fight' && r.visibility === 'shared'));
  const ownerEdits = (u, r) => r.owner === u.id && real(u) && (!r.author || r.author === u.id || (r.type === 'fight' && r.visibility === 'shared'));
  function canSelect(S, u, table, r) {
    if (!u) return false;
    if (table === 'records') return ownerSees(u, r) || recVisibleToPartner(S, u, r);
    if (table === 'partners') return r.owner === u.id && real(u);
    if (table === 'partner_notes') return (r.owner === u.id && real(u)) || (r.partner === u.id && myOwner(S, u) === r.owner) || S.t.records.some((x) => x.id === r.record_id && x.author === u.id);
    if (table === 'task_submissions') return real(u) && (r.owner === u.id || S.t.records.some((x) => x.id === r.record_id && x.author === u.id));
    if (table === 'wishes') return (r.owner === u.id && real(u)) || (r.owner === myOwner(S, u) && !r.archived);
    return r.owner === u.id && real(u);
  }
  function canDelete(S, u, table, r) {
    if (table === 'records') return r.owner === u.id && real(u) && (!r.author || r.author === u.id || (r.type === 'fight' && r.data && r.data.deletedAt));
    if (table === 'partners') return (r.owner === u.id && real(u)) || r.uid === u.id;
    if (table === 'partner_notes') return (r.owner === u.id && real(u)) || r.partner === u.id;
    return r.owner === u.id && real(u);
  }
  window.__mockErrors = [];
  const err = (m) => ({ data: null, error: { message: m } });
  function query(table) {
    let filters = [], op = 'select', payload = null, single = false, rangeArg = null, order = null;
    const q = {
      select() { return q; }, order(c, o) { order = [c, !(o && o.ascending === false)]; return q; },
      range(a, b) { rangeArg = [a, b]; return q; }, eq(c, v) { filters.push([c, v]); return q; },
      maybeSingle() { single = true; return q; },
      upsert(o) { op = 'upsert'; payload = o; return q; }, insert(o) { op = 'insert'; payload = o; return q; }, update(o) { op = 'update'; payload = o; return q; },
      delete() { op = 'delete'; return q; },
      then(res, rej) {
        try {
          if (!navigator.onLine) return res(err('TypeError: Failed to fetch'));
          const S = load(); const u = me();
          if (table === 'feedback' && op === 'insert') {
            if ((payload.user_id || null) !== (u ? u.id : null)) return res(err('new row violates row-level security policy'));
            if (!payload.message || payload.message.length > 1000) return res(err('check constraint'));
            S.t.feedback = S.t.feedback || []; S.t.feedback.push({ ...payload, created_at: new Date().toISOString() }); save(S); return res({ data: null, error: null });
          }
          if (!u) return res(err('not authenticated'));
          const rows = S.t[table] || (S.t[table] = []);
          const match = (r) => filters.every(([c, v]) => r[c] === v);
          if (op === 'upsert') {
            const row = { owner: u.id, ...payload };
            if (!(row.owner === u.id && real(u))) return res(err('new row violates row-level security policy'));
            const key = table === 'records' ? ['id'] : ['owner', 'key'];
            const i = rows.findIndex((r) => key.every((k) => r[k] === row[k]));
            if (i >= 0) {
              if (rows[i].owner !== u.id || (table === 'records' && !ownerEdits(u, rows[i]))) return res(err('new row violates row-level security policy'));
              const visChanged = table === 'records' && rows[i].visibility !== row.visibility;
              rows[i] = { ...rows[i], ...row };
              if (visChanged) { rows[i].unlocked = false; rows[i].data = { ...rows[i].data, unlocked: false }; S.t.task_submissions.filter((t) => t.record_id === rows[i].id && t.status === 'pending').forEach((t) => { t.status = 'rejected'; }); }
            }
            else rows.push({ created_at: new Date().toISOString(), unlocked: false, ...(table === 'records' ? { author: u.id } : {}), ...row });
            save(S); return res({ data: null, error: null });
          }
          if (op === 'insert') {
            const row = { id: 'w' + (++S.n), created_at: new Date().toISOString(), done: false, done_at: null, done_by_name: '', record_id: null, note: '', category: '', ...payload };
            if (!(row.owner === u.id && real(u))) return res(err('new row violates row-level security policy'));
            if (table === 'wishes' && rows.filter((r) => r.owner === u.id).length >= 200) return res(err('一起完成的事最多 200 件'));
            rows.push(row); save(S); return res({ data: null, error: null });
          }
          if (op === 'update') {
            rows.filter(match).filter((r) => (table === 'records' ? ownerEdits(u, r) : r.owner === u.id && real(u))).forEach((r) => Object.assign(r, payload));
            save(S); return res({ data: null, error: null });
          }
          if (op === 'delete') {
            const kill = rows.filter((r) => match(r) && canDelete(S, u, table, r));
            S.t[table] = rows.filter((r) => !kill.includes(r));
            if (table === 'shares') S.t.partners = S.t.partners.filter((p) => !kill.some((k) => k.owner === p.owner));
            if (table === 'records') S.t.task_submissions = S.t.task_submissions.filter((t) => !kill.some((k) => k.id === t.record_id));
            save(S); return res({ data: null, error: null });
          }
          let out = rows.filter((r) => match(r) && canSelect(S, u, table, r));
          if (order) out.sort((a, b) => (a[order[0]] > b[order[0]] ? 1 : -1) * (order[1] ? 1 : -1));
          if (rangeArg) out = out.slice(rangeArg[0], rangeArg[1] + 1);
          if (single) return res({ data: out[0] || null, error: null });
          return res({ data: out, error: null });
        } catch (e) { rej(e); }
      },
    };
    return q;
  }
  const rpcs = {
    admin_feedback(S, u) {
      if (!(S.admins || []).includes(u.id)) throw new Error('沒有權限');
      const items = (S.t.feedback || []).slice().reverse().map((f) => ({ at: f.created_at || new Date().toISOString(), kind: f.kind, message: f.message, contact: f.contact || '', page: f.page || '', mode: f.mode || '' }));
      return { total: items.length, week: items.length, items };
    },
    am_i_admin(S, u) { return (S.admins || []).includes(u.id); },
    admin_stats(S, u) {
      if (!(S.admins || []).includes(u.id)) throw new Error('沒有權限');
      const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(Date.now() - (29 - i) * 864e5); return { d: d.toISOString().slice(0, 10), signups: i % 4, pairs: i % 7 === 0 ? 1 : 0, active_couples: Math.min(3, Math.floor(i / 8)), writers: i % 5, records: (i * 3) % 7, deleted: i % 9 === 0 ? 1 : 0, interest: i === 20 ? 1 : 0, account_deletes: i === 12 ? 1 : 0 }; });
      const weeks = Array.from({ length: 12 }, (_, i) => ({ wk: new Date(Date.now() - i * 7 * 864e5).toISOString().slice(0, 10), signups: 12 - i, activated: 8 - Math.min(8, i), paired: 5 - Math.min(5, i), d7_n: i < 2 ? 0 : 10, d7_yes: i < 2 ? 0 : 4, d30_n: i < 6 ? 0 : 8, d30_yes: i < 6 ? 0 : 2, writers: 9 - Math.min(9, i) }));
      return { now: { unpaired_3d: 6, unpaired_writers_3d: 2, pending_joins_1d: 1, owners: 42, owners_today: 2, owners_7d: 11, couples: 9, active_couples_7d: 5, both_wrote_7d: 3, writers_today: 4, writers_7d: 13, records_today: 7, edits_today: 2, deleted_records_7d: 1, records_total: 318, interest: 3, interest_by_feature: { capsule: 2, theme: 1 }, interest_by_price: { 690: 2, 790: 1 }, interest_groups: 2, accounts_deleted_7d: 0, accounts_deleted_total: 1, last_write_at: new Date().toISOString() }, daily: days, weekly: weeks, at: new Date().toISOString() };
    },
    // 通知（真的資料庫由觸發器寫入；這裡測試直接放進 S.notifs）
    my_notifications(S, u) { return (S.notifs || []).filter((n) => n.recipient === u.id).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 50).map(({ recipient, ...n }) => n); },
    mark_notifications_read(S, u) { (S.notifs || []).forEach((n) => { if (n.recipient === u.id && !n.read_at) n.read_at = new Date().toISOString(); }); },
    mark_notification_read(S, u, a) { (S.notifs || []).forEach((n) => { if (n.recipient === u.id && n.id === a.p_id && !n.read_at) n.read_at = new Date().toISOString(); }); },
    mark_record_notifications_read(S, u, a) { (S.notifs || []).forEach((n) => { if (n.recipient === u.id && n.record_id === a.p_record && !n.read_at) n.read_at = new Date().toISOString(); }); },
    notifications_seen(S, u) { (S.notifs || []).forEach((n) => { if (n.recipient === u.id && !n.read_at) n.emailed_at = n.emailed_at || new Date().toISOString(); }); },
    email_unsubscribe(S, u, a) { const ok = (S.unsubTokens || {})[a.p_uid] === a.p_token; if (ok) { S.prefs = S.prefs || {}; S.prefs[a.p_uid] = { email_on: false }; } return ok; },
    notify_prefs_get(S, u) { return { email_on: ((S.prefs || {})[u.id] || { email_on: true }).email_on }; },
    push_subscribe(S, u, a) { S.push = (S.push || []).filter((x) => x.endpoint !== a.p_endpoint); S.push.push({ uid: u.id, endpoint: a.p_endpoint, p256dh: a.p_p256dh, auth: a.p_auth }); },
    push_unsubscribe(S, u, a) { S.push = (S.push || []).filter((x) => !(x.endpoint === a.p_endpoint && x.uid === u.id)); },
    notify_prefs_set(S, u, a) { S.prefs = S.prefs || {}; S.prefs[u.id] = { email_on: !!a.p_email_on }; },
    partner_info(S, u) {
      const p = S.t.partners.find((x) => x.uid === u.id); if (!p) return null;
      const s = S.t.shares.find((x) => x.owner === p.owner);
      const m = S.t.settings.find((x) => x.owner === p.owner && x.key === 'mascot');
      return { owner: p.owner, name: p.name, owner_name: s.owner_name, approved: p.approved !== false, mascot: m ? m.value : null, paused: pausedSp(S, p.owner) };
    },
    // 每天一題：簡化版的伺服器邏輯（S.dailyToday 可以指定「今天」，方便測換日）
    _daily(S, u) {
      const space = myOwner(S, u) || (real(u) ? u.id : null); if (!space) return null;
      const members = [space, ...S.t.partners.filter((x) => x.owner === space && x.approved !== false).map((x) => x.uid)].sort();
      const today = S.dailyToday || new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
      if (members.length !== 2 || !members.includes(u.id)) return { space, members, today, pair: null };
      S.daily = S.daily || { pairs: {}, answers: [] };
      const key = space + ':' + members.join(',');
      if (!S.daily.pairs[key]) S.daily.pairs[key] = { started_on: today };
      return { space, members, today, pair: key, started_on: S.daily.pairs[key].started_on, other: members.find((m) => m !== u.id) };
    },
    daily_state(S, u) {
      const d = this._daily(S, u); if (!d) return { ok: false };
      const nameOf = (m) => { const sh = S.t.shares.find((x) => x.owner === d.space); if (m === d.space) return (sh && sh.owner_name) || '對方'; const p = S.t.partners.find((x) => x.uid === m); return (p && p.name) || '對方'; };
      const names = Object.fromEntries(d.members.map((m) => [m, nameOf(m)]));
      if (!d.pair) return { ok: true, me: u.id, members: d.members, names };
      const A = S.daily.answers.filter((a) => a.pair === d.pair);
      const mine = A.find((a) => a.day === d.today && a.user_id === u.id); const th = A.find((a) => a.day === d.today && a.user_id === d.other);
      const days = (x) => Math.round((Date.parse(x) - Date.parse(d.started_on)) / 864e5);
      const both = [...new Set(A.map((a) => a.day))].filter((day) => A.filter((a) => a.day === day).length === 2);
      return { ok: true, me: u.id, members: d.members, names, pair: d.pair, today: d.today, n: days(d.today), q_id: (mine || th || {}).q_id || null,
        mine: mine ? mine.body : null, other_done: !!th, revealed: !!(mine && th), other: mine && th ? th.body : null,
        pending: A.filter((a) => a.user_id === d.other && a.day < d.today && !A.some((b) => b.day === a.day && b.user_id === u.id)).sort((x, y) => (x.day < y.day ? 1 : -1)).map((a) => ({ day: a.day, q_id: a.q_id })),
        month_days: both.filter((x) => x.slice(0, 7) === d.today.slice(0, 7)).length };
    },
    daily_save(S, u, a) {
      const d = this._daily(S, u); if (!d || !d.pair) throw new Error('另一半加入之後就能一起寫');
      const body = String(a.p_body || '').trim(); if (!body || body.length > 300) throw new Error('答案要 1 到 300 個字');
      if (!a.p_day || a.p_day > d.today || a.p_day < d.started_on) throw new Error('這一天不能寫');
      const A = S.daily.answers; const mine = A.find((x) => x.pair === d.pair && x.day === a.p_day && x.user_id === u.id); const th = A.find((x) => x.pair === d.pair && x.day === a.p_day && x.user_id === d.other);
      if (a.p_day < d.today && !th && !mine) throw new Error('這一天不能寫');
      if (mine && th) throw new Error('已經揭曉了，不能改');
      const q = th ? th.q_id : mine ? mine.q_id : a.p_q_id;
      if (mine) mine.body = body; else A.push({ pair: d.pair, day: a.p_day, q_id: q, user_id: u.id, body });
      return { revealed: !!th, q_id: q };
    },
    daily_history(S, u, a) {
      const d = this._daily(S, u); if (!d || !d.pair) return [];
      const before = a.p_before && a.p_before < d.today ? a.p_before : d.today; const A = S.daily.answers.filter((x) => x.pair === d.pair && x.day < before);
      const days = [...new Set(A.map((x) => x.day))].filter((day) => A.filter((x) => x.day === day).length === 2).sort().reverse().slice(0, a.p_limit || 20);
      return days.map((day) => ({ day, q_id: A.find((x) => x.day === day).q_id, answers: Object.fromEntries(A.filter((x) => x.day === day).map((x) => [x.user_id, x.body])) }));
    },
    // 主題題庫：簡化版的伺服器邏輯（共用每天一題的「這一對」；每個主題只開前 5 題）
    topic_state(S, u) {
      const st = this.daily_state(S, u); if (!st.ok || !st.pair) return st.ok ? { ok: true, me: st.me, members: st.members, names: st.names } : st;
      const d = this._daily(S, u); const A = (S.topics || []).filter((a) => a.pair === d.pair);
      const answers = {};
      for (const q of new Set(A.map((a) => a.q_id))) { const mi = A.find((a) => a.q_id === q && a.user_id === u.id); const th = A.find((a) => a.q_id === q && a.user_id === d.other); answers[q] = { mine: mi ? mi.body : null, other_done: !!th, other: mi && th ? th.body : null }; }
      return { ok: true, me: u.id, members: d.members, names: st.names, pair: d.pair, answers };
    },
    topic_save(S, u, a) {
      const d = this._daily(S, u); if (!d || !d.pair) throw new Error('另一半加入之後就能一起寫');
      if (!/^[a-z]{3,8}[0-9]{2}$/.test(a.p_q_id || '')) throw new Error('找不到這一題');
      const n = Number(a.p_q_id.slice(-2)); if (n < 1 || n > 5) throw new Error('這一題還沒開放');
      const prev = a.p_q_id.slice(0, -2) + String(n - 1).padStart(2, '0');
      if (n > 1 && !(S.topics || []).some((x) => x.pair === d.pair && x.q_id === prev && x.user_id === u.id)) throw new Error('先寫完上一題');
      const body = String(a.p_body || '').trim(); if (!body || body.length > 300) throw new Error('答案要 1 到 300 個字');
      S.topics = S.topics || []; const A = S.topics;
      const mine = A.find((x) => x.pair === d.pair && x.q_id === a.p_q_id && x.user_id === u.id); const th = A.find((x) => x.pair === d.pair && x.q_id === a.p_q_id && x.user_id === d.other);
      if (mine && th) throw new Error('已經揭曉了，不能改');
      if (mine) mine.body = body; else A.push({ pair: d.pair, q_id: a.p_q_id, user_id: u.id, body });
      return { revealed: !!th };
    },
    // 秘密留言板：簡化版的伺服器邏輯（共用每天一題的「這一對」）
    note_state(S, u) {
      const d = this._daily(S, u); if (!d) return { ok: false };
      const nameOf = (m) => { const sh = S.t.shares.find((x) => x.owner === d.space); if (m === d.space) return (sh && sh.owner_name) || '對方'; const p = S.t.partners.find((x) => x.uid === m); return (p && p.name) || '對方'; };
      const names = Object.fromEntries(d.members.map((m) => [m, nameOf(m)]));
      if (!d.pair) return { ok: true, me: u.id, pair: null, names };
      const N = (S.notes || []).filter((n) => n.pair === d.pair);
      const last = (f) => { const x = N.filter(f).sort((a, b) => b.id - a.id)[0]; if (!x) return null; const { pair, recipient, ...r } = x; return r; };
      return { ok: true, me: u.id, pair: d.pair, members: d.members, names, inbox: last((n) => n.recipient === u.id), sent: last((n) => n.author === u.id), unseen: N.filter((n) => n.recipient === u.id && !n.seen_at).length };
    },
    note_send(S, u, a) {
      const d = this._daily(S, u); if (!d || !d.pair) throw new Error('另一半加入之後就能寫紙條給對方');
      const body = String(a.p_body || '').trim();
      if (a.p_kind === 'text' && (!body || body.length > 120)) throw new Error('紙條要 1 到 120 個字');
      if (a.p_kind === 'draw' && !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(a.p_image || '')) throw new Error('手寫的圖存不進去，請再寫一次');
      S.notes = S.notes || []; S.noteSeq = (S.noteSeq || 0) + 1;
      S.notes.push({ id: S.noteSeq, pair: d.pair, author: u.id, recipient: d.other, kind: a.p_kind, body: a.p_kind === 'text' ? body : '', image: a.p_kind === 'draw' ? a.p_image : null, pen: ['ink', 'red', 'blue'].includes(a.p_pen) ? a.p_pen : 'ink', created_at: new Date().toISOString(), seen_at: null });
      return { id: S.noteSeq };
    },
    note_seen(S, u, a) {
      const d = this._daily(S, u); if (!d || !d.pair) return;
      (S.notes || []).forEach((n) => { if (n.pair === d.pair && n.recipient === u.id && n.id <= a.p_id && !n.seen_at) n.seen_at = new Date().toISOString(); });
    },
    note_history(S, u, a) {
      const d = this._daily(S, u); if (!d || !d.pair) return [];
      return (S.notes || []).filter((n) => n.pair === d.pair && (a.p_before == null || n.id < a.p_before)).sort((x, y) => y.id - x.id).slice(0, a.p_limit || 12).map(({ pair, recipient, ...r }) => r);
    },
    note_delete(S, u, a) { S.notes = (S.notes || []).filter((n) => !(n.id === a.p_id && n.author === u.id)); },
    // 重新認識你：簡化版的伺服器邏輯（回味期 7 天、90 天一回、兩人都交卷才揭曉）
    quiz_state(S, u) {
      const Q = S.quiz || { rounds: [], answers: [] };
      const space = myOwner(S, u) || (real(u) ? u.id : null); if (!space) return { ok: false };
      const members = [space, ...S.t.partners.filter((x) => x.owner === space && x.approved !== false).map((x) => x.uid)].sort();
      const key = members.join(',');
      const rounds = Q.rounds.filter((r) => r.space === space && r.members.join(',') === key).sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
      const cur = rounds[0]; const now = Date.now(); const DAY = 864e5;
      const nameOf = (m) => { if (m === space) { const sh = S.t.shares.find((x) => x.owner === space); return (sh && sh.owner_name) || '對方'; } const st = S.t.settings.find((x) => x.owner === space && x.key === 'names'); const p = S.t.partners.find((x) => x.uid === m); return (st && st.value && st.value.partner) || (p && p.name) || '對方'; };
      const ansOf = (rid) => Q.answers.filter((a) => a.round_id === rid);
      let round = null, reveal = null, next = null;
      if (cur) {
        const openUntil = cur.revealed_at ? Date.parse(cur.revealed_at) + 7 * DAY : null;
        if (cur.revealed_at) next = new Date(Math.max(Date.parse(cur.started_at) + 90 * DAY, openUntil)).toISOString();
        const mine = ansOf(cur.id).find((a) => a.uid === u.id);
        round = { id: cur.id, questions: cur.questions, started_at: cur.started_at, revealed_at: cur.revealed_at, open_until: openUntil && new Date(openUntil).toISOString(), no: rounds.length,
          submitted: Object.fromEntries(ansOf(cur.id).map((a) => [a.uid, !!a.submitted_at])),
          mine: cur.revealed_at ? null : mine ? { answers: mine.answers, guesses: mine.guesses, submitted_at: mine.submitted_at } : null };
        if (cur.revealed_at && now < openUntil) {
          const prev = rounds[1];
          reveal = { answers: Object.fromEntries(ansOf(cur.id).map((a) => [a.uid, { answers: a.answers, guesses: a.guesses, hits: a.hits, misses: a.misses || [] }])),
            prev: prev ? { id: prev.id, started_at: prev.started_at, questions: prev.questions, answers: Object.fromEntries(ansOf(prev.id).map((a) => [a.uid, a.answers])) } : null };
        }
      }
      return { ok: true, me: u.id, members, names: Object.fromEntries(members.map((m) => [m, nameOf(m)])), round, reveal,
        can_start: members.length === 2 && (!cur || (!!cur.revealed_at && now >= Date.parse(next))), next_at: next,
        used: [...new Set(rounds.flatMap((r) => r.questions.map((q) => q.id)))],
        history: rounds.map((r) => ({ started_at: r.started_at, revealed_at: r.revealed_at, hits: ansOf(r.id).reduce((n, a) => n + a.hits.length, 0) })) };
    },
    quiz_start(S, u, a) {
      const st = this.quiz_state(S, u); if (!st.ok) throw new Error('請先登入');
      if (st.members.length !== 2) throw new Error('另一半加入後才能一起玩');
      if (st.round && !st.round.revealed_at) return st.round.id;
      if (!st.can_start) throw new Error('還沒到下一回的時間');
      S.quiz = S.quiz || { rounds: [], answers: [] };
      const id = 'qr' + (++S.n);
      S.quiz.rounds.push({ id, space: myOwner(S, u) || u.id, members: st.members, questions: a.p_questions, started_at: new Date().toISOString(), revealed_at: null });
      return id;
    },
    quiz_save(S, u, a) {
      const r = (S.quiz || { rounds: [] }).rounds.find((x) => x.id === a.p_round);
      if (!r || !r.members.includes(u.id)) throw new Error('找不到這一回');
      if (r.revealed_at) throw new Error('這一回已經揭曉了');
      const ids = r.questions.map((q) => q.id);
      const clean = (o) => Object.fromEntries(Object.entries(o || {}).filter(([k, v]) => ids.includes(k) && String(v).trim()).map(([k, v]) => [k, String(v).trim().slice(0, 300)]));
      let row = S.quiz.answers.find((x) => x.round_id === r.id && x.uid === u.id);
      if (row && row.submitted_at) throw new Error('已經交卷了，不能再改');
      const ans = clean(a.p_answers);
      if (a.p_submit && Object.keys(ans).length < ids.length) throw new Error('還有題目沒寫');
      if (!row) { row = { round_id: r.id, uid: u.id, hits: [] }; S.quiz.answers.push(row); }
      Object.assign(row, { answers: ans, guesses: clean(a.p_guesses), submitted_at: a.p_submit ? new Date().toISOString() : null });
      if (!a.p_submit) return { revealed: false };
      const all = r.members.every((m) => S.quiz.answers.some((x) => x.round_id === r.id && x.uid === m && x.submitted_at));
      if (all) r.revealed_at = new Date().toISOString();
      return { revealed: all };
    },
    quiz_trim(S, u, a) {
      const r = (S.quiz || { rounds: [] }).rounds.find((x) => x.id === a.p_round);
      if (!r || !r.members.includes(u.id)) throw new Error('找不到這一回');
      if (r.revealed_at || S.quiz.answers.some((x) => x.round_id === r.id && x.submitted_at)) throw new Error('已經有人交卷，不能改題目');
      const q = a.p_keep.map((id) => r.questions.find((x) => x.id === id));
      if (q.some((x) => !x) || q.length < 3) throw new Error('找不到這一題');
      r.questions = q;
    },
    quiz_mark_hit(S, u, a) {
      const r = (S.quiz || { rounds: [] }).rounds.find((x) => x.id === a.p_round);
      if (!r || !r.revealed_at) throw new Error('找不到這一回');
      const row = S.quiz.answers.find((x) => x.round_id === r.id && x.uid === u.id);
      row.hits = a.p_hit ? [...new Set([...row.hits, a.p_qid])] : row.hits.filter((x) => x !== a.p_qid);
    },
    quiz_mark(S, u, a) {
      if (S.noQuizMark) throw new Error('Could not find the function public.quiz_mark');
      if (!['hit', 'miss', ''].includes(a.p_verdict || '')) throw new Error('判定只能是猜中或沒猜中');
      const r = (S.quiz || { rounds: [] }).rounds.find((x) => x.id === a.p_round);
      if (!r || !r.revealed_at) throw new Error('找不到這一回');
      const row = S.quiz.answers.find((x) => x.round_id === r.id && x.uid === u.id);
      row.hits = row.hits.filter((x) => x !== a.p_qid); row.misses = (row.misses || []).filter((x) => x !== a.p_qid);
      if (a.p_verdict === 'hit') row.hits.push(a.p_qid);
      if (a.p_verdict === 'miss') row.misses.push(a.p_qid);
    },
    partner_set_name(S, u, a) {
      const n = (a.p_name || '').trim(); if (!n || n.length > 20) throw new Error('名字要 1 到 20 個字');
      const p = S.t.partners.find((x) => x.uid === u.id); if (!p) throw new Error('你還沒加入對方的日記');
      p.name = n; if (p.approved === false) return;
      const st = S.t.settings.find((x) => x.owner === p.owner && x.key === 'names');
      if (st) st.value = { ...(st.value || {}), partner: n }; else S.t.settings.push({ owner: p.owner, key: 'names', value: { partner: n } });
    },
    owner_set_partner_name(S, u, a) { const n = (a.p_name || '').trim(); if (!real(u) || !n) return; S.t.partners.filter((x) => x.owner === u.id && x.approved !== false).forEach((x) => { x.name = n; }); },
    set_share(S, u, a) {
      if (!real(u)) throw new Error('請先登入');
      if (!/^[A-Z0-9]{6,12}$/.test(a.p_code)) throw new Error('分享碼格式不對');
      if (a.p_password != null && a.p_password.length < 6) throw new Error('密碼至少 6 個字');
      if (S.t.shares.some((s) => s.code === a.p_code && s.owner !== u.id)) throw new Error('duplicate key value violates unique constraint');
      const s = S.t.shares.find((x) => x.owner === u.id);
      if (s) { s.code = a.p_code; s.owner_name = a.p_owner_name; if (a.p_password != null) s.pass = a.p_password; s.failed = 0; }
      else { if (a.p_password == null) throw new Error('請設定密碼'); S.t.shares.push({ owner: u.id, code: a.p_code, pass: a.p_password, owner_name: a.p_owner_name, failed: 0, created_at: new Date().toISOString() }); }
    },
    partner_save_record(S, u, a) {
      if (!real(u)) throw new Error('要先綁定 Email 或 Google 帳號，才能新增或修改紀錄');
      const p = S.t.partners.find((x) => x.uid === u.id && x.approved !== false); if (!p) throw new Error('你還沒有用分享碼加入，或還在等對方同意');
      const rec = a.p_rec; const now = Date.now();
      const r = S.t.records.find((x) => x.id === rec.id);
      const type = r ? r.type : rec.type;
      if (!['happy', 'cloud', 'fight'].includes(type)) throw new Error('類型不對');
      const keys = type === 'fight' ? ['title', 'date', 'category', 'reason', 'myView', 'theirView', 'status', 'resolution', 'followUps', 'emojis', 'tags']
        : ['title', 'date', 'description', 'emojis', 'tags'].concat(type === 'cloud' ? ['reflections'] : []);
      const inp = {}; keys.forEach((k) => { if (k in rec) inp[k] = rec[k]; });
      if ('photoIds' in rec && (!r || r.author === u.id)) { if (!Array.isArray(rec.photoIds) || rec.photoIds.length > 9) throw new Error('照片資料不對，每則最多 9 張'); inp.photoIds = rec.photoIds; }
      if (!inp.title || inp.title.length > 60) throw new Error('標題要 1 到 60 個字');
      const vis = type === 'fight' ? 'shared' : (rec.visibility || (r ? r.visibility : type === 'cloud' ? 'locked' : 'shared'));
      if (!['shared', 'locked', 'task'].includes(vis)) throw new Error('誰可以看的設定不對');
      if (vis === 'task') { const tt = ((rec.task && rec.task.text) || '').trim(); if (!tt || tt.length > 100) throw new Error('解鎖任務要 1 到 100 個字'); inp.task = { text: tt, mode: ['photo', 'answer'].includes(rec.task.mode) ? rec.task.mode : 'confirm' }; }
      const relock = r && r.unlocked && rec.unlocked === false;
      if (type === 'cloud' && 'clearedAt' in rec) inp.clearedAt = typeof rec.clearedAt === 'number' ? ((r && r.data.clearedAt) || now) : null;
      const nextNo = () => {
        const ls = S.t.settings.find((x) => x.owner === p.owner && x.key === 'lastNo');
        const no = Math.max(0, ...S.t.records.filter((x) => x.owner === p.owner && x.type === type).map((x) => x.data.no || 0), (ls && ls.value[type]) || 0) + 1;
        if (ls) ls.value = { ...ls.value, [type]: no }; else S.t.settings.push({ owner: p.owner, key: 'lastNo', value: { [type]: no } });
        return no;
      };
      if (r) {
        if (r.owner !== p.owner || r.data.deletedAt) throw new Error('找不到這則紀錄');
        if (type === 'fight' && r.visibility !== 'shared') throw new Error('找不到這個議題，或它沒有分享給你');
        if (type !== 'fight' && r.author !== u.id) throw new Error('只能修改你自己寫的紀錄');
        const visChanged = r.visibility !== vis;
        r.data = { ...r.data, ...inp, visibility: vis, updatedAt: now, editedAt: now, editedBy: u.id }; if (r.data.clearedAt === null) delete r.data.clearedAt;
        if (relock || visChanged) { r.unlocked = false; r.data.unlocked = false; }
        if (visChanged) S.t.task_submissions.filter((t) => t.record_id === r.id && t.status === 'pending').forEach((t) => { t.status = 'rejected'; });
        r.visibility = vis; return r.data;
      }
      const base = { emojis: [], tags: [], description: '', ...(type === 'fight' ? { status: 'open', followUps: [], category: '', reason: '', myView: '', theirView: '', resolution: '' } : type === 'cloud' ? { reflections: [] } : {}) };
      const data = { ...base, date: new Date().toISOString().slice(0, 10), ...inp,
        id: rec.id, type, no: nextNo(), visibility: vis, unlocked: false, photoIds: inp.photoIds || [], task: inp.task || { text: '', mode: 'confirm' }, author: u.id, authorName: p.name, v: 1, createdAt: now, updatedAt: now };
      if (data.clearedAt === null) delete data.clearedAt;
      S.t.records.push({ id: rec.id, owner: p.owner, author: u.id, type, visibility: vis, unlocked: false, data, created_at: new Date().toISOString() });
      return data;
    },
    partner_delete_record(S, u, a) {
      if (!real(u)) throw new Error('要先綁定帳號');
      const r = S.t.records.find((x) => x.id === a.p_id && x.owner === myOwner(S, u) && x.author === u.id && !x.data.deletedAt);
      if (!r) throw new Error('只能刪除你自己寫的紀錄');
      if (r.type === 'fight') r.data = { ...r.data, deletedAt: Date.now(), updatedAt: Date.now() };
      else S.t.records = S.t.records.filter((x) => x !== r);
    },
    others_locked(S, u) {
      const space = myOwner(S, u) || (real(u) ? u.id : null);
      return S.t.records.filter((r) => r.owner === space && (r.author || r.owner) !== u.id && r.visibility === 'locked' && !r.data.deletedAt).map((r) => ({ id: r.id, type: r.type, no: r.data.no }));
    },
    next_no(S, u, a) {
      if (!real(u)) throw new Error('請先登入');
      const ls = S.t.settings.find((x) => x.owner === u.id && x.key === 'lastNo');
      const no = Math.max(0, ...S.t.records.filter((x) => x.owner === u.id && !x.archived && x.type === a.p_type).map((x) => x.data.no || 0), (ls && ls.value[a.p_type]) || 0) + 1;
      if (ls) ls.value = { ...ls.value, [a.p_type]: no }; else S.t.settings.push({ owner: u.id, key: 'lastNo', value: { [a.p_type]: no } });
      return no;
    },
    renumber_all(S, u) {
      if (!real(u)) throw new Error('請先登入');
      const last = {};
      ['happy', 'cloud', 'fight'].forEach((t) => {
        const rs = S.t.records.filter((x) => x.owner === u.id && x.type === t && !x.data.deletedAt).sort((x, y) => (x.data.date || '').localeCompare(y.data.date || '') || (x.data.createdAt || 0) - (y.data.createdAt || 0));
        rs.forEach((r, i) => { r.data.no = i + 1; }); last[t] = rs.length;
      });
      const ls = S.t.settings.find((x) => x.owner === u.id && x.key === 'lastNo');
      if (ls) ls.value = last; else S.t.settings.push({ owner: u.id, key: 'lastNo', value: last });
    },
    join_share(S, u, a) {
      if (!a.p_name) return { ok: false, error: '名字要 1 到 20 個字' };
      const s = S.t.shares.find((x) => x.code === a.p_code);
      if (!s) return { ok: false, error: '分享碼或密碼不對' };
      if (s.locked) return { ok: false, error: '輸錯太多次了，請 10 分鐘後再試' };
      if (s.pass !== a.p_password) { s.failed++; if (s.failed >= 5) { s.locked = true; s.failed = 0; } return { ok: false, error: '分享碼或密碼不對' }; }
      const mine = S.t.partners.find((p) => p.uid === u.id && p.owner === s.owner && p.approved !== false);
      if (mine) { mine.name = a.p_name; return { ok: true, pending: false }; }
      if (S.t.partners.filter((p) => p.owner === s.owner && p.approved === false && p.uid !== u.id).length >= 3) return { ok: false, error: '目前等待同意的人太多了，請紀錄的主人先處理' };
      S.t.partners = S.t.partners.filter((p) => p.uid !== u.id);
      const boundP = !real(u) ? S.t.partners.find((p) => p.owner === s.owner && p.approved !== false && p.uid !== u.id && S.users[p.uid] && !S.users[p.uid].is_anonymous) : null;
      S.t.partners.push({ uid: u.id, owner: s.owner, name: a.p_name, joined_at: new Date().toISOString(), approved: !!localStorage.getItem('mockAutoApprove') });
      return { ok: true, pending: !localStorage.getItem('mockAutoApprove'), bound_partner: boundP ? boundP.name : null };
    },
    partner_accounts(S, u) {
      if (!real(u)) return [];
      return S.t.partners.filter((p) => p.owner === u.id).map((p) => ({ uid: p.uid, bound: !!(S.users[p.uid] && !S.users[p.uid].is_anonymous), returning: S.t.records.some((r) => r.owner === u.id && r.author === p.uid && r.author !== u.id) }));
    },
    approve_partner(S, u, a) {
      if (!real(u)) throw new Error('請先登入');
      if (!S.t.partners.some((p) => p.uid === a.p_uid && p.owner === u.id && p.approved === false)) throw new Error('找不到這個加入要求');
      S.t.partners = S.t.partners.filter((p) => p.owner !== u.id || p.uid === a.p_uid);
      S.t.partners.find((p) => p.uid === a.p_uid).approved = true;
    },
    toggle_heart(S, u, a) {
      const space = myOwner(S, u) || (real(u) ? u.id : null);
      const p = S.t.partners.find((x) => x.uid === u.id && x.approved !== false);
      const sh = S.t.shares.find((x) => x.owner === u.id);
      const name = p ? p.name : (sh && sh.owner_name) || '對方';
      const r = S.t.records.find((x) => x.id === a.p_record_id && x.owner === space && (x.author || x.owner) !== u.id && !x.data.deletedAt && (x.visibility === 'shared' || (x.visibility === 'task' && x.unlocked)));
      if (!r || r.type !== 'happy') throw new Error('只能對看得到、對方寫的美好時刻按愛心');
      S.t.partner_notes = S.t.partner_notes || [];
      const i = S.t.partner_notes.findIndex((n) => n.record_id === r.id && n.partner === u.id && n.kind === 'heart');
      if (i >= 0) { S.t.partner_notes.splice(i, 1); return false; }
      S.t.partner_notes.push({ id: 'pn' + (++S.n), owner: r.owner, record_id: r.id, partner: u.id, partner_name: name, kind: 'heart', text: '', created_at: new Date().toISOString() });
      return true;
    },
    add_partner_note(S, u, a) {
      const p = S.t.partners.find((x) => x.uid === u.id && x.approved !== false); if (!p) throw new Error('你還沒有用分享碼加入');
      const r = S.t.records.find((x) => x.id === a.p_record_id && recVisibleToPartner(S, u, x));
      if (!r || r.type !== 'fight') throw new Error('只能在看得到的吵架議題寫補充');
      const t = (a.p_text || '').trim(); if (!t || t.length > 1000) throw new Error('補充要 1 到 1000 個字');
      S.t.partner_notes = S.t.partner_notes || [];
      S.t.partner_notes.push({ id: 'pn' + (++S.n), owner: p.owner, record_id: r.id, partner: u.id, partner_name: p.name, kind: 'note', text: t, created_at: new Date().toISOString() });
    },
    photo_quota(S, u) {
      const sp = myOwner(S, u) || u.id;
      const plus = (S.plans || {})[sp] === 'plus';
      const folders = [sp, ...S.t.partners.filter((x) => x.owner === sp && x.approved !== false).map((x) => x.uid)];
      const cnt = (f) => Object.keys(S.files).filter((k) => k.startsWith(f + '/') && k.split('/').length === 2 && !k.split('/')[1].startsWith('task-')).length;
      return { plan: plus ? 'plus' : 'free', limit: plus ? null : 30, used: folders.reduce((n, f) => n + cnt(f), 0), mine: cnt(u.id) };
    },
    note_upgrade_interest(S, u) { S.interest = S.interest || {}; S.interest[u.id] = (S.interest[u.id] || 0) + 1; },
    // 「我有興趣」：每人每功能一列（S.interests['uid:feature'] = 按了幾次，只有第一次回傳 true）
    note_interest(S, u, a) {
      if (S.noInterestRpc) throw new Error('Could not find the function public.note_interest');
      S.interests = S.interests || {}; const k = u.id + ':' + a.p_feature;
      if (S.interests[k]) { S.interests[k]++; return false; } S.interests[k] = 1; S.interestPrice = S.interestPrice || {}; S.interestPrice[k] = a.p_price || null; return true;
    },
    interest_groups(S) { const sp = (uid) => { const p = S.t.partners.find((x) => x.uid === uid && x.approved !== false); return p ? p.owner : uid; }; return new Set(Object.keys(S.interests || {}).filter((k) => !k.endsWith(':nest')).map((k) => sp(k.split(':')[0]))).size; },
    my_interests(S, u) { return Object.keys(S.interests || {}).filter((k) => k.startsWith(u.id + ':')).map((k) => k.split(':')[1]); },
    // 時光膠囊：打開日期前，收件人只拿得到日期（S.capToday 可以指定今天）
    _capSpace(S, u) { return myOwner(S, u) || (real(u) ? u.id : null); },
    capsule_list(S, u) {
      if (S.noCapsules) throw new Error('Could not find the function public.capsule_list');
      const space = rpcs._capSpace(S, u); if (!space) return [];
      const today = S.capToday || new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
      const members = [space, ...S.t.partners.filter((x) => x.owner === space && x.approved !== false).map((x) => x.uid)];
      const nameOf = (m) => { if (m === space) { const sh = S.t.shares.find((x) => x.owner === space); return (sh && sh.owner_name) || '對方'; } const p = S.t.partners.find((x) => x.uid === m); return (p && p.name) || '對方'; };
      (S.capsules || []).forEach((c) => { if (c.space === space && !c.for_uid && c.author !== u.id && members.includes(c.author)) c.for_uid = u.id; });
      return (S.capsules || []).filter((c) => c.space === space && (c.author === u.id || (members.includes(c.author) && c.for_uid === u.id)))
        .sort((a, b) => (a.open_on < b.open_on ? -1 : 1))
        .map((c) => (c.author === u.id || c.open_on <= today
          ? { id: c.id, mine: c.author === u.id, author_name: nameOf(c.author), open_on: c.open_on, occasion: c.occasion, opened: c.open_on <= today, body: c.body, photo_path: c.photo_path, created_at: c.created_at }
          : { id: c.id, mine: false, author_name: nameOf(c.author), open_on: c.open_on, occasion: c.occasion, opened: false, sealed: true, created_at: c.created_at }));
    },
    capsule_save(S, u, a) {
      const space = rpcs._capSpace(S, u); if (!space) throw new Error('要先登入才能寫時光膠囊');
      const today = S.capToday || new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
      if (!a.p_open_on || a.p_open_on <= today) throw new Error('打開日期要選明天以後');
      if (!(a.p_body || '').trim() && !a.p_photo) throw new Error('寫一點話，或放一張照片');
      S.capsules = S.capsules || [];
      if (a.p_id) {
        const c = S.capsules.find((x) => x.id === a.p_id && x.author === u.id); if (!c) throw new Error('找不到這個時光膠囊');
        if (c.open_on <= today) throw new Error('已經打開了，不能再改');
        const old = c.photo_path !== a.p_photo ? c.photo_path : null;
        Object.assign(c, { open_on: a.p_open_on, occasion: a.p_occasion, body: a.p_body, photo_path: a.p_photo });
        return { id: c.id, old_photo: old };
      }
      if ((S.plans || {})[u.id] !== 'plus' && S.capsules.some((x) => x.author === u.id && x.space === space && x.open_on > today)) throw new Error('capsule_limit');
      const members = [space, ...S.t.partners.filter((x) => x.owner === space && x.approved !== false).map((x) => x.uid)];
      const c = { id: 'cap' + (++S.n), space, author: u.id, for_uid: members.find((m) => m !== u.id) || null, open_on: a.p_open_on, occasion: a.p_occasion, body: a.p_body, photo_path: a.p_photo, created_at: new Date().toISOString() };
      S.capsules.push(c); return { id: c.id };
    },
    capsule_delete(S, u, a) {
      const c = (S.capsules || []).find((x) => x.id === a.p_id && x.author === u.id); if (!c) return null;
      S.capsules = S.capsules.filter((x) => x !== c); return c.photo_path || null;
    },
    // 倒數日：簡化版的伺服器邏輯（兩個人共用，都能改；暫停分享時另一半看不到主人新增的）
    _cdVisible(S, u, c, space) {
      const members = [space, ...S.t.partners.filter((x) => x.owner === space && x.approved !== false).map((x) => x.uid)];
      return c.space === space && members.includes(c.author) && !(c.author === space && u.id !== space && pausedSp(S, space));
    },
    countdown_list(S, u) {
      if (S.noCountdowns) throw new Error('Could not find the function public.countdown_list');
      const space = rpcs._capSpace(S, u); if (!space) return [];
      const nameOf = (m) => { if (m === space) { const sh = S.t.shares.find((x) => x.owner === space); return (sh && sh.owner_name) || '對方'; } const p = S.t.partners.find((x) => x.uid === m); return (p && p.name) || '對方'; };
      return (S.countdowns || []).filter((c) => rpcs._cdVisible(S, u, c, space)).sort((a, b) => (a.on_date < b.on_date ? -1 : 1))
        .map((c) => ({ id: c.id, title: c.title, on_date: c.on_date, kind: c.kind, yearly: c.yearly, mine: c.author === u.id, author_name: nameOf(c.author), created_at: c.created_at }));
    },
    countdown_save(S, u, a) {
      const space = rpcs._capSpace(S, u); if (!space) throw new Error('要先登入才能新增倒數日');
      const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
      const title = String(a.p_title || '').trim(); if (!title || title.length > 20) throw new Error('名稱要 1 到 20 個字');
      if (!a.p_on_date) throw new Error('選一個日期');
      if (!a.p_yearly && a.p_on_date < today) throw new Error('日期要選今天以後');
      S.countdowns = S.countdowns || [];
      if (a.p_id) {
        const c = S.countdowns.find((x) => x.id === a.p_id); if (!c || !rpcs._cdVisible(S, u, c, space)) throw new Error('找不到這個倒數日');
        Object.assign(c, { title, on_date: a.p_on_date, kind: a.p_kind, yearly: !!a.p_yearly }); return { id: c.id };
      }
      if (S.countdowns.filter((x) => x.space === space).length >= 50) throw new Error('倒數日最多 50 個，先刪掉一些過了的吧');
      const c = { id: 'cd' + (++S.n), space, author: u.id, title, on_date: a.p_on_date, kind: a.p_kind, yearly: !!a.p_yearly, created_at: new Date().toISOString() };
      S.countdowns.push(c); return { id: c.id };
    },
    countdown_delete(S, u, a) {
      const space = rpcs._capSpace(S, u); const c = (S.countdowns || []).find((x) => x.id === a.p_id);
      if (c && space && rpcs._cdVisible(S, u, c, space)) S.countdowns = S.countdowns.filter((x) => x !== c);
    },
    partner_add_wish(S, u, a) {
      const p = S.t.partners.find((x) => x.uid === u.id && x.approved !== false); if (!p) throw new Error('你還沒有用分享碼加入');
      S.t.wishes = S.t.wishes || [];
      S.t.wishes.push({ id: 'w' + (++S.n), owner: p.owner, title: a.p_title, note: a.p_note || '', category: a.p_category || '', created_by: 'partner', created_by_name: p.name, done: false, done_at: null, done_by_name: '', record_id: null, created_at: new Date().toISOString() });
    },
    partner_set_wish_done(S, u, a) {
      const p = S.t.partners.find((x) => x.uid === u.id && x.approved !== false); if (!p) throw new Error('你還沒有用分享碼加入');
      const w = (S.t.wishes || []).find((x) => x.id === a.p_id && x.owner === p.owner); if (!w) throw new Error('找不到這件事');
      w.done = a.p_done; w.done_at = a.p_done ? new Date().toISOString() : null; w.done_by_name = a.p_done ? p.name : '';
    },
    partner_delete_wish(S, u, a) {
      const p = S.t.partners.find((x) => x.uid === u.id && x.approved !== false); if (!p) throw new Error('你還沒有用分享碼加入');
      const n = (S.t.wishes || []).length;
      S.t.wishes = (S.t.wishes || []).filter((x) => !(x.id === a.p_id && x.owner === p.owner && x.created_by === 'partner'));
      if (S.t.wishes.length === n) throw new Error('只能刪除你自己加的');
    },
    partner_locked(S, u) {
      const o = myOwner(S, u);
      return S.t.records.filter((r) => r.owner === o && r.visibility === 'locked' && !r.data.deletedAt).map((r) => ({ id: r.id, type: r.type, no: r.data.no }));
    },
    delete_account(S, u) {
      if (!real(u)) throw new Error('請先登入');
      delete S.users[u.id];
      for (const t of ['records', 'settings', 'task_submissions']) S.t[t] = S.t[t].filter((r) => r.owner !== u.id);
      S.t.shares = S.t.shares.filter((r) => r.owner !== u.id); S.t.partners = S.t.partners.filter((r) => r.owner !== u.id);
    },
    review_task(S, u, a) {
      if (!real(u)) throw new Error('請先登入');
      const t = S.t.task_submissions.find((x) => x.id === a.p_id && x.status === 'pending' && S.t.records.some((r) => r.id === x.record_id && (r.author || r.owner) === u.id));
      if (!t) throw new Error('找不到這個任務，可能已經審核過了');
      t.status = a.p_approve ? 'approved' : 'rejected'; t.reviewed_at = new Date().toISOString(); t.review_note = a.p_approve ? '' : (a.p_note || '').trim();
      if (a.p_approve) { const r = S.t.records.find((x) => x.id === t.record_id && (x.author || x.owner) === u.id); if (r) { r.unlocked = true; r.data = { ...r.data, unlocked: true, unlockedAt: Date.now(), updatedAt: Date.now() }; } }
    },
    end_relationship(S, u, a) {
      if (!real(u) || myOwner(S, u)) throw new Error('只有建立分享的人可以結束這段關係');
      const now = Date.now();
      if (a.p_mode === 'archive') S.t.records.filter((r) => r.owner === u.id && !r.archived).forEach((r) => { r.archived = true; r.data = { ...r.data, archivedAt: now, updatedAt: now }; });
      else S.t.records = S.t.records.filter((r) => r.owner !== u.id || r.archived);
      S.t.wishes = (S.t.wishes || []).filter((w) => w.owner !== u.id || a.p_mode === 'archive').map((w) => (w.owner === u.id ? { ...w, archived: true } : w));
      if (a.p_keep && !S.t.partners.some((x) => x.owner === u.id && x.uid === a.p_keep && x.approved === false)) throw new Error('找不到這個加入要求');
      S.t.partners = S.t.partners.filter((x) => x.owner !== u.id || (a.p_keep && x.uid === a.p_keep)); if (!a.p_keep) S.t.shares = S.t.shares.filter((x) => x.owner !== u.id);
      S.t.settings = S.t.settings.filter((x) => !(x.owner === u.id && ['lastNo', 'sharePaused', 'partnerLeft'].includes(x.key)));
      const n = S.t.settings.find((x) => x.owner === u.id && x.key === 'names'); if (n) n.value = { ...n.value, partner: '', since: '' };
    },
    partner_bring_records(S, u, a) {
      if (!real(u)) throw new Error('要先建立帳號');
      const p = S.t.partners.find((x) => x.uid === u.id && x.approved !== false); if (!p) throw new Error('你還沒有加入對方的日記，或還在等對方同意');
      const mine = S.t.records.filter((r) => r.owner === u.id && (r.author || r.owner) === u.id && !r.archived && !r.data.deletedAt)
        .sort((x, y) => (x.data.date || '').localeCompare(y.data.date || '') || (x.data.createdAt || 0) - (y.data.createdAt || 0));
      if (a.p_dry) return mine.length;
      for (const r of mine) {
        const ls = S.t.settings.find((x) => x.owner === p.owner && x.key === 'lastNo');
        const no = Math.max(0, ...S.t.records.filter((x) => x.owner === p.owner && x.type === r.type).map((x) => x.data.no || 0), (ls && ls.value[r.type]) || 0) + 1;
        if (ls) ls.value = { ...ls.value, [r.type]: no }; else S.t.settings.push({ owner: p.owner, key: 'lastNo', value: { [r.type]: no } });
        r.owner = p.owner; r.author = u.id; r.unlocked = false;
        r.data = { ...r.data, no, author: u.id, authorName: p.name, unlocked: false, updatedAt: Date.now(), movedAt: Date.now() };
      }
      return mine.length;
    },
    partner_end_relationship(S, u) {
      const p = S.t.partners.find((x) => x.uid === u.id && x.approved !== false); if (!p) throw new Error('你目前沒有加入任何分享');
      S.t.partners = S.t.partners.filter((x) => x.uid !== u.id);
      S.t.settings = S.t.settings.filter((x) => !(x.owner === p.owner && x.key === 'partnerLeft'));
      S.t.settings.push({ owner: p.owner, key: 'partnerLeft', value: { name: p.name, at: Date.now() } });
    },
    delete_archive(S, u) { S.t.records = S.t.records.filter((r) => r.owner !== u.id || !r.archived); },
    member_tasks(S, u) {
      const mo = myOwner(S, u); const o = mo || (real(u) ? u.id : null);
      return S.t.records.filter((r) => r.owner === o && (r.author || r.owner) !== u.id && !r.archived && !(mo && pausedSp(S, o)) && r.visibility === 'task' && !r.unlocked && !r.data.deletedAt).map((r) => {
        const subs = S.t.task_submissions.filter((t) => t.record_id === r.id && t.partner === u.id).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        return { id: r.id, type: r.type, task: { text: r.data.task.text, mode: r.data.task.mode }, submission: subs[0] ? { status: subs[0].status, created_at: subs[0].created_at, review_note: subs[0].review_note || '' } : null };
      });
    },
    submit_task(S, u, a) {
      const mo = myOwner(S, u); const space = mo || (real(u) ? u.id : null); if (!space) throw new Error('你還沒有用分享碼加入，或還在等對方同意');
      const p = S.t.partners.find((x) => x.uid === u.id) || { owner: space, name: (S.t.shares.find((x) => x.owner === u.id) || {}).owner_name || '' };
      const r = S.t.records.find((x) => x.id === a.p_record_id && x.owner === space && (x.author || x.owner) !== u.id && x.visibility === 'task' && !x.unlocked);
      if (!r) throw new Error('找不到這個任務，可能已經解鎖了');
      if (r.data.task.mode === 'photo' && !a.p_photo_path) throw new Error('這個任務要上傳照片');
      if (r.data.task.mode === 'answer' && !String(a.p_note || '').trim()) throw new Error('這個任務要寫回答');
      if (S.t.task_submissions.some((t) => t.record_id === r.id && t.partner === u.id && t.status === 'pending')) throw new Error('已經送出了，等對方確認');
      if (S.t.task_submissions.filter((t) => t.record_id === r.id && t.partner === u.id && Date.now() - Date.parse(t.created_at) < 86400000).length >= 5) throw new Error('這個任務今天已經送出 5 次了，明天再試');
      S.t.task_submissions.push({ id: 'sub' + (++S.n), owner: p.owner, record_id: r.id, partner: u.id, partner_name: p.name, note: a.p_note, photo_path: a.p_photo_path, status: 'pending', created_at: new Date().toISOString() });
    },
  };
  const toDataUrl = (blob) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
  window.supabase = {
    createClient() {
      return {
        auth: {
          async getSession() { const u = me(); return { data: { session: u ? { user: u } : null }, error: null }; },
          async signInWithPassword({ email, password }) {
            if (password !== 'secret123') return { data: {}, error: { message: 'Invalid login credentials' } };
            const S = load(); const id = 'owner-' + email.split('@')[0]; S.users[id] = { id, email, is_anonymous: false, identities: [{ provider: 'email' }] }; save(S);
            sessionStorage.setItem('mockUid', id); return { data: { session: { user: S.users[id] } }, error: null };
          },
          async signInWithIdToken({ token }) {
            window.__idToken = token;
            const S = load(); const id = 'owner-g'; S.users[id] = S.users[id] || { id, email: 'g@x.com', is_anonymous: false, identities: [{ provider: 'google' }] }; save(S);
            sessionStorage.setItem('mockUid', id); return { data: { session: { user: S.users[id] } }, error: null };
          },
          async signInAnonymously() {
            const S = load(); const id = 'anon-' + (++S.n); S.users[id] = { id, email: '', is_anonymous: true }; save(S);
            sessionStorage.setItem('mockUid', id); return { data: { session: { user: S.users[id] } }, error: null };
          },
          async resetPasswordForEmail(email, o) { window.__resetMail = { email, o }; return { data: {}, error: null }; },
          async updateUser(o) {
            window.__updatedUser = o;
            const S = load(); const u = me();
            if (u && o.email && u.is_anonymous) { S.users[u.id].pendingEmail = o.email; save(S); }
            if (u && o.data) { S.users[u.id].user_metadata = { ...(S.users[u.id].user_metadata || {}), ...o.data }; save(S); }
            return { data: { user: u ? S.users[u.id] : null }, error: null };
          },
          async refreshSession() { return { data: { session: me() ? { user: me() } : null }, error: null }; },
          async linkIdentity() { if (localStorage.getItem('mockLinkErr')) return { data: {}, error: { message: 'Manual linking is disabled' } }; const S = load(); const u = me(); const wasAnon = S.users[u.id].is_anonymous; S.users[u.id].is_anonymous = false; if (wasAnon) S.users[u.id].email = 'google@x.com'; S.users[u.id].identities = [...(S.users[u.id].identities || []), { provider: 'google' }]; save(S); return { data: {}, error: null }; },
          async signUp({ email, options }) {
            if (localStorage.getItem('mockSignUpErr')) return { data: {}, error: { message: 'x' } };
            const S = load(); const id = 'owner-' + email.split('@')[0]; S.users[id] = { id, email, is_anonymous: false, identities: [{ provider: 'email' }], user_metadata: (options && options.data) || {} }; save(S);
            if (localStorage.getItem('mockSignUpConfirm')) return { data: { session: null, user: S.users[id] }, error: null };
            sessionStorage.setItem('mockUid', id); return { data: { session: { user: S.users[id] } }, error: null };
          },
          async signOut() { sessionStorage.removeItem('mockUid'); return { error: null }; },
          async exchangeCodeForSession() { return { data: {}, error: null }; },
          async signInWithOAuth() { return { data: {}, error: null }; },
        },
        from: query,
        async rpc(name, args) {
          if (!navigator.onLine) return err('TypeError: Failed to fetch');
          const S = load(); const u = me();
          if (!u && name !== 'email_unsubscribe') return err('not authenticated');
          try { const d = rpcs[name](S, u, args || {}); save(S); return { data: d === undefined ? null : d, error: null }; } catch (e) { return err(e.message); }
        },
        storage: {
          from() {
            return {
              async upload(path, blob) {
                const S = load(); const u = me(); const folder = path.split('/')[0]; const file = path.split('/').pop();
                if (folder !== u.id || !(real(u) || (myOwner(S, u) && (file.startsWith('task-') || file.startsWith('cap-'))))) return err('new row violates row-level security policy');
                if (file.startsWith('cap-')) { S.files[path] = await toDataUrl(blob); save(S); return { data: {}, error: null }; }
                if (real(u) && !S.files[path]) {
                  const parts = path.split('/');
                  if (parts.length === 3 && !S.files[parts[0] + '/' + parts[2]]) return err('new row violates row-level security policy');
                  if (parts.length === 2 && (S.plans || {})[u.id] !== 'plus' && Object.keys(S.files).filter((k) => k.startsWith(u.id + '/') && k.split('/').length === 2).length >= 30) return err('new row violates row-level security policy');
                }
                S.files[path] = await toDataUrl(blob); save(S); return { data: {}, error: null };
              },
              async download(path) {
                if (!navigator.onLine) return err('TypeError: Failed to fetch');
                const S = load(); const u = me(); const folder = path.split('/')[0]; const file = path.split('/').pop(); const id = file.replace(/\.jpg$/, '');
                const ok = folder === u.id
                  || (folder === myOwner(S, u) && S.t.records.some((r) => (r.author || r.owner) === r.owner && recVisibleToPartner(S, u, r) && (r.data.photoIds || []).includes(id)))
                  || (real(u) && S.t.records.some((r) => r.owner === u.id && r.author === folder && r.author !== u.id && !r.data.deletedAt && (r.visibility === 'shared' || (r.visibility === 'task' && r.unlocked)) && (r.data.photoIds || []).includes(id)))
                  || (real(u) && S.t.task_submissions.some((t) => t.photo_path === path && S.t.records.some((r) => r.id === t.record_id && (r.author || r.owner) === u.id)))
                  || (file.startsWith('cap-') && (S.capsules || []).some((c) => c.photo_path === path && c.for_uid === u.id && c.open_on <= (S.capToday || new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10))));
                if (!ok || !S.files[path]) return err('not found');
                return { data: await (await fetch(S.files[path])).blob(), error: null };
              },
              async remove(paths) { const S = load(); const u = me(); paths.filter((p) => (p.startsWith(u.id + '/') && (real(u) || p.split('/').pop().startsWith('cap-'))) || (real(u) && S.t.task_submissions.some((t) => t.owner === u.id && t.photo_path === p))).forEach((p) => delete S.files[p]); save(S); return { data: {}, error: null }; },
              async list(prefix) { const S = load(); return { data: Object.keys(S.files).filter((p) => p.startsWith(prefix + '/') && !p.slice(prefix.length + 1).includes('/')).map((p) => ({ name: p.slice(prefix.length + 1) })), error: null }; },
            };
          },
        },
      };
    },
  };
})();
