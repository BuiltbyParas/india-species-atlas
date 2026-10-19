// Which client-side route change leaves nodes/listeners behind? Prints live DOM count and CDP Nodes/listeners after each hop, two passes.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const ROUTES = (process.env.ROUTES ?? '/atlas,/species,/field/bengal-tiger,/compare,/conservation,/about,/field/great-indian-bustard,/').split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: false });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const cdp = await page.context().newCDPSession(page); await cdp.send('Performance.enable');
await page.goto(BASE + '/about', { waitUntil: 'domcontentloaded' }); await sleep(3000);
for (let pass = 0; pass < 3; pass++) for (const r of ROUTES) {
  await page.evaluate((to) => { history.pushState({}, '', to); dispatchEvent(new PopStateEvent('popstate')); }, r);
  await sleep(3000);
  await cdp.send('HeapProfiler.collectGarbage');
  const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
  const live = await page.evaluate(() => document.getElementsByTagName('*').length);
  console.log(`pass ${pass} ${r.padEnd(28)} live ${live}  Nodes ${m.Nodes}  listeners ${m.JSEventListeners}  docs ${m.Documents}  frames ${m.Frames}`);
}
await browser.close();
