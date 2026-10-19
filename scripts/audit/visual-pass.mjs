// Usage: OUT=dir SHOTS="sel:offsetPx,..." node visual-pass.mjs — screenshots at offsets relative to an element's top (home page), plus optional about frames
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:5173', OUT = process.env.OUT, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: process.env.REDUCED === '1' ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
const tag = process.env.TAG ?? '';
await page.goto(BASE + (process.env.ROUTE ?? '/'), { waitUntil: 'domcontentloaded' }); await sleep(+(process.env.WAIT ?? 8000));
for (const s of (process.env.SHOTS ?? '').split(',').filter(Boolean)) {
  const [sel, off] = s.split('@');
  const y = await page.evaluate(([sel, off]) => {
    const e = sel === 'doc' ? document.documentElement : document.querySelector(sel);
    const base = sel === 'doc' ? 0 : e.getBoundingClientRect().top + scrollY;
    const v = off.endsWith('e') ? base + e.offsetHeight + +off.slice(0, -1) : base + +off;
    return Math.round(v);
  }, [sel, off]);
  await page.evaluate((v) => window.scrollTo(0, v), y); await sleep(1500);
  const name = `${tag}${sel.replace(/[^a-z0-9]/gi, '')}-${off}.png`;
  await page.screenshot({ path: `${OUT}/${name}` });
  console.log(name, y);
}
await browser.close();
