// One-session final checks: hero-sink opacity vs --p, Conservation 3D view, Compare chooser, risk-ladder contrast, Atlas map note vs attribution, console output per route.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173'; const OUT = 'scripts/audit/out/final'; mkdirSync(OUT, { recursive: true });
const sl = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const logs = {};
async function open(route, vp = { width: 1440, height: 900 }) {
  const page = await (await browser.newContext({ viewport: vp })).newPage();
  const L = logs[route + '@' + vp.width] = [];
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && L.push(`${m.type()}: ${m.text().slice(0, 160)}`));
  page.on('pageerror', (e) => L.push('pageerror: ' + String(e).slice(0, 160)));
  page.on('requestfailed', (r) => L.push('requestfailed: ' + r.url().slice(0, 100)));
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' }); await sl(8000); return page;
}
// 1 hero sink
{ const page = await open('/');
  const r = await page.evaluate(async () => { const out = []; const s = document.querySelector('.hero-stage'); const sec = s.closest('section'); const top = sec.getBoundingClientRect().top + scrollY; const run = sec.offsetHeight - innerHeight;
    for (const f of [0.5, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1]) { scrollTo({ top: top + f * run, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 350)); const k = document.querySelector('.hero-sink'); const p = +getComputedStyle(document.querySelector('.hero-stage')).getPropertyValue('--p'); const sheet = +(getComputedStyle(document.querySelector('.hero-stage')).getPropertyValue('--sheet') || 0); out.push({ f, p, sink: +(+getComputedStyle(k).opacity).toFixed(3), expect: +(Math.min(1, Math.max(0, (p - 0.7) * 5)) * (1 - sheet)).toFixed(3) }); } return out; });
  console.log('HERO SINK', JSON.stringify(r)); await page.context().close(); }
// 2 conservation 3D
{ const page = await open('/atlas');
  await page.getByRole('tab', { name: /conservation/i }).click(); await sl(1500);
  await page.getByRole('button', { name: /3D sites/i }).click(); await sl(6000);
  const st = await page.evaluate(() => ({ canvas: !!document.querySelector('#atlas-map-panel canvas, canvas'), pressed: [...document.querySelectorAll('[aria-pressed="true"]')].map((e) => e.textContent.trim()), msg: [...document.querySelectorAll('p')].map((p) => p.textContent).find((t) => /3D view/.test(t)) ?? null }));
  console.log('3D', JSON.stringify(st)); await page.screenshot({ path: `${OUT}/3d.png` });
  const cv = await page.$('canvas'); if (cv) { const b = await cv.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2 + 120, b.y + b.height / 2 + 30, { steps: 8 }); await page.mouse.up(); await sl(800); await page.screenshot({ path: `${OUT}/3d-drag.png` }); }
  await page.getByRole('button', { name: /^Map$/ }).click(); await sl(1500);
  console.log('3D→Map back', await page.evaluate(() => !!document.querySelector('.leaflet-container')));
  await page.screenshot({ path: `${OUT}/atlas-conservation-map.png` }); await page.context().close(); }
// 3 compare
{ const page = await open('/compare'); await page.screenshot({ path: `${OUT}/compare.png` });
  const n = await page.locator('.cc-mark').count(); const btn = page.locator('.cc-mark').first(); await btn.hover(); await sl(300);
  console.log('COMPARE marks', n, 'aria', await btn.getAttribute('aria-label'), 'readout', await page.locator('.cc-readout').innerText()); await page.context().close(); }
// 4 conservation contrast + caption, atlas note
const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
for (const w of [1440, 375]) { const page = await open('/conservation', { width: w, height: w > 500 ? 900 : 800 });
  const res = await page.evaluate(() => { const toRGB = (el) => { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = getComputedStyle(el).color; c.fillRect(0, 0, 1, 1); return [...c.getImageData(0, 0, 1, 1).data]; };
    const bg = getComputedStyle(document.body).backgroundColor; return [...document.querySelectorAll('.risk-rung-name, .risk-rung-species li, .risk-rung-none')].map((e) => ({ t: e.textContent.trim().slice(0, 24), c: toRGB(e), fs: getComputedStyle(e).fontSize })).concat([{ bg }]); });
  const bgm = res.at(-1).bg.match(/\d+/g).map(Number); const L2 = lum(bgm);
  const rows = res.slice(0, -1).map((r) => { const L1 = lum(r.c.slice(0, 3)); const [a, b] = L1 > L2 ? [L1, L2] : [L2, L1]; return `${r.t}:${((a + 0.05) / (b + 0.05)).toFixed(1)}`; });
  console.log('CONTRAST', w, 'bg', bgm.join(','), rows.join(' | '));
  await (await page.$('.risk-ladder'))?.scrollIntoViewIfNeeded(); await sl(800); await page.screenshot({ path: `${OUT}/conservation-${w}.png` }); await page.context().close(); }
{ const page = await open('/atlas'); await sl(2000);
  const g = await page.evaluate(() => { const a = document.querySelector('.leaflet-control-attribution')?.getBoundingClientRect(); const notes = [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && /basemap|note|approximate|boundar/i.test(e.textContent) && e.textContent.length < 300).map((e) => ({ t: e.textContent.slice(0, 60), r: e.getBoundingClientRect().toJSON() })); return { a: a?.toJSON(), notes }; });
  const ov = g.notes.map((n) => ({ t: n.t, overlap: g.a && !(n.r.right < g.a.left || n.r.left > g.a.right || n.r.bottom < g.a.top || n.r.top > g.a.bottom) }));
  console.log('ATLAS NOTE', JSON.stringify({ attr: g.a && [g.a.left, g.a.top, g.a.right, g.a.bottom].map(Math.round), ov })); await page.screenshot({ path: `${OUT}/atlas.png` }); await page.context().close(); }
for (const r of ['/species', '/field/tiger', '/about', '/sources']) { const p = await open(r); await p.context().close(); }
console.log('CONSOLE', JSON.stringify(logs, null, 1));
await browser.close();
