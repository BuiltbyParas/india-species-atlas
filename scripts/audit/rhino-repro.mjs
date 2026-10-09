// Rhino white-screen reproduction: several journeys into /field/indian-rhinoceros, mean luminance of each frame + console/network errors.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4200';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const GPU = ['--use-gl=angle', '--use-angle=gl-egl', '--enable-gpu', '--ignore-gpu-blocklist'];
const IDS = ['great-indian-bustard', 'snow-leopard', 'ganges-river-dolphin', 'bengal-tiger', 'indian-rhinoceros'];
const browser = await chromium.launch({ args: GPU });
async function open() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ' ' + m.text().slice(0, 300)); });
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message + ' ' + (e.stack ?? '').split('\n').slice(0, 4).join('|')));
  await page.addInitScript(() => { window.addEventListener('webglcontextlost', () => console.warn('CTXLOST ' + Math.round(performance.now()) + ' ' + new Error().stack?.split('\n').length), true); });
  page.on('requestfailed', (r) => errs.push('reqfail ' + r.url()));
  page.on('response', (r) => { if (r.status() >= 400) errs.push('http' + r.status() + ' ' + r.url()); });
  return { ctx, page, errs };
}
const lum = async (page, name) => {
  if (process.env.NOLUM) { await page.screenshot({ path: `scripts/audit/out/${name}.png` }); return; }
  const buf = await page.screenshot({ path: `scripts/audit/out/${name}.png` });
  const r = await page.evaluate(async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = 64; c.height = 40; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 64, 40); const d = x.getImageData(0, 0, 64, 40).data; let s = 0, w = 0; for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; s += l; if (l > 240) w++; } return [Math.round(s / (d.length / 4)), Math.round(100 * w / (d.length / 4))]; }, buf.toString('base64'));
  const st = await page.evaluate(() => { const e = document.querySelector('.fs-study'); return e ? `${e.dataset.status}/ch${e.dataset.current}` : 'no-study'; });
  console.log(name.padEnd(28), 'meanLum', r[0], 'white%', r[1], st);
};
const mode = process.argv[2] ?? 'all';
// A: direct
if (mode === 'all' || mode === 'a') { const { ctx, page, errs } = await open(); await page.goto(`${BASE}/field/indian-rhinoceros`); await sleep(5000); await lum(page, 'A-direct'); console.log(errs); await ctx.close(); }
// B: walk through every study via Next, scrolling each to the end
if (mode === 'all' || mode === 'b') {
  const { ctx, page, errs } = await open(); await page.goto(`${BASE}/field/great-indian-bustard`); await sleep(3000);
  for (let i = 0; i < 5; i++) {
    for (let k = 0; k < 10; k++) { await page.mouse.wheel(0, 700); await sleep(350); }
    await lum(page, `B-${IDS[i]}-end`);
    if (i < 4) { await page.locator('.fs-next').first().click(); await sleep(i === 3 ? 6000 : 3000); await lum(page, `B-${IDS[i + 1]}-arrive`); }
  }
  console.log(errs); await ctx.close();
}
// C: fast wheel from index through studies
if (mode === 'all' || mode === 'c') {
  const { ctx, page, errs } = await open(); await page.goto(`${BASE}/field/bengal-tiger`); await sleep(3000);
  for (let k = 0; k < 40; k++) { await page.mouse.wheel(0, 1200); await sleep(60); }
  await sleep(500); await lum(page, 'C-tiger-fast-end');
  await page.locator('.fs-next').first().click();
  for (let k = 0; k < 30; k++) { await sleep(150); }
  await lum(page, 'C-rhino-after-fast'); console.log(errs); await ctx.close();
}
await browser.close();
