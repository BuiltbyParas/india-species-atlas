import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = process.env.OUT; const ID = process.env.ID; const CH = +(process.env.CH ?? 0);
const W = 1440, H = 900; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
await page.goto(`${BASE}/field/${ID}?hold=1`, { waitUntil: 'domcontentloaded' });
for (let k = 0; k < 60; k++) { const st = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.status); if (st === 'ready') break; await sleep(250); }
await sleep(2500);
await page.evaluate((i) => { const run = document.querySelector('.fs-runway'); const c = run.children[i]; const y = run.getBoundingClientRect().top + scrollY + c.offsetTop + c.offsetHeight * 0.5 - innerHeight * 0.5; window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y); }, CH);
await sleep(1500);
for (const [n, x, y] of [['L', 0.04, 0.5], ['C', 0.5, 0.5], ['R', 0.96, 0.5], ['U', 0.5, 0.1]]) {
  await page.mouse.move(W * x, H * y, { steps: 8 }); await sleep(2200);
  await page.screenshot({ path: `${OUT}/ptr-${ID}-${CH}-${n}.jpg`, type: 'jpeg', quality: 86 });
}
await browser.close();
