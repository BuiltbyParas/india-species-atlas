// The field studies read: walk every study's arrival and each movement of its article (Encounter, Discover,
// Protect — the six beats inside them), down and back up, and check
// what the section says at each stop — the study on screen, whether it is being read, the beat the list marks, the
// beat whose head is near the eye, that every beat's text is in the DOM (not a canvas), console errors, failed media,
// sideways overflow and how many <video> elements exist.
//   BASE=http://127.0.0.1:4301 W=1440 H=900 OUT=... node scripts/audit/read-walk.mjs
// REDUCED=1 emulates prefers-reduced-motion; NOGL=1 disables WebGL; TOUCH=1 a phone; SHOTS=0 skips screenshots.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:4301';
const W = +(process.env.W ?? 1440);
const H = +(process.env.H ?? 900);
const OUT = process.env.OUT ?? `${process.env.HOME}/.cache/ispa-redesign/read-walk`;
const TAG = process.env.TAG ?? `${W}`;
const SHOTS = process.env.SHOTS !== '0';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const args = ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl', '--autoplay-policy=no-user-gesture-required'];
if (process.env.NOGL) args.push('--disable-webgl', '--disable-3d-apis');
const browser = await chromium.launch({ headless: true, args });
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: +(process.env.DPR ?? 1),
  reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference',
  hasTouch: Boolean(process.env.TOUCH),
  isMobile: Boolean(process.env.TOUCH),
});
const page = await ctx.newPage();
const log = [];
const failed = [];
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) log.push(`[${m.type()}] ${m.text().slice(0, 240)}`);
});
page.on('pageerror', (e) => log.push('[pageerror] ' + e.message.slice(0, 240)));
page.on('requestfailed', (r) => failed.push(`${r.url().slice(-80)} ${r.failure()?.errorText}`));
page.on('response', (r) => {
  if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(-80)}`);
});

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await sleep(+(process.env.WAIT ?? 9000));
const scrollTo = (y) =>
  page.evaluate((y) => {
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }, y);
const abs = (sel) => page.evaluate((sel) => [...document.querySelectorAll(sel)].map((e) => e.getBoundingClientRect().top + scrollY), sel);

const state = () =>
  page.evaluate(() => {
    const sec = document.querySelector('#field-studies');
    const comp = document.querySelector('.fs-comp.is-active');
    const cur = document.querySelector('.fs-list-beats a.is-current');
    // The beat whose head is nearest the upper third of the screen.
    let near = null;
    let best = Infinity;
    for (const b of document.querySelectorAll('.fs-sec')) {
      const d = Math.abs(b.getBoundingClientRect().top - innerHeight * 0.3);
      if (d < best) {
        best = d;
        near = `${b.closest('.fs-read').dataset.study}/${b.dataset.sec}`;
      }
    }
    const depth = document.querySelector('.fs-depth');
    return {
      study: comp?.className.match(/fs-comp--(\d+)/)?.[1],
      phase: comp?.dataset.phase,
      reading: sec?.dataset.reading !== undefined,
      listBeat: cur?.textContent ?? null,
      near,
      depth: depth ? +getComputedStyle(depth).opacity : null,
      stage: sec?.dataset.status,
      videos: document.querySelectorAll('video').length,
      hOverflow: document.documentElement.scrollWidth > innerWidth,
    };
  });

const text = await page.evaluate(() =>
  [...document.querySelectorAll('.fs-read')].map((a) => ({
    study: a.dataset.study,
    beats: [...a.querySelectorAll('.fs-beat')].map((b) => [b.dataset.beat, b.innerText.trim().length]),
    h3: a.querySelector('h3')?.textContent,
  })),
);
console.log('articles', JSON.stringify(text));
const empty = text.flatMap((t) => t.beats.filter(([, n]) => n < 40).map(([b]) => `${t.study}/${b}`));

const panels = await abs('.fs-index-panel');
const reads = await page.evaluate(() =>
  [...document.querySelectorAll('.fs-read')].map((a) => [...a.querySelectorAll('.fs-sec')].map((b) => b.getBoundingClientRect().top + scrollY)),
);
const sectionH = await page.evaluate(() => document.querySelector('#field-studies').offsetHeight);
console.log('section height', sectionH, '=', (sectionH / H).toFixed(1), 'screens');

const rows = [];
const stops = [];
panels.forEach((top, i) => {
  stops.push({ key: `s${i}-arrive`, y: top, expect: { study: String(i + 1).padStart(2, '0'), reading: false } });
  reads[i].forEach((y, j) => stops.push({ key: `s${i}-b${j}`, y: y - H * 0.3, expect: { study: String(i + 1).padStart(2, '0'), reading: true, beat: j } }));
  // The hand-over: the bridge line leaving, the next world coming (no expectation but the general ones).
  if (panels[i + 1]) stops.push({ key: `s${i}-hand`, y: panels[i + 1] - H * 0.42, expect: {} });
});
const secEnd = await page.evaluate(() => {
  const s = document.querySelector('#field-studies');
  return s.getBoundingClientRect().bottom + scrollY;
});
// Out of the section into Chapter 03, and into it from the survey plate above.
stops.push({ key: 'exit-a', y: secEnd - H * 1.0, expect: {} }, { key: 'exit-b', y: secEnd - H * 0.5, expect: {} }, { key: 'exit-c', y: secEnd, expect: {} });
stops.unshift({ key: 'enter', y: panels[0] - H * 0.6, expect: {} });
let bad = 0;
const BEATS = ['Encounter', 'Discover', 'Protect'];
const check = (st, s, dir) => {
  const errs = [];
  if (st.expect.study && s.study !== st.expect.study) errs.push(`study ${s.study}≠${st.expect.study}`);
  if (st.expect.reading !== undefined && s.reading !== st.expect.reading) errs.push(`reading ${s.reading}`);
  if (st.expect.beat !== undefined && W > 900 && s.listBeat !== BEATS[st.expect.beat]) errs.push(`list ${s.listBeat}≠${BEATS[st.expect.beat]}`);
  if (s.hOverflow) errs.push('h-overflow');
  if (s.videos > 1) errs.push(`videos ${s.videos}`);
  if (errs.length) bad++;
  console.log(dir, st.key.padEnd(9), errs.length ? 'FAIL ' + errs.join(', ') : 'ok', JSON.stringify(s));
  rows.push({ dir, key: st.key, ...s, errs });
};
for (const st of stops) {
  await scrollTo(st.y);
  await sleep(st.key.endsWith('arrive') || st.key.endsWith('hand') ? 2200 : 1100);
  const s = await state();
  check(st, s, 'down');
  if (SHOTS) await page.screenshot({ path: `${OUT}/${TAG}-${st.key}.jpg`, type: 'jpeg', quality: 80 });
}
// And back up: every study's arrival and first beat, from the bottom.
for (const st of [...stops].reverse().filter((s) => s.key.endsWith('arrive') || s.key.endsWith('b0'))) {
  await scrollTo(st.y);
  // A plate's clip is let go 0.9 s after its study is left (LivingPlate.tsx).
  await sleep(1600);
  check(st, await state(), 'up');
}
writeFileSync(`${OUT}/${TAG}-read-walk.json`, JSON.stringify({ rows, log, failed, empty }, null, 1));
console.log('beats with no text:', empty.length ? empty.join(', ') : 'none');
console.log('console:', log.length ? log.join('\n') : 'none');
console.log('failed requests:', failed.length ? failed.join('\n') : 'none');
console.log(bad ? `${bad} stops failed` : `all ${rows.length} stops ok`);
await browser.close();
process.exit(bad || empty.length || log.some((l) => l.startsWith('[pageerror]')) ? 1 : 0);
