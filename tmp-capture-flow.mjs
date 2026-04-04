import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3000';
const outDir = '/root/.openclaw/workspace/screenshots';

async function ensureDir() {
  const fs = await import('node:fs/promises');
  await fs.mkdir(outDir, { recursive: true });
}

async function save(page, name) {
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 2,
});

await ensureDir();

await page.goto(base, { waitUntil: 'networkidle' });
await save(page, '01-home');

await page.getByRole('button', { name: /Founder happy path/i }).click();
await page.waitForTimeout(1200);
await save(page, '02-demo-pack-loaded');

await page.getByRole('button', { name: /Analyze stool/i }).first().click();
await page.waitForTimeout(1500);
await save(page, '03-result');

const saveButton = page.getByRole('button', { name: /Save this check-in|Save \(/i }).first();
if (await saveButton.isVisible()) {
  await saveButton.click();
  await page.waitForTimeout(1200);
}
await save(page, '04-history-after-save');

const draftButton = page.getByRole('button', { name: /Draft next follow-up|Reuse newest save/i }).first();
if (await draftButton.isVisible()) {
  await draftButton.click();
  await page.waitForTimeout(1200);
}
await save(page, '05-follow-up-draft');

await browser.close();
