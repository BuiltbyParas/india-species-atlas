// One browser session: home at scroll stops, then the working pages top to bottom. OUT=dir
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:5173', OUT = process.env.OUT ?? '.';
const W = 1440, H = 900, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const only = (process.env.ONLY ?? 'home,atlas,compare,conservation').split(',');
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
if (only.includes('home')) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await sleep(9000);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = +(process.env.STEP ?? 1800); let i = 0;
  for (let y = 0; y < total; y += step, i++) {
    await page.mouse.wheel(0, i ? step : 0); await sleep(1800);
    await page.screenshot({ path: `${OUT}/home-${String(i).padStart(2, '0')}.png` });
  }
  console.log('home total', total, 'shots', i);
}
for (const r of ['atlas', 'compare', 'conservation'].filter((x) => only.includes(x))) {
  await page.goto(`${BASE}/${r}`, { waitUntil: 'domcontentloaded' }); await sleep(5000);
  const total = await page.evaluate(() => document.documentElement.scrollHeight); let i = 0;
  for (let y = 0; y < total && i < 8; y += 800, i++) {
    await page.evaluate((v) => window.scrollTo(0, v), y); await sleep(900);
    await page.screenshot({ path: `${OUT}/${r}-${i}.png` });
  }
  console.log(r, total);
}
await browser.close();
