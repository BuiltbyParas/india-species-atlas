// The Fragments journey (RegionFragments' canvas stage), as a reader moves through it. Production build, GPU on.
// Checks at rest: the stage's stop agrees with the scroll (stopAt), the words shown are that stop's, the rail names
// it, the page never scrolls sideways; the drawing changes visibly between every pair of steps across the whole run;
// forward and backward land on the same state; a fling and a reversal settle correctly; hover, the rail, the keyboard
// and a click on the sheet work; frame timing across a steady pass. Env: W/H, BASE, OUT (screens).
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4301';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const OUT = process.env.OUT;
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errs = [];
page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
const results = [];
const check = (name, pass, info = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${info}`); };
const settle = async (extra = 1100) => {
  let last = -1;
  for (let i = 0; i < 80; i++) {
    const y = await page.evaluate(() => Math.round(scrollY));
    if (y === last) break;
    last = y;
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(extra);
};
const geom = await page.evaluate(() => { const s = document.getElementById('fragments'); return { top: s.getBoundingClientRect().top + scrollY, run: s.offsetHeight - innerHeight, journey: s.classList.contains('is-journey') }; });
check('journey mode on a wide screen', geom.journey, `run ${geom.run}px = ${(geom.run / H).toFixed(2)} screens`);
const stopAt = (p) => { const segs = 9, g = Math.min(segs, Math.max(0, p * segs)), k = Math.min(segs - 1, Math.floor(g)), u = g - k, t = Math.min(1, Math.max(0, (u - 0.2) / 0.6)); return -1 + k + t * t * (3 - 2 * t); };
const state = () => page.evaluate(() => {
  const s = document.getElementById('fragments');
  const r = s.getBoundingClientRect();
  const run = s.offsetHeight - innerHeight;
  const p = Math.min(1, Math.max(0, -r.top / run));
  const st = window.__fragments?.();
  const live = [...s.querySelectorAll('.fj-panel.is-live')].map((e) => +e.dataset.stop);
  const cur = s.querySelector('.fj-stop[aria-current]');
  const c = s.querySelector('.fj-canvas');
  const t = document.createElement('canvas'); t.width = 64; t.height = 40;
  t.getContext('2d').drawImage(c, 0, 0, 64, 40);
  const px = Array.from(t.getContext('2d').getImageData(0, 0, 64, 40).data);
  return { p, st, live, cur: cur ? [...s.querySelectorAll('.fj-stop')].indexOf(cur) : null, px, hscroll: document.documentElement.scrollWidth > innerWidth };
});
const diff = (a, b) => { let d = 0; for (let i = 0; i < a.length; i += 4) d += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return d / (a.length / 4) / 3; };
const wheelTo = async (target, step = 200, gap = 35) => {
  let y = await page.evaluate(() => scrollY);
  const dir = Math.sign(target - y);
  while (Math.abs(target - y) > step) { await page.mouse.wheel(0, dir * step); y += dir * step; await page.waitForTimeout(gap); }
  await settle(200);
  await page.evaluate((t) => window.scrollTo(0, t), target);
  await settle();
};
let shot = 0;
const agree = async (label) => {
  const s = await state();
  const want = stopAt(s.p);
  const near = Math.round(s.st.s);
  const ok = Math.abs(s.st.s - want) < 0.03 && (s.live.length === 0 || s.live.includes(near)) && (near < 0 || near > 7 || s.cur === near) && !s.hscroll;
  check(`${label} p=${s.p.toFixed(3)}`, ok, `stage s ${s.st.s.toFixed(2)} want ${want.toFixed(2)} | live ${s.live} | rail ${s.cur}`);
  if (OUT) await page.screenshot({ path: `${OUT}/journey-${W}-${String(++shot).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 62 });
  return s;
};
await page.evaluate((t) => window.scrollTo(0, t), geom.top - H);
await settle();
// Forward in 18 steps across the run: every step must change the drawing.
const fwd = new Map();
let prev = null; let still = 0; const diffs = [];
for (let i = 0; i <= 18; i++) {
  const f = i / 18;
  await wheelTo(Math.round(geom.top + f * geom.run));
  const s = await agree('forward');
  fwd.set(i, s);
  if (prev) { const d = diff(prev.px, s.px); diffs.push(d.toFixed(1)); if (d < 1.5) still++; }
  prev = s;
}
check('the drawing changes between every step of the run', still === 0, `mean |Δ| per step: ${diffs.join(' ')}`);
// Back over the same steps: the same states.
let mismatch = 0;
for (const i of [15, 11, 7, 3]) {
  await wheelTo(Math.round(geom.top + (i / 18) * geom.run));
  const s = await agree('back');
  if (Math.abs(s.st.s - fwd.get(i).st.s) > 0.03) mismatch++;
  const d = diff(s.px, fwd.get(i).px);
  if (d > 12) { mismatch++; console.log('  drawing differs from the forward pass by', d.toFixed(1)); }
}
check('backward lands on the forward states', mismatch === 0);
// A fling through and back, and a reversal mid-glide.
await page.evaluate((t) => window.scrollTo(0, t), geom.top + 0.1 * geom.run); await settle();
for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(16); }
await settle(); await agree('fling down');
for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, -900); await page.waitForTimeout(16); }
await settle(); await agree('fling up');
for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 600); await page.waitForTimeout(16); }
await page.waitForTimeout(150);
for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, -600); await page.waitForTimeout(16); }
await settle(); await agree('reversed mid-glide');
// Hover: at Western Ghats (stop 2), the pointer over the lifted piece makes it answer; leaving restores.
const stopY = (k) => Math.round(geom.top + ((k + 1) / 9) * geom.run);
await wheelTo(stopY(2));
const box = await page.evaluate(() => { const c = document.querySelector('.fj-canvas').getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height }; });
let found = null;
for (const [fx, fy] of [[0.62, 0.55], [0.66, 0.5], [0.6, 0.62], [0.64, 0.42], [0.7, 0.6]]) {
  await page.mouse.move(box.x + box.w * fx, box.y + box.h * fy, { steps: 5 });
  await page.waitForTimeout(600);
  const st = await page.evaluate(() => window.__fragments());
  const k = st.hover.findIndex((h) => h > 0.5);
  if (k >= 0) { found = { k, fx, fy, cursor: await page.evaluate(() => { const c = document.querySelector('.fj-canvas'); return c.dataset.cursor ?? getComputedStyle(c).cursor; }) }; break; }
}
check('hover over the sheet lifts a region and the cursor names the action', found && /pointer|Go to/.test(found.cursor), JSON.stringify(found));
if (OUT) await page.screenshot({ path: `${OUT}/journey-${W}-hover.jpg`, type: 'jpeg', quality: 70 });
await page.mouse.move(box.x + 30, box.y + box.h - 30, { steps: 4 });
await page.mouse.move(-10, H / 2);
await page.waitForTimeout(800);
const off = await page.evaluate(() => window.__fragments().hover.every((h) => h < 0.05));
check('leaving restores the composition', off);
// A species row: hover names its places on the sheet.
const row = page.locator('.fj-panel.is-live .frag-sp').first();
await row.hover(); await page.waitForTimeout(700);
if (OUT) await page.screenshot({ path: `${OUT}/journey-${W}-species.jpg`, type: 'jpeg', quality: 70 });
// Keyboard: focus the rail's 06 and press Enter: the page travels to that region.
await page.mouse.move(-10, H / 2);
await page.locator('.fj-stop').nth(5).focus();
await page.waitForTimeout(400);
const railHover = await page.evaluate(() => window.__fragments().hover[5]);
check('focusing a rail stop makes its region answer', railHover > 0.5, `hover ${railHover}`);
await page.keyboard.press('Enter');
await settle(1600);
let s = await state();
check('Enter on the rail travels to that region', Math.abs(s.st.s - 5) < 0.05, `s ${s.st.s.toFixed(2)}`);
// Tab into the words: focus moves into the live panel's species buttons.
await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
// Click on the sheet: on another region's piece, the camera travels there.
await page.mouse.move(-10, H / 2);
await wheelTo(stopY(-1));
const before = (await state()).st.s;
let clicked = false;
for (const [fx, fy] of [[0.6, 0.35], [0.66, 0.3], [0.7, 0.45], [0.62, 0.5]]) {
  await page.mouse.move(box.x + box.w * fx, box.y + box.h * fy, { steps: 3 });
  await page.waitForTimeout(400);
  const k = (await page.evaluate(() => window.__fragments())).hover.findIndex((h) => h > 0.5);
  if (k >= 0) { await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy); await settle(1800); s = await state(); clicked = { k, s: s.st.s }; break; }
}
check('a click on a region takes the camera there', clicked && Math.abs(clicked.s - clicked.k) < 0.05, JSON.stringify(clicked) + ` from ${before}`);
// Frame timing over a steady wheel pass through the run.
await page.mouse.move(-10, H / 2);
await page.evaluate((t) => window.scrollTo(0, t), geom.top); await settle();
await page.evaluate(() => { window.__ft = []; let last = performance.now(); const f = (t) => { window.__ft.push(t - last); last = t; if (window.__ft.length < 100000) window.__ftId = requestAnimationFrame(f); }; window.__ftId = requestAnimationFrame(f); });
for (let y = 0; y < geom.run; y += 120) { await page.mouse.wheel(0, 120); await page.waitForTimeout(33); }
await settle(300);
const ft = await page.evaluate(() => { cancelAnimationFrame(window.__ftId); const a = window.__ft.slice(5).sort((x, y) => x - y); const mean = a.reduce((s, v) => s + v, 0) / a.length; return { n: a.length, fps: +(1000 / mean).toFixed(1), p50: +a[Math.floor(a.length * 0.5)].toFixed(1), p95: +a[Math.floor(a.length * 0.95)].toFixed(1), slow: +(a.filter((v) => v > 25).length / a.length * 100).toFixed(1) }; });
console.log('frame timing across the run', JSON.stringify(ft));
console.log('errs', JSON.stringify(errs));
check('no console errors', errs.length === 0);
console.log(`${results.filter(Boolean).length}/${results.length} pass`);
await browser.close();
