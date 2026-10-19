// Frame timing, field studies: baseline vs current production builds, interleaved, one browser, GPU on.
import { chromium } from 'playwright';
// BASE_URL / CUR_URL: the two servers (production previews by default); Q: a query for both (e.g. '?hold=1' on dev
// servers, to freeze the frame governor so the two are measured at the same quality).
const BUILDS = { base: process.env.BASE_URL ?? 'http://localhost:4302', cur: process.env.CUR_URL ?? 'http://localhost:4301' };
const Q = process.env.Q ?? '';
const IDS = (process.env.IDS ?? 'great-indian-bustard,snow-leopard,ganges-river-dolphin,bengal-tiger,indian-rhinoceros').split(',');
const REPS = +(process.env.REPS ?? 2);
const W = 1440, H = 900;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const stats = (iv) => {
  const s = [...iv].sort((a, b) => a - b);
  const sum = iv.reduce((a, b) => a + b, 0);
  return { fps: +(1000 * iv.length / sum).toFixed(1), p95: +s[Math.floor(s.length * 0.95)].toFixed(1), slow: +(100 * iv.filter((x) => x > 25).length / iv.length).toFixed(1) };
};
const results = [];
for (const id of IDS) for (let r = 0; r < REPS; r++) for (const build of (process.env.ONLY ? [process.env.ONLY] : ['base', 'cur'])) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  await page.goto(`${BUILDS[build]}/field/${id}${Q}`, { waitUntil: 'domcontentloaded' });
  for (let k = 0; k < 80; k++) { const st = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.status); if (st === 'ready' || st === 'flat') break; await sleep(250); }
  await sleep(3500);
  await page.evaluate(() => { window.__iv = []; let last = 0; const f = (t) => { if (last) window.__iv.push(t - last); last = t; window.__raf = requestAnimationFrame(f); }; window.__raf = requestAnimationFrame(f); });
  await page.mouse.move(W / 2, H / 2);
  // Scroll the whole study down, then back up.
  const t0 = Date.now();
  while (Date.now() - t0 < 7000) { await page.mouse.wheel(0, 110); await sleep(45); }
  const t1 = Date.now();
  while (Date.now() - t1 < 3000) { await page.mouse.wheel(0, -260); await sleep(45); }
  const scroll = await page.evaluate(() => { const v = window.__iv; window.__iv = []; return v; });
  await sleep(1200);
  await page.evaluate(() => { window.__iv = []; });
  // The hand moving the sun: a slow circle for 4 s.
  const t2 = Date.now();
  while (Date.now() - t2 < 4000) { const a = (Date.now() - t2) / 700; await page.mouse.move(W / 2 + Math.cos(a) * 500, H / 2 + Math.sin(a) * 300); await sleep(16); }
  const pointer = await page.evaluate(() => window.__iv);
  const f = await page.evaluate(() => ({ ...(window.__atlasField?.() ?? {}), status: document.querySelector('.fs-study')?.dataset.status }));
  const row = { id, build, rep: r, scroll: stats(scroll), pointer: stats(pointer), rung: f.rung, tier: f.tier, status: f.status, failed: f.failed, calls: f.calls, tris: f.triangles, buildMs: f.buildMs?.[id] };
  results.push(row);
  console.log(JSON.stringify(row));
  await ctx.close();
}
await browser.close();
