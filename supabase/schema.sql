-- 我們的紀錄：Supabase 資料表與安全規則
-- 用法：在 Supabase 後台左邊選 SQL Editor → New query，把這整個檔案貼上，按 Run。
-- 重複執行也沒關係。

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

-- 設定：吵架分類、上次備份時間等
create table if not exists public.settings (
  owner  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key    text not null,
  value  jsonb,
  primary key (owner, key)
);

-- 安全規則：每個人只能讀寫自己的資料
-- （之後做分享碼唯讀版時，會再加一條「對方只能讀公開或已解鎖的紀錄」）
alter table public.records enable row level security;
alter table public.settings enable row level security;

drop policy if exists "records: owner full access" on public.records;
create policy "records: owner full access" on public.records
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

drop policy if exists "settings: owner full access" on public.settings;
create policy "settings: owner full access" on public.settings
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- 照片：放在不公開的 photos 儲存空間，路徑是「使用者 id/照片 id.jpg」
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "photos: owner read" on storage.objects;
create policy "photos: owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos: owner insert" on storage.objects;
create policy "photos: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos: owner update" on storage.objects;
create policy "photos: owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos: owner delete" on storage.objects;
create policy "photos: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
