-- 每 10 分鐘叫一次 notify-email，把還沒讀的通知寄成 Email。
-- 只要貼一次到 Supabase SQL Editor 按 Run（要先部署 notify-email 這個 Edge Function）。
-- 這裡不放任何密碼：notify-email 只會寄「本來就該寄」的信，多叫幾次也不會重寄。
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('notify-email') where exists (select 1 from cron.job where jobname = 'notify-email');
select cron.schedule('notify-email', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://bihepkbxeqvufbbnokuw.supabase.co/functions/v1/notify-email',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )
$$);
