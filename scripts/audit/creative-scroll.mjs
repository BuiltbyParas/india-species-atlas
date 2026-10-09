// Fast, reversed and interrupted scrolling through a study: the stage must still show its own world and the chapter must follow the page.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4200';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IDS = (process.env.IDS ?? 'great-indian-bustard,indian-rhinoceros,bengal-tiger').split(',');
const browser = await chromium.launch({ headless: false });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const log = []; page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.push(`[${m.type()}] ${m.text().slice(0, 160)}`); });
let bad = 0;
const snap = (tag, id) => page.evaluate(([t, i]) => { const f = window.__atlasField?.() ?? {}; const s = document.querySelector('.fs-study'); return `${t.padEnd(14)} y=${Math.round(scrollY)} ch=${s?.dataset.current} status=${s?.dataset.status} showing=${f.showing} rung=${f.rung} failed=${f.failed} ok=${f.showing === i && !f.failed}`; }, [tag, id]);
for (const id of IDS) {
  await page.goto(`${BASE}/field/${id}`); await sleep(3500);
  for (const [tag, fn] of [
    ['fast down', async () => { for (let k = 0; k < 30; k++) { await page.mouse.wheel(0, 1400); await sleep(40); } }],
    ['settle', async () => { await sleep(2500); }],
    ['fast up', async () => { for (let k = 0; k < 30; k++) { await page.mouse.wheel(0, -1400); await sleep(40); } }],
    ['settle', async () => { await sleep(2500); }],
    ['zig-zag', async () => { for (let k = 0; k < 12; k++) { await page.mouse.wheel(0, k % 2 ? -900 : 1100); await sleep(90); } await sleep(2500); }],
  ]) { await fn(); const r = await snap(tag, id); if (!r.endsWith('ok=true')) bad++; console.log(id.padEnd(22), r); }
}
process.exitCode = bad ? 1 : 0;
console.log(bad ? `${bad} PROBLEMS` : 'ALL OK', 'console:', log.length ? log : 'none');
await browser.close();
