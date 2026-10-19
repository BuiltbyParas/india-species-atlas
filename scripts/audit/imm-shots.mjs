// Immersive pass captures: frames at offsets from elements' tops, reached by wheel (Lenis-friendly), settled.
// argv: OUT then specs "selector@offsetVh[@tag]" ... ; offset in viewport heights from the element's top.
// Env: W/H, BASE, RM=1, HOVER="x,y" (move the mouse there before each shot), WAIT ms.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [OUT, ...SPECS] = process.argv.slice(2);
const BASE = process.env.BASE ?? 'http://localhost:4301';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: process.env.NOGL ? ['--disable-webgl', '--disable-3d-apis'] : ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
const errs = [];
page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
await page.goto(BASE + (process.env.PATHNAME ?? '/'), { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4500);
const settle = async () => {
  let last = -1;
  for (let i = 0; i < 80; i++) {
    const y = await page.evaluate(() => Math.round(scrollY));
    if (y === last) break;
    last = y;
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(+(process.env.WAIT ?? 1200));
};
let n = 0;
for (const spec of SPECS) {
  const [sel, off, tag] = spec.split('@');
  const target = await page.evaluate(([sel, off]) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return Math.round(el.getBoundingClientRect().top + scrollY + Number(off) * innerHeight);
  }, [sel, off]);
  if (target === null) { console.log('missing', sel); continue; }
  let y = await page.evaluate(() => scrollY);
  const dir = Math.sign(target - y);
  while (Math.abs(target - y) > 300) { await page.mouse.wheel(0, dir * 300); y += dir * 300; await page.waitForTimeout(30); }
  await settle();
  const now = await page.evaluate(() => scrollY);
  if (Math.abs(now - target) > 2) { await page.evaluate((t) => window.scrollTo(0, t), target); await settle(); }
  if (process.env.HOVER) { const [hx, hy] = process.env.HOVER.split(',').map(Number); await page.mouse.move(hx, hy, { steps: 6 }); await page.waitForTimeout(700); }
  const name = `${String(++n).padStart(2, '0')}-${tag ?? sel.replace(/[^a-z0-9]+/gi, '')}-${off}`;
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 72 });
  const st = await page.evaluate(() => (window.__fragments ? window.__fragments() : null));
  console.log(name, 'y', Math.round(await page.evaluate(() => scrollY)), st ? JSON.stringify({ s: +st.s.toFixed(2), raw: +st.raw.toFixed(2) }) : '');
}
console.log('errs', JSON.stringify(errs));
await browser.close();
