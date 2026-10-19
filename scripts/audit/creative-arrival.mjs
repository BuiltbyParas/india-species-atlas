// Where does each chapter's text sit the moment it becomes current (settled), and how much of it is under the foot fade (below FOOT px)?
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4200';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const FOOT = H - 0.16 * H; // the HUD foot starts to bite about here
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IDS = ['great-indian-bustard', 'snow-leopard', 'ganges-river-dolphin', 'bengal-tiger', 'indian-rhinoceros'];
const browser = await chromium.launch({ headless: false });
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
for (const id of IDS) {
  await page.goto(`${BASE}/field/${id}`, { waitUntil: 'domcontentloaded' }); await sleep(3500);
  let last = '-1';
  for (let k = 0; k < 90; k++) {
    const c = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.current);
    if (c !== last) {
      last = c; await sleep(1500);
      const r = await page.evaluate(() => { const e = document.querySelector('.fs-ch.is-current .fs-ch-inner'); if (!e) return null; const t = [...e.querySelectorAll('p,h2,li,figcaption')].map((n) => n.getBoundingClientRect()); return { top: Math.round(Math.min(...t.map((x) => x.top))), bottom: Math.round(Math.max(...t.map((x) => x.bottom))), long: e.parentElement.classList.contains('is-long') }; });
      console.log(id.padEnd(22), 'ch', c, r ? `${r.long ? 'long ' : 'pin  '} top ${r.top} bottom ${r.bottom}${r.bottom > FOOT ? '  <-- in foot' : ''}` : '-');
    }
    await page.mouse.wheel(0, 150); await sleep(100);
  }
}
await browser.close();
