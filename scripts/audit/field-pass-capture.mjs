// Field-study capture: every chapter of each study, GPU on (ANGLE GL), settled frames.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = process.env.OUT ?? `${process.env.HOME}/.cache/ispa-field2/before`;
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const IDS = (process.env.IDS ?? 'great-indian-bustard,snow-leopard,ganges-river-dolphin,bengal-tiger,indian-rhinoceros').split(',');
const ONLY = process.env.CH ? process.env.CH.split(',').map(Number) : null;
const SETTLE = +(process.env.SETTLE ?? 2600);
// Production builds ignore ?hold=1 (dev only): pass Q='' and the governor's rung is logged with each study.
const Q = process.env.Q ?? '?hold=1';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: process.env.NOGL ? ['--disable-3d-apis'] : ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl', '--enable-unsafe-swiftshader=false'] });
// MOBILE=1: a touch phone (coarse pointer, no hover), at DPR 1 so the GPU cost stays comparable.
const MOBILE = !!process.env.MOBILE;
const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: process.env.RM ? 'reduce' : 'no-preference', ...(MOBILE ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}) });
const page = await ctx.newPage();
const log = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.push(`[${m.type()}] ${m.text().slice(0, 240)}`); });
page.on('pageerror', (e) => log.push('[pageerror] ' + e.message.slice(0, 240)));
for (const id of IDS) {
  await page.goto(`${BASE}/field/${id}${Q}`, { waitUntil: 'domcontentloaded' });
  const t0 = Date.now();
  for (let k = 0; k < 60; k++) {
    const s = await page.evaluate(() => ({ st: document.querySelector('.fs-study')?.dataset.status, f: window.__atlasField?.() }));
    if (s.st === 'ready' && s.f?.showing) break;
    if (s.st === 'flat') break;
    await sleep(250);
  }
  if (!ONLY || ONLY.includes(-1)) {
    await sleep(900); await page.screenshot({ path: `${OUT}/${W}-${id}-open0.jpg`, type: 'jpeg', quality: 86 });
    await sleep(SETTLE); await page.screenshot({ path: `${OUT}/${W}-${id}-open1.jpg`, type: 'jpeg', quality: 86 });
  } else await sleep(SETTLE);
  const n = await page.evaluate(() => document.querySelector('.fs-runway')?.children.length ?? 0);
  for (let i = 0; i < n; i++) {
    if (ONLY && !ONLY.includes(i)) continue;
    await page.evaluate((i) => {
      const run = document.querySelector('.fs-runway');
      const c = run.children[i];
      const top = run.getBoundingClientRect().top + window.scrollY + c.offsetTop;
      const y = top + c.offsetHeight * 0.5 - innerHeight * 0.5;
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
    }, i);
    await sleep(SETTLE);
    await page.screenshot({ path: `${OUT}/${W}-${id}-c${i}.jpg`, type: 'jpeg', quality: 86 });
  }
  const f = await page.evaluate(() => ({ ...(window.__atlasField?.() ?? {}), status: document.querySelector('.fs-study')?.dataset.status }));
  console.log(id, 'chapters', n, 'load', Date.now() - t0, 'ms', JSON.stringify({ mode: f.mode, showing: f.showing, status: f.status, tier: f.tier, rung: f.rung, calls: f.calls, tris: f.triangles, build: f.buildMs }));
}
console.log('console:', log.length ? log.join('\n') : 'none');
await browser.close();
