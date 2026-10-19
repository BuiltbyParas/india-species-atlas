// The field studies read: the ways in, through and out. Returning from a study opens the index at that study's
// arrival (not inside another study's article); the header's /#field-studies lands on the first; the keyboard reaches
// the list's beat links and Enter moves the page to that beat; the skip link leaves the section for Chapter 03.
//   BASE=http://localhost:4301 node scripts/audit/read-nav.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4301';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
let bad = 0;
const ok = (name, cond, info = '') => {
  if (!cond) bad++;
  console.log(cond ? 'ok  ' : 'FAIL', name, info);
};
const state = () =>
  page.evaluate(() => {
    const comp = document.querySelector('.fs-comp.is-active');
    return {
      study: comp?.className.match(/fs-comp--(\d+)/)?.[1],
      phase: comp?.dataset.phase,
      reading: document.querySelector('#field-studies')?.dataset.reading !== undefined,
      path: location.pathname + location.hash,
      focus: document.activeElement?.textContent?.trim().slice(0, 40),
    };
  });

// 1. Into the tiger's study from the list, and back.
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await sleep(8000);
const top = await page.evaluate(() => document.querySelector('.fs-index-panel').getBoundingClientRect().top + scrollY);
await page.evaluate((y) => window.scrollTo(0, y), top);
await sleep(2500);
await page.click('.fs-list-item:has-text("Bengal Tiger")');
await page.waitForURL(/\/field\/bengal-tiger/, { timeout: 15000, waitUntil: 'commit' });
await sleep(4000);
await page.click('.fs-exit');
await page.waitForURL((u) => u.pathname === '/', { timeout: 15000, waitUntil: 'commit' });
await sleep(4000);
let s = await state();
ok('return lands on the tiger arrival', s.study === '04' && !s.reading && s.phase !== '3' && s.phase !== '4', JSON.stringify(s));

// 2. The header's Field studies, from another route.
await page.goto(`${BASE}/atlas`, { waitUntil: 'domcontentloaded' });
await sleep(3000);
await page.goto(`${BASE}/#field-studies`, { waitUntil: 'domcontentloaded' });
await sleep(8000);
s = await state();
ok('/#field-studies lands on the first study', s.study === '01' && !s.reading, JSON.stringify(s));

// 3. Keyboard: focus the snow leopard's list entry, Tab into its movements, Enter on "Discover".
await page.focus('.fs-list-item:has-text("Snow Leopard")');
await sleep(2500);
let found = false;
for (let i = 0; i < 6 && !found; i++) {
  await page.keyboard.press('Tab');
  await sleep(250);
  found = (await state()).focus === 'Discover';
}
ok('Tab reaches the beat links', found, JSON.stringify(await state()));
await page.keyboard.press('Enter');
await sleep(2500);
s = await state();
const beatTop = await page.evaluate(() => document.getElementById('read-snow-leopard-discover').getBoundingClientRect().top);
ok('Enter on a beat moves the page to it', s.study === '02' && s.reading && beatTop > 0 && beatTop < 450, `${JSON.stringify(s)} beatTop=${Math.round(beatTop)}`);
const visibleFocus = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== 'none');
ok('focused beat link shows a focus ring', visibleFocus);

// 4. The skip link leaves the section.
await page.evaluate((y) => window.scrollTo(0, y - innerHeight * 1.2), top);
await sleep(1500);
await page.focus('.fs-skip');
await page.keyboard.press('Enter');
await sleep(2500);
const after = await page.evaluate(() => {
  const ch = document.getElementById('selection-chapter');
  return { chTop: Math.round(ch.getBoundingClientRect().top), focus: document.activeElement?.id };
});
ok('skip link reaches Chapter 03', after.chTop > -120 && after.chTop < 450 && after.focus === 'selection-chapter', JSON.stringify(after));

ok('no page errors', errs.length === 0, errs.join(' | '));
await browser.close();
console.log(bad ? `${bad} failed` : 'all navigation checks ok');
process.exit(bad ? 1 : 0);
