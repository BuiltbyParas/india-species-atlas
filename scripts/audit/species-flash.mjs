// Species section static-image repro: wheel down through all five field studies, then back up, ROUNDS times, while an
// in-page sampler logs every frame on which a still image is on screen over (or instead of) the field stage: the flat
// photograph (.fs-flat), a plate's poster without its clip playing, the encounter's still. Also logs the stage's own state
// changes (status, failed/failReason, mode, showing) and the section's height in screens.
// BASE=http://localhost:5173 W=1440 H=900 ROUNDS=2 SHOTS=1 node scripts/audit/species-flash.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://localhost:5173';
const W = +(process.env.W ?? 1440);
const H = +(process.env.H ?? 900);
const ROUNDS = +(process.env.ROUNDS ?? 2);
const SHOTS = process.env.SHOTS === '1';
const OUT = process.env.OUT ?? 'scripts/audit/out/species-flash';
const STEP = +(process.env.STEP ?? 240);
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({
  headless: process.env.HEADLESS === '1',
  args: ['--ignore-gpu-blocklist', '--enable-gpu', '--autoplay-policy=no-user-gesture-required', ...(process.env.NOGL ? ['--disable-webgl', '--disable-3d-apis'] : [])],
});
const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
const log = [];
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && log.push(`[${m.type()}] ${m.text().slice(0, 220)}`));
page.on('pageerror', (e) => log.push('[pageerror] ' + e.message.slice(0, 220)));
page.on('requestfailed', (r) => log.push(`[requestfailed] ${r.url().slice(-80)} ${r.failure()?.errorText}`));
await page.addInitScript(() => {
  window.__ev = [];
  let last = '';
  const vis = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= innerHeight || r.width < 2 || r.height < 2) return false;
    let o = 1;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      o *= +cs.opacity;
    }
    return o > 0.05 ? +o.toFixed(2) : false;
  };
  window.__gaps = [];
  let prev = 0;
  const tick = () => {
    const now = performance.now();
    if (prev && window.__measure) window.__gaps.push(now - prev);
    prev = now;
    const sec = document.getElementById('field-studies');
    if (sec) {
      const f = window.__atlasField?.() ?? {};
      const flat = vis(document.querySelector('.fs-flat-img'));
      const plates = [...document.querySelectorAll('.fs-plate')].map((p) => {
        const still = vis(p.querySelector('.fs-plate-still'));
        const v = p.querySelector('video');
        // A video with a decoded frame covers the still, playing or paused; only a still with no frame over it is shown.
        const covered = v && v.readyState >= 2;
        return still && !covered ? `${p.dataset.plate}:still(${p.dataset.state})@${still}` : '';
      }).filter(Boolean);
      const s = [
        `status=${sec.dataset.status}`,
        `study=${sec.querySelector('.fs-index-stage')?.dataset.study}`,
        `mode=${f.mode}`,
        `show=${f.showing}`,
        f.failed ? `FAILED(${f.failReason})` : '',
        flat ? `FLATIMG@${flat}` : '',
        plates.join(','),
      ].filter(Boolean).join(' ');
      if (s !== last) {
        last = s;
        window.__ev.push(`${Math.round(performance.now())} y=${Math.round(scrollY)} ${s}`);
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await page.goto(BASE + '/', { waitUntil: 'load' });
await sleep(2500);
const geo = await page.evaluate(() => {
  const s = document.getElementById('field-studies');
  const r = s.getBoundingClientRect();
  return { top: r.top + scrollY, height: s.offsetHeight, vh: innerHeight, screens: +(s.offsetHeight / innerHeight).toFixed(2), doc: document.documentElement.scrollHeight };
});
console.log(`viewport ${W}x${H}`, JSON.stringify(geo));
const jump = (y) => page.evaluate((y) => { const l = window.__lenis; if (l) l.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); }, y);
await jump(geo.top - H * 1.2);
await sleep(2500);
await page.mouse.move(W * 0.3, H * 0.5);
await page.evaluate(() => (window.__measure = true));
let shot = 0;
const pass = async (dir, tag) => {
  const end = dir > 0 ? geo.top + geo.height : geo.top - H * 0.8;
  for (let k = 0; k < 400; k++) {
    const y = await page.evaluate(() => scrollY);
    if ((dir > 0 && y >= end) || (dir < 0 && y <= end)) break;
    await page.mouse.wheel(0, dir * STEP);
    await sleep(110);
    if (SHOTS && k % 6 === 0) await page.screenshot({ path: `${OUT}/${tag}-${String(shot++).padStart(3, '0')}.jpg`, quality: 60, type: 'jpeg' });
  }
  await sleep(1200);
};
for (let r = 1; r <= ROUNDS; r++) {
  await pass(1, `r${r}down`);
  await pass(-1, `r${r}up`);
}
const ev = await page.evaluate(() => window.__ev);
const bad = ev.filter((e) => /FLATIMG|still\(|FAILED/.test(e));
console.log('--- events', ev.length);
for (const e of ev) console.log(e);
console.log('--- still-image frames (events)', bad.length);
const perf = await page.evaluate(() => {
  const g = window.__gaps.slice().sort((a, b) => a - b);
  const q = (k) => g[Math.min(g.length - 1, Math.floor(g.length * k))]?.toFixed(1);
  const f = window.__atlasField?.() ?? {};
  return { frames: g.length, median: q(0.5), p90: q(0.9), p99: q(0.99), over32: (g.filter((x) => x > 32).length / g.length).toFixed(3), over50: (g.filter((x) => x > 50).length / g.length).toFixed(3), heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, glGeometries: f.geometries, glTextures: f.textures, worlds: f.worldCount };
});
console.log('frame gaps (ms) and memory', JSON.stringify(perf));
console.log('field', JSON.stringify(await page.evaluate(() => { const f = window.__atlasField?.() ?? {}; return { failed: f.failed, failReason: f.failReason, recoveries: f.recoveries, tier: f.tier, rung: f.rung, modeLog: f.modeLog, buildMs: f.buildMs }; })));
console.log('console', log.length ? log.slice(0, 30) : 'none');
await browser.close();
