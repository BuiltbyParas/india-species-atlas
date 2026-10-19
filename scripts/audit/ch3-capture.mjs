// Chapter 03 in context: from the floodplain study's end through the selection into Ch.04. OUT=dir W/H, RM=1 for reduced motion.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? '.';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const TAG = process.env.TAG ?? `${W}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, reducedMotion: process.env.RM ? 'reduce' : 'no-preference', hasTouch: W < 700, isMobile: W < 700 });
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errs.push(m.text().slice(0, 200)));
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await sleep(7000);
const sec = await page.evaluate(() => {
  const s = document.getElementById('selection-chapter');
  const r = s.getBoundingClientRect();
  return { top: r.top + scrollY, h: r.height };
});
console.log('selection', sec);
const fracs = (process.env.FRACS ?? '-0.6,-0.25,0,0.15,0.3,0.45,0.6,0.75,0.9,1.05').split(',').map(Number);
// Walk there in steps so scroll-driven scenes see the way in.
let y = await page.evaluate(() => scrollY);
for (const f of fracs) {
  const target = Math.round(sec.top + f * sec.h);
  while (Math.abs(target - y) > 10) {
    y += Math.sign(target - y) * Math.min(Math.abs(target - y), H * 0.5);
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await sleep(160);
  }
  await sleep(1400);
  await page.screenshot({ path: `${OUT}/${TAG}-${String(f).replace('.', 'p')}.jpg`, type: 'jpeg', quality: 72 });
}
if (process.env.EVAL) console.log(await page.evaluate(process.env.EVAL));
console.log('console', JSON.stringify(errs.slice(0, 12)));
await browser.close();
