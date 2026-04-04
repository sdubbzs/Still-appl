import { chromium, devices } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices['iPhone 13'] });
const page = await context.newPage();
const logs = [];
page.on('console', msg => logs.push(`console:${msg.type()}:${msg.text()}`));
await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
await page.locator('text=One-tap demo packs').waitFor();
const button = page.locator('button', { hasText: 'Founder happy path' }).first();
await button.tap();
await page.waitForTimeout(1500);
const body = await page.locator('body').innerText();
console.log(JSON.stringify({
  url: page.url(),
  hasLoadedWord: body.includes('Loaded'),
  hasDemoStatus: body.includes('Demo status'),
  hasDescribeHeading: body.includes('Describe the stool'),
  hasStep2Label: body.includes('Step 2'),
  hasBristol: body.includes('Bristol stool type'),
  activeLoadedText: body.includes('Demo pack loaded'),
  logs,
}, null, 2));
await browser.close();