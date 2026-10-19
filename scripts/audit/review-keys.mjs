// Whole-experience review: the home page and one study by keyboard alone. Tab through the first N stops and record,
// for each, what has focus, whether a focus ring is drawn (outline or box-shadow), whether the element is on screen
// after the page has moved to it, and whether it sits inside something hidden from assistive technology.
// Env: BASE (default :4301), ROUTE (default /), N (default 60), W/H.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4301';
const ROUTE = process.env.ROUTE ?? '/';
const N = +(process.env.N ?? 60);
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
await sleep(ROUTE === '/' ? 10000 : 6000);
const rows = [];
for (let i = 0; i < N; i++) {
  await page.keyboard.press('Tab');
  await sleep(450);
  const r = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
    const b = el.getBoundingClientRect();
    const onScreen = b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth && b.width > 0;
    let hidden = false;
    for (let e = el; e; e = e.parentElement) if (e.getAttribute?.('aria-hidden') === 'true' || e.inert) hidden = true;
    const name = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 48);
    return { tag: el.tagName.toLowerCase(), name, ring, onScreen, hidden, y: Math.round(scrollY), opacity: cs.opacity, vis: cs.visibility };
  });
  if (!r) { rows.push({ i, tag: '(body)' }); continue; }
  rows.push({ i, ...r });
}
let bad = 0;
for (const r of rows) {
  const flags = [r.ring === false && 'NO-RING', r.onScreen === false && 'OFF-SCREEN', r.hidden && 'ARIA-HIDDEN', r.opacity === '0' && 'INVISIBLE', r.vis === 'hidden' && 'VIS-HIDDEN'].filter(Boolean);
  if (flags.length) bad++;
  console.log(String(r.i).padStart(2), (r.tag ?? '').padEnd(7), String(r.y ?? '').padStart(6), (r.name ?? '').padEnd(50), flags.join(' '));
}
console.log(`stops ${rows.length}, flagged ${bad}`, errs.length ? errs : '');
await browser.close();
