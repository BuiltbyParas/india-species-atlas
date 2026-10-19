import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = process.env.OUT ?? `${process.env.HOME}/.cache/ispa-field2/before`;
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
const log = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.push(`[${m.type()}] ${m.text().slice(0, 240)}`); });
page.on('pageerror', (e) => log.push('[pageerror] ' + e.message.slice(0, 240)));
await page.goto(`${BASE}/?hold=1`, { waitUntil: 'domcontentloaded' });
await sleep(11000);
await page.screenshot({ path: `${OUT}/${W}-home-hero.jpg`, type: 'jpeg', quality: 86 });
// The field-studies index (Ch. 02): step through it.
const top = await page.evaluate(() => { const el = document.querySelector('#field-studies'); return el ? el.getBoundingClientRect().top + scrollY : -1; });
const hgt = await page.evaluate(() => document.querySelector('#field-studies')?.offsetHeight ?? 0);
console.log('index top', top, 'height', hgt);
const steps = +(process.env.STEPS ?? 8);
for (let i = 0; i <= steps; i++) {
  const y = top - H * 0.6 + (hgt + H * 0.2) * (i / steps);
  await page.evaluate((y) => { window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y); }, y);
  await sleep(2400);
  await page.screenshot({ path: `${OUT}/${W}-home-index-${i}.jpg`, type: 'jpeg', quality: 86 });
}
console.log('console:', log.length ? log.join('\n') : 'none');
await browser.close();
