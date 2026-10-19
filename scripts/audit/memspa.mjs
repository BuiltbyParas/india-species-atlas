// One browser, one page load, then client-side route changes only (no reload): does heap / DOM / listeners / GPU-backed process RSS climb?
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const CYCLES = +(process.env.CYCLES ?? 4);
const ROUTES = (process.env.ROUTES ?? '/atlas,/species,/field/bengal-tiger,/compare,/conservation,/about,/field/great-indian-bustard,/').split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rss = () => { try { return Math.round(execSync(`ps -eo rss,args --no-headers | grep ms-playwright | grep -v grep | awk '{s+=$1} END {print s}'`).toString() / 1024); } catch { return -1; } };
const browser = await chromium.launch({ headless: false });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const cdp = await page.context().newCDPSession(page);
await cdp.send('Performance.enable');
await page.goto(BASE + '/atlas', { waitUntil: 'domcontentloaded' }); await sleep(4000);
const snap = async (tag) => { await cdp.send('HeapProfiler.collectGarbage'); const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value])); console.log(tag.padEnd(34), `heap ${(m.JSHeapUsedSize / 1048576).toFixed(1)}MB nodes ${m.Nodes} listeners ${m.JSEventListeners} rss ${rss()}MB`); };
for (let c = 0; c < CYCLES; c++) {
  for (const r of ROUTES) {
    await page.evaluate((to) => { history.pushState({}, '', to); dispatchEvent(new PopStateEvent('popstate')); }, r);
    await sleep(3500);
    for (let k = 0; k < 4; k++) { await page.mouse.wheel(0, 600); await sleep(150); }
    await sleep(500);
    if (r === '/') await snap(`cycle ${c} end at ${r}`);
  }
}
await browser.close();
