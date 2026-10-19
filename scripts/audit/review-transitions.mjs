// Whole-experience review: the moves between places, as timed frames. Home index → a study (the camera goes in),
// the end of a study → the next study (one world turns into the next), a study → back to the index, and a working
// page → the home page (the ruled page turn). Production build, GPU on. Env: BASE, OUT, W/H, MOBILE=1, ID (the study
// to enter, default bengal-tiger), EVERY (ms between frames, default 160), N (frames per move, default 18).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4301';
const OUT = process.env.OUT ?? `${process.env.HOME}/.cache/ispa-review/transitions`;
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const ID = process.env.ID ?? 'bengal-tiger';
const EVERY = +(process.env.EVERY ?? 160), N = +(process.env.N ?? 18);
const MOBILE = !!process.env.MOBILE;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, ...(MOBILE ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}) });
const page = await ctx.newPage();
const log = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.push(`[${m.type()}] ${m.text().slice(0, 200)}`); });
page.on('pageerror', (e) => log.push('[pageerror] ' + e.message.slice(0, 200)));
const tag = `${W}${MOBILE ? 'm' : ''}`;
const state = () => page.evaluate(() => {
  const f = window.__atlasField?.();
  return `${location.pathname} y=${Math.round(scrollY)} field=${f ? `${f.mode}/${f.showing}/r${f.rung}${f.failed ? '/FAILED' : ''}` : '-'}`;
});
async function film(name) {
  const t0 = Date.now();
  for (let k = 0; k < N; k++) {
    await page.screenshot({ path: `${OUT}/${tag}-${name}-${String(k).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 70 }).catch(() => {});
    const wait = (k + 1) * EVERY - (Date.now() - t0);
    if (wait > 0) await sleep(wait);
  }
  console.log(name, 'frames', N, 'in', Date.now() - t0, 'ms →', await state());
}
const scrollY = (y) => page.evaluate((y) => window.scrollTo(0, y), y);

// 1. Home, to the index at the chosen study, then in.
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await sleep(9000);
const i = ['great-indian-bustard', 'snow-leopard', 'ganges-river-dolphin', 'bengal-tiger', 'indian-rhinoceros'].indexOf(ID);
const top = await page.evaluate(() => document.querySelector('#field-studies').getBoundingClientRect().top + window.scrollY);
await scrollY(top + i * H);
await sleep(4500);
console.log('index', await state());
await page.screenshot({ path: `${OUT}/${tag}-enter-pre.jpg`, type: 'jpeg', quality: 80 });
const link = page.locator('.fs-comp.is-active .fs-comp-name a');
await link.click();
await film('enter');
await sleep(2000);

// 2. The end of the study, then the next study.
const end = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
await scrollY(end);
await sleep(3500);
await page.screenshot({ path: `${OUT}/${tag}-next-pre.jpg`, type: 'jpeg', quality: 80 });
const next = page.locator('a[href^="/field/"]').filter({ hasNotText: 'Previous' }).first();
console.log('next link:', await next.getAttribute('href'), '|', (await next.innerText()).replace(/\s+/g, ' ').slice(0, 60));
await next.click();
await film('next');
await sleep(2500);

// 3. Back to the index from the study's way out.
const back = page.locator('a').filter({ hasText: /^\s*Field studies\s*$/ }).last();
await back.click();
await film('back');
await sleep(2000);

// 4. A working page, then home by the header's name (the page turn).
await page.goto(`${BASE}/species`, { waitUntil: 'domcontentloaded' });
await sleep(3500);
await page.locator('header a').first().click();
await film('home');
console.log('console:', log.length ? '\n' + log.join('\n') : 'none');
await browser.close();
