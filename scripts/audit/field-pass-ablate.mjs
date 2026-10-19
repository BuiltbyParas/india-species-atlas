// What each layer of a world costs: hide one at a time (dev server, governor held), measure frame time while scrolling.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const ID = process.env.ID;
const W = 1440, H = 900;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
await page.goto(`${BASE}/field/${ID}?hold=1`, { waitUntil: 'domcontentloaded' });
for (let k = 0; k < 80; k++) { const st = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.status); if (st === 'ready') break; await sleep(250); }
await sleep(3000);
// Put the study in its first chapter and keep the camera still: measure the world, not the scroll.
const measure = async () => {
  await page.evaluate(() => { window.__iv = []; let last = 0; const f = (t) => { if (last) window.__iv.push(t - last); last = t; if (window.__iv.length < 150) requestAnimationFrame(f); }; requestAnimationFrame(f); });
  // Keep the sun moving (as a scroll or a hand does), so the light grid is redrawn every frame.
  const t0 = Date.now();
  let a = 0;
  while (Date.now() - t0 < 2700) { a += 0.2; await page.mouse.move(W / 2 + Math.cos(a) * 300, H / 2 + Math.sin(a) * 200); await sleep(16); }
  const iv = await page.evaluate(() => window.__iv);
  const s = [...iv].sort((x, y) => x - y);
  return { ms: +(iv.reduce((x, y) => x + y, 0) / iv.length).toFixed(2), p90: +s[Math.floor(s.length * 0.9)].toFixed(1) };
};
const names = await page.evaluate((id) => {
  const w = window.__fieldStage().worlds.get(id);
  return w.scene.children.map((c, i) => `${i}:${c.type}:${c.material?.type ?? ''}:${c.geometry?.type ?? ''}:${c.geometry?.instanceCount ?? c.count ?? ''}`);
}, ID);
console.log('children', names.join(' | '));
console.log('all', JSON.stringify(await measure()));
for (let i = 0; i < names.length; i++) {
  await page.evaluate(([id, i]) => { window.__fieldStage().worlds.get(id).scene.children[i].visible = false; }, [ID, i]);
  console.log('hide', names[i], JSON.stringify(await measure()));
  await page.evaluate(([id, i]) => { window.__fieldStage().worlds.get(id).scene.children[i].visible = true; }, [ID, i]);
}
await page.evaluate((id) => { const w = window.__fieldStage().worlds.get(id); w.__vol = w.volume; w.volume = undefined; w.grade.__b = w.grade.bloom; w.grade.bloom = 0; }, ID);
console.log('no volume, no bloom', JSON.stringify(await measure()));
await page.evaluate(() => window.__fieldStage().look.setRung(2));
console.log('+ no msaa', JSON.stringify(await measure()));
await browser.close();
