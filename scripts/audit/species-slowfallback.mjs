// The flat fallback is still reached when a device genuinely cannot hold the field stage: hold the first world under
// heavy CPU throttling (no scrolling, so nothing excuses the frames) and wait for the stage to give up and the
// study's photograph to stand in. BASE=http://localhost:5173 RATE=20 node scripts/audit/species-slowfallback.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto(BASE + '/', { waitUntil: 'load' });
await sleep(2500);
const top = await p.evaluate(() => document.querySelector('.fs-index-panel').getBoundingClientRect().top + scrollY);
await p.evaluate((y) => window.__lenis.scrollTo(y, { immediate: true, force: true }), top + 300);
await sleep(5000);
const cdp = await p.context().newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: +(process.env.RATE ?? 20) });
let s;
for (let t = 0; t < 40; t++) {
  await sleep(1000);
  s = await p.evaluate(() => ({ failed: window.__atlasField().failed, reason: window.__atlasField().failReason, status: document.getElementById('field-studies').dataset.status, flat: Boolean(document.querySelector('.fs-flat-img')) }));
  if (s.failed && s.flat) break;
}
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
console.log(s.failed && s.flat && s.status === 'flat' ? 'ok  ' : 'FAIL', 'fallback under sustained slowness', JSON.stringify(s));
await b.close();
process.exit(s.failed && s.flat ? 0 : 1);
