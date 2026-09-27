# Supabase 寄出的信（中文版）

Supabase 預設寄英文信，寄件人也是 Supabase，使用者容易以為是垃圾信。把這裡的內容貼到 Supabase 後台就會換成中文。

位置：Supabase → Authentication → Emails（Email Templates）。每一種信都有「Subject」和「Message body」兩格。

| 後台的名稱 | Subject（標題） | Message body（內容） |
|---|---|---|
| Confirm signup | 【啾啾日記】確認你的 Email | `confirm-signup.html` 整個貼上 |
| Reset Password | 【啾啾日記】重設密碼 | `reset-password.html` |
| Magic Link | 【啾啾日記】登入連結 | `magic-link.html` |
| Change Email Address | 【啾啾日記】確認新的 Email | `change-email.html` |

注意：
- 內容裡的 `{{ .ConfirmationURL }}` 不要改，Supabase 會換成真正的連結。
- 免費方案用 Supabase 內建的寄信服務，每小時只能寄很少封，寄件人也改不了。使用者變多之後，到 Authentication → SMTP Settings 接自己的寄信服務（例如 Resend、Brevo），寄件人才能設成 `hello@jas-soul.com` 這類自己的網址。
