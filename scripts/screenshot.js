import { chromium } from 'playwright';

const args = process.argv.slice(2);
const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const url = get('--url');
const out = get('--out');

if (!url || !out) {
  console.error('Usage: node scripts/screenshot.js --url <url> --out <path>');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.screenshot({ path: out, fullPage: true });
await browser.close();

console.log(`Screenshot saved: ${out}`);
