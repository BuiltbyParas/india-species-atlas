// Frame rate through the home page's two reworked hand-overs, with a control span: a steady scroll at 14 px a frame.
// Production build (vite preview), GPU on. BASE (default :4301). Run twice per build; the laptop swaps.
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
const grounds = await box('.grounds');
const index = await box('#field-studies');
const sel = await box('#selection-chapter');
const cons = await box('#conservation-chapter');
// Both builds are measured over the same stories: from the plate's last mark to the first study held; from the dome at
// rest to Chapter 04's plate grown.
const spans = [
  ['control: Survey contours draw', grounds.top, grounds.top + H * 1.2],
  // The field stage starts loading somewhere in here (a screen and a half before its section): the whole run to the dive.
  ['Survey contours + marks', grounds.top, grounds.top + grounds.h - H * 2.1],
  ['Survey dive → Thar world', grounds.top + grounds.h - H * 2.1, index.top + H * 0.4],
  ['Ch.03 exit → Ch.04 plate', sel.top + sel.h * 0.72, cons.top + H * 0.3],
];
for (const [name, a, b] of spans) {
  await page.evaluate((v) => window.scrollTo(0, v), Math.round(a - H)); await sleep(1200);
  await page.evaluate((v) => window.scrollTo(0, v), Math.round(a)); await sleep(2500);
  console.log(name.padEnd(30), JSON.stringify(await measure(Math.round(a), Math.round(b))));
}
await browser.close();
