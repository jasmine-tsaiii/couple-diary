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
  return jsonb_build_object('ok', true, 'pending', true);
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
  select jsonb_build_object('owner', p.owner, 'name', p.name, 'owner_name', s.owner_name, 'approved', p.approved)
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
  where id = p_id and owner = p.owner;
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
  delete from public.wishes where id = p_id and owner = p.owner and created_by = 'partner';
  if not found then raise exception '只能刪除你自己加的'; end if;
end $$;

revoke all on function public.partner_add_wish(text, text, text) from public, anon;
revoke all on function public.partner_set_wish_done(uuid, boolean) from public, anon;
revoke all on function public.partner_delete_wish(uuid) from public, anon;
grant execute on function public.partner_add_wish(text, text, text) to authenticated;
grant execute on function public.partner_set_wish_done(uuid, boolean) to authenticated;
grant execute on function public.partner_delete_wish(uuid) to authenticated;

-- ============================================================
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
