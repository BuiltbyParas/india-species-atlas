// Usage: OUT=dir node look.mjs  — hero frames, chapter 04 through closing, about page
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:5173', OUT = process.env.OUT, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const only = (process.env.ONLY ?? 'hero,cons,about').split(',');
const reduced = process.env.REDUCED === '1';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
const tag = reduced ? 'rm-' : '';
if (only.includes('hero') || only.includes('cons')) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await sleep(8000);
  if (only.includes('hero')) for (const y of (process.env.HY ?? '0,400,900,1600').split(',').map(Number)) {
    await page.evaluate((v) => window.scrollTo(0, v), y); await sleep(1500);
    await page.screenshot({ path: `${OUT}/${tag}hero-${y}.png` });
  }
  if (only.includes('cons')) {
    const top = await page.evaluate(() => { const e = document.getElementById('conservation-chapter'); return e.getBoundingClientRect().top + scrollY; });
    const h = await page.evaluate(() => document.getElementById('conservation-chapter').offsetHeight);
    console.log('cons top', top, 'height', h);
    const fr = (process.env.CF ?? '0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1').split(',').map(Number);
    for (const f of fr) {
      const t2 = await page.evaluate(() => document.getElementById('conservation-chapter').getBoundingClientRect().top + scrollY);
      const h2 = await page.evaluate(() => document.getElementById('conservation-chapter').offsetHeight);
      const y = Math.round(t2 + f * (h2 - 900));
      await page.evaluate((v) => window.scrollTo(0, v), y); await sleep(1600);
      await page.screenshot({ path: `${OUT}/${tag}cons-${f}.png` });
      for (const h of (process.env.HOVERS ?? '').split(',').filter(Boolean)) {
        const [at, sel, n] = h.split(':');
        if (+at !== f) continue;
        await page.locator('#conservation-chapter ' + sel).nth(+n).hover(); await sleep(900);
        await page.screenshot({ path: `${OUT}/${tag}cons-${f}-hover.png` }); await page.mouse.move(5, 5); await sleep(400);
      }
    }
  }
}
if (only.includes('about')) {
  await page.goto(BASE + '/about', { waitUntil: 'domcontentloaded' }); await sleep(4000);
  const total = await page.evaluate(() => document.documentElement.scrollHeight); let i = 0;
  console.log('about total', total);
  const ys = process.env.AY ? process.env.AY.split(',').map(Number) : Array.from({ length: Math.min(12, Math.ceil(total / 850)) }, (_, k) => k * 850);
  for (const y of ys) {
    i++;
    await page.evaluate((v) => window.scrollTo(0, v), y); await sleep(1100);
    await page.screenshot({ path: `${OUT}/${tag}about-${y}.png` });
  }
}
await browser.close();
