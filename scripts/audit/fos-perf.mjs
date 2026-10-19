// Field of species: what a playing plate costs the field stage. Holds each footage study at its second beat for a few
// seconds and records requestAnimationFrame intervals, with the clips allowed and then refused (the plate stays a still),
// alternating runs to spread this laptop's noise. Also opens the encounter and records the same while its footage plays.
//   BASE=http://127.0.0.1:4301 RUNS=2 node scripts/audit/fos-perf.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4301';
const RUNS = +(process.env.RUNS ?? 2);
const W = 1440;
const H = 900;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(block) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
  if (block) await page.route(/\.(webm|mp4)$/, (r) => r.abort());
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await sleep(9000);
  const top = await page.evaluate(() => document.querySelector('#field-studies').getBoundingClientRect().top + scrollY);
  const sample = () =>
    page.evaluate(
      () =>
        new Promise((done) => {
          const t = [];
          let last = performance.now();
          const end = last + 4000;
          const f = (now) => {
            t.push(now - last);
            last = now;
            if (now < end) requestAnimationFrame(f);
            else {
              t.sort((a, b) => a - b);
              const mean = t.reduce((a, b) => a + b, 0) / t.length;
              done({ fps: +(1000 / mean).toFixed(1), p95: +t[Math.floor(t.length * 0.95)].toFixed(1), slow: +((t.filter((x) => x > 25).length / t.length) * 100).toFixed(0) });
            }
          };
          requestAnimationFrame(f);
        }),
    );
  const out = {};
  for (const [name, i] of [
    ['bustard', 0],
    ['leopard', 1],
  ]) {
    await page.evaluate((y) => scrollTo(0, y), top + i * H);
    await sleep(2500);
    out[name] = await sample();
  }
  if (!block) {
    await page.evaluate((y) => scrollTo(0, y), top + 1.32 * H);
    await sleep(2200);
    await page.locator('.fs-comp.is-active .fs-encounter').click();
    await sleep(2000);
    out.encounter = await sample();
  }
  out.stage = await page.evaluate(() => document.querySelector('#field-studies').dataset.status);
  await browser.close();
  return out;
}

for (let r = 0; r < RUNS; r++) {
  for (const block of [false, true]) {
    console.log(block ? 'stills ' : 'footage', JSON.stringify(await run(block)));
  }
}
