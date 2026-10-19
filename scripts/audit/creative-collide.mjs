// Settled-state collision check: at rest on each chapter, do visible chapter text boxes overlap the progress line, the HUD coordinates, the credit, the exit link or the header?
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4200';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IDS = ['great-indian-bustard', 'snow-leopard', 'ganges-river-dolphin', 'bengal-tiger', 'indian-rhinoceros'];
const browser = await chromium.launch({ headless: false });
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
const measure = () => page.evaluate(() => {
  const vis = (e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && +s.opacity > 0.3 && s.visibility !== 'hidden'; };
  const box = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
  const hit = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
  const avoid = [['progress', '.fs-progress'], ['hud', '.fs-hud-coord, .fs-hud'], ['credit', '.fs-credit'], ['exit', '.fs-exit']].flatMap(([n, q]) => [...document.querySelectorAll(q)].filter(vis).map((e) => [n, box(e)]));
  avoid.push(['header', { l: 0, t: 0, r: innerWidth, b: 80 }]);
  const texts = [...document.querySelectorAll('.fs-ch-inner')].filter(vis).flatMap((c) => [...c.querySelectorAll('p,h1,h2,h3,li,a,figcaption,span.fs-figure-value')].filter((e) => e.children.length === 0 || e.tagName !== 'LI').filter(vis));
  const out = [];
  for (const t of texts) { const b = box(t); const hits = avoid.filter(([, a]) => hit(b, a)).map(([n]) => n); if (b.b > innerHeight + 2) hits.push('below-fold'); if (hits.length) out.push(`${t.tagName.toLowerCase()}"${(t.textContent || '').trim().slice(0, 28)}" ${hits.join('+')}`); }
  return out;
});
for (const id of IDS) {
  await page.goto(`${BASE}/field/${id}`, { waitUntil: 'domcontentloaded' }); await sleep(3500);
  let last = '-1';
  for (let k = 0; k < 80; k++) {
    const c = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.current);
    if (c !== last) { last = c; await sleep(2600); const o = await measure(); console.log(id.padEnd(22), 'ch', c, o.length ? o.join(' | ') : 'clear'); }
    await page.mouse.wheel(0, 180); await sleep(120);
  }
}
await browser.close();
