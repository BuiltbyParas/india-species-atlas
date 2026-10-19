// Frame rate over the stretches the type pass animates, read in sequence on one page at a steady 14 px a frame.
// Production build (vite preview), GPU on. BASE (default :4301), W/H. Run each build at least twice, alternating;
// the laptop swaps. Also reports whether the live relief survived (the hero gives up to a held, flat page when slow).
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4301';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await sleep(7000);
const box = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; }, sel);
const measure = (from, to) => page.evaluate(async ({ from, to }) => {
  const times = []; let last = performance.now(); let y = from;
  await new Promise((done) => {
    const step = (t) => { times.push(t - last); last = t; y += 14; window.scrollTo(0, y); if (y < to) requestAnimationFrame(step); else done(); };
    requestAnimationFrame(step);
  });
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return { frames: times.length, fps: +(1000 / avg).toFixed(1), p95ms: +times[Math.floor(times.length * 0.95)].toFixed(1), over33: times.filter((t) => t > 33).length };
}, { from, to });
const hero = await box('#atlas-top');
const ch02 = await box('#species-chapter');
const cons = await box('#conservation-chapter');
const fin = await box('.final');
const spans = [
  ['hero: name parts, captions', hero.top, hero.top + (hero.h - H) * 0.4],
  ['Ch.02 statement', ch02.top - H, ch02.top + H * 0.2],
  ['Ch.04 hinge', cons.top + (cons.h - H) * 0.84, cons.top + (cons.h - H) * 0.97],
  ['closing reassembly + coda', fin.top - H * 0.6, fin.top + H * 0.8],
];
for (const [name, a, b] of spans) {
  await page.evaluate((v) => window.scrollTo(0, v), Math.max(0, Math.round(a - H))); await sleep(1200);
  await page.evaluate((v) => window.scrollTo(0, v), Math.round(a)); await sleep(2500);
  console.log(name.padEnd(28), JSON.stringify(await measure(Math.round(a), Math.round(b))));
}
console.log('live relief at end:', await page.evaluate(() => !!document.querySelector('.final.is-world')));
await browser.close();
