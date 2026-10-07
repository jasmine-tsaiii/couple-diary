-- 每天晚上 9 點（台灣時間）叫一次 notify-email，把當天還沒讀的通知合成一封信寄出。一天最多一封。
-- 另外每天早上 9 點（台灣時間）跑 notify_daily()：紀念日、烏雲回顧、好幾天沒寫的提醒。
-- 只要貼一次到 Supabase SQL Editor 按 Run（要先部署 notify-email 這個 Edge Function）。
-- 這裡不放任何密碼：notify-email 只會寄「本來就該寄」的信，多叫幾次也不會重寄。
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('notify-email') where exists (select 1 from cron.job where jobname = 'notify-email');
select cron.schedule('notify-email', '0 13 * * *', $$
  select net.http_post(
    url := 'https://bihepkbxeqvufbbnokuw.supabase.co/functions/v1/notify-email',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )
$$);

select cron.unschedule('notify-daily') where exists (select 1 from cron.job where jobname = 'notify-daily');
select cron.schedule('notify-daily', '0 1 * * *', $$ select public.notify_daily() $$);

-- 手機推播：晚上 11 點到早上 8 點不推，這段時間的通知在早上 8 點（台灣）一起推（send-push 要先部署）
select cron.unschedule('send-push-morning') where exists (select 1 from cron.job where jobname = 'send-push-morning');
select cron.schedule('send-push-morning', '1 0 * * *', $$
  select net.http_post(
    url := 'https://bihepkbxeqvufbbnokuw.supabase.co/functions/v1/send-push',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )
$$);
