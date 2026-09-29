-- 我們的紀錄：Supabase 資料表與安全規則
-- 用法：在 Supabase 後台左邊選 SQL Editor → New query，把這整個檔案貼上，按 Run。
-- 重複執行也沒關係（更新版本時再貼一次整個檔案就好）。

create extension if not exists pgcrypto with schema extensions;

-- ============================================================
-- 1. 自己的紀錄和設定
-- ============================================================

-- 紀錄：一則美好時刻／烏雲時刻／吵架議題就是一行，內容整包存在 data 裡
create table if not exists public.records (
  id          text primary key,
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type        text not null check (type in ('happy', 'cloud', 'fight')),
  visibility  text not null default 'shared' check (visibility in ('shared', 'locked', 'task')),
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists records_owner_idx on public.records (owner);
-- 任務解鎖的紀錄，你確認對方完成任務後會變成 true
alter table public.records add column if not exists unlocked boolean not null default false;

-- 設定：吵架分類、上次備份時間等
create table if not exists public.settings (
  owner  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key    text not null,
  value  jsonb,
  primary key (owner, key)
);

-- 大小上限：一則紀錄的文字內容最多約 100 KB（照片另外存），一個設定最多約 20 KB
alter table public.records drop constraint if exists records_data_size;
alter table public.records add constraint records_data_size check (octet_length(data::text) <= 100000) not valid;
alter table public.settings drop constraint if exists settings_value_size;
alter table public.settings add constraint settings_value_size check (octet_length(value::text) <= 20000) not valid;

-- 是不是用 email 或 Google 登入的正式帳號（對方用分享碼加入時是臨時帳號）
create or replace function public.is_real_user() returns boolean
language sql stable as $$
  select auth.uid() is not null and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;

-- 安全規則：每個正式帳號只能讀寫自己的資料
alter table public.records enable row level security;
alter table public.settings enable row level security;

drop policy if exists "records: owner full access" on public.records;
create policy "records: owner full access" on public.records
  for all to authenticated
  using (owner = auth.uid() and public.is_real_user())
  with check (owner = auth.uid() and public.is_real_user());

drop policy if exists "settings: owner full access" on public.settings;
create policy "settings: owner full access" on public.settings
  for all to authenticated
  using (owner = auth.uid() and public.is_real_user())
  with check (owner = auth.uid() and public.is_real_user());

-- ============================================================
-- 2. 分享碼：對方輸入分享碼、密碼和名字後，可以看「給對方看」和已解鎖的紀錄
-- ============================================================

-- 你的分享碼（每個人一組）。密碼只存加密雜湊。
create table if not exists public.shares (
  owner            uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  code             text not null unique,
  pass_hash        text not null,
  owner_name       text not null default '',
  failed_attempts  int not null default 0,
  locked_until     timestamptz,
  created_at       timestamptz not null default now()
);

-- 已經加入的對方
create table if not exists public.partners (
  uid        uuid primary key references auth.users (id) on delete cascade,
  owner      uuid not null references public.shares (owner) on delete cascade,
  name       text not null,
  joined_at  timestamptz not null default now()
);
create index if not exists partners_owner_idx on public.partners (owner);
-- 新加入（包括換手機重新加入）要你按同意才生效；以前已經加入的人維持有效
alter table public.partners add column if not exists approved boolean not null default true;
alter table public.partners alter column approved set default false;

-- 對方送出的任務
create table if not exists public.task_submissions (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null references auth.users (id) on delete cascade,
  record_id     text not null references public.records (id) on delete cascade,
  partner       uuid not null references auth.users (id) on delete cascade,
  partner_name  text not null,
  note          text not null default '',
  photo_path    text,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz
);
create index if not exists task_submissions_owner_idx on public.task_submissions (owner, status);

alter table public.shares enable row level security;
alter table public.partners enable row level security;
alter table public.task_submissions enable row level security;

-- 分享碼：只有你自己看得到、刪得掉；建立和修改要透過下面的 set_share（才能把密碼加密）
drop policy if exists "shares: owner read" on public.shares;
create policy "shares: owner read" on public.shares
  for select to authenticated using (owner = auth.uid() and public.is_real_user());
drop policy if exists "shares: owner delete" on public.shares;
create policy "shares: owner delete" on public.shares
  for delete to authenticated using (owner = auth.uid() and public.is_real_user());

-- 對方名單：你看得到、可以移除；對方可以自己離開
drop policy if exists "partners: owner read" on public.partners;
create policy "partners: owner read" on public.partners
  for select to authenticated using (owner = auth.uid() and public.is_real_user());
drop policy if exists "partners: owner remove" on public.partners;
create policy "partners: owner remove" on public.partners
  for delete to authenticated using (owner = auth.uid() and public.is_real_user());
drop policy if exists "partners: self leave" on public.partners;
create policy "partners: self leave" on public.partners
  for delete to authenticated using (uid = auth.uid());

-- 任務：你看得到、可以審核和刪除；對方送出要透過 submit_task
drop policy if exists "tasks: owner read" on public.task_submissions;
create policy "tasks: owner read" on public.task_submissions
  for select to authenticated using (owner = auth.uid() and public.is_real_user());
drop policy if exists "tasks: owner review" on public.task_submissions;
create policy "tasks: owner review" on public.task_submissions
  for update to authenticated
  using (owner = auth.uid() and public.is_real_user())
  with check (owner = auth.uid() and public.is_real_user());
-- 審核只能改狀態和時間，其他欄位（照片位置、紀錄、送出的人）都不能改
revoke update on public.task_submissions from authenticated, anon;
grant update (status, reviewed_at) on public.task_submissions to authenticated;
drop policy if exists "tasks: owner delete" on public.task_submissions;
create policy "tasks: owner delete" on public.task_submissions
  for delete to authenticated using (owner = auth.uid() and public.is_real_user());

-- 目前登入的人是誰的另一半（不是另一半就是 null）
create or replace function public.my_owner() returns uuid
language sql stable security definer set search_path = public as $$
  select owner from public.partners where uid = auth.uid() and approved
$$;

-- 對方可以讀的紀錄：「給對方看」，或「任務解鎖」而且已經解鎖
drop policy if exists "records: partner read" on public.records;
create policy "records: partner read" on public.records
  for select to authenticated
  using (
    owner = public.my_owner() and (data ->> 'deletedAt') is null
    and (visibility = 'shared' or (visibility = 'task' and unlocked))
  );

-- 建立或修改分享碼。p_password 留空代表不改密碼（只改分享碼或名字）。
create or replace function public.set_share(p_code text, p_password text, p_owner_name text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_name text := trim(coalesce(p_owner_name, ''));
begin
  if not public.is_real_user() then raise exception '請先登入'; end if;
  if public.my_owner() is not null then raise exception '另一半的身分不能建立分享碼'; end if;
  if v_code !~ '^[A-Z0-9]{6,12}$' then raise exception '分享碼格式不對'; end if;
  if char_length(v_name) > 20 then raise exception '名字最多 20 個字'; end if;
  if p_password is not null and (char_length(p_password) < 6 or octet_length(p_password) > 72) then
    raise exception '密碼要 6 到 72 個字元';
  end if;

  if exists (select 1 from public.shares where owner = auth.uid()) then
    update public.shares set
      code = v_code,
      owner_name = v_name,
      pass_hash = case when p_password is null then pass_hash else extensions.crypt(p_password, extensions.gen_salt('bf')) end,
      failed_attempts = 0,
      locked_until = null
    where owner = auth.uid();
  else
    if p_password is null then raise exception '請設定密碼'; end if;
    insert into public.shares (owner, code, pass_hash, owner_name)
    values (auth.uid(), v_code, extensions.crypt(p_password, extensions.gen_salt('bf')), v_name);
  end if;
end $$;

-- 對方用分享碼加入。輸錯 5 次會鎖 10 分鐘。
create or replace function public.join_share(p_code text, p_password text, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.shares;
  v_name text := trim(coalesce(p_name, ''));
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', '請重新整理頁面再試一次'); end if;
  if v_name = '' or char_length(v_name) > 20 then return jsonb_build_object('ok', false, 'error', '名字要 1 到 20 個字'); end if;

  select * into s from public.shares where code = upper(trim(coalesce(p_code, ''))) for update;
  if not found then return jsonb_build_object('ok', false, 'error', '分享碼或密碼不對'); end if;
  if s.owner = auth.uid() then return jsonb_build_object('ok', false, 'error', '這是你自己的分享碼'); end if;
  if s.locked_until is not null and s.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', '輸錯太多次了，請 10 分鐘後再試');
  end if;
  if s.pass_hash <> extensions.crypt(coalesce(p_password, ''), s.pass_hash) then
    update public.shares set
      failed_attempts = case when failed_attempts + 1 >= 5 then 0 else failed_attempts + 1 end,
      locked_until = case when failed_attempts + 1 >= 5 then now() + interval '10 minutes' else locked_until end
    where owner = s.owner;
    return jsonb_build_object('ok', false, 'error', '分享碼或密碼不對');
  end if;

  update public.shares set failed_attempts = 0, locked_until = null where owner = s.owner;
  -- 同一個瀏覽器已經被同意過：只更新名字
  if exists (select 1 from public.partners where uid = auth.uid() and owner = s.owner and approved) then
    update public.partners set name = v_name where uid = auth.uid();
    return jsonb_build_object('ok', true, 'pending', false);
  end if;
  -- 其他情況（第一次加入、換手機、換人）都先等主人同意；同時最多 3 個人在等，避免被灌
  if (select count(*) from public.partners where owner = s.owner and not approved and uid <> auth.uid()) >= 3 then
    return jsonb_build_object('ok', false, 'error', '目前等待同意的人太多了，請紀錄的主人先處理');
  end if;
  insert into public.partners (uid, owner, name, approved) values (auth.uid(), s.owner, v_name, false)
  on conflict (uid) do update set owner = excluded.owner, name = excluded.name, joined_at = now(), approved = false;
  -- 臨時身分加入、但這段分享已經有綁定帳號的另一半：提醒他如果是同一個人，要用原本的帳號登入（不然同意後會擠掉原本的帳號）
  return jsonb_build_object('ok', true, 'pending', true, 'bound_partner', (
    select p.name from public.partners p join auth.users u on u.id = p.uid
    where p.owner = s.owner and p.approved and p.uid <> auth.uid() and not coalesce(u.is_anonymous, false)
      and not public.is_real_user()
    limit 1));
end $$;

-- 你同意某個人加入：一組分享碼只有一位另一半，同意新的人就會取代舊的（包括舊手機的身分）
create or replace function public.approve_partner(p_uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_real_user() then raise exception '請先登入'; end if;
  if not exists (select 1 from public.partners where uid = p_uid and owner = auth.uid() and not approved) then
    raise exception '找不到這個加入要求，可能對方已經離開了';
  end if;
  delete from public.partners where owner = auth.uid() and uid <> p_uid;
  update public.partners set approved = true, joined_at = now() where uid = p_uid;
end $$;

-- 對方看得到自己「有幾則上鎖的紀錄」：只給類型和編號，不給任何內容
create or replace function public.partner_locked() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'type', r.type, 'no', r.data -> 'no') order by r.created_at desc), '[]'::jsonb)
  from public.records r
  where r.owner = public.my_owner() and r.visibility = 'locked' and (r.data ->> 'deletedAt') is null
$$;

-- 對方看自己的身分：名字、對方的名字
create or replace function public.partner_info() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('owner', p.owner, 'name', p.name, 'owner_name', s.owner_name, 'approved', p.approved,
    -- 吉祥物顏色跟著主人的設定
    'mascot', (select value from public.settings where owner = p.owner and key = 'mascot'))
  from public.partners p join public.shares s on s.owner = p.owner
  where p.uid = auth.uid()
$$;

-- 對方看還沒解鎖的任務：只給任務內容和類型，不給紀錄本身
create or replace function public.partner_tasks() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'type', r.type,
    'task', jsonb_build_object('text', r.data -> 'task' ->> 'text', 'mode', r.data -> 'task' ->> 'mode'),
    'submission', (
      select jsonb_build_object('status', t.status, 'created_at', t.created_at)
      from public.task_submissions t
      where t.record_id = r.id and t.partner = auth.uid()
      order by t.created_at desc limit 1
    )
  ) order by r.created_at desc), '[]'::jsonb)
  from public.records r
  where r.owner = public.my_owner() and r.visibility = 'task' and not r.unlocked and (r.data ->> 'deletedAt') is null
$$;

-- 對方送出任務（照片要先上傳到自己的資料夾）
create or replace function public.submit_task(p_record_id text, p_note text, p_photo_path text) returns void
language plpgsql security definer set search_path = public as $$
declare
  p public.partners;
  r public.records;
begin
  select * into p from public.partners where uid = auth.uid() and approved;
  if not found then raise exception '你還沒有用分享碼加入，或還在等對方同意'; end if;
  select * into r from public.records
  where id = p_record_id and owner = p.owner and visibility = 'task' and not unlocked and (data ->> 'deletedAt') is null;
  if not found then raise exception '找不到這個任務，可能已經解鎖了'; end if;
  if public.space_paused(p.owner) then raise exception '對方暫停分享中，等對方打開再送出'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception '留言最多 500 個字'; end if;
  if p_photo_path is not null and p_photo_path !~ ('^' || auth.uid()::text || '/task-[A-Za-z0-9_-]+\.jpg$') then
    raise exception '照片位置不對';
  end if;
  if r.data -> 'task' ->> 'mode' = 'photo' and p_photo_path is null then raise exception '這個任務要上傳照片'; end if;
  if exists (select 1 from public.task_submissions where record_id = r.id and partner = auth.uid() and status = 'pending') then
    raise exception '已經送出了，等對方確認';
  end if;
  -- 同一個任務一天最多送 5 次
  if (select count(*) from public.task_submissions
      where record_id = r.id and partner = auth.uid() and created_at > now() - interval '1 day') >= 5 then
    raise exception '這個任務今天已經送出 5 次了，明天再試';
  end if;
  insert into public.task_submissions (owner, record_id, partner, partner_name, note, photo_path)
  values (p.owner, r.id, auth.uid(), p.name, coalesce(p_note, ''), p_photo_path);
end $$;

-- 你審核任務：更新任務狀態，通過時同時解鎖紀錄（一次做完，不會只做一半）
create or replace function public.review_task(p_id uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  t public.task_submissions;
begin
  if not public.is_real_user() then raise exception '請先登入'; end if;
  select * into t from public.task_submissions where id = p_id and owner = auth.uid() and status = 'pending' for update;
  if not found then raise exception '找不到這個任務，可能已經審核過了'; end if;
  update public.task_submissions
    set status = case when p_approve then 'approved' else 'rejected' end, reviewed_at = now()
    where id = t.id;
  if p_approve then
    update public.records
      set unlocked = true, updated_at = now(),
          data = data || jsonb_build_object('unlocked', true,
            'unlockedAt', (extract(epoch from now()) * 1000)::bigint,
            'updatedAt', (extract(epoch from now()) * 1000)::bigint)
      where id = t.record_id and owner = auth.uid() and visibility = 'task';
  end if;
end $$;

-- 刪除帳號：只能刪自己的正式帳號；紀錄、設定、分享、任務會跟著帳號一起刪掉（on delete cascade）
-- 照片請 App 先刪（App 的「刪除帳號」會先清空資料再呼叫這個）
create or replace function public.delete_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_real_user() then raise exception '請先登入'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- 可見度改變時：一律重新上鎖，並退回還在審核中的任務（避免改來改去就直接看得到）
create or replace function public.records_visibility_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.visibility is distinct from old.visibility then
    new.unlocked := false;
    new.data := jsonb_set(new.data, '{unlocked}', 'false');
    update public.task_submissions set status = 'rejected', reviewed_at = now()
      where record_id = new.id and status = 'pending';
  end if;
  return new;
end $$;
drop trigger if exists records_visibility_changed on public.records;
create trigger records_visibility_changed before update on public.records
  for each row execute function public.records_visibility_changed();

-- 函式只給登入的人用
revoke all on function public.approve_partner(uuid) from public, anon;
grant execute on function public.approve_partner(uuid) to authenticated;
revoke all on function public.partner_locked() from public, anon;
grant execute on function public.partner_locked() to authenticated;
revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
revoke all on function public.review_task(uuid, boolean) from public, anon;
grant execute on function public.review_task(uuid, boolean) to authenticated;
revoke all on function public.set_share(text, text, text) from public, anon;
revoke all on function public.join_share(text, text, text) from public, anon;
revoke all on function public.partner_info() from public, anon;
revoke all on function public.partner_tasks() from public, anon;
revoke all on function public.submit_task(text, text, text) from public, anon;
revoke all on function public.my_owner() from public, anon;
grant execute on function public.set_share(text, text, text) to authenticated;
grant execute on function public.join_share(text, text, text) to authenticated;
grant execute on function public.partner_info() to authenticated;
grant execute on function public.partner_tasks() to authenticated;
grant execute on function public.submit_task(text, text, text) to authenticated;
grant execute on function public.my_owner() to authenticated;

-- 另一半的回應：美好時刻按愛心、吵架議題寫「我的補充」。紀錄本身另一半還是不能改。
create table if not exists public.partner_notes (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null references auth.users (id) on delete cascade,
  record_id     text not null references public.records (id) on delete cascade,
  partner       uuid not null references auth.users (id) on delete cascade,
  partner_name  text not null,
  kind          text not null check (kind in ('heart', 'note')),
  text          text not null default '' check (char_length(text) <= 1000),
  created_at    timestamptz not null default now()
);
create unique index if not exists partner_notes_one_heart on public.partner_notes (record_id, partner) where kind = 'heart';
create index if not exists partner_notes_owner_idx on public.partner_notes (owner, record_id);
alter table public.partner_notes enable row level security;

-- 你看得到所有回應、可以刪；另一半只看得到、刪得掉自己寫的；新增要透過下面的函式
drop policy if exists "notes: owner read" on public.partner_notes;
create policy "notes: owner read" on public.partner_notes
  for select to authenticated using (owner = auth.uid() and public.is_real_user());
drop policy if exists "notes: partner read" on public.partner_notes;
create policy "notes: partner read" on public.partner_notes
  for select to authenticated using (partner = auth.uid() and owner = public.my_owner());
drop policy if exists "notes: owner delete" on public.partner_notes;
create policy "notes: owner delete" on public.partner_notes
  for delete to authenticated using (owner = auth.uid() and public.is_real_user());
drop policy if exists "notes: partner delete" on public.partner_notes;
create policy "notes: partner delete" on public.partner_notes
  for delete to authenticated using (partner = auth.uid());

-- 另一半看得到的紀錄（給對方看、或已解鎖，而且沒有被刪除）
create or replace function public.partner_can_see(p_record_id text) returns public.records
language sql stable security definer set search_path = public as $$
  select r.* from public.records r
  where r.id = p_record_id and r.owner = public.my_owner() and (r.data ->> 'deletedAt') is null
    and (r.visibility = 'shared' or (r.visibility = 'task' and r.unlocked))
$$;

-- 按愛心／收回愛心（只有美好時刻），回傳按完之後是不是有愛心
create or replace function public.toggle_heart(p_record_id text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  r public.records;
  p public.partners;
begin
  select * into p from public.partners where uid = auth.uid() and approved;
  if not found then raise exception '你還沒有用分享碼加入'; end if;
  r := public.partner_can_see(p_record_id);
  if r.id is null or r.type <> 'happy' then raise exception '只能對看得到的美好時刻按愛心'; end if;
  if exists (select 1 from public.partner_notes where record_id = r.id and partner = auth.uid() and kind = 'heart') then
    delete from public.partner_notes where record_id = r.id and partner = auth.uid() and kind = 'heart';
    return false;
  end if;
  insert into public.partner_notes (owner, record_id, partner, partner_name, kind) values (p.owner, r.id, auth.uid(), p.name, 'heart');
  return true;
end $$;

-- 在吵架議題寫「我的補充」（每則最多 1000 字，一個議題最多 50 則）
create or replace function public.add_partner_note(p_record_id text, p_text text) returns void
language plpgsql security definer set search_path = public as $$
declare
  r public.records;
  p public.partners;
  v_text text := trim(coalesce(p_text, ''));
begin
  select * into p from public.partners where uid = auth.uid() and approved;
  if not found then raise exception '你還沒有用分享碼加入'; end if;
  r := public.partner_can_see(p_record_id);
  if r.id is null or r.type <> 'fight' then raise exception '只能在看得到的吵架議題寫補充'; end if;
  if v_text = '' or char_length(v_text) > 1000 then raise exception '補充要 1 到 1000 個字'; end if;
  if (select count(*) from public.partner_notes where record_id = r.id and partner = auth.uid() and kind = 'note') >= 50 then
    raise exception '一個議題最多寫 50 則補充';
  end if;
  insert into public.partner_notes (owner, record_id, partner, partner_name, kind, text) values (p.owner, r.id, auth.uid(), p.name, 'note', v_text);
end $$;

revoke all on function public.partner_can_see(text) from public, anon, authenticated;
revoke all on function public.toggle_heart(text) from public, anon;
revoke all on function public.add_partner_note(text, text) from public, anon;
grant execute on function public.toggle_heart(text) to authenticated;
grant execute on function public.add_partner_note(text, text) to authenticated;

-- ============================================================
-- 一起完成的事：兩個人都能新增、打勾的清單（紀錄主人擁有這份清單）
-- ============================================================
create table if not exists public.wishes (
  id              uuid primary key default gen_random_uuid(),
  owner           uuid not null references auth.users (id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 60),
  note            text not null default '' check (char_length(note) <= 300),
  category        text not null default '' check (char_length(category) <= 12),
  created_by      text not null default 'owner' check (created_by in ('owner', 'partner')),
  created_by_name text not null default '' check (char_length(created_by_name) <= 20),
  done            boolean not null default false,
  done_at         timestamptz,
  done_by_name    text not null default '' check (char_length(done_by_name) <= 20),
  record_id       text,
  created_at      timestamptz not null default now()
);
create index if not exists wishes_owner_idx on public.wishes (owner, created_at);
alter table public.wishes enable row level security;

-- 你：全部都能讀寫；另一半：只能讀，新增和打勾要透過下面的函式
drop policy if exists "wishes: owner all" on public.wishes;
create policy "wishes: owner all" on public.wishes
  for all to authenticated
  using (owner = auth.uid() and public.is_real_user())
  with check (owner = auth.uid() and public.is_real_user());
drop policy if exists "wishes: partner read" on public.wishes;
create policy "wishes: partner read" on public.wishes
  for select to authenticated using (owner = public.my_owner());

-- 一份清單最多 200 件
create or replace function public.wishes_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.wishes where owner = new.owner) >= 200 then
    raise exception '一起完成的事最多 200 件';
  end if;
  return new;
end $$;
drop trigger if exists wishes_limit on public.wishes;
create trigger wishes_limit before insert on public.wishes for each row execute function public.wishes_limit();

create or replace function public.partner_add_wish(p_title text, p_note text, p_category text) returns void
language plpgsql security definer set search_path = public as $$
declare
  p public.partners;
begin
  select * into p from public.partners where uid = auth.uid() and approved;
  if not found then raise exception '你還沒有用分享碼加入'; end if;
  insert into public.wishes (owner, title, note, category, created_by, created_by_name)
  values (p.owner, trim(coalesce(p_title, '')), trim(coalesce(p_note, '')), trim(coalesce(p_category, '')), 'partner', p.name);
end $$;

create or replace function public.partner_set_wish_done(p_id uuid, p_done boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  p public.partners;
begin
  select * into p from public.partners where uid = auth.uid() and approved;
  if not found then raise exception '你還沒有用分享碼加入'; end if;
  update public.wishes set
    done = p_done,
    done_at = case when p_done then now() else null end,
    done_by_name = case when p_done then p.name else '' end
  where id = p_id and owner = p.owner and not archived;
  if not found then raise exception '找不到這件事'; end if;
end $$;

-- 另一半只能刪自己加的
create or replace function public.partner_delete_wish(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  p public.partners;
begin
  select * into p from public.partners where uid = auth.uid() and approved;
  if not found then raise exception '你還沒有用分享碼加入'; end if;
  delete from public.wishes where id = p_id and owner = p.owner and created_by = 'partner' and not archived;
  if not found then raise exception '只能刪除你自己加的'; end if;
end $$;

revoke all on function public.partner_add_wish(text, text, text) from public, anon;
revoke all on function public.partner_set_wish_done(uuid, boolean) from public, anon;
revoke all on function public.partner_delete_wish(uuid) from public, anon;
grant execute on function public.partner_add_wish(text, text, text) to authenticated;
grant execute on function public.partner_set_wish_done(uuid, boolean) to authenticated;
grant execute on function public.partner_delete_wish(uuid) to authenticated;

-- ============================================================
-- ---------- 雙人版：兩個人各記各的，吵架議題共用 ----------
-- 每則紀錄記下「誰寫的」；舊紀錄都是主人寫的
alter table public.records add column if not exists author uuid;
-- 結束一段關係時「封存」的紀錄和清單：主人自己還看得到，之後的新另一半看不到
alter table public.records add column if not exists archived boolean not null default false;
alter table public.wishes add column if not exists archived boolean not null default false;
update public.records set author = owner where author is null;
alter table public.records alter column author set default auth.uid();
create index if not exists records_owner_author_idx on public.records (owner, author);

-- 主人：自己寫的全部看得到；另一半寫的只看得到「給對方看」和任務解鎖的
drop policy if exists "records: owner full access" on public.records;
drop policy if exists "records: owner read" on public.records;
create policy "records: owner read" on public.records
  for select to authenticated
  using (
    owner = auth.uid() and public.is_real_user()
    and (author is null or author = auth.uid()
         or ((data ->> 'deletedAt') is null and (visibility = 'shared' or (visibility = 'task' and unlocked)))
         or (type = 'fight' and visibility = 'shared'))
  );
drop policy if exists "records: owner insert" on public.records;
create policy "records: owner insert" on public.records
  for insert to authenticated
  with check (owner = auth.uid() and public.is_real_user() and author = auth.uid());
-- 主人能改自己寫的，和分享的吵架議題（兩個人共用）
drop policy if exists "records: owner update" on public.records;
create policy "records: owner update" on public.records
  for update to authenticated
  using (owner = auth.uid() and public.is_real_user() and (author is null or author = auth.uid() or (type = 'fight' and visibility = 'shared')))
  with check (owner = auth.uid() and public.is_real_user() and (author is null or author = auth.uid() or (type = 'fight' and visibility = 'shared')));
-- 主人只能刪自己寫的；另一半刪掉、放在最近刪除的吵架議題，過期後主人可以清掉
drop policy if exists "records: owner delete" on public.records;
create policy "records: owner delete" on public.records
  for delete to authenticated
  using (owner = auth.uid() and public.is_real_user() and (author is null or author = auth.uid() or (type = 'fight' and (data ->> 'deletedAt') is not null)));

-- 另一半：自己寫的全部看得到；主人寫的只看得到分享和任務解鎖的
drop policy if exists "records: partner read" on public.records;
create policy "records: partner read" on public.records
  for select to authenticated
  using (
    owner = public.my_owner()
    and (author = auth.uid()
         or ((data ->> 'deletedAt') is null and (visibility = 'shared' or (visibility = 'task' and unlocked))))
  );

-- 對方上鎖的紀錄：只給類型和編號，不給內容（兩個人都用這個）
create or replace function public.others_locked() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'type', r.type, 'no', r.data -> 'no') order by r.created_at desc), '[]'::jsonb)
  from public.records r
  where r.owner = coalesce(public.my_owner(), case when public.is_real_user() then auth.uid() end)
    and r.author is distinct from auth.uid()
    and r.visibility = 'locked' and (r.data ->> 'deletedAt') is null
$$;
-- 舊版 App 用的名字，內容一樣
create or replace function public.partner_locked() returns jsonb
language sql stable security definer set search_path = public as $$ select public.others_locked() $$;

-- 下一個編號：兩個人共用一組，看得到的、看不到的都算，也不重複用刪掉的號碼
create or replace function public.take_next_no(p_owner uuid, p_type text) returns int
language plpgsql security definer set search_path = public as $$
declare v_no int;
begin
  select greatest(
    coalesce(max((data ->> 'no')::int), 0),
    coalesce((select (value ->> p_type)::int from public.settings where owner = p_owner and key = 'lastNo'), 0)
  ) + 1 into v_no
  from public.records where owner = p_owner and type = p_type and not archived;
  insert into public.settings (owner, key, value) values (p_owner, 'lastNo', jsonb_build_object(p_type, v_no))
  on conflict (owner, key) do update set value = coalesce(public.settings.value, '{}'::jsonb) || jsonb_build_object(p_type, v_no);
  return v_no;
end $$;
-- 主人新增紀錄時拿編號（也會算到另一半上鎖、主人看不到的紀錄）
create or replace function public.next_no(p_type text) returns int
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_real_user() then raise exception '請先登入'; end if;
  if p_type not in ('happy', 'cloud', 'fight') then raise exception '類型不對'; end if;
  return public.take_next_no(auth.uid(), p_type);
end $$;
-- 主人按「依日期重新編號」：兩個人的紀錄一起排
create or replace function public.renumber_all() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_real_user() then raise exception '請先登入'; end if;
  with n as (
    select id, row_number() over (partition by type order by data ->> 'date', coalesce((data ->> 'createdAt')::bigint, 0), id) as no
    from public.records where owner = auth.uid() and (data ->> 'deletedAt') is null and not archived
  )
  update public.records r set data = r.data || jsonb_build_object('no', n.no)
  from n where r.id = n.id and (r.data ->> 'no') is distinct from n.no::text;
  insert into public.settings (owner, key, value)
  select auth.uid(), 'lastNo', coalesce(jsonb_object_agg(type, c), '{}'::jsonb)
  from (select type, count(*) as c from public.records where owner = auth.uid() and (data ->> 'deletedAt') is null and not archived group by type) x
  on conflict (owner, key) do update set value = excluded.value;
end $$;

-- 另一半新增或修改紀錄（要先綁定 Email 或 Google，臨時帳號不能寫）
-- 美好、烏雲：只能改自己寫的；吵架議題：分享的都能改。只收文字欄位，編號、照片、誰寫的由資料庫決定
drop function if exists public.partner_save_fight(jsonb);
drop function if exists public.partner_delete_fight(text);
create or replace function public.partner_save_record(p_rec jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p public.partners;
  r public.records;
  v_id text := p_rec ->> 'id';
  v_type text;
  v_vis text;
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
  v_in jsonb := '{}'::jsonb;
  v_data jsonb;
  v_str text[];
  v_arr text[];
  k text;
  v_relock boolean := false;
begin
  if not public.is_real_user() then raise exception '要先綁定 Email 或 Google 帳號，才能新增或修改紀錄'; end if;
  select * into p from public.partners where uid = auth.uid() and approved;
  if not found then raise exception '你還沒有用分享碼加入，或還在等對方同意'; end if;
  if v_id is null or v_id !~ '^[A-Za-z0-9_-]{1,40}$' then raise exception '紀錄編號不對'; end if;

  select * into r from public.records where id = v_id for update;
  v_type := case when found then r.type else p_rec ->> 'type' end;
  if v_type is null or v_type not in ('happy', 'cloud', 'fight') then raise exception '類型不對'; end if;

  -- 每種紀錄收哪些欄位
  if v_type = 'fight' then
    v_str := array['title', 'date', 'category', 'reason', 'myView', 'theirView', 'status', 'resolution'];
    v_arr := array['followUps', 'emojis', 'tags'];
  else
    v_str := array['title', 'date', 'description'];
    v_arr := array['emojis', 'tags'] || case when v_type = 'cloud' then array['reflections'] else array[]::text[] end;
  end if;
  foreach k in array v_str loop
    if p_rec ? k then
      if jsonb_typeof(p_rec -> k) <> 'string' then raise exception '資料格式不對：%', k; end if;
      v_in := v_in || jsonb_build_object(k, p_rec ->> k);
    end if;
  end loop;
  foreach k in array v_arr loop
    if p_rec ? k then
      if jsonb_typeof(p_rec -> k) <> 'array' then raise exception '資料格式不對：%', k; end if;
      v_in := v_in || jsonb_build_object(k, p_rec -> k);
    end if;
  end loop;
  if char_length(coalesce(v_in ->> 'title', 'x')) not between 1 and 60 then raise exception '標題要 1 到 60 個字'; end if;
  if v_in ? 'date' and v_in ->> 'date' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception '日期格式不對'; end if;
  if char_length(coalesce(v_in ->> 'description', '')) > 2000 then raise exception '描述最多 2000 個字'; end if;
  if char_length(coalesce(v_in ->> 'category', '')) > 12 then raise exception '分類最多 12 個字'; end if;
  if greatest(char_length(coalesce(v_in ->> 'reason', '')), char_length(coalesce(v_in ->> 'myView', '')), char_length(coalesce(v_in ->> 'theirView', ''))) > 1000 then raise exception '每一欄最多 1000 個字'; end if;
  if char_length(coalesce(v_in ->> 'resolution', '')) > 500 then raise exception '解法最多 500 個字'; end if;
  if v_in ? 'status' and v_in ->> 'status' not in ('open', 'progress', 'resolved') then raise exception '狀態不對'; end if;
  if jsonb_array_length(coalesce(v_in -> 'followUps', '[]')) > 100 then raise exception '每個議題最多 100 則後續'; end if;
  if jsonb_array_length(coalesce(v_in -> 'reflections', '[]')) > 50 then raise exception '每則最多 50 則反思'; end if;
  if jsonb_array_length(coalesce(v_in -> 'emojis', '[]')) > 5 or jsonb_array_length(coalesce(v_in -> 'tags', '[]')) > 10 then raise exception '表情或標籤太多了'; end if;
  -- 誰可以看：吵架議題一律分享；美好、烏雲可以分享、上鎖，或出任務讓對方解鎖
  if v_type = 'fight' then v_vis := 'shared';
  else
    v_vis := coalesce(p_rec ->> 'visibility', case when r.id is not null then r.visibility when v_type = 'cloud' then 'locked' else 'shared' end);
    if v_vis not in ('shared', 'locked', 'task') then raise exception '誰可以看的設定不對'; end if;
    if v_vis = 'task' then
      if char_length(trim(coalesce(p_rec -> 'task' ->> 'text', ''))) not between 1 and 100 then raise exception '解鎖任務要 1 到 100 個字'; end if;
      v_in := v_in || jsonb_build_object('task', jsonb_build_object('text', trim(p_rec -> 'task' ->> 'text'),
        'mode', case when p_rec -> 'task' ->> 'mode' = 'photo' then 'photo' else 'confirm' end));
    end if;
    -- 重新上鎖：只能從解鎖改回上鎖，不能自己解鎖
    v_relock := r.id is not null and r.unlocked and (p_rec -> 'unlocked') = 'false'::jsonb;
  end if;
  -- 照片：只收自己寫的紀錄的照片清單（照片檔放在自己的資料夾）
  if p_rec ? 'photoIds' and (r.id is null or r.author = auth.uid()) then
    if jsonb_typeof(p_rec -> 'photoIds') <> 'array' or jsonb_array_length(p_rec -> 'photoIds') > 9
       or exists (select 1 from jsonb_array_elements(p_rec -> 'photoIds') e where jsonb_typeof(e) <> 'string' or e #>> '{}' !~ '^[A-Za-z0-9_-]{1,40}$') then
      raise exception '照片資料不對，每則最多 9 張';
    end if;
    v_in := v_in || jsonb_build_object('photoIds', p_rec -> 'photoIds');
  end if;
  -- 烏雲放晴：時間由資料庫記
  if v_type = 'cloud' and p_rec ? 'clearedAt' then
    v_in := v_in || jsonb_build_object('clearedAt', case when jsonb_typeof(p_rec -> 'clearedAt') = 'number' then to_jsonb(coalesce((r.data ->> 'clearedAt')::bigint, v_now)) else 'null'::jsonb end);
  end if;

  if r.id is not null then
    if r.owner <> p.owner or (r.data ->> 'deletedAt') is not null or r.archived then raise exception '找不到這則紀錄'; end if;
    if v_type = 'fight' and r.visibility <> 'shared' then raise exception '找不到這個議題，或它沒有分享給你'; end if;
    if v_type = 'fight' and r.author is distinct from auth.uid() and public.space_paused(p.owner) then raise exception '對方暫停分享中，等對方打開再更新'; end if;
    if v_type <> 'fight' and r.author is distinct from auth.uid() then raise exception '只能修改你自己寫的紀錄'; end if;
    v_data := r.data || v_in || jsonb_build_object('visibility', v_vis, 'updatedAt', v_now, 'editedAt', v_now, 'editedBy', auth.uid());
    if v_relock then v_data := v_data || jsonb_build_object('unlocked', false); end if;
    if v_data -> 'clearedAt' = 'null'::jsonb then v_data := v_data - 'clearedAt'; end if;
    update public.records set data = v_data, visibility = v_vis, updated_at = now(),
      unlocked = case when v_relock then false else unlocked end where id = v_id;
  else
    if (select count(*) from public.records where owner = p.owner and author = auth.uid()) >= 3000 then
      raise exception '紀錄太多了';
    end if;
    v_data := jsonb_build_object('emojis', '[]'::jsonb, 'tags', '[]'::jsonb, 'description', '', 'photoIds', '[]'::jsonb, 'task', jsonb_build_object('text', '', 'mode', 'confirm'))
      || case when v_type = 'fight' then jsonb_build_object('status', 'open', 'followUps', '[]'::jsonb, 'category', '', 'reason', '', 'myView', '', 'theirView', '', 'resolution', '')
              when v_type = 'cloud' then jsonb_build_object('reflections', '[]'::jsonb) else '{}'::jsonb end
      || v_in
      || jsonb_build_object('id', v_id, 'type', v_type, 'no', public.take_next_no(p.owner, v_type), 'visibility', v_vis, 'unlocked', false,
                            'author', auth.uid(), 'authorName', p.name, 'v', 1,
                            'createdAt', v_now, 'updatedAt', v_now);
    if v_data -> 'clearedAt' = 'null'::jsonb then v_data := v_data - 'clearedAt'; end if;
    if not v_data ? 'date' then v_data := v_data || jsonb_build_object('date', to_char(now(), 'YYYY-MM-DD')); end if;
    insert into public.records (id, owner, author, type, visibility, data) values (v_id, p.owner, auth.uid(), v_type, v_vis, v_data);
  end if;
  return v_data;
end $$;

-- 另一半刪掉自己寫的紀錄：美好、烏雲直接刪掉；吵架議題移到主人的「最近刪除」
create or replace function public.partner_delete_record(p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
  r public.records;
begin
  if not public.is_real_user() then raise exception '要先綁定帳號'; end if;
  select * into r from public.records
  where id = p_id and owner = public.my_owner() and author = auth.uid() and (data ->> 'deletedAt') is null and not archived for update;
  if not found then raise exception '只能刪除你自己寫的紀錄'; end if;
  if r.type = 'fight' then
    update public.records set data = data || jsonb_build_object('deletedAt', v_now, 'updatedAt', v_now), updated_at = now() where id = p_id;
  else
    delete from public.records where id = p_id;
  end if;
end $$;
revoke all on function public.take_next_no(uuid, text) from public, anon, authenticated;
revoke all on function public.others_locked() from public, anon;
revoke all on function public.next_no(text) from public, anon;
revoke all on function public.renumber_all() from public, anon;
revoke all on function public.partner_save_record(jsonb) from public, anon;
revoke all on function public.partner_delete_record(text) from public, anon;
grant execute on function public.others_locked() to authenticated;
grant execute on function public.next_no(text) to authenticated;
grant execute on function public.renumber_all() to authenticated;
grant execute on function public.partner_save_record(jsonb) to authenticated;
grant execute on function public.partner_delete_record(text) to authenticated;

-- ---------- 雙人版第三段：互相按愛心 ----------
-- partner_notes 的 partner 欄位改成「寫這則回應的人」，可能是另一半，也可能是主人（對另一半寫的紀錄按愛心）
-- 自己寫的紀錄上的回應，自己看得到
drop policy if exists "notes: author read" on public.partner_notes;
create policy "notes: author read" on public.partner_notes
  for select to authenticated
  using (exists (select 1 from public.records r where r.id = record_id and r.author = auth.uid()));

-- 我在這個空間裡看得到、但不是我寫的紀錄（按愛心、寫補充用）
create or replace function public.member_can_see(p_record_id text) returns public.records
language sql stable security definer set search_path = public as $$
  select r.* from public.records r
  where r.id = p_record_id
    and r.owner = coalesce(public.my_owner(), case when public.is_real_user() then auth.uid() end)
    and r.author is distinct from auth.uid()
    and (r.data ->> 'deletedAt') is null
    and (r.visibility = 'shared' or (r.visibility = 'task' and r.unlocked))
$$;
-- 我在這個空間裡的名字
create or replace function public.member_name() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select name from public.partners where uid = auth.uid() and approved),
    (select nullif(owner_name, '') from public.shares where owner = auth.uid()),
    '對方')
$$;

-- 按愛心／收回愛心（只有美好時刻，而且是對方寫的），回傳按完之後是不是有愛心
create or replace function public.toggle_heart(p_record_id text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  r public.records;
begin
  r := public.member_can_see(p_record_id);
  if r.id is null or r.type <> 'happy' then raise exception '只能對看得到、對方寫的美好時刻按愛心'; end if;
  if exists (select 1 from public.partner_notes where record_id = r.id and partner = auth.uid() and kind = 'heart') then
    delete from public.partner_notes where record_id = r.id and partner = auth.uid() and kind = 'heart';
    return false;
  end if;
  insert into public.partner_notes (owner, record_id, partner, partner_name, kind) values (r.owner, r.id, auth.uid(), public.member_name(), 'heart');
  return true;
end $$;

-- 在對方寫的吵架議題寫「我的補充」（每則最多 1000 字，一個議題最多 50 則）
create or replace function public.add_partner_note(p_record_id text, p_text text) returns void
language plpgsql security definer set search_path = public as $$
declare
  r public.records;
  v_text text := trim(coalesce(p_text, ''));
begin
  r := public.member_can_see(p_record_id);
  if r.id is null or r.type <> 'fight' then raise exception '只能在看得到的吵架議題寫補充'; end if;
  if v_text = '' or char_length(v_text) > 1000 then raise exception '補充要 1 到 1000 個字'; end if;
  if (select count(*) from public.partner_notes where record_id = r.id and partner = auth.uid() and kind = 'note') >= 50 then
    raise exception '一個議題最多寫 50 則補充';
  end if;
  insert into public.partner_notes (owner, record_id, partner, partner_name, kind, text) values (r.owner, r.id, auth.uid(), public.member_name(), 'note', v_text);
end $$;
revoke all on function public.member_can_see(text) from public, anon, authenticated;
revoke all on function public.member_name() from public, anon, authenticated;

-- 意見回饋：訪客、主人、另一半都能送出；只有你在 Supabase 後台看得到（沒有讀取權限）
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid(),
  kind text not null default '其他' check (char_length(kind) <= 12),
  message text not null check (char_length(message) between 1 and 1000),
  contact text not null default '' check (char_length(contact) <= 100),
  page text not null default '' check (char_length(page) <= 60),
  mode text not null default '' check (char_length(mode) <= 12),
  agent text not null default '' check (char_length(agent) <= 200)
);
alter table public.feedback enable row level security;
drop policy if exists "feedback: anyone insert" on public.feedback;
create policy "feedback: anyone insert" on public.feedback for insert to anon, authenticated
  with check (user_id is not distinct from auth.uid());
grant insert on public.feedback to anon, authenticated;
-- 防洗版：同一個帳號一天 10 則，全部加起來一天 500 則
create or replace function public.feedback_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.feedback where created_at > now() - interval '1 day') >= 500 then
    raise exception '今天的回饋太多了，請明天再試';
  end if;
  if new.user_id is not null and (select count(*) from public.feedback where user_id = new.user_id and created_at > now() - interval '1 day') >= 10 then
    raise exception '今天已經送出很多則了，謝謝你！請明天再寫';
  end if;
  return new;
end $$;
drop trigger if exists feedback_limit on public.feedback;
create trigger feedback_limit before insert on public.feedback for each row execute function public.feedback_limit();

-- 3. 照片：放在不公開的 photos 儲存空間，路徑是「使用者 id/照片 id.jpg」
-- ============================================================
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;
-- 只收 JPEG（App 會先壓縮），每張最多 5 MB
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'] where id = 'photos';

-- 自己的照片：正式帳號可以讀寫自己資料夾
drop policy if exists "photos: owner read" on storage.objects;
create policy "photos: owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 雲端照片額度：免費帳號最多 30 張（小圖和任務照片不算）。
-- 要讓某個人不受限制：到 Table Editor 的 plans 表新增一列，owner 填他的使用者 id，plan 填 plus。
create table if not exists public.plans (
  owner       uuid primary key references auth.users (id) on delete cascade,
  plan        text not null default 'free' check (plan in ('free', 'plus')),
  note        text not null default '',
  updated_at  timestamptz not null default now()
);
alter table public.plans enable row level security;
drop policy if exists "plans: owner read" on public.plans;
create policy "plans: owner read" on public.plans
  for select to authenticated using (owner = auth.uid());

-- 誰按過「我有興趣」（付費功能還沒推出，先看有多少人想要）
create table if not exists public.upgrade_interest (
  owner       uuid primary key references auth.users (id) on delete cascade,
  times       int not null default 1,
  first_at    timestamptz not null default now(),
  last_at     timestamptz not null default now()
);
alter table public.upgrade_interest enable row level security;

create or replace function public.photo_quota() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'plan', coalesce((select plan from public.plans where owner = auth.uid()), 'free'),
    'limit', case when coalesce((select plan from public.plans where owner = auth.uid()), 'free') = 'plus' then null else 30 end,
    'used', (select count(*) from storage.objects o
             where o.bucket_id = 'photos' and (storage.foldername(o.name))[1] = auth.uid()::text
               and coalesce((storage.foldername(o.name))[2], '') <> 't')
  )
$$;
-- 小圖只能放「已經有原圖」的，免得有人拿小圖資料夾繞過額度
create or replace function public.thumb_ok(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from storage.objects o
    where o.bucket_id = 'photos' and o.name = (storage.foldername(p_name))[1] || '/' || storage.filename(p_name))
$$;
create or replace function public.photo_quota_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select (q ->> 'limit') is null or (q ->> 'used')::int < (q ->> 'limit')::int from (select public.photo_quota() as q) x
$$;
create or replace function public.note_upgrade_interest() returns void
language sql security definer set search_path = public as $$
  insert into public.upgrade_interest (owner) values (auth.uid())
  on conflict (owner) do update set times = public.upgrade_interest.times + 1, last_at = now()
$$;
revoke all on function public.photo_quota() from public, anon;
revoke all on function public.photo_quota_ok() from public, anon;
revoke all on function public.note_upgrade_interest() from public, anon;
revoke all on function public.thumb_ok(text) from public, anon;
grant execute on function public.thumb_ok(text) to authenticated;
grant execute on function public.photo_quota() to authenticated;
grant execute on function public.photo_quota_ok() to authenticated;
grant execute on function public.note_upgrade_interest() to authenticated;

drop policy if exists "photos: owner insert" on storage.objects;
create policy "photos: owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text
    and (
      (public.is_real_user() and (
        (coalesce((storage.foldername(name))[2], '') = 't' and public.thumb_ok(name))
        or (coalesce((storage.foldername(name))[2], '') = '' and public.photo_quota_ok())
      ))
      or (public.my_owner() is not null and storage.filename(name) like 'task-%')
    )
  );

drop policy if exists "photos: owner update" on storage.objects;
create policy "photos: owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text and public.is_real_user());

drop policy if exists "photos: owner delete" on storage.objects;
create policy "photos: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text and public.is_real_user());

-- 對方可以看：你「給對方看」或已解鎖紀錄裡的照片
drop policy if exists "photos: partner read" on storage.objects;
create policy "photos: partner read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.my_owner()::text
    and exists (
      select 1 from public.records r
      where r.owner = public.my_owner()
        and (r.visibility = 'shared' or (r.visibility = 'task' and r.unlocked))
        and (r.data ->> 'deletedAt') is null
        and r.data -> 'photoIds' ? split_part(storage.filename(name), '.', 1)
    )
  );

-- 你可以看、刪對方上傳的任務照片
drop policy if exists "photos: owner reads partner tasks" on storage.objects;
create policy "photos: owner reads partner tasks" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos' and public.is_real_user()
    and exists (
      select 1 from public.task_submissions t
      where t.owner = auth.uid() and t.photo_path = name
        and (storage.foldername(name))[1] = t.partner::text
    )
  );
drop policy if exists "photos: owner deletes partner tasks" on storage.objects;
create policy "photos: owner deletes partner tasks" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos' and public.is_real_user()
    and exists (
      select 1 from public.task_submissions t
      where t.owner = auth.uid() and t.photo_path = name
        and (storage.foldername(name))[1] = t.partner::text
    )
  );

-- ============================================================
-- 暫停分享：主人在設定頁打開後，另一半暫時看不到主人寫的任何紀錄、照片、任務和一起完成的事；
-- 另一半自己寫的照舊看得到。關掉就恢復，資料不會動。
-- ============================================================
create or replace function public.space_paused(p_owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select value = 'true'::jsonb from public.settings where owner = p_owner and key = 'sharePaused'), false)
$$;
revoke all on function public.space_paused(uuid) from public, anon;
grant execute on function public.space_paused(uuid) to authenticated;

drop policy if exists "records: partner read" on public.records;
create policy "records: partner read" on public.records
  for select to authenticated
  using (
    owner = public.my_owner()
    and (author = auth.uid()
         or (not public.space_paused(owner)
             and (data ->> 'deletedAt') is null and (visibility = 'shared' or (visibility = 'task' and unlocked))))
  );

drop policy if exists "wishes: partner read" on public.wishes;
create policy "wishes: partner read" on public.wishes
  for select to authenticated using (owner = public.my_owner() and not public.space_paused(owner));

drop policy if exists "photos: partner read" on storage.objects;
create policy "photos: partner read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.my_owner()::text
    and not public.space_paused(public.my_owner())
    and exists (
      select 1 from public.records r
      where r.owner = public.my_owner()
        and (r.visibility = 'shared' or (r.visibility = 'task' and r.unlocked))
        and (r.data ->> 'deletedAt') is null
        and r.data -> 'photoIds' ? split_part(storage.filename(name), '.', 1)
    )
  );

create or replace function public.partner_tasks() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'type', r.type,
    'task', jsonb_build_object('text', r.data -> 'task' ->> 'text', 'mode', r.data -> 'task' ->> 'mode'),
    'submission', (
      select jsonb_build_object('status', t.status, 'created_at', t.created_at)
      from public.task_submissions t
      where t.record_id = r.id and t.partner = auth.uid()
      order by t.created_at desc limit 1
    )
  ) order by r.created_at desc), '[]'::jsonb)
  from public.records r
  where r.owner = public.my_owner() and not public.space_paused(r.owner)
    and r.visibility = 'task' and not r.unlocked and (r.data ->> 'deletedAt') is null
$$;

create or replace function public.member_can_see(p_record_id text) returns public.records
language sql stable security definer set search_path = public as $$
  select r.* from public.records r
  where r.id = p_record_id
    and r.owner = coalesce(public.my_owner(), case when public.is_real_user() then auth.uid() end)
    and r.author is distinct from auth.uid()
    and (r.data ->> 'deletedAt') is null
    and (r.visibility = 'shared' or (r.visibility = 'task' and r.unlocked))
    and (public.my_owner() is null or not public.space_paused(r.owner))
$$;
revoke all on function public.member_can_see(text) from public, anon, authenticated;

-- 另一半的首頁會顯示「暫停分享中」
create or replace function public.partner_info() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('owner', p.owner, 'name', p.name, 'owner_name', s.owner_name, 'approved', p.approved,
    'mascot', (select value from public.settings where owner = p.owner and key = 'mascot'),
    'paused', public.space_paused(p.owner))
  from public.partners p join public.shares s on s.owner = p.owner
  where p.uid = auth.uid()
$$;

create or replace function public.others_locked() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'type', r.type, 'no', r.data -> 'no') order by r.created_at desc), '[]'::jsonb)
  from public.records r
  where r.owner = coalesce(public.my_owner(), case when public.is_real_user() then auth.uid() end)
    and r.author is distinct from auth.uid()
    and r.visibility = 'locked' and (r.data ->> 'deletedAt') is null
    and (public.my_owner() is null or not public.space_paused(r.owner))
$$;

-- ============================================================
-- 雙人版第三段：互相出任務。誰寫的紀錄誰審核；退回時可以寫一句原因。
-- ============================================================
alter table public.task_submissions add column if not exists review_note text not null default '';
alter table public.task_submissions drop constraint if exists task_submissions_review_note_len;
alter table public.task_submissions add constraint task_submissions_review_note_len check (char_length(review_note) <= 200);

-- 寫紀錄的人看得到別人對這則送出的任務（主人本來就看得到自己空間的全部）
drop policy if exists "tasks: author read" on public.task_submissions;
create policy "tasks: author read" on public.task_submissions
  for select to authenticated
  using (public.is_real_user() and exists (select 1 from public.records r where r.id = record_id and r.author = auth.uid()));
-- 審核一律透過 review_task，不能直接改
drop policy if exists "tasks: owner review" on public.task_submissions;
revoke update on public.task_submissions from authenticated, anon;

-- 我可以做的任務：對方寫的、出了任務、還沒解鎖的紀錄（只給任務內容，不給紀錄本身）
create or replace function public.member_tasks() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'type', r.type,
    'task', jsonb_build_object('text', r.data -> 'task' ->> 'text', 'mode', r.data -> 'task' ->> 'mode'),
    'submission', (
      select jsonb_build_object('status', t.status, 'created_at', t.created_at, 'review_note', t.review_note)
      from public.task_submissions t
      where t.record_id = r.id and t.partner = auth.uid()
      order by t.created_at desc limit 1
    )
  ) order by r.created_at desc), '[]'::jsonb)
  from public.records r
  where r.owner = coalesce(public.my_owner(), case when public.is_real_user() then auth.uid() end)
    and r.author is distinct from auth.uid()
    and (public.my_owner() is null or not public.space_paused(r.owner))
    and r.visibility = 'task' and not r.unlocked and (r.data ->> 'deletedAt') is null
$$;
create or replace function public.partner_tasks() returns jsonb
language sql stable security definer set search_path = public as $$ select public.member_tasks() $$;

-- 送出任務（兩個人都可以；照片要先上傳到自己的資料夾）
create or replace function public.submit_task(p_record_id text, p_note text, p_photo_path text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_space uuid := coalesce(public.my_owner(), case when public.is_real_user() then auth.uid() end);
  r public.records;
begin
  if v_space is null then raise exception '你還沒有用分享碼加入，或還在等對方同意'; end if;
  select * into r from public.records
  where id = p_record_id and owner = v_space and author is distinct from auth.uid() and not archived
    and visibility = 'task' and not unlocked and (data ->> 'deletedAt') is null;
  if not found then raise exception '找不到這個任務，可能已經解鎖了'; end if;
  if public.my_owner() is not null and public.space_paused(v_space) then raise exception '對方暫停分享中，等對方打開再送出'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception '留言最多 500 個字'; end if;
  if p_photo_path is not null and p_photo_path !~ ('^' || auth.uid()::text || '/task-[A-Za-z0-9_-]+\.jpg$') then
    raise exception '照片位置不對';
  end if;
  if r.data -> 'task' ->> 'mode' = 'photo' and p_photo_path is null then raise exception '這個任務要上傳照片'; end if;
  if exists (select 1 from public.task_submissions where record_id = r.id and partner = auth.uid() and status = 'pending') then
    raise exception '已經送出了，等對方確認';
  end if;
  if (select count(*) from public.task_submissions
      where record_id = r.id and partner = auth.uid() and created_at > now() - interval '1 day') >= 5 then
    raise exception '這個任務今天已經送出 5 次了，明天再試';
  end if;
  insert into public.task_submissions (owner, record_id, partner, partner_name, note, photo_path)
  values (v_space, r.id, auth.uid(), public.member_name(), coalesce(p_note, ''), p_photo_path);
end $$;

-- 審核：只有寫那則紀錄的人能審；通過時同時解鎖紀錄
create or replace function public.review_task(p_id uuid, p_approve boolean, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare
  t public.task_submissions;
begin
  if not public.is_real_user() then raise exception '請先登入'; end if;
  if char_length(coalesce(p_note, '')) > 200 then raise exception '原因最多 200 個字'; end if;
  select t0.* into t from public.task_submissions t0 join public.records r on r.id = t0.record_id
  where t0.id = p_id and t0.status = 'pending' and r.author = auth.uid()
  for update of t0;
  if not found then raise exception '找不到這個任務，可能已經審核過了'; end if;
  update public.task_submissions
    set status = case when p_approve then 'approved' else 'rejected' end, reviewed_at = now(),
        review_note = case when p_approve then '' else trim(coalesce(p_note, '')) end
    where id = t.id;
  if p_approve then
    update public.records
      set unlocked = true, updated_at = now(),
          data = data || jsonb_build_object('unlocked', true,
            'unlockedAt', (extract(epoch from now()) * 1000)::bigint,
            'updatedAt', (extract(epoch from now()) * 1000)::bigint)
      where id = t.record_id and author = auth.uid() and visibility = 'task';
  end if;
end $$;
create or replace function public.review_task(p_id uuid, p_approve boolean) returns void
language sql security definer set search_path = public as $$ select public.review_task(p_id, p_approve, null) $$;
revoke all on function public.member_tasks() from public, anon;
revoke all on function public.review_task(uuid, boolean, text) from public, anon;
revoke all on function public.review_task(uuid, boolean) from public, anon;
grant execute on function public.member_tasks() to authenticated;
grant execute on function public.review_task(uuid, boolean, text) to authenticated;
grant execute on function public.review_task(uuid, boolean) to authenticated;

-- 任務照片：兩個人都能放進自己資料夾，不算照片額度
drop policy if exists "photos: owner insert" on storage.objects;
create policy "photos: owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text
    and (
      (public.is_real_user() and storage.filename(name) not like 'task-%' and (
        (coalesce((storage.foldername(name))[2], '') = 't' and public.thumb_ok(name))
        or (coalesce((storage.foldername(name))[2], '') = '' and public.photo_quota_ok())
      ))
      or ((public.my_owner() is not null or public.is_real_user())
          and coalesce((storage.foldername(name))[2], '') = '' and storage.filename(name) like 'task-%')
    )
  );
create or replace function public.photo_quota() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'plan', coalesce((select plan from public.plans where owner = auth.uid()), 'free'),
    'limit', case when coalesce((select plan from public.plans where owner = auth.uid()), 'free') = 'plus' then null else 30 end,
    'used', (select count(*) from storage.objects o
             where o.bucket_id = 'photos' and (storage.foldername(o.name))[1] = auth.uid()::text
               and coalesce((storage.foldername(o.name))[2], '') <> 't'
               and storage.filename(o.name) not like 'task-%')
  )
$$;

-- 寫紀錄的人看得到、刪得掉對方為這則送出的任務照片
drop policy if exists "photos: owner reads partner tasks" on storage.objects;
drop policy if exists "photos: author reads task photos" on storage.objects;
create policy "photos: author reads task photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos' and public.is_real_user()
    and exists (
      select 1 from public.task_submissions t join public.records r on r.id = t.record_id
      where r.author = auth.uid() and t.photo_path = name
        and (storage.foldername(name))[1] = t.partner::text
    )
  );
drop policy if exists "photos: owner deletes partner tasks" on storage.objects;
drop policy if exists "photos: author deletes task photos" on storage.objects;
create policy "photos: author deletes task photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos' and public.is_real_user()
    and exists (
      select 1 from public.task_submissions t join public.records r on r.id = t.record_id
      where r.author = auth.uid() and t.photo_path = name
        and (storage.foldername(name))[1] = t.partner::text
    )
  );

-- ============================================================
-- 雙人版第三段：另一半的照片。照片放在「寫的人」自己的資料夾，
-- 對方只看得到分享或已解鎖紀錄裡的照片；照片額度兩個人共用。
-- ============================================================
create or replace function public.photo_quota() returns jsonb
language sql stable security definer set search_path = public as $$
  with sp as (select coalesce(public.my_owner(), auth.uid()) as owner)
  select jsonb_build_object(
    'plan', coalesce((select plan from public.plans, sp where plans.owner = sp.owner), 'free'),
    'limit', case when coalesce((select plan from public.plans, sp where plans.owner = sp.owner), 'free') = 'plus' then null else 30 end,
    'used', (select count(*) from storage.objects o, sp
             where o.bucket_id = 'photos'
               and (storage.foldername(o.name))[1] in (
                 select sp.owner::text union all select uid::text from public.partners where owner = sp.owner and approved)
               and coalesce((storage.foldername(o.name))[2], '') <> 't'
               and storage.filename(o.name) not like 'task-%'),
    -- 自己放的張數（設定頁顯示「你幾張、對方幾張」）
    'mine', (select count(*) from storage.objects o
             where o.bucket_id = 'photos' and (storage.foldername(o.name))[1] = auth.uid()::text
               and coalesce((storage.foldername(o.name))[2], '') <> 't'
               and storage.filename(o.name) not like 'task-%')
  )
  from sp
$$;

-- 另一半看主人的照片：只限主人自己寫、分享或已解鎖的紀錄（不能拿自己的紀錄去指主人的照片）
drop policy if exists "photos: partner read" on storage.objects;
create policy "photos: partner read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.my_owner()::text
    and not public.space_paused(public.my_owner())
    and exists (
      select 1 from public.records r
      where r.owner = public.my_owner() and r.author = r.owner
        and (r.visibility = 'shared' or (r.visibility = 'task' and r.unlocked))
        and (r.data ->> 'deletedAt') is null
        and r.data -> 'photoIds' ? split_part(storage.filename(name), '.', 1)
    )
  );

-- 主人看另一半的照片：只限另一半自己寫、分享或已解鎖的紀錄
drop policy if exists "photos: owner reads partner photos" on storage.objects;
create policy "photos: owner reads partner photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos' and public.is_real_user()
    and storage.filename(name) not like 'task-%'
    and exists (
      select 1 from public.records r
      where r.owner = auth.uid() and r.author::text = (storage.foldername(name))[1] and r.author <> auth.uid()
        and (r.visibility = 'shared' or (r.visibility = 'task' and r.unlocked))
        and (r.data ->> 'deletedAt') is null
        and r.data -> 'photoIds' ? split_part(storage.filename(name), '.', 1)
    )
  );

-- ============================================================
-- 結束這段關係：封存（紀錄收起來，只有你看得到）或刪除；兩種都會移除另一半、停止分享
-- ============================================================
drop policy if exists "records: partner read" on public.records;
create policy "records: partner read" on public.records
  for select to authenticated
  using (
    owner = public.my_owner() and not archived
    and (author = auth.uid()
         or (not public.space_paused(owner)
             and (data ->> 'deletedAt') is null and (visibility = 'shared' or (visibility = 'task' and unlocked))))
  );
drop policy if exists "wishes: partner read" on public.wishes;
create policy "wishes: partner read" on public.wishes
  for select to authenticated using (owner = public.my_owner() and not archived and not public.space_paused(owner));

create or replace function public.member_tasks() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'type', r.type,
    'task', jsonb_build_object('text', r.data -> 'task' ->> 'text', 'mode', r.data -> 'task' ->> 'mode'),
    'submission', (
      select jsonb_build_object('status', t.status, 'created_at', t.created_at, 'review_note', t.review_note)
      from public.task_submissions t
      where t.record_id = r.id and t.partner = auth.uid()
      order by t.created_at desc limit 1
    )
  ) order by r.created_at desc), '[]'::jsonb)
  from public.records r
  where r.owner = coalesce(public.my_owner(), case when public.is_real_user() then auth.uid() end)
    and r.author is distinct from auth.uid() and not r.archived
    and (public.my_owner() is null or not public.space_paused(r.owner))
    and r.visibility = 'task' and not r.unlocked and (r.data ->> 'deletedAt') is null
$$;
create or replace function public.others_locked() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'type', r.type, 'no', r.data -> 'no') order by r.created_at desc), '[]'::jsonb)
  from public.records r
  where r.owner = coalesce(public.my_owner(), case when public.is_real_user() then auth.uid() end)
    and r.author is distinct from auth.uid() and not r.archived
    and r.visibility = 'locked' and (r.data ->> 'deletedAt') is null
    and (public.my_owner() is null or not public.space_paused(r.owner))
$$;
create or replace function public.member_can_see(p_record_id text) returns public.records
language sql stable security definer set search_path = public as $$
  select r.* from public.records r
  where r.id = p_record_id and not r.archived
    and r.owner = coalesce(public.my_owner(), case when public.is_real_user() then auth.uid() end)
    and r.author is distinct from auth.uid()
    and (r.data ->> 'deletedAt') is null
    and (r.visibility = 'shared' or (r.visibility = 'task' and r.unlocked))
    and (public.my_owner() is null or not public.space_paused(r.owner))
$$;
revoke all on function public.member_can_see(text) from public, anon, authenticated;

drop policy if exists "photos: partner read" on storage.objects;
create policy "photos: partner read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.my_owner()::text
    and not public.space_paused(public.my_owner())
    and exists (
      select 1 from public.records r
      where r.owner = public.my_owner() and r.author = r.owner and not r.archived
        and (r.visibility = 'shared' or (r.visibility = 'task' and r.unlocked))
        and (r.data ->> 'deletedAt') is null
        and r.data -> 'photoIds' ? split_part(storage.filename(name), '.', 1)
    )
  );

-- p_mode：'archive' 封存、'delete' 刪除（只動目前這段關係的，之前封存的不動）
-- 刪除時照片請 App 先刪（App 會先刪你資料夾裡這些紀錄的照片）
-- p_keep：結束後要讓哪個「還在等同意」的新對象加入（分享碼保留給他）；null 就全部移除、分享碼作廢
create or replace function public.end_relationship(p_mode text, p_keep uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  if not public.is_real_user() or public.my_owner() is not null then raise exception '只有建立分享的人可以結束這段關係'; end if;
  if p_mode not in ('archive', 'delete') then raise exception '請選擇封存或刪除'; end if;
  if p_mode = 'archive' then
    update public.records set archived = true, updated_at = now(),
      data = data || jsonb_build_object('archivedAt', v_now, 'updatedAt', v_now)
      where owner = auth.uid() and not archived;
    update public.wishes set archived = true where owner = auth.uid() and not archived;
  else
    delete from public.records where owner = auth.uid() and not archived;
    delete from public.wishes where owner = auth.uid() and not archived;
  end if;
  if p_keep is not null and not exists (select 1 from public.partners where owner = auth.uid() and uid = p_keep and not approved) then
    raise exception '找不到這個加入要求，可能對方已經離開了';
  end if;
  delete from public.partners where owner = auth.uid() and (p_keep is null or uid <> p_keep);
  if p_keep is null then delete from public.shares where owner = auth.uid(); end if;
  delete from public.settings where owner = auth.uid() and key in ('lastNo', 'sharePaused', 'partnerLeft');
  update public.settings set value = value || '{"partner": "", "since": ""}'::jsonb
    where owner = auth.uid() and key = 'names' and jsonb_typeof(value) = 'object';
end $$;
-- 把封存的紀錄全部還原回目前這段（例如按錯「是新的對象」封存了）。還原後重新編號
create or replace function public.restore_archive() returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
  v_count integer;
begin
  if not public.is_real_user() or public.my_owner() is not null then raise exception '只有建立分享的人可以還原封存'; end if;
  update public.records set archived = false, updated_at = now(),
    data = (data - 'archivedAt') || jsonb_build_object('updatedAt', v_now)
    where owner = auth.uid() and archived;
  get diagnostics v_count = row_count;
  update public.wishes set archived = false where owner = auth.uid() and archived;
  perform public.renumber_all();
  return v_count;
end $$;
revoke all on function public.restore_archive() from public, anon;
grant execute on function public.restore_archive() to authenticated;
create or replace function public.end_relationship(p_mode text) returns void
language sql security definer set search_path = public as $$ select public.end_relationship(p_mode, null::uuid) $$;
revoke all on function public.end_relationship(text) from public, anon;
grant execute on function public.end_relationship(text) to authenticated;
revoke all on function public.end_relationship(text, uuid) from public, anon;
grant execute on function public.end_relationship(text, uuid) to authenticated;

-- 永久刪除封存的紀錄（照片請 App 先刪）
create or replace function public.delete_archive() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_real_user() or public.my_owner() is not null then raise exception '請先登入'; end if;
  delete from public.records where owner = auth.uid() and archived;
  delete from public.wishes where owner = auth.uid() and archived;
end $$;
revoke all on function public.delete_archive() from public, anon;
grant execute on function public.delete_archive() to authenticated;

-- 另一半結束這段關係：自己離開，並留一個通知給主人（主人下次打開 App 會看到，並被帶去封存或刪除）
create or replace function public.partner_end_relationship() returns void
language plpgsql security definer set search_path = public as $$
declare
  p public.partners;
begin
  select * into p from public.partners where uid = auth.uid() and approved;
  if not found then raise exception '你目前沒有加入任何分享'; end if;
  delete from public.partners where uid = auth.uid();
  insert into public.settings (owner, key, value)
  values (p.owner, 'partnerLeft', jsonb_build_object('name', p.name, 'at', (extract(epoch from now()) * 1000)::bigint))
  on conflict (owner, key) do update set value = excluded.value;
end $$;
revoke all on function public.partner_end_relationship() from public, anon;
grant execute on function public.partner_end_relationship() to authenticated;

-- 主人看另一半（包括等同意的人）是不是綁定帳號、是不是以前就寫過紀錄的人（回來的另一半）
create or replace function public.partner_accounts() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'uid', p.uid,
    'bound', not coalesce(u.is_anonymous, false),
    'returning', exists (select 1 from public.records r where r.owner = p.owner and r.author = p.uid and r.author <> p.owner)
  )), '[]'::jsonb)
  from public.partners p left join auth.users u on u.id = p.uid
  where p.owner = auth.uid() and public.is_real_user()
$$;
revoke all on function public.partner_accounts() from public, anon;
grant execute on function public.partner_accounts() to authenticated;

-- 讓 GitHub Actions 每幾天打一次，免費方案才不會因為沒人用被暫停（不讀任何資料）
create or replace function public.ping() returns integer
language sql stable as $$ select 1 $$;
grant execute on function public.ping() to anon, authenticated;

-- ============================================================
-- 通知（2026-09-28）：另一半新增美好、任務等你確認、任務通過時，通知對方
-- App 內的小鈴鐺讀 notifications；Email 由 Edge Function notify-email 定時寄（每人每天晚上 9 點最多一封）
-- 之後做 App 時，推播也從這張表送，不用改其他地方
-- ============================================================
create table if not exists public.notifications (
  id           bigint generated always as identity primary key,
  recipient    uuid not null references auth.users (id) on delete cascade,
  space_owner  uuid not null references auth.users (id) on delete cascade,
  actor        uuid references auth.users (id) on delete set null,
  actor_name   text not null default '',
  kind         text not null check (kind in ('new_happy', 'new_task_record', 'task_submitted', 'task_approved')),
  record_id    text,
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  emailed_at   timestamptz
);
create index if not exists notifications_recipient_idx on public.notifications (recipient, created_at desc);
create index if not exists notifications_email_idx on public.notifications (created_at) where emailed_at is null and read_at is null;
alter table public.notifications enable row level security;
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select to authenticated using (recipient = auth.uid());

-- 每個人收通知的方式（之後的 App 推播也放這裡）
create table if not exists public.notify_prefs (
  uid            uuid primary key references auth.users (id) on delete cascade,
  email_on       boolean not null default true,
  last_email_at  timestamptz,
  updated_at     timestamptz not null default now()
);
alter table public.notify_prefs enable row level security;
drop policy if exists "notify_prefs_select_own" on public.notify_prefs;
create policy "notify_prefs_select_own" on public.notify_prefs for select to authenticated using (uid = auth.uid());

-- 誰的名字：主人用分享時填的名字，另一半用加入時的名字
create or replace function public.space_member_name(p_owner uuid, p_uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    case when p_uid = p_owner then (select nullif(owner_name, '') from public.shares where owner = p_owner)
         else (select name from public.partners where owner = p_owner and uid = p_uid) end,
    '對方')
$$;
revoke all on function public.space_member_name(uuid, uuid) from public, anon, authenticated;

-- 新增美好時刻（給對方看、或要完成任務才能看）時通知對方。上鎖的、烏雲、吵架不通知；搬家或匯入的舊紀錄也不通知
create or replace function public.notify_new_record() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_author uuid := coalesce(new.author, new.owner);
  v_kind text;
  v_created bigint := nullif(new.data ->> 'createdAt', '')::bigint;
begin
  if new.type <> 'happy' or new.visibility = 'locked' or new.archived or (new.data ->> 'deletedAt') is not null then return new; end if;
  if v_created is not null and v_created < (extract(epoch from now() - interval '1 day') * 1000) then return new; end if;
  v_kind := case when new.visibility = 'task' then 'new_task_record' else 'new_happy' end;
  if v_author = new.owner then
    if public.space_paused(new.owner) then return new; end if;
    insert into public.notifications (recipient, space_owner, actor, actor_name, kind, record_id)
      select p.uid, new.owner, v_author, public.space_member_name(new.owner, v_author), v_kind, new.id
      from public.partners p where p.owner = new.owner and p.approved and p.uid <> v_author;
  else
    insert into public.notifications (recipient, space_owner, actor, actor_name, kind, record_id)
      values (new.owner, new.owner, v_author, public.space_member_name(new.owner, v_author), v_kind, new.id);
  end if;
  return new;
end $$;
drop trigger if exists records_notify on public.records;
create trigger records_notify after insert on public.records for each row execute function public.notify_new_record();

-- 任務送出時通知寫這則紀錄的人；任務通過時通知做任務的人
create or replace function public.notify_task() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r public.records;
  v_writer uuid;
begin
  select * into r from public.records where id = new.record_id;
  if not found then return new; end if;
  v_writer := coalesce(r.author, r.owner);
  if tg_op = 'INSERT' and new.status = 'pending' and v_writer <> new.partner then
    insert into public.notifications (recipient, space_owner, actor, actor_name, kind, record_id)
      values (v_writer, r.owner, new.partner, coalesce(nullif(new.partner_name, ''), public.space_member_name(r.owner, new.partner)), 'task_submitted', r.id);
  elsif tg_op = 'UPDATE' and new.status = 'approved' and old.status is distinct from 'approved' and v_writer <> new.partner then
    insert into public.notifications (recipient, space_owner, actor, actor_name, kind, record_id)
      values (new.partner, r.owner, v_writer, public.space_member_name(r.owner, v_writer), 'task_approved', r.id);
  end if;
  return new;
end $$;
drop trigger if exists task_submissions_notify on public.task_submissions;
create trigger task_submissions_notify after insert or update of status on public.task_submissions for each row execute function public.notify_task();

-- App 讀自己的通知（最近 50 則）、標成已讀、Email 開關
create or replace function public.my_notifications() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) from (
    select id, actor_name, kind, record_id, created_at, read_at from public.notifications
    where recipient = auth.uid() order by created_at desc limit 50
  ) x
$$;
create or replace function public.mark_notifications_read() returns void
language sql security definer set search_path = public as $$
  update public.notifications set read_at = now() where recipient = auth.uid() and read_at is null
$$;
create or replace function public.notify_prefs_get() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('email_on', coalesce((select email_on from public.notify_prefs where uid = auth.uid()), true))
$$;
create or replace function public.notify_prefs_set(p_email_on boolean) returns void
language sql security definer set search_path = public as $$
  insert into public.notify_prefs (uid, email_on, updated_at) values (auth.uid(), p_email_on, now())
  on conflict (uid) do update set email_on = excluded.email_on, updated_at = now()
$$;
revoke all on function public.my_notifications() from public, anon;
revoke all on function public.mark_notifications_read() from public, anon;
revoke all on function public.notify_prefs_get() from public, anon;
revoke all on function public.notify_prefs_set(boolean) from public, anon;
grant execute on function public.my_notifications() to authenticated;
grant execute on function public.mark_notifications_read() to authenticated;
grant execute on function public.notify_prefs_get() to authenticated;
grant execute on function public.notify_prefs_set(boolean) to authenticated;

-- ============================================================
-- 數據看板（2026-09-29）：只有管理員看得到，只回統計數字，不回任何內容或 Email
-- 管理員名單 app_admins 不寫在這個檔案裡（避免把信箱放上 GitHub），在 SQL Editor 另外跑一次：
--   insert into public.app_admins (uid) select id from auth.users where email = '你的信箱' on conflict do nothing;
-- ============================================================
create table if not exists public.app_admins (
  uid        uuid primary key references auth.users (id) on delete cascade,
  added_at   timestamptz not null default now()
);
alter table public.app_admins enable row level security; -- 沒有任何規則：App 直接讀不到，只有下面的函式用

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_real_user() and exists (select 1 from public.app_admins where uid = auth.uid())
$$;
revoke all on function public.is_admin() from public, anon, authenticated;

-- 我是不是管理員（設定頁決定要不要顯示「數據」入口）
create or replace function public.am_i_admin() returns boolean
language sql stable security definer set search_path = public as $$ select public.is_admin() $$;
revoke all on function public.am_i_admin() from public, anon;
grant execute on function public.am_i_admin() to authenticated;

-- 看板的全部數字：即時總覽、最近 30 天、最近 12 週留存。時間用台灣時間
create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_today timestamptz := date_trunc('day', now() at time zone 'Asia/Taipei') at time zone 'Asia/Taipei';
  v_now jsonb; v_daily jsonb; v_weekly jsonb;
begin
  if not public.is_admin() then raise exception '沒有權限'; end if;

  with owners as (select id, created_at from auth.users where not coalesce(is_anonymous, false)),
  couples as (select owner from public.partners where approved group by owner),
  acts as (select coalesce(author, owner) as who, owner, created_at, updated_at, data from public.records)
  select jsonb_build_object(
    'owners', (select count(*) from owners),
    'owners_today', (select count(*) from owners where created_at >= v_today),
    'owners_7d', (select count(*) from owners where created_at >= now() - interval '7 days'),
    'couples', (select count(*) from couples),
    'active_couples_7d', (select count(distinct a.owner) from acts a join couples c on c.owner = a.owner where a.updated_at >= now() - interval '7 days'),
    'both_wrote_7d', (select count(*) from (select a.owner from acts a join couples c on c.owner = a.owner
        where a.updated_at >= now() - interval '7 days' group by a.owner
        having bool_or(a.who = a.owner) and bool_or(a.who <> a.owner)) x),
    'writers_today', (select count(distinct who) from acts where updated_at >= v_today),
    'writers_7d', (select count(distinct who) from acts where updated_at >= now() - interval '7 days'),
    'records_today', (select count(*) from acts where created_at >= v_today),
    'edits_today', (select count(*) from acts where updated_at >= v_today and created_at < v_today and (data ->> 'deletedAt') is null),
    'deleted_records_7d', (select count(*) from acts where (data ->> 'deletedAt') is not null
        and to_timestamp((data ->> 'deletedAt')::bigint / 1000.0) >= now() - interval '7 days'),
    'records_total', (select count(*) from acts where (data ->> 'deletedAt') is null),
    'interest', (select count(*) from public.upgrade_interest),
    'last_write_at', (select max(updated_at) from acts)
  ) into v_now;

  with days as (
    select generate_series((now() at time zone 'Asia/Taipei')::date - 29, (now() at time zone 'Asia/Taipei')::date, interval '1 day')::date as d
  ),
  owners as (select (created_at at time zone 'Asia/Taipei')::date as d from auth.users where not coalesce(is_anonymous, false)),
  couples as (select owner, (min(joined_at) at time zone 'Asia/Taipei')::date as d from public.partners where approved group by owner),
  acts as (
    select coalesce(author, owner) as who, owner,
      (created_at at time zone 'Asia/Taipei')::date as cd, (updated_at at time zone 'Asia/Taipei')::date as ud,
      case when (data ->> 'deletedAt') is not null then (to_timestamp((data ->> 'deletedAt')::bigint / 1000.0) at time zone 'Asia/Taipei')::date end as dd
    from public.records
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'd', to_char(x.d, 'YYYY-MM-DD'),
    'signups', (select count(*) from owners o where o.d = x.d),
    'pairs', (select count(*) from couples c where c.d = x.d),
    'records', (select count(*) from acts a where a.cd = x.d),
    'deleted', (select count(*) from acts a where a.dd = x.d),
    'writers', (select count(distinct a.who) from acts a where a.ud = x.d),
    'active_couples', (select count(distinct a.owner) from acts a join couples c on c.owner = a.owner where a.ud = x.d),
    'interest', (select count(*) from public.upgrade_interest i where (i.first_at at time zone 'Asia/Taipei')::date = x.d)
  ) order by x.d), '[]'::jsonb) into v_daily from days x;

  with weeks as (
    select generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') as wk
  ),
  owners as (select id, created_at from auth.users where not coalesce(is_anonymous, false)),
  acts as (select coalesce(author, owner) as who, owner, created_at, updated_at from public.records),
  per_user as (
    select o.id, o.created_at,
      exists (select 1 from acts a where a.who = o.id and a.created_at < o.created_at + interval '24 hours') as activated,
      exists (select 1 from public.partners p where p.owner = o.id and p.approved) as paired,
      case when now() >= o.created_at + interval '14 days' then
        exists (select 1 from acts a where a.who = o.id and a.updated_at >= o.created_at + interval '7 days' and a.updated_at < o.created_at + interval '14 days') end as d7,
      case when now() >= o.created_at + interval '37 days' then
        exists (select 1 from acts a where a.who = o.id and a.updated_at >= o.created_at + interval '30 days' and a.updated_at < o.created_at + interval '37 days') end as d30
    from owners o
  ),
  wk as (
    select w.wk,
      count(u.id) as signups,
      count(u.id) filter (where u.activated) as activated,
      count(u.id) filter (where u.paired) as paired,
      count(u.d7) as d7_n, count(u.id) filter (where u.d7) as d7_yes,
      count(u.d30) as d30_n, count(u.id) filter (where u.d30) as d30_yes,
      (select count(distinct a.who) from acts a where a.updated_at >= w.wk and a.updated_at < w.wk + interval '1 week') as writers
    from weeks w left join per_user u on u.created_at >= w.wk and u.created_at < w.wk + interval '1 week'
    group by w.wk
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'wk', to_char(wk, 'YYYY-MM-DD'), 'signups', signups, 'activated', activated, 'paired', paired,
    'd7_n', d7_n, 'd7_yes', d7_yes, 'd30_n', d30_n, 'd30_yes', d30_yes, 'writers', writers
  ) order by wk desc), '[]'::jsonb) into v_weekly from wk;

  return jsonb_build_object('now', v_now, 'daily', v_daily, 'weekly', v_weekly, 'at', now());
end $$;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
