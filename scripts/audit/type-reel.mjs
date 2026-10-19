// Short loops of the scrubbed type moments: the page is stepped through a stretch and a cropped frame kept at each
// step, for an animated WebP (magick). Scrubbed reveals depend only on position, so the frames are the motion.
// Production build (vite preview), GPU on. BASE (default :4301), OUT, TAG, W/H.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4301';
const OUT = process.env.OUT ?? `${process.env.HOME}/.cache/ispa-typepass/reel`;
const TAG = process.env.TAG ?? 'after';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await sleep(7000);
const box = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; }, sel);
const to = (y) => page.evaluate((v) => (window.__lenis ? window.__lenis.scrollTo(v, { immediate: true, force: true }) : window.scrollTo(0, v)), y);
const hero = await box('#atlas-top');
const ch02 = await box('#species-chapter');
const cons = await box('#conservation-chapter');
const fin = await box('.final');
// name, from, to, frames, crop
const REELS = [
  ['hero', hero.top, hero.top + (hero.h - H) * 0.14, 22, { x: 0, y: H * 0.35, width: W, height: H * 0.6 }],
  ['ch02', ch02.top - H * 0.62, ch02.top - H * 0.05, 26, { x: 0, y: H * 0.15, width: W * 0.62, height: H * 0.75 }],
  ['hinge', cons.top + (cons.h - H) * 0.86, cons.top + (cons.h - H) * 0.93, 22, { x: 0, y: H * 0.25, width: W * 0.6, height: H * 0.6 }],
  ['close', fin.top - H * 0.6, fin.top + H * 0.45, 26, { x: 0, y: H * 0.15, width: W * 0.62, height: H * 0.75 }],
];
for (const [name, a, b, n, clip] of REELS) {
  let y = Math.max(0, Math.round(a - H));
  await to(y);
  await sleep(900);
  for (let k = 0; k < n; k++) {
    const target = Math.round(a + ((b - a) * k) / (n - 1));
    while (y < target) {
      y = Math.min(target, y + 30);
      await to(y);
      await sleep(20);
    }
    await sleep(380);
    await page.screenshot({ path: `${OUT}/${TAG}-${name}-${String(k).padStart(2, '0')}.png`, clip });
  }
  console.log(name, n);
}
await browser.close();
