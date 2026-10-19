// One browser session: settle the page, then screenshot at viewport-height steps. OUT=dir ROUTE=/ MAX=n
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = process.env.OUT ?? '.';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const routes = (process.env.ROUTES ?? '/').split(',');
const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
const errs = []; page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errs.push(m.text().slice(0, 160)));
for (const route of routes) {
  const tag = route === '/' ? 'home' : route.replace(/\W+/g, '_').replace(/^_/, '');
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' }); await sleep(+(process.env.SETTLE ?? 9000));
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const n = Math.min(+(process.env.MAX ?? 8), Math.ceil(total / (H * 0.9)));
  console.log(route, 'height', total, 'shots', n);
  for (let i = 0; i < n; i++) {
    await page.screenshot({ path: `${OUT}/${tag}-${String(i).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 70 });
    for (let k = 0; k < 6; k++) { await page.mouse.wheel(0, H * 0.15); await sleep(120); }
    await sleep(900);
  }
}
console.log('console', errs.slice(0, 10));
await browser.close();
