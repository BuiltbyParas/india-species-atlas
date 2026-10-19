// Whole-experience review: the study moves by click, normal and reduced motion — index → study, study → next study,
// study → index — each landing on the right page and world, the words arrived, the world handed back, the index at the
// study the reader left. Production build, GPU on. Env: BASE (default :4301).
import { chromium } from 'playwright';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const B = process.env.BASE ?? 'http://127.0.0.1:4301';
const browser = await chromium.launch({ headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
let bad = 0;
const ok = (c, msg) => { console.log(c ? 'ok  ' : 'FAIL', msg); if (!c) bad++; };
for (const rm of [false, true]) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: rm ? 'reduce' : 'no-preference' })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  const state = () => page.evaluate(() => { const s = document.querySelector('.fs-study'); const f = window.__atlasField?.(); return { path: location.pathname, arrived: s?.classList.contains('is-arrived') ?? null, held: s?.hasAttribute('data-held') ?? null, idxHeld: document.querySelector('.fs-index')?.hasAttribute('data-held') ?? null, idx: document.querySelector('.fs-index-stage')?.dataset.study ?? null, showing: f?.showing, mode: f?.mode, y: Math.round(scrollY) }; });
  const tag = rm ? '[rm]' : '[motion]';
  await page.goto(B + '/', { waitUntil: 'domcontentloaded' });
  await sleep(9000);
  const top = await page.evaluate(() => document.querySelector('#field-studies').getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => window.scrollTo(0, y), top + 2 * 900);
  await sleep(4500);
  await page.locator('.fs-comp.is-active .fs-comp-name a').click();
  await sleep(6000);
  let s = await state();
  ok(s.path === '/field/ganges-river-dolphin' && s.arrived && !s.held && s.showing === 'ganges-river-dolphin' && s.mode === 'host' && s.y === 0, `${tag} index → river study ${JSON.stringify(s)}`);
  await page.evaluate(() => { const run = document.querySelector('.fs-runway'); const c = run.lastElementChild; window.scrollTo(0, run.getBoundingClientRect().top + scrollY + c.offsetTop + c.offsetHeight * 0.5 - innerHeight * 0.5); });
  await sleep(2500);
  await page.locator('button', { hasText: 'Next field study' }).click();
  await sleep(7000);
  s = await state();
  ok(s.path === '/field/bengal-tiger' && s.arrived && !s.held && s.showing === 'bengal-tiger' && s.mode === 'host' && s.y === 0, `${tag} river → next (tiger) ${JSON.stringify(s)}`);
  await page.locator('.fs-exit').click();
  await sleep(7000);
  s = await state();
  ok(s.path === '/' && s.idx === 'bengal-tiger' && s.showing === 'bengal-tiger' && !s.idxHeld && s.mode === 'host', `${tag} tiger → index ${JSON.stringify(s)}`);
  const comp = await page.evaluate(() => [...document.querySelectorAll('.fs-comp.is-active .fs-comp-name .fs-word')].map((w) => w.textContent).join(' '));
  ok(comp?.startsWith('Bengal Tiger'), `${tag} index composition after return: ${comp}`);
  ok(errs.length === 0, `${tag} console errors: ${errs.length ? errs.join(' | ') : 'none'}`);
  await page.context().close();
}
console.log(bad ? `${bad} FAILED` : 'all passed');
await browser.close();
