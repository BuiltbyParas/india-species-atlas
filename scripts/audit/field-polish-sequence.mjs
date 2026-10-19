// A study's scroll as a sequence of frames: the page scrolled in even steps from the top through the first chapters,
// each frame settled, so a transition can be read frame by frame. GPU on (ANGLE GL).
// Env: BASE, ID (study), W, H, MOBILE=1 (touch phone), STEPS (frames), SPAN (how many screens of scroll), OUT, TAG, Q.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://localhost:4301';
const ID = process.env.ID ?? 'ganges-river-dolphin';
const W = +(process.env.W ?? 390), H = +(process.env.H ?? 844);
const STEPS = +(process.env.STEPS ?? 6);
const SPAN = +(process.env.SPAN ?? 2.4);
const Q = process.env.Q ?? '?quality=balanced';
const TAG = process.env.TAG ?? 'after';
const OUT = process.env.OUT ?? `${process.env.HOME}/.cache/ispa-field3/seq`;
const SETTLE = +(process.env.SETTLE ?? 1600);
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const MOBILE = !!process.env.MOBILE;
const ctx = await browser.newContext({ viewport: { width: W, height: H }, ...(MOBILE ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}) });
const page = await ctx.newPage();
const log = [];
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && log.push(`[${m.type()}] ${m.text().slice(0, 200)}`));
page.on('pageerror', (e) => log.push('[pageerror] ' + e.message.slice(0, 200)));
await page.goto(`${BASE}/field/${ID}${Q}`, { waitUntil: 'domcontentloaded' });
for (let k = 0; k < 80; k++) {
  const st = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.status);
  if (st === 'ready' || st === 'flat') break;
  await sleep(250);
}
await sleep(3000);
for (let i = 0; i < STEPS; i++) {
  const y = Math.round((i / (STEPS - 1)) * SPAN * H);
  await page.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)), y);
  await sleep(SETTLE);
  await page.screenshot({ path: `${OUT}/${TAG}-${ID}-${W}-s${i}.jpg`, type: 'jpeg', quality: 84 });
}
const f = await page.evaluate(() => window.__atlasField?.());
console.log(ID, W, 'rung', f?.rung, 'tier', f?.tier, 'console:', log.length ? log.join(' | ') : 'none');
await browser.close();
