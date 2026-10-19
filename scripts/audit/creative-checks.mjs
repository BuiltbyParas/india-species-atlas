// Creative master pass checks. OUT=dir
//  1. hero emergence mid-way and settled; 2. hero gives up mid-descent (context lost) → chapter 04 still drawn when pinned;
//  3. narrow (390) chapter 04 + about; 4. console errors on /, /about, /atlas, /field/<id>.
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:5173', OUT = process.env.OUT, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const errors = [];
const mk = async (w, h) => { const p = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage(); p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => m.type() === 'error' && errors.push(m.text())); return p; };
let page = await mk(1440, 900);
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
let at = 0;
for (const t of [2600, 3600, 4600, 8000]) { await sleep(t - at); at = t; await page.screenshot({ path: `${OUT}/emerge-${t}.png` }); }
// 2. drop the hero to flat mid-descent
await page.evaluate(() => window.scrollTo(0, 700)); await sleep(1200);
await page.evaluate(() => document.querySelector('.hero-stage canvas')?.dispatchEvent(new Event('webglcontextlost')));
await sleep(1500);
const info = await page.evaluate(() => ({ flat: !document.querySelector('.hero-stage'), h: document.documentElement.scrollHeight }));
const top = await page.evaluate(() => document.getElementById('conservation-chapter').getBoundingClientRect().top + scrollY);
await page.evaluate((v) => window.scrollTo(0, v), Math.round(top + 0.3 * 3240)); await sleep(1800);
const vars = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('.cons-stage')); return { draw: c.getPropertyValue('--draw'), frag: c.getPropertyValue('--frag') }; });
console.log('after bail', info, 'chapter04 at 0.3', vars);
await page.screenshot({ path: `${OUT}/bail-cons.png` });
await page.close();
// 3. narrow
page = await mk(390, 844);
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await sleep(7000);
const nt = await page.evaluate(() => { const e = document.getElementById('conservation-chapter'); return [e.getBoundingClientRect().top + scrollY, e.offsetHeight]; });
for (const f of [0.1, 0.4, 0.85]) { await page.evaluate((v) => window.scrollTo(0, v), Math.round(nt[0] + f * nt[1])); await sleep(1200); await page.screenshot({ path: `${OUT}/narrow-cons-${f}.png` }); }
await page.goto(BASE + '/about', { waitUntil: 'domcontentloaded' }); await sleep(3000);
for (const y of [0, 1400]) { await page.evaluate((v) => window.scrollTo(0, v), y); await sleep(1000); await page.screenshot({ path: `${OUT}/narrow-about-${y}.png` }); }
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
console.log('about narrow horizontal overflow', overflow);
await page.close();
// 4. other routes
page = await mk(1440, 900);
for (const r of ['/atlas', '/field/bengal-tiger', '/conservation', '/documentary']) { await page.goto(BASE + r, { waitUntil: 'domcontentloaded' }); await sleep(4500); }
await page.screenshot({ path: `${OUT}/last-route.png` });
console.log('errors', errors.length ? errors : 'none');
await browser.close();
