// Whole-experience review: the home page scrolled as a reader would — wheel steps at a steady pace with a pause on
// each chapter — logging, every 250 ms, where the page is, the frame rate the page actually got, and what the field
// stage and the atlas world are doing (mode, rung, gave up and why). Optional screenshots at a fixed interval.
// Env: BASE (default :4301), OUT, W/H, PX (wheel step, default 80), MS (ms between steps, default 60),
// PAUSE (ms to rest every PAUSE_EVERY px, default 900 / 900), SHOTS=ms (screenshot interval, 0 = none), TAG,
// FROM/TO (px range to scroll, default whole page), MOBILE=1.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4301';
const OUT = process.env.OUT ?? `${process.env.HOME}/.cache/ispa-review/scroll`;
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const PX = +(process.env.PX ?? 80), MS = +(process.env.MS ?? 60);
const PAUSE = +(process.env.PAUSE ?? 900), PAUSE_EVERY = +(process.env.PAUSE_EVERY ?? 900);
const SHOTS = +(process.env.SHOTS ?? 0);
const TAG = process.env.TAG ?? 'cur';
const MOBILE = !!process.env.MOBILE;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, ...(MOBILE ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}) });
const page = await ctx.newPage();
const log = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.push(`[${m.type()}] ${m.text().slice(0, 240)}`); });
page.on('pageerror', (e) => log.push('[pageerror] ' + e.message.slice(0, 240)));
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await sleep(11000);
// Frame intervals as the page sees them.
await page.evaluate(() => {
  window.__iv = [];
  let last = 0;
  const tick = (t) => { if (last) window.__iv.push(t - last); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
const sample = () => page.evaluate(() => {
  const iv = window.__iv.splice(0);
  const fps = iv.length ? 1000 / (iv.reduce((a, b) => a + b, 0) / iv.length) : 0;
  const long = iv.filter((x) => x > 50).length;
  const f = window.__atlasField?.();
  return {
    t: Math.round(performance.now()), y: Math.round(scrollY), fps: +fps.toFixed(1), long, max: Math.round(Math.max(0, ...iv)),
    env: document.documentElement.dataset.env ?? '',
    // The atlas world (hero + Ch. 04) and the hero's height: a scene that gives up changes the page under the reader.
    atlas: window.__atlasWorld?.().live ?? null,
    hero: Math.round(document.querySelector('main section')?.getBoundingClientRect().height ?? 0),
    page: document.documentElement.scrollHeight,
    field: f ? { mode: f.mode, showing: f.showing, rung: f.rung, failed: f.failed, why: f.failReason, rec: f.recoveries } : null,
  };
});
const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const FROM = +(process.env.FROM ?? 0), TO = Math.min(total, +(process.env.TO ?? total));
if (FROM) { await page.evaluate((y) => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), FROM); await sleep(2500); }
await page.mouse.move(W * 0.5, H * 0.5);
const rows = [];
let lastSample = Date.now(), lastShot = Date.now(), sinceRest = 0, k = 0;
// A wheel the page stops answering (a section that holds it, the end of the page) must not hang the run.
const START = Date.now(), LIMIT = +(process.env.LIMIT ?? 360000);
let lastY = -1, still = 0;
await page.evaluate(() => (window.__iv = []));
while (true) {
  const y = await page.evaluate(() => scrollY);
  if (y >= TO - 2) break;
  still = y === lastY ? still + 1 : 0;
  lastY = y;
  if (still > 40) {
    // What holds the wheel: the element under the pointer and its ancestors, every full-screen fixed layer, the lock.
    const why = await page.evaluate(() => {
      const chain = []; let e = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      while (e && chain.length < 6) { chain.push(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${String(e.className).split(' ').slice(0, 2).join('.')}`); e = e.parentElement; }
      const fixed = [...document.querySelectorAll('body *')].filter((n) => { const c = getComputedStyle(n); return c.position === 'fixed' && c.pointerEvents !== 'none' && c.display !== 'none' && n.getBoundingClientRect().height > innerHeight * 0.8; }).map((n) => `${n.tagName.toLowerCase()}.${String(n.className).slice(0, 50)} z${getComputedStyle(n).zIndex}`);
      return { chain, fixed, html: getComputedStyle(document.documentElement).overflow, body: getComputedStyle(document.body).overflow, cls: document.documentElement.className, sh: document.documentElement.scrollHeight, field: window.__atlasField?.() };
    });
    console.log('STALLED at', y, 'of', TO, JSON.stringify(why));
    break;
  }
  if (Date.now() - START > LIMIT) { console.log('TIME LIMIT at', y, 'of', TO); break; }
  await page.mouse.wheel(0, PX);
  sinceRest += PX;
  await sleep(MS);
  if (sinceRest >= PAUSE_EVERY) { sinceRest = 0; await sleep(PAUSE); }
  if (Date.now() - lastSample >= 250) {
    lastSample = Date.now();
    const r = await sample();
    rows.push(r);
    if (rows.length % 8 === 0) console.log(`  … y ${r.y} ${r.fps}fps ${r.env} ${r.field ? `${r.field.mode}/${r.field.showing}/r${r.field.rung}${r.field.failed ? ' FAILED ' + r.field.why : ''}` : ''}`);
  }
  if (SHOTS && Date.now() - lastShot >= SHOTS) {
    lastShot = Date.now();
    await page.screenshot({ path: `${OUT}/${TAG}-${String(k++).padStart(3, '0')}.jpg`, type: 'jpeg', quality: 72 });
  }
}
await sleep(1500);
rows.push(await sample());
const fin = await page.evaluate(() => window.__atlasField?.() ?? null);
writeFileSync(`${OUT}/${TAG}-scroll.json`, JSON.stringify({ rows, fin, log }, null, 1));
// One line per second: position, fps, long frames, field stage.
let prev = '';
for (const r of rows.filter((_, i) => i % 4 === 0)) {
  const f = r.field ? `${r.field.mode}/${r.field.showing ?? '-'}/r${r.field.rung}${r.field.failed ? ' FAILED ' + r.field.why : ''}${r.field.rec ? ' rec' + r.field.rec : ''}` : '';
  const line = `${String(r.y).padStart(6)} ${String(r.fps).padStart(5)}fps long${String(r.long).padStart(2)} max${String(r.max).padStart(4)} ${r.env.padEnd(10)} atlas=${r.atlas} hero=${r.hero} page=${r.page} ${f}`;
  console.log(line); prev = line;
}
const all = rows.filter((r) => r.fps);
console.log('mean fps', (all.reduce((a, r) => a + r.fps, 0) / all.length).toFixed(1), 'windows', JSON.stringify(fin?.windows), 'modeLog', JSON.stringify(fin?.modeLog?.slice(-6)));
console.log('console:', log.length ? '\n' + log.join('\n') : 'none');
await browser.close();
