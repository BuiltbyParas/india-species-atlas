// One browser, N cycles through routes. Per route: CDP JS heap (after forced GC), DOM nodes, listeners, and the browser's own process RSS (child tree of this launch).
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const CYCLES = +(process.env.CYCLES ?? 3);
const ROUTES = (process.env.ROUTES ?? '/,/atlas,/species,/compare,/conservation,/about,/sources').split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: false });
const rss = () => { try { return Math.round(execSync(`ps -eo rss,args --no-headers | grep ms-playwright | grep -v grep | awk '{s+=$1} END {print s}'`).toString() / 1024); } catch { return -1; } };
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const cdp = await page.context().newCDPSession(page);
await cdp.send('Performance.enable');
const rows = [];
for (let c = 0; c < CYCLES; c++) for (const r of ROUTES) {
  await page.goto(BASE + r, { waitUntil: 'domcontentloaded' }); await sleep(3500);
  for (let k = 0; k < 6; k++) { await page.mouse.wheel(0, 700); await sleep(150); }
  await sleep(800);
  await cdp.send('HeapProfiler.collectGarbage');
  const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
  const row = { c, r, heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(1), nodes: m.Nodes, listeners: m.JSEventListeners, rssMB: rss() };
  rows.push(row); console.log(JSON.stringify(row));
}
await browser.close();
