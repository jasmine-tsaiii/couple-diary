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
  select owner from public.partners where uid = auth.uid()
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
  -- 一個分享碼只給一個人：已經有別人加入時，要主人先移除舊的
  if exists (select 1 from public.partners where owner = s.owner and uid <> auth.uid()) then
    return jsonb_build_object('ok', false, 'error', '這個分享已經有人加入了。請紀錄的主人先在設定頁移除舊的，再加入一次');
  end if;
  insert into public.partners (uid, owner, name) values (auth.uid(), s.owner, v_name)
  on conflict (uid) do update set owner = excluded.owner, name = excluded.name, joined_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- 對方看自己的身分：名字、對方的名字
create or replace function public.partner_info() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('owner', p.owner, 'name', p.name, 'owner_name', s.owner_name)
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
  select * into p from public.partners where uid = auth.uid();
  if not found then raise exception '你還沒有用分享碼加入'; end if;
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
      set unlocked = true, data = jsonb_set(data, '{unlocked}', 'true'), updated_at = now()
      where id = t.record_id and owner = auth.uid() and visibility = 'task';
  end if;
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

-- ============================================================
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

drop policy if exists "photos: owner insert" on storage.objects;
create policy "photos: owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text
    and (public.is_real_user() or (public.my_owner() is not null and storage.filename(name) like 'task-%'))
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
