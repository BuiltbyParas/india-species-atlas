// Hero hand-over: scroll through the descent's end at slow / medium / fast speeds; per step record --p, the sink's opacity and the mean luminance in nine horizontal bands; flag big band jumps and a canvas that goes missing.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
const BASE = process.env.BASE ?? 'http://localhost:5173';
const sl = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: !process.env.HEADED });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const bands = (buf) => { const p = PNG.sync.read(buf); const out = new Array(9).fill(0); const n = p.width * Math.floor(p.height / 9);
  for (let y = 0; y < p.height; y++) { const b = Math.min(8, Math.floor(y / (p.height / 9))); for (let x = 0; x < p.width; x += 4) { const i = (y * p.width + x) * 4; out[b] += 0.2126 * p.data[i] + 0.7152 * p.data[i + 1] + 0.0722 * p.data[i + 2]; } }
  return out.map((v) => v / (n / 4)); };
for (const [name, step, wait, from, to] of [['slow', 70, 140, 1800, 3500], ['medium', 220, 70, 1800, 3500], ['fast', 700, 25, 0, 3500]]) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await sl(9000);
  await page.evaluate((y) => window.scrollTo(0, y), from); await sl(1500);
  let prev = null, y = from; const rows = [];
  while (y < to) {
    await page.mouse.wheel(0, step); await sl(wait + 120); y += step; // wheel is smoothed; settle a little before sampling
    const m = await page.evaluate(() => { const s = document.querySelector('.hero-stage'); const k = document.querySelector('.hero-sink'); const c = s?.querySelector('canvas');
      return { url: location.pathname, y: Math.round(scrollY), p: s ? +getComputedStyle(s).getPropertyValue('--p') : null, sink: k ? +(+getComputedStyle(k).opacity).toFixed(2) : null, cv: c ? +getComputedStyle(c).opacity : null }; });
    if (m.p === null && !globalThis.shot) { globalThis.shot = 1; await page.screenshot({ path: process.env.SHOT ?? 'null.png' }); }
    const b = bands(await page.screenshot());
    const jump = prev ? Math.max(...b.map((v, i) => Math.abs(v - prev[i]))) : 0;
    rows.push({ ...m, jump: +jump.toFixed(1), top: +b[0].toFixed(1), bot: +b[8].toFixed(1) }); prev = b;
  }
  console.log(`\n${name}: step ${step}`); for (const r of rows) console.log(JSON.stringify(r) + (r.jump > 12 ? '  <-- jump' : ''));
}
await browser.close();
