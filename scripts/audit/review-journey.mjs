// Whole-experience review: the home page as a first-time visitor sees it — the loader and the hero's entrance as
// timed frames, then the whole page at half-viewport steps as settled frames — with the section under the middle of
// the screen, the header's state and the atlas world's act logged per frame. GPU on (ANGLE GL), production build.
// Env: BASE (default :4301), OUT, W/H, MOBILE=1 (touch phone, DPR 1), RM=1 (reduced motion), NOGL=1, STEP (fraction
// of the viewport per frame, default 0.5), SETTLE (ms, default 1400).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4301';
const OUT = process.env.OUT ?? `${process.env.HOME}/.cache/ispa-review/journey`;
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const STEP = +(process.env.STEP ?? 0.5), SETTLE = +(process.env.SETTLE ?? 1400);
const MOBILE = !!process.env.MOBILE;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const args = process.env.NOGL ? ['--disable-3d-apis'] : ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'];
const browser = await chromium.launch({ headless: true, args });
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  reducedMotion: process.env.RM ? 'reduce' : 'no-preference',
  ...(MOBILE ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}),
});
const page = await ctx.newPage();
const log = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.push(`[${m.type()}] ${m.text().slice(0, 240)}`); });
page.on('pageerror', (e) => log.push('[pageerror] ' + e.message.slice(0, 240)));
page.on('requestfailed', (r) => log.push('[reqfail] ' + r.url().slice(-90) + ' ' + (r.failure()?.errorText ?? '')));
const tag = `${W}${MOBILE ? 'm' : ''}${process.env.RM ? '-rm' : ''}${process.env.NOGL ? '-nogl' : ''}`;
const t0 = Date.now();
await page.goto(`${BASE}/`, { waitUntil: 'commit' });
// The entrance, as timed frames from the moment the document arrives.
for (const t of [400, 1200, 2200, 3200, 4400, 5800, 7400, 9500]) {
  const wait = t - (Date.now() - t0);
  if (wait > 0) await sleep(wait);
  // Nothing painted yet is not a failure: the frame is skipped.
  await page.screenshot({ path: `${OUT}/${tag}-enter-${String(t).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 84 }).catch(() => {});
}
await sleep(1500);
const where = () => page.evaluate(() => {
  const mid = innerHeight * 0.5;
  // The innermost landmark that holds the middle of the screen.
  const els = [...document.querySelectorAll('main section, main [id], main [data-ground], footer')];
  let best = null;
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.top <= mid && r.bottom >= mid && (!best || r.height < best.h)) best = { h: r.height, name: el.id || el.className.toString().split(' ').slice(0, 2).join('.') || el.tagName };
  }
  const hdr = document.querySelector('header');
  return {
    y: Math.round(scrollY), at: best?.name ?? '?',
    header: hdr ? Object.entries(hdr.dataset).map(([k, v]) => `${k}=${v}`).join(',') : '',
    env: document.documentElement.dataset.env ?? document.body.dataset.env ?? '',
    field: window.__atlasField?.() ? (({ showing, rung, mode }) => ({ showing, rung, mode }))(window.__atlasField()) : null,
  };
});
const H0 = await page.evaluate(() => document.documentElement.scrollHeight);
const rows = [];
let i = 0;
for (let y = 0; y <= H0 - H + 1; y += Math.round(H * STEP), i++) {
  await page.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)), y);
  await sleep(SETTLE);
  const w = await where();
  rows.push({ i, ...w });
  await page.screenshot({ path: `${OUT}/${tag}-s${String(i).padStart(3, '0')}.jpg`, type: 'jpeg', quality: 80 });
}
const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
writeFileSync(`${OUT}/${tag}-rows.json`, JSON.stringify({ height: H0, over, rows, log }, null, 1));
console.log(`page height ${H0}, frames ${rows.length}, overflow ${over}`);
for (const r of rows) console.log(String(r.i).padStart(3), String(r.y).padStart(6), r.at.padEnd(34), r.header.padEnd(30), r.env, r.field ? JSON.stringify(r.field) : '');
console.log('console:', log.length ? '\n' + log.join('\n') : 'none');
await browser.close();
