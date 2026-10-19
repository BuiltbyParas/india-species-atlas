// Screenshot each movement of each study, head 18% down the screen. W H OUT; STUDY to limit; SEC to limit.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const OUT = process.env.OUT ?? 'scripts/audit/out/species-shot';
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ headless: process.env.HEADLESS !== '0', args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const p = await (await b.newContext({ viewport: { width: W, height: H }, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' })).newPage();
await p.goto((process.env.BASE ?? 'http://localhost:5173') + '/?hold=1', { waitUntil: 'load' });
await p.waitForTimeout(1500);
const ids = await p.evaluate(() => [...document.querySelectorAll('.fs-sec')].map((s) => s.id));
const panels = await p.evaluate(() => [...document.querySelectorAll('.fs-index-panel')].map((x) => x.getBoundingClientRect().top + scrollY));
const jump = (y) => p.evaluate((y) => { const l = window.__lenis; if (l) l.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); }, y);
const studies = ['great-indian-bustard', 'snow-leopard', 'ganges-river-dolphin', 'bengal-tiger', 'indian-rhinoceros'];
for (const [i, y] of panels.entries()) {
  if (process.env.STUDY && !studies[i].includes(process.env.STUDY)) continue;
  await jump(y - 0); await p.waitForTimeout(2600);
  await p.screenshot({ path: `${OUT}/${i}-arrival.jpg`, type: 'jpeg', quality: 70 });
  for (const id of ids.filter((x) => x.includes(studies[i]))) {
    if (process.env.SEC && !id.endsWith(process.env.SEC)) continue;
    const t = await p.evaluate((id) => document.getElementById(id).getBoundingClientRect().top + scrollY, id);
    await jump(t - H * 0.12); await p.waitForTimeout(1600);
    await p.screenshot({ path: `${OUT}/${i}-${id.split('-').pop()}.jpg`, type: 'jpeg', quality: 70 });
  }
}
await b.close();
