// Hero stability under load: the home page with Chrome's CPU throttle on, read every 500 ms while it settles and
// then while it is scrolled at a reader's pace. Logs the page height, every top-level section's height, whether the
// live hero is still running (.hero-stage), the atlas world's state, and any scroll the page made on its own.
// Pass: page and hero heights constant through the run, and no unrequested scroll movement over 4 px.
// Env: BASE (default http://localhost:4301), RATE (CPU throttle, default 4), W/H, SETTLE (ms, default 12000),
// SCROLL_TO (px, default 9000), OUT (JSON log path, optional), FORCE_AT (px: at that scroll position, fire the atlas
// canvas's `webglcontextlost`, the same path the hero takes when its governor gives up, so the fallback is
// exercised on every run rather than only when the machine happens to be slow enough).
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4301';
const RATE = +(process.env.RATE ?? 4);
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const SETTLE = +(process.env.SETTLE ?? 12000);
const SCROLL_TO = +(process.env.SCROLL_TO ?? 9000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });

const read = () =>
  page.evaluate(() => {
    const main = document.querySelector('main') ?? document.body;
    const sections = [...main.querySelectorAll(':scope > section, :scope > div > section')].map((s) => Math.round(s.getBoundingClientRect().height));
    const hero = document.querySelector('[data-hero-section]') ?? document.querySelector('.hero-stage')?.closest('section') ?? main.querySelector('section');
    return {
      t: Math.round(performance.now()),
      y: Math.round(scrollY),
      doc: document.documentElement.scrollHeight,
      hero: hero ? Math.round(hero.getBoundingClientRect().height) : null,
      live: !!document.querySelector('.atlas-canvas'),
      held: !!document.querySelector('.hero-stage[data-held]'),
      flat: !document.querySelector('.hero-stage'),
      sections,
    };
  });

const log = [];
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
for (let t = 0; t < SETTLE; t += 500) {
  await sleep(500);
  log.push({ phase: 'settle', ...(await read()) });
}
// Scroll at a reader's pace, checking that the page does not move by itself between steps.
let drift = 0;
const FORCE_AT = process.env.FORCE_AT === undefined ? null : +process.env.FORCE_AT;
for (let y = 0; y < SCROLL_TO; y += 300) {
  await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y);
  if (FORCE_AT !== null && y === FORCE_AT) await page.evaluate(() => document.querySelector('.atlas-canvas')?.dispatchEvent(new Event('webglcontextlost')));
  await sleep(450);
  const r = await read();
  drift = Math.max(drift, Math.abs(r.y - Math.min(y, r.doc - H)));
  log.push({ phase: 'scroll', want: y, ...r });
}
const docs = log.map((r) => r.doc), heroes = log.map((r) => r.hero ?? 0);
const summary = {
  base: BASE, rate: RATE, viewport: `${W}x${H}`,
  docMin: Math.min(...docs), docMax: Math.max(...docs), docChange: Math.max(...docs) - Math.min(...docs),
  heroMin: Math.min(...heroes), heroMax: Math.max(...heroes),
  liveAtEnd: log.at(-1).live, heldAtEnd: log.at(-1).held,
  maxUnrequestedScroll: drift, errors,
};
console.log(JSON.stringify(summary));
for (const r of log.filter((_, i) => i % 4 === 0 || i === log.length - 1)) console.log(JSON.stringify({ ...r, sections: r.sections.join(',') }));
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify({ summary, log }, null, 1));
await browser.close();
