// The home page's hand-overs, walked at a reader's pace: for each seam, the page is moved in small steps through the
// stretch either side of a boundary and a frame is kept every SHOT px. Production build (vite preview), GPU on.
// Env: BASE (default :4301), OUT, W/H, RM=1, SEAMS (comma list of names below), SHOT (px, default 0.25 × H).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4301';
const OUT = process.env.OUT ?? `${process.env.HOME}/.cache/ispa-cohesion/seams`;
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const SHOT = +(process.env.SHOT ?? Math.round(H * 0.25));
const TAG = process.env.TAG ?? `${W}${process.env.RM ? '-rm' : ''}`;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Each seam: the element whose top is the boundary, and the stretch around it in viewport heights.
const ALL = {
  hero: { sel: '#species-chapter', from: -1.6, to: 0.4 },
  survey: { sel: '#field-studies', from: -1.9, to: 0.6 },
  ch03: { sel: '#selection-chapter', from: -1.2, to: 0.5 },
  ch04: { sel: '#conservation-chapter', from: -1.8, to: 0.4 },
  close: { sel: '.final', from: -1.0, to: 1.2 },
};
const names = (process.env.SEAMS ?? Object.keys(ALL).join(',')).split(',');
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const mobile = W < 700;
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  reducedMotion: process.env.RM ? 'reduce' : 'no-preference',
  hasTouch: mobile,
  isMobile: mobile,
});
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errs.push(m.text().slice(0, 200)));
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await sleep(6500);
const to = (y) => page.evaluate((v) => (window.__lenis ? window.__lenis.scrollTo(v, { immediate: true, force: true }) : window.scrollTo(0, v)), y);
let y = 0;
for (const name of names) {
  const s = ALL[name];
  const top = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.getBoundingClientRect().top + scrollY : null;
  }, s.sel);
  if (top == null) {
    console.log(name, 'missing', s.sel);
    continue;
  }
  const a = Math.max(0, Math.round(top + s.from * H));
  const b = Math.round(top + s.to * H);
  // Walk to the start, then through the seam.
  while (Math.abs(a - y) > 10) {
    y += Math.sign(a - y) * Math.min(Math.abs(a - y), H * 0.4);
    await to(y);
    await sleep(90);
  }
  let k = 0;
  for (let at = a; at <= b; at += SHOT, k++) {
    while (y < at) {
      y = Math.min(at, y + 40);
      await to(y);
      await sleep(28);
    }
    await sleep(650);
    await page.screenshot({ path: `${OUT}/${TAG}-${name}-${String(k).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 70 });
  }
  console.log(name, 'top', Math.round(top), 'frames', k);
}
console.log('console', JSON.stringify(errs.slice(0, 12)));
await browser.close();
