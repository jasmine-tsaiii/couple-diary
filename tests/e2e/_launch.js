// 本機（Claude 的環境）有現成的 Chromium；CI 用 npx playwright install 裝的
const fs = require('fs');
const local = '/opt/pw-browsers/chromium';
module.exports = fs.existsSync(local) && !process.env.CI ? { executablePath: local } : {};
