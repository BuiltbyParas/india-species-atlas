// Creative-quality walk: homepage and all five studies at 1440x900, one screenshot per chapter. Headed Chromium, default flags.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://localhost:4200';
const OUT = process.env.OUT ?? 'scripts/audit/out/creative';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const TAG = process.env.TAG ?? 'before';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IDS = ['great-indian-bustard', 'snow-leopard', 'ganges-river-dolphin', 'bengal-tiger', 'indian-rhinoceros'];
const browser = await chromium.launch({ headless: false });
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
const log = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.push(`[${m.type()}] ${m.text().slice(0, 200)}`); });
page.on('pageerror', (e) => log.push('[pageerror] ' + e.message.slice(0, 200)));
const shot = (n) => page.screenshot({ path: `${OUT}/${TAG}-${W}-${n}.jpg`, type: 'jpeg', quality: 82 });
const t0 = Date.now();
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
for (const [i, ms] of [[0, 600], [1, 1400], [2, 3000]]) { await sleep(ms); await shot(`home-load${i}`); }
console.log('home ready-ish', Date.now() - t0, 'ms');
for (let i = 1; i <= 8; i++) { await page.mouse.move(W / 2, H / 2); await page.mouse.wheel(0, 650); await sleep(1300); await shot(`home-s${i}`); }
for (const id of IDS) {
  await page.goto(`${BASE}/field/${id}`, { waitUntil: 'domcontentloaded' });
  const t = Date.now(); await sleep(700); await shot(`${id}-a0`); await sleep(2500); await shot(`${id}-a1`);
  let last = -1, n = 0;
  for (let k = 0; k < 60 && n < 12; k++) {
    const c = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.current);
    if (c !== last) { last = c; n++; await sleep(1100); await shot(`${id}-c${c}`); }
    await page.mouse.wheel(0, 260); await sleep(160);
  }
  console.log(id, 'chapters shot', n, 'state', JSON.stringify(await page.evaluate(() => ({ ...(window.__atlasField?.() ?? {}), status: document.querySelector('.fs-study')?.dataset.status }))));
}
console.log('console:', log.length ? log : 'none');
await browser.close();
