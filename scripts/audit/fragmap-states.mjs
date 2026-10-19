// Superseded on wide screens by imm-frag-journey.mjs (18 Oct immersive pass): the run is now a canvas stage, not a sideways track.
// Fragments (the horizontal run at the end of Chapter 01), as a reader moves through it: forward and back in steps,
// a fast fling through and back, a reversal mid-run, keyboard focus into a fragment off the frame. At each rest the
// track's offset must agree with the scroll's place in the section, the fragment named in the foot must be the one in
// the middle, the page must not scroll sideways. Also frame timing across a steady pass. Production build, GPU on.
// Env: W/H, BASE, OUT.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4301';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const OUT = process.env.OUT;
const browser = await chromium.launch({ args: process.env.NOGL ? ['--disable-webgl', '--disable-3d-apis'] : ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errs = [];
page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
const results = [];
const check = (name, pass, info = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${info}`); };
const settle = async () => {
  let last = -1;
  for (let i = 0; i < 60; i++) {
    const y = await page.evaluate(() => Math.round(scrollY));
    if (y === last) break;
    last = y;
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(900); // the scrub's own catch-up
};
const state = () => page.evaluate(() => {
  const s = document.getElementById('fragments');
  const track = s.querySelector('.frags-track');
  const r = s.getBoundingClientRect();
  const run = s.offsetHeight - innerHeight;
  const p = Math.min(1, Math.max(0, -r.top / run));
  const distance = track.scrollWidth - innerWidth;
  const m = /translate3d\((-?[\d.]+)px/.exec(track.style.transform);
  const x = m ? -parseFloat(m[1]) : 0;
  // Which fragment's centre is nearest the middle of the frame, by layout.
  const arts = [...track.querySelectorAll('article.frag')];
  let best = null, bd = Infinity;
  for (const a of arts) { const b = a.getBoundingClientRect(); const d = Math.abs(b.left + b.width / 2 - innerWidth / 2); if (d < bd) { bd = d; best = a.querySelector('h3')?.textContent; } }
  return { p, expect: p * distance, x, now: s.querySelector('.frags-now')?.textContent ?? '', centred: best, bd: bd / (arts[0]?.offsetWidth || 1), hscroll: document.documentElement.scrollWidth > innerWidth };
});
const top = await page.evaluate(() => document.getElementById('fragments').getBoundingClientRect().top + scrollY);
const run = await page.evaluate(() => { const s = document.getElementById('fragments'); return s.offsetHeight - innerHeight; });
console.log('section run px', run, 'vh', (run / H).toFixed(2));
// Arrive by wheel from above.
await page.evaluate((t) => window.scrollTo(0, t), top - H);
await settle();
const stepTo = async (target, step = 240, gap = 40) => {
  let y = await page.evaluate(() => scrollY);
  const dir = Math.sign(target - y);
  while (Math.abs(target - y) > step) { await page.mouse.wheel(0, dir * step); y += dir * step * 0.9; await page.waitForTimeout(gap); }
  await settle();
};
let n = 0;
const agree = async (label) => {
  const s = await state();
  const okX = Math.abs(s.x - s.expect) < 6;
  const nameOk = s.bd > 0.6 || !s.centred || s.now.includes(s.centred);
  check(`${label} p=${s.p.toFixed(2)}`, okX && nameOk && !s.hscroll, `x ${s.x.toFixed(0)}/${s.expect.toFixed(0)} | foot "${s.now}" centred "${s.centred}"`);
  if (OUT) await page.screenshot({ path: `${OUT}/states-${W}-${String(++n).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 65 });
};
for (const f of [0.1, 0.35, 0.6, 0.85, 1.0]) { await stepTo(top + f * run); await agree(`forward`); }
for (const f of [0.7, 0.4, 0.15]) { await stepTo(top + f * run); await agree(`back`); }
// A fling through and back.
for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(16); }
await settle();
await agree('fling down');
for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, -900); await page.waitForTimeout(16); }
await settle();
await agree('fling up');
// Interrupted: reverse halfway through a glide.
await page.evaluate((t) => window.scrollTo(0, t), top + 0.3 * run);
await settle();
for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(16); }
await page.waitForTimeout(120);
for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, -700); await page.waitForTimeout(16); }
await settle();
await agree('reversed mid-glide');
// Keyboard: from the opening, Tab into the run, then on through the fragments' buttons; each focused button must be
// brought into the frame (the page scrolls so its fragment comes to the middle; the clipped frame never scrolls).
await page.evaluate((t) => window.scrollTo(0, t), top + 2);
await settle();
await page.locator('#fragments article.frag').nth(0).locator('button').first().focus();
await page.waitForTimeout(2200);
let kbOk = true;
const seen = [];
for (let i = 0; i < 14; i++) {
  await settle();
  const kb = await page.evaluate(() => {
    const el = document.activeElement;
    const b = el.getBoundingClientRect();
    return { inView: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight, scrollLeft: document.querySelector('.frags-frame').scrollLeft, label: el.textContent?.slice(0, 40), frag: el.closest('article')?.querySelector('h3')?.textContent };
  });
  if (!kb.frag) break;
  seen.push(`${kb.frag}:${kb.label}:${kb.inView ? 'in' : 'OUT'}`);
  if (!kb.inView || kb.scrollLeft !== 0) kbOk = false;
  await page.keyboard.press('Tab');
}
check('keyboard Tab walks the fragments in frame', kbOk && seen.length >= 10, seen.join(' | '));
// Frame timing across one steady pass of the run (wheel, reader pace).
await page.evaluate((t) => window.scrollTo(0, t), top - 10);
await settle();
await page.evaluate(() => { window.__ft = []; let last = performance.now(); const f = (t) => { window.__ft.push(t - last); last = t; if (window.__ftOn) requestAnimationFrame(f); }; window.__ftOn = true; requestAnimationFrame(f); });
let y = 0;
while (y < run) { await page.mouse.wheel(0, 120); y += 108; await page.waitForTimeout(33); }
await page.waitForTimeout(800);
const ft = await page.evaluate(() => { window.__ftOn = false; return window.__ft.slice(5); });
const sorted = [...ft].sort((a, b) => a - b);
const fps = 1000 / (ft.reduce((a, b) => a + b, 0) / ft.length);
const slow = ft.filter((x) => x > 33.4).length;
console.log(`frames ${ft.length} mean fps ${fps.toFixed(1)} p95 ${sorted[Math.floor(sorted.length * 0.95)].toFixed(1)}ms slow(>33ms) ${slow}`);
console.log('errs', JSON.stringify(errs));
console.log(results.every(Boolean) && !errs.length ? 'ALL PASS' : `${results.filter((x) => !x).length} FAIL`);
await browser.close();
