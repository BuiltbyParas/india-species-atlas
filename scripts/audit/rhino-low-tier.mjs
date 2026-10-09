// Forces the lowest quality tier (three worlds in memory) and walks all five studies with Next; each arrival must be showing its own world and still be drawing.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4200';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IDS = ['great-indian-bustard', 'snow-leopard', 'ganges-river-dolphin', 'bengal-tiger', 'indian-rhinoceros'];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=gl-egl', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/GL Driver|parallel_shader/.test(m.text())) errs.push(m.text().slice(0, 200)); });
await page.goto(`${BASE}/field/${IDS[0]}?quality=low`); await sleep(3500);
let bad = 0;
const probe = async (id, tag) => {
  await sleep(600);
  const b = await page.evaluate(() => window.__atlasField());
  const ok = b.showing === id && !b.failed && b.calls >= 3; // a frozen stage draws 1 call: the previous world's frame stays on the canvas
  const png = await page.screenshot(); const lum = await page.evaluate(async (s) => { const i = new Image(); i.src = 'data:image/png;base64,' + s; await i.decode(); const c = document.createElement('canvas'); c.width = 32; c.height = 20; const x = c.getContext('2d'); x.drawImage(i, 0, 0, 32, 20); const d = x.getImageData(0, 0, 32, 20).data; let t = 0; for (let k = 0; k < d.length; k += 4) t += (d[k] + d[k + 1] + d[k + 2]) / 3; return Math.round(t / 640); }, png.toString('base64'));
  if (!ok) bad++;
  console.log(id.padEnd(22), tag.padEnd(7), `showing=${b.showing} mode=${b.mode} failed=${b.failed} calls=${b.calls} lum=${lum}`, ok ? 'OK' : 'MISMATCH');
};
for (let i = 0; i < 5; i++) {
  await probe(IDS[i], 'arrive');
  for (let k = 0; k < 10; k++) { await page.mouse.wheel(0, 700); await sleep(250); }
  await probe(IDS[i], 'end');
  if (i < 4) { await page.locator('.fs-next').first().click(); await sleep(3500); }
}
console.log('tier', await page.evaluate(() => sessionStorage.length ? JSON.stringify(Object.fromEntries(Object.entries(sessionStorage).filter(([k]) => /quality|tier/i.test(k)))) : 'none'));
console.log(bad ? `${bad} MISMATCHES` : 'all arrivals showed their own world', 'errors:', errs.length ? errs : 'none');
await browser.close();
