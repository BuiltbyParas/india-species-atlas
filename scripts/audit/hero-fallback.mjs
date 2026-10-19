// Hero fallback continuity: at several scroll offsets, fire the real `webglcontextlost` listener on the hero canvas (the same path onTooSlow takes), and record scrollY, section geometry, the heading nearest the viewport top, and a screenshot before / right after / settled.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = process.env.OUT ?? 'scripts/audit/out/hero-fallback';
import { mkdirSync } from 'node:fs'; mkdirSync(OUT, { recursive: true });
const sl = (ms) => new Promise((r) => setTimeout(r, ms));
const positions = (process.env.POS ?? '1200,5000,9000,12500,15500').split(',').map(Number);
const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const snap = (page) => page.evaluate(() => {
  const h = document.querySelector('.hero-stage')?.closest('section') ?? null;
  const flat = !document.querySelector('.hero-stage');
  const vis = [...document.querySelectorAll('h1,h2,h3')].filter((e) => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).slice(0, 2).map((e) => e.textContent.trim().slice(0, 40));
  return { scrollY: Math.round(scrollY), doc: document.documentElement.scrollHeight, flat, vis };
});
for (const y of positions) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await sl(9000);
  const live = await page.evaluate(() => !!document.querySelector('.hero-stage canvas'));
  await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y); await sl(1500);
  const before = await snap(page); await page.screenshot({ path: `${OUT}/${y}-0before.png` });
  await page.evaluate(() => document.querySelector('.hero-stage canvas')?.dispatchEvent(new Event('webglcontextlost')));
  await sl(60); const after = await snap(page); await page.screenshot({ path: `${OUT}/${y}-1after.png` });
  const trace = []; for (let i = 0; i < 8; i++) { await sl(400); trace.push((await snap(page)).scrollY); }
  const settled = await snap(page); await page.screenshot({ path: `${OUT}/${y}-2settled.png` });
  console.log(JSON.stringify({ y, live, before, after, trace, settled, errs }));
  await page.context().close();
}
await browser.close();
