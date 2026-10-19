// The field studies' frame cost: scroll through the section with the wheel at a steady pace (as a reader would, through
// Lenis) and record requestAnimationFrame intervals; then hold each study's arrival for a few seconds. Run against a
// before and an after build to compare; alternate runs, this laptop's noise is several fps.
//   BASE=http://localhost:4301 RUNS=2 SCREENS=6 node scripts/audit/read-perf.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4301';
const RUNS = +(process.env.RUNS ?? 2);
const W = +(process.env.W ?? 1440);
const H = +(process.env.H ?? 900);
const SCREENS = +(process.env.SCREENS ?? 6);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const stats = (d) => {
  const s = [...d].sort((a, b) => a - b);
  const mean = d.reduce((a, b) => a + b, 0) / d.length;
  return { fps: +(1000 / mean).toFixed(1), p95: +s[Math.floor(s.length * 0.95)].toFixed(1), long: d.filter((x) => x > 50).length, n: d.length };
};

for (let run = 0; run < RUNS; run++) {
  const browser = await chromium.launch({ headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
  const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await sleep(9000);
  const top = await page.evaluate(() => document.querySelector('#field-studies').getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => window.scrollTo(0, y - innerHeight), top);
  await sleep(2500);
  await page.mouse.move(W * 0.3, H * 0.5);
  await page.evaluate(() => {
    window.__d = [];
    let last = performance.now();
    const f = (t) => {
      window.__d.push(t - last);
      last = t;
      if (window.__go) requestAnimationFrame(f);
    };
    window.__go = true;
    requestAnimationFrame(f);
  });
  // A steady reader's pace: 100 px every 110 ms (~900 px/s).
  const steps = Math.round(((SCREENS + 1) * H) / 100);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, 100);
    await sleep(110);
  }
  await sleep(800);
  const scrolled = await page.evaluate(() => {
    window.__go = false;
    return window.__d.slice(5);
  });
  // Held: each study's arrival, the world alone with its name.
  const held = [];
  const panels = await page.evaluate(() => [...document.querySelectorAll('.fs-index-panel')].map((p) => p.getBoundingClientRect().top + scrollY));
  for (const y of panels) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await sleep(2200);
    const d = await page.evaluate(
      () =>
        new Promise((res) => {
          const d = [];
          let last = performance.now();
          const end = last + 2500;
          const f = (t) => {
            d.push(t - last);
            last = t;
            if (t < end) requestAnimationFrame(f);
            else res(d.slice(3));
          };
          requestAnimationFrame(f);
        }),
    );
    held.push(...d);
  }
  console.log(`run ${run}`, 'scroll', JSON.stringify(stats(scrolled)), 'held', JSON.stringify(stats(held)));
  await browser.close();
}
