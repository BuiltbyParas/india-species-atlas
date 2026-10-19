// The home page's type at its moments: for each, the page is walked (in small steps, as a reader scrolls) to a place
// relative to a section and a short burst of frames is kept, so a reveal is seen mid-motion as well as at rest.
// Production build (vite preview), GPU on. Env: BASE (default :4301), OUT, W/H, RM=1, TAG, ONLY (comma list of moments),
// BURST (ms list, default "120,450,1100").
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4301';
const OUT = process.env.OUT ?? `${process.env.HOME}/.cache/ispa-typepass`;
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const TAG = process.env.TAG ?? `${W}${process.env.RM ? '-rm' : ''}`;
const BURST = (process.env.BURST ?? '120,450,1100').split(',').map(Number);
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Each moment: the section, and where in its run (top of section + f × its scroll run, or + v viewport heights).
const MOMENTS = [
  ['hero-exit-a', '#atlas-top', { f: 0.05 }],
  ['hero-exit-b', '#atlas-top', { f: 0.1 }],
  ['hero-cap', '#atlas-top', { f: 0.3 }],
  ['ch02-a', '#species-chapter', { v: -0.55 }],
  ['ch02-b', '#species-chapter', { v: -0.3 }],
  ['ch02-c', '#species-chapter', { v: 0 }],
  ['survey-intro', '.grounds', { f: 0.06 }],
  ['survey-1', '.grounds', { f: 0.2 }],
  ['survey-3', '.grounds', { f: 0.5 }],
  ['survey-dive', '.grounds', { f: 0.9 }],
  ['ch03-a', '#selection-chapter', { v: -0.45 }],
  ['ch03-b', '#selection-chapter', { f: 0.1 }],
  ['ch03-rise', '#selection-chapter', { f: 0.5 }],
  ['ch03-hold', '#selection-chapter', { f: 0.72 }],
  ['ch03-leave', '#selection-chapter', { f: 0.94 }],
  ['ch04-a', '#conservation-chapter', { f: 0.12 }],
  ['ch04-b', '#conservation-chapter', { f: 0.3 }],
  ['ch04-year', '#conservation-chapter', { f: 0.75 }],
  ['ch04-hinge-a', '#conservation-chapter', { f: 0.88 }],
  ['ch04-hinge-m', '#conservation-chapter', { f: 0.905 }],
  ['ch04-hinge-b', '#conservation-chapter', { f: 0.93 }],
  ['close-a', '.final', { v: -0.3 }],
  ['close-b', '.final', { v: 0.25 }],
  ['close-c', '.final', { v: 0.7 }],
];
const only = process.env.ONLY?.split(',');
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  reducedMotion: process.env.RM ? 'reduce' : 'no-preference',
});
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errs.push(m.text().slice(0, 200)));
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
// The opening, as it arrives.
if (!only || only.includes('hero')) {
  let at = 0;
  for (const t of [1600, 2600, 3600, 5200]) {
    await sleep(t - at);
    at = t;
    await page.screenshot({ path: `${OUT}/${TAG}-hero-${t}.jpg`, type: 'jpeg', quality: 72 });
  }
} else await sleep(5200);
await sleep(1300);
const to = (y) => page.evaluate((v) => (window.__lenis ? window.__lenis.scrollTo(v, { immediate: true, force: true }) : window.scrollTo(0, v)), y);
let y = 0;
for (const [name, sel, at] of MOMENTS) {
  if (only && !only.includes(name)) continue;
  const target = await page.evaluate(
    ([s, a, vh]) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const top = el.getBoundingClientRect().top + scrollY;
      return Math.round(a.f !== undefined ? top + a.f * Math.max(1, el.offsetHeight - vh) : top + a.v * vh);
    },
    [sel, at, H],
  );
  if (target == null) {
    console.log(name, 'missing', sel);
    continue;
  }
  // Walk there at a reader's pace over the last screen, so scrubbed things pass through their states.
  while (Math.abs(target - y) > H) {
    y += Math.sign(target - y) * H * 0.5;
    await to(y);
    await sleep(60);
  }
  while (Math.abs(target - y) > 2) {
    y += Math.sign(target - y) * Math.min(Math.abs(target - y), 36);
    await to(y);
    await sleep(24);
  }
  let last = 0;
  for (const ms of BURST) {
    await sleep(ms - last);
    last = ms;
    await page.screenshot({ path: `${OUT}/${TAG}-${name}-${ms}.jpg`, type: 'jpeg', quality: 72 });
  }
}
console.log('console', JSON.stringify(errs.slice(0, 12)));
await browser.close();
