// Whole-experience review: the field stage's hand-overs as the compositor shows them (a CDP screencast, not forced
// screenshots, which can catch a blank frame mid-route-change). Each frame's mean brightness is read; a step of 4 or
// more between consecutive frames is reported with the gap before it, so a stall on a loaded machine can be told from
// a real pop. Production build, GPU on.
// Env: BASE (default :4301), OUT, MODE = enter (index → bengal-tiger) | exit (bengal-tiger → index) | next (river → tiger).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4301';
const MODE = process.env.MODE ?? 'enter';
const OUT = process.env.OUT ?? `${process.env.HOME}/.cache/ispa-review/cast-${MODE}`;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const ready = async () => { for (let k = 0; k < 80; k++) { if (await page.evaluate(() => document.querySelector('.fs-study')?.dataset.status === 'ready')) return; await sleep(250); } };
if (MODE === 'enter') {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await sleep(9000);
  const top = await page.evaluate(() => document.querySelector('#field-studies').getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo(0, y), top + 3 * 900);
  await sleep(4500);
} else {
  await page.goto(`${BASE}/field/${MODE === 'exit' ? 'bengal-tiger' : 'ganges-river-dolphin'}`, { waitUntil: 'domcontentloaded' });
  await ready();
  await sleep(4000);
  if (MODE === 'next') {
    await page.evaluate(() => { const run = document.querySelector('.fs-runway'); const c = run.lastElementChild; window.scrollTo(0, run.getBoundingClientRect().top + scrollY + c.offsetTop + c.offsetHeight * 0.5 - innerHeight * 0.5); });
    await sleep(3000);
  }
}
const cdp = await page.context().newCDPSession(page);
let n = 0; const t0 = Date.now(); const times = [];
cdp.on('Page.screencastFrame', async (f) => {
  const k = n++;
  times.push([k, Date.now() - t0]);
  writeFileSync(`${OUT}/f${String(k).padStart(3, '0')}.jpg`, Buffer.from(f.data, 'base64'));
  await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 60, maxWidth: 720, maxHeight: 450, everyNthFrame: 1 });
await sleep(300);
if (MODE === 'enter') await page.locator('.fs-comp.is-active .fs-comp-name a').click();
else if (MODE === 'exit') await page.locator('.fs-exit').click();
else await page.locator('button', { hasText: 'Next field study' }).click();
await sleep(5000);
await cdp.send('Page.stopScreencast');
await sleep(300);
const vals = times.map(([k, ms]) => [k, ms, +execFileSync('magick', [`${OUT}/f${String(k).padStart(3, '0')}.jpg`, '-format', '%[fx:mean*255]', 'info:']).toString()]);
const steps = vals.slice(1).map((v, i) => ({ frame: v[0], ms: v[1], delta: +(v[2] - vals[i][2]).toFixed(1), gapMs: v[1] - vals[i][1] })).filter((s) => Math.abs(s.delta) >= 4);
writeFileSync(`${OUT}/times.json`, JSON.stringify(vals));
console.log(MODE, '→', await page.evaluate(() => location.pathname), 'frames', vals.length, 'steps ≥ 4:', JSON.stringify(steps));
await browser.close();
