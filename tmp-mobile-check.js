const { chromium, devices } = require('playwright');

(async() => {
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
    hasLoadedText: body.includes('Loaded Founder happy path') || body.includes('Loaded'),
    hasDescribeHeading: body.includes('Describe the stool'),
    hasStep2Hint: body.includes('Step 2'),
    hasJustScrollTarget: body.includes('Bristol stool type'),
    snippet: body.slice(0, 2500),
    logs,
  }, null, 2));
  await browser.close();
})();