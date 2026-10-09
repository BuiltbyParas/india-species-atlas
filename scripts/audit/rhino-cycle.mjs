// Rhino regression: slow scroll, leave/return (history), repeated visits and refresh in one page; reports luminance per frame and console problems.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4200';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=gl-egl', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ' ' + m.text().slice(0, 300)); });
page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
page.on('requestfailed', (r) => errs.push('reqfail ' + r.url()));
page.on('response', (r) => { if (r.status() >= 400) errs.push('http' + r.status() + ' ' + r.url()); });
await page.addInitScript(() => addEventListener('webglcontextlost', () => console.warn('CONTEXT_LOST_WEBGL'), true));
const snap = async (name) => {
  const buf = await page.screenshot({ path: `scripts/audit/out/${name}.png` });
  const lum = await page.evaluate(async (b64) => { const i = new Image(); i.src = 'data:image/png;base64,' + b64; await i.decode(); const c = document.createElement('canvas'); c.width = 64; c.height = 40; const x = c.getContext('2d'); x.drawImage(i, 0, 0, 64, 40); const d = x.getImageData(0, 0, 64, 40).data; let s = 0; for (let k = 0; k < d.length; k += 4) s += (d[k] + d[k + 1] + d[k + 2]) / 3; return Math.round(s / (d.length / 4)); }, buf.toString('base64'));
  const st = await page.evaluate(() => { const e = document.querySelector('.fs-study'); return e ? `${e.dataset.status}/ch${e.dataset.current}` : 'no-study'; });
  console.log(name.padEnd(26), 'lum', lum, st);
};
await page.goto(`${BASE}/field/bengal-tiger`); await sleep(3500);
await page.locator('.fs-next').first().click(); await sleep(5000); await snap('1-arrive');
for (let k = 0; k < 14; k++) { await page.mouse.wheel(0, 250); await sleep(500); } await snap('2-slow-scroll');
for (let n = 1; n <= 3; n++) {
  await page.goBack(); await sleep(3000); await snap(`3-left-${n}`);
  await page.goForward(); await sleep(4000); await snap(`4-returned-${n}`);
}
await page.reload(); await sleep(5000); await snap('5-refresh');
for (let k = 0; k < 6; k++) { await page.mouse.wheel(0, 700); await sleep(300); } await snap('6-after-refresh-scroll');
console.log('errors:', errs.length ? errs : 'none');
await browser.close();
