// Fragments and the working map where the run does not move: reduced motion (desktop) and a phone. Full-section
// captures, plus: no sideways page scroll, every fragment's title and species list readable (opacity 1, on the page),
// map markers present. argv: OUT TAG. Env: W/H, RM=1, BASE.
import { chromium } from 'playwright';
const [OUT, TAG] = process.argv.slice(2);
const BASE = process.env.BASE ?? 'http://localhost:4301';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: process.env.RM ? 'reduce' : 'no-preference', isMobile: W < 600, hasTouch: W < 600, deviceScaleFactor: W < 600 ? 2 : 1 });
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
const sec = await page.evaluate(() => { const s = document.getElementById('fragments'); return { cls: s.className, top: s.getBoundingClientRect().top + scrollY, h: s.offsetHeight }; });
console.log('section', JSON.stringify(sec));
// Walk through it, a screen at a time, so in-view reveals play, keeping a frame at each.
let i = 0;
for (let y = sec.top - H * 0.2; y < sec.top + sec.h + H * 1.2; y += H * 0.9) {
  await page.evaluate((t) => window.scrollTo(0, t), y);
  await page.waitForTimeout(900);
  if (i < 14) await page.screenshot({ path: `${OUT}/${TAG}-${String(i++).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 62 });
}
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const arts = [...document.querySelectorAll('#fragments article.frag')];
  const unreadable = arts.filter((a) => {
    const t = a.querySelector('.frag-text');
    const name = a.querySelector('.frag-name');
    return getComputedStyle(t).opacity !== '1' || name.getBoundingClientRect().width < 20;
  }).map((a) => a.querySelector('h3').textContent);
  return { hscroll: document.documentElement.scrollWidth > innerWidth, arts: arts.length, unreadable, markers: document.querySelectorAll('#home-map-panel .leaflet-marker-icon').length };
});
console.log(JSON.stringify(r));
console.log('errs', JSON.stringify(errs));
console.log(!r.hscroll && r.arts === 8 && !r.unreadable.length && r.markers === 52 && !errs.length ? 'ALL PASS' : 'FAIL');
await browser.close();
