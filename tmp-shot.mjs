import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
await page.screenshot({ path: '/root/.openclaw/workspace/stool-scout-current-home.png', fullPage: true });
await browser.close();
