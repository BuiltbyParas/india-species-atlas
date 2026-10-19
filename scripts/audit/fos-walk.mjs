// Field of species: walk the field-studies index beat by beat (name → notes and plate → credit) for every study,
// and record what the section holds at each stop: the beat, the plates' states, how many <video> elements exist (never
// more than one should be decoding), console errors and failed media requests.
//   BASE=http://127.0.0.1:4301 W=1440 H=900 OUT=... node scripts/audit/fos-walk.mjs
// REDUCED=1 emulates prefers-reduced-motion; NOGL=1 disables WebGL.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:4301';
const W = +(process.env.W ?? 1440);
const H = +(process.env.H ?? 900);
const OUT = process.env.OUT ?? `${process.env.HOME}/.cache/ispa-redesign/fos-after`;
const TAG = process.env.TAG ?? `${W}`;
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
// BLOCKWEBM=1: refuse the clips (the plates' still and failure path, and a check of whether decoding affects the stage).
if (process.env.BLOCKWEBM) await page.route(/\.webm$/, (r) => r.abort());
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
const top = await page.evaluate(() => {
  const el = document.querySelector('#field-studies');
  return el ? el.getBoundingClientRect().top + scrollY : -1;
});
const n = await page.evaluate(() => document.querySelectorAll('.fs-comp').length);
// Each study's arrival on the page (its stretch is its arrival and then its article: StudyReading.tsx).
const panels = await page.evaluate(() => [...document.querySelectorAll('.fs-index-panel')].map((p) => p.getBoundingClientRect().top + scrollY));
console.log('index top', Math.round(top), 'studies', n);
const rows = [];
const only = process.env.STUDIES ? process.env.STUDIES.split(',').map(Number) : [...Array(n).keys()];
for (const i of only) {
  for (const [beat, off] of [
    ['a', -0.3],
    ['b', 0],
    ['c', 0.32],
  ]) {
    await scrollTo(panels[i] + off * H);
    await sleep(beat === 'b' ? 2600 : 1900);
    const s = await page.evaluate(() => {
      const comp = document.querySelector('.fs-comp.is-active');
      const plates = [...document.querySelectorAll('.fs-plate')].map((p) => `${p.dataset.plate}:${p.classList.contains('is-shown') ? 'open' : 'shut'}/${p.dataset.state}`);
      const videos = [...document.querySelectorAll('video')].map((v) => ({ src: v.currentSrc.split('/').pop().slice(0, 40), paused: v.paused, muted: v.muted, ready: v.readyState }));
      return {
        study: comp?.className.match(/fs-comp--(\d+)/)?.[1],
        phase: comp?.dataset.phase,
        sci: comp?.querySelector('.fs-comp-sci')?.textContent,
        plates,
        videos,
        stage: document.querySelector('#field-studies')?.dataset.status,
        hOverflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    rows.push({ i, beat, ...s });
    console.log(i, beat, JSON.stringify(s));
    await page.screenshot({ path: `${OUT}/${TAG}-s${i}${beat}.jpg`, type: 'jpeg', quality: 82 });
  }
}
writeFileSync(`${OUT}/${TAG}-walk.json`, JSON.stringify({ rows, log, failed }, null, 1));
console.log('console:', log.length ? log.join('\n') : 'none');
console.log('failed requests:', failed.length ? failed.join('\n') : 'none');
await browser.close();
