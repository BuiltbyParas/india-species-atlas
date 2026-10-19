// The hero descent, run RUNS times at reader pace (GPU on): does the live relief survive (no fall back to the flat
// hero), and what does the frame timing look like over the stretch where the title parts (the scaled, blurred
// "Species")? Production build. Env: W/H, RUNS, BASE.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4301';
const W = +(process.env.W ?? 1920), H = +(process.env.H ?? 1080);
const RUNS = +(process.env.RUNS ?? 4);
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
let gaveUp = 0;
const all = [];
for (let r = 0; r < RUNS; r++) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(7000);
  const live0 = await page.evaluate(() => !!document.querySelector('.hero-probe') && !document.querySelector('[data-held]'));
  await page.evaluate(() => { window.__ft = []; let last = performance.now(); const f = (t) => { window.__ft.push([t - last, scrollY]); last = t; if (window.__on) requestAnimationFrame(f); }; window.__on = true; requestAnimationFrame(f); });
  const end = await page.evaluate(() => { const h = document.getElementById('atlas-top'); return h.offsetHeight; });
  let y = 0;
  while (y < end + 1200) { await page.mouse.wheel(0, 100); y += 90; await page.waitForTimeout(33); }
  await page.waitForTimeout(1500);
  const res = await page.evaluate(() => { window.__on = false; return { ft: window.__ft, live: !!document.querySelector('.hero-probe') && !document.querySelector('[data-held]') }; });
  const parting = res.ft.filter(([, sy]) => sy < 900).map(([g]) => g).slice(3);
  const descent = res.ft.filter(([, sy]) => sy >= 900).map(([g]) => g);
  const stat = (a) => { const s = [...a].sort((x, y) => x - y); return a.length ? `n${a.length} fps ${(1000 / (a.reduce((p, c) => p + c, 0) / a.length)).toFixed(1)} p95 ${s[Math.floor(s.length * 0.95)].toFixed(1)} slow ${a.filter((g) => g > 32).length}` : '-'; };
  if (live0 && !res.live) gaveUp++;
  console.log(`run ${r + 1}: live at start ${live0}, live after ${res.live} | parting ${stat(parting)} | descent ${stat(descent)}`);
  all.push(...parting);
  await page.close();
}
console.log(`gave up ${gaveUp}/${RUNS}`);
await browser.close();
