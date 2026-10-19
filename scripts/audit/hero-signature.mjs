// Usage: OUT=dir [TIMES=ms,...] [SCROLLS=px,...] [REDUCED=1] [W=1440 H=900] node hero-signature.mjs
// The hero's entrance as a time series from a cold load, then frames at scroll offsets.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173', OUT = process.env.OUT, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const browser = await chromium.launch({ args: process.env.NOGL === '1' ? ['--disable-gpu', '--disable-webgl', '--disable-3d-apis'] : ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: process.env.REDUCED === '1' ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
// Times are measured from the moment the loader hands over (the title starts to play).
await page.waitForSelector('.hero-title .reveal-text.is-shown', { timeout: 60000 }).catch(() => console.log('no ready'));
const t0 = Date.now();
const tag = process.env.TAG ?? '';
for (const t of (process.env.TIMES ?? '').split(',').filter(Boolean).map(Number)) {
  await sleep(Math.max(0, t - (Date.now() - t0)));
  await page.screenshot({ path: `${OUT}/${tag}t${t}.png` });
  console.log('t', t);
}
await sleep(+(process.env.SETTLE ?? 0));
for (const y of (process.env.SCROLLS ?? '').split(',').filter(Boolean).map(Number)) {
  await page.evaluate((v) => window.scrollTo(0, v), y); await sleep(1600);
  await page.screenshot({ path: `${OUT}/${tag}s${y}.png` });
  console.log('s', y);
}
const info = await page.evaluate(() => {
  const st = document.querySelector('.hero-stage') ?? document.querySelector('[data-marks]');
  const t = document.querySelector('.hero-title')?.getBoundingClientRect();
  const b = document.querySelector('[data-hero-baseline]')?.getBoundingClientRect();
  return { marks: st?.getAttribute('data-marks'), tropic: st && getComputedStyle(st).getPropertyValue('--tropic-y'), base: b?.top, title: t && [t.top, t.bottom, t.left, t.right] };
});
console.log(JSON.stringify(info));
await browser.close();
