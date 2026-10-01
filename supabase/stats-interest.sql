-- 啾啾日記：各付費功能的「我有興趣」人數（只讀，不會改任何資料）
-- 用法：Supabase 後台 → SQL Editor → 貼上整份 → Run。
-- 一個人對同一個功能按很多次也只算 1 個人（資料表本身就是每人每功能一列）。
-- 功能代號：photos 照片額度、capsule 時光膠囊、theme 主題背景（Plus）、theme_single 單買主題、
--          daily_question 每日一問題庫、task_pack 任務包、mission_pack 臥底任務卡包、recap_premium 年度回顧精美版
-- 「看過入口的人數」在 GA4 的 paywall_view 事件（參數 feature），兩個相除就是興趣比例；超過 10% 的功能，下一步做完整版。

select
  feature as 功能,
  count(*) as 按我有興趣的人數,
  count(*) filter (where first_at >= now() - interval '7 days') as 最近7天新增,
  to_char(min(first_at) at time zone 'Asia/Taipei', 'YYYY-MM-DD') as 第一次,
  to_char(max(first_at) at time zone 'Asia/Taipei', 'YYYY-MM-DD') as 最近一次
from public.upgrade_interest
group by feature
order by count(*) desc;
