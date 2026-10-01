-- 啾啾日記：每週數字（只讀，不會改任何資料）
-- 用法：Supabase 後台 → SQL Editor → 貼上整份 → Run，會出現最近 12 週的表。
-- 只算次數和比例，不看任何紀錄內容。
--
-- 欄位說明：
--   新註冊         這週用 Email 或 Google 註冊的人（不含用分享碼加入的另一半）
--   24小時內開始寫  新註冊的人裡，註冊後 24 小時內至少寫了 1 則
--   有配對          新註冊的人裡，已經有另一半被同意加入
--   第7天還在       新註冊的人裡，註冊後第 7～13 天有新增或修改紀錄（還沒滿 14 天的週會是空的）
--   第30天還在      新註冊的人裡，註冊後第 30～36 天有新增或修改紀錄（還沒滿 37 天的週會是空的）
--   這週有寫的人    這週有新增或修改紀錄的人（主人和另一半都算）
--   兩個人都有寫    這週主人和另一半都有寫的配對數
--   按我有興趣      這週第一次按「我有興趣」的人（任何付費功能都算，一個人只算一次）
-- 想看每個付費功能各有幾個人按「我有興趣」：改跑 supabase/stats-interest.sql（設定 → 數據看板也看得到）。
-- 注意：「有沒有寫」看的是每則紀錄最後修改的時間，舊紀錄後來又被改過的話，只算最後那次。

with weeks as (
  select generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') as wk
),
owners as (
  select id, created_at from auth.users where not coalesce(is_anonymous, false)
),
acts as (
  -- 每則紀錄：誰寫的（沒有 author 的是主人自己寫的）、屬於哪個主人、什麼時候動過
  select coalesce(author, owner) as who, owner, created_at, updated_at from public.records
),
per_user as (
  select o.id, o.created_at,
    exists (select 1 from acts a where a.who = o.id and a.created_at < o.created_at + interval '24 hours') as activated,
    exists (select 1 from public.partners p where p.owner = o.id and p.approved) as paired,
    case when now() >= o.created_at + interval '14 days' then
      exists (select 1 from acts a where a.who = o.id and a.updated_at >= o.created_at + interval '7 days' and a.updated_at < o.created_at + interval '14 days') end as d7,
    case when now() >= o.created_at + interval '37 days' then
      exists (select 1 from acts a where a.who = o.id and a.updated_at >= o.created_at + interval '30 days' and a.updated_at < o.created_at + interval '37 days') end as d30
  from owners o
)
select
  to_char(w.wk, 'YYYY-MM-DD') as 週一,
  count(u.id) as 新註冊,
  count(u.id) filter (where u.activated) as "24小時內開始寫",
  case when count(u.id) > 0 then round(100.0 * count(u.id) filter (where u.activated) / count(u.id)) || '%' end as 啟用率,
  count(u.id) filter (where u.paired) as 有配對,
  case when count(u.d7) > 0 then round(100.0 * count(u.id) filter (where u.d7) / count(u.d7)) || '%' end as 第7天還在,
  case when count(u.d30) > 0 then round(100.0 * count(u.id) filter (where u.d30) / count(u.d30)) || '%' end as 第30天還在,
  (select count(distinct a.who) from acts a where a.updated_at >= w.wk and a.updated_at < w.wk + interval '1 week') as 這週有寫的人,
  (select count(*) from (
     select a.owner from acts a
     where a.updated_at >= w.wk and a.updated_at < w.wk + interval '1 week'
       and exists (select 1 from public.partners p where p.owner = a.owner and p.approved)
     group by a.owner
     having bool_or(a.who = a.owner) and bool_or(a.who <> a.owner)
   ) x) as 兩個人都有寫,
  (select count(*) from (select owner, min(first_at) as f from public.upgrade_interest group by owner) i where i.f >= w.wk and i.f < w.wk + interval '1 week') as 按我有興趣
from weeks w
left join per_user u on u.created_at >= w.wk and u.created_at < w.wk + interval '1 week'
group by w.wk
order by w.wk desc;
