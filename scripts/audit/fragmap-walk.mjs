// Walks the home page to fractions of a section's run and keeps a frame at each (production build, GPU on).
// argv: OUT TAG selector f1,f2,...   Env: W/H, RM=1, BASE
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [OUT, TAG, SEL, FS] = process.argv.slice(2);
const BASE = process.env.BASE ?? 'http://localhost:4301';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
const errs = [];
page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4500);
let y = 0;
for (const f of FS.split(',').map(Number)) {
  const target = await page.evaluate(([sel, f]) => {
    const el = document.querySelector(sel);
    const r = el.getBoundingClientRect();
    return Math.round(r.top + scrollY + f * Math.max(r.height - innerHeight, innerHeight));
  }, [SEL, f]);
  // Step there as a reader would, so scrubbed timelines see the whole way.
  const step = Math.sign(target - y) * 240;
  while (Math.abs(target - y) > 240) { y += step; await page.mouse.wheel(0, step); await page.waitForTimeout(40); }
  await page.evaluate((t) => window.scrollTo(0, t), target); y = target;
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${OUT}/${TAG}-${f}.jpg`, type: 'jpeg', quality: 70 });
}
console.log('errs', JSON.stringify(errs));
await browser.close();
