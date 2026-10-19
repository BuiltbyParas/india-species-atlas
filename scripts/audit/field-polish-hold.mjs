// Frame time with the camera held on one chapter and the sun turning (the light grid redrawn every frame), for two
// servers, interleaved: where a world's cost sits (ground level or seen from above). Dev servers with ?hold=1.
// Env: BASE_URL, CUR_URL, ID, CH (comma list of chapter indices), REPS.
import { chromium } from 'playwright';
const BUILDS = { base: process.env.BASE_URL ?? 'http://localhost:5180', cur: process.env.CUR_URL ?? 'http://localhost:5181' };
const ID = process.env.ID ?? 'bengal-tiger';
const CHS = (process.env.CH ?? '0,3').split(',').map(Number);
const REPS = +(process.env.REPS ?? 2);
const W = 1440, H = 900;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
for (let rep = 0; rep < REPS; rep++) for (const build of ['base', 'cur']) {
  const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
  await page.goto(`${BUILDS[build]}/field/${ID}?hold=1&quality=balanced`, { waitUntil: 'domcontentloaded' });
  for (let k = 0; k < 80; k++) { const st = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.status); if (st === 'ready') break; await sleep(250); }
  await sleep(3500);
  const out = {};
  for (const ch of CHS) {
    await page.evaluate((i) => {
      const run = document.querySelector('.fs-runway');
      const c = run.children[i];
      const y = run.getBoundingClientRect().top + window.scrollY + c.offsetTop + c.offsetHeight * 0.5 - innerHeight * 0.5;
      window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y);
    }, ch);
    await sleep(2500);
    await page.evaluate(() => { window.__iv = []; let last = 0; const f = (t) => { if (last) window.__iv.push(t - last); last = t; if (window.__iv.length < 180) requestAnimationFrame(f); }; requestAnimationFrame(f); });
    const t0 = Date.now();
    let a = 0;
    while (Date.now() - t0 < 3200) { a += 0.15; await page.mouse.move(W / 2 + Math.cos(a) * 320, H / 2 + Math.sin(a) * 200); await sleep(16); }
    const iv = await page.evaluate(() => window.__iv);
    out[`c${ch}`] = +(1000 * iv.length / iv.reduce((x, y) => x + y, 0)).toFixed(1);
  }
  console.log(JSON.stringify({ id: ID, build, rep, fps: out }));
  await page.context().close();
}
await browser.close();
