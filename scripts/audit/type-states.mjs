// The type pass's states, checked rather than looked at: after a jump (End, Home, a mid-page landing) every animated
// line must settle readable; scrubbed lines must reverse; the split text must read exactly as written; nothing may
// overflow the page sideways. Production build (vite preview). BASE (default :4301), W/H.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4301';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
const errs = [];
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errs.push(m.text().slice(0, 160)));
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 160)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await sleep(6500);
let fails = 0;
const check = (name, ok, detail = '') => {
  if (!ok) fails++;
  console.log(ok ? 'ok  ' : 'FAIL', name, detail);
};
const jump = (y) => page.evaluate((v) => (window.__lenis ? window.__lenis.scrollTo(v, { immediate: true, force: true }) : window.scrollTo(0, v)), y);
const at = (sel, f) => page.evaluate(([s, f, vh]) => { const el = document.querySelector(s); const top = el.getBoundingClientRect().top + scrollY; return Math.round(top + f * vh); }, [sel, f, H]);
// Lowest opacity / largest blur among a set of elements (computed).
const settle = (sel) => page.evaluate((s) => {
  const els = [...document.querySelectorAll(s)];
  let minO = 1, maxB = 0;
  for (const el of els) {
    const cs = getComputedStyle(el);
    minO = Math.min(minO, +cs.opacity);
    const m = /blur\(([\d.]+)px\)/.exec(cs.filter);
    if (m) maxB = Math.max(maxB, +m[1]);
  }
  return { n: els.length, minO: +minO.toFixed(2), maxB: +maxB.toFixed(2) };
}, sel);
// Rendered text (paragraphs separated), as a reader or a screen reader gets it.
const text = (sel) => page.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, ' ').trim(), sel);

// Text reads exactly as written.
check('Ch.02 statement text', (await text('.chapter-lit-statement')) === 'Five species, five kinds of ground. Each is shown where it is recorded, what cuts through that ground, and what protects it.', await text('.chapter-lit-statement'));
check('hinge text', (await text('.cons-close-b')) === 'It is about where we choose to protect them.', await text('.cons-close-b'));
check('coda text', (await text('.final-coda')) === 'Mapping what remains. Understanding what is at risk. Protecting what can still be saved.', await text('.final-coda'));
check('h1 text', (await text('h1')) === 'India Species Atlas', await text('h1'));

// End: the closing must be resolved without having been scrolled through.
await page.keyboard.press('End');
await sleep(2600);
const end = await page.evaluate(() => scrollY);
let s = await settle('.final-coda-line');
check('End → coda resolved', s.minO > 0.97 && s.maxB < 0.3, JSON.stringify(s));
s = await settle('.final-title .fw');
check('End → name met and sharp', s.minO > 0.97 && s.maxB < 0.3, JSON.stringify(s));

// Home, then a direct landing mid-Ch.04: the threat's name settles.
await page.keyboard.press('Home');
await sleep(1500);
await jump(await at('#conservation-chapter', 2.2));
await sleep(2200);
s = await settle('.cons-feature-name .fx-w');
check('Ch.04 landing → threat name resolved', s.n > 0 && s.minO > 0.97 && s.maxB < 0.3, JSON.stringify(s));

// Ch.02: resolved when passed, unresolved again when scrolled back above it (the scrub reverses).
await jump(await at('#species-chapter', 0));
await sleep(900);
s = await settle('.lit-word');
check('Ch.02 read → all words resolved', s.minO > 0.97 && s.maxB < 0.3, JSON.stringify(s));
await jump(await at('#species-chapter', -0.75));
await sleep(900);
s = await settle('.lit-word');
check('Ch.02 scrolled back → words wait in depth', s.minO < 0.5 && s.maxB > 1, JSON.stringify(s));

// Fast fling down and back through the whole page, then rest on Ch.03 at hold: its words settled and sharp.
for (let y = 0; y < end; y += H * 3) {
  await jump(y);
  await sleep(16);
}
for (let y = end; y > 0; y -= H * 3) {
  await jump(y);
  await sleep(16);
}
const sel = await page.evaluate((vh) => { const el = document.querySelector('#selection-chapter'); const top = el.getBoundingClientRect().top + scrollY; return Math.round(top - vh * 0.6 + 0.72 * (el.offsetHeight - vh + vh * 0.6)); }, H);
await jump(sel);
await sleep(2200);
s = await settle('.selection-title .ink-word, .selection-body .ink-word');
check('fling → Ch.03 hold: title and body resolved', s.minO > 0.97 && s.maxB < 0.3, JSON.stringify(s));
s = await settle('.sel-text');
check('fling → Ch.03 hold: column present', s.minO > 0.97 && s.maxB < 0.3, JSON.stringify(s));

const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
check('no sideways overflow', over <= 0, `${over}px`);
check('console clean', errs.length === 0, JSON.stringify(errs.slice(0, 6)));
console.log(fails ? `${fails} failed` : 'all passed');
await browser.close();
process.exit(fails ? 1 : 0);
