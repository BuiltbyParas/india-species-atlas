// Chapter 03 frame rate: a steady scroll through the pinned plate, then the dome turned through the index. GPU path.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:5173';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await sleep(7000);
if (process.env.ABL) await page.addStyleTag({ content: process.env.ABL });
const sec = await page.evaluate(() => { const r = document.getElementById('selection-chapter').getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; });
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
const grounds = await page.evaluate(() => { const r = document.querySelector('.grounds').getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; });
const spans = [
  ...(process.env.ABL ? [] : [['control: Survey plate', grounds.top, grounds.top + grounds.h * 0.6]]),
  ['Ch.03 arrival + sheet', sec.top - H, sec.top + 0.25 * sec.h],
  ['Ch.03 tilt + rise', sec.top + 0.25 * sec.h, sec.top + 0.5 * sec.h],
  ['Ch.03 hold + exit', sec.top + 0.5 * sec.h, sec.top + sec.h],
];
for (const [name, a, b] of spans.filter(([n]) => !process.env.ONLY || n.includes(process.env.ONLY))) {
  await page.evaluate((v) => window.scrollTo(0, v), Math.round(a)); await sleep(2500);
  console.log(name, JSON.stringify(await measure(Math.round(a), Math.round(b))));
}
if (process.env.ONLY) { await browser.close(); process.exit(0); }
await page.evaluate((v) => window.scrollTo(0, v), Math.round(sec.top + 0.62 * sec.h)); await sleep(2500);
const turn = await page.evaluate(async () => {
  const rows = [...document.querySelectorAll('.sel-row')];
  const times = []; let last = performance.now(); let run = true;
  const tick = (t) => { times.push(t - last); last = t; if (run) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  for (const k of [6, 1, 10, 3, 11, 0]) { rows[k].click(); await new Promise((r) => setTimeout(r, 900)); }
  run = false;
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return { frames: times.length, fps: +(1000 / avg).toFixed(1), p95ms: +times[Math.floor(times.length * 0.95)].toFixed(1), over33: times.filter((t) => t > 33).length };
});
console.log('turning the dome', JSON.stringify(turn));
await browser.close();
