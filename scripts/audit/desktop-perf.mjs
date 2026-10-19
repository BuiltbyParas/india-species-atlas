// Desktop performance measurement for the field studies and main routes.
// One preview server, one Chromium, scenarios run strictly in sequence.
// Usage: node scripts/audit/desktop-perf.mjs <label> [WxH] [scenario,...]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const label = process.argv[2] ?? 'run';
const [W, H] = (process.argv[3] ?? '1440x900').split('x').map(Number);
const only = process.argv[4]?.split(',');
const PORT = 4173;
const BASE = `http://localhost:${PORT}`;
const OUT = new URL(`./out/`, import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const STUDIES = ['great-indian-bustard', 'snow-leopard', 'ganges-river-dolphin', 'bengal-tiger', 'indian-rhinoceros'];

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await sleep(200); }

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=gl-egl', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--hide-scrollbars', '--force-color-profile=srgb', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
});
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const results = { label, viewport: `${W}x${H}`, date: new Date().toISOString(), scenarios: {} };

const RECORDER = () => {
  const r = (window.__rec = { frames: [], long: [], start: 0 });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) r.long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true });
  let last = 0;
  const tick = (t) => { if (last) r.frames.push(t - last); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
};
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(1) : 0; };
async function mark(page) { await page.evaluate(() => { __rec.frames = []; __rec.long = []; __rec.t0 = performance.now(); }); }
async function stats(page) {
  const d = await page.evaluate(() => ({ f: __rec.frames, long: __rec.long.filter((l) => l[0] >= __rec.t0), dur: performance.now() - __rec.t0,
    heap: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null, field: window.__atlasField?.() }));
  const f = d.f;
  return {
    seconds: +(d.dur / 1000).toFixed(1), frames: f.length, fps: +(f.length / (d.dur / 1000)).toFixed(1),
    p50: pct(f, 0.5), p95: pct(f, 0.95), p99: pct(f, 0.99), max: +Math.max(0, ...f).toFixed(1),
    over20: f.filter((x) => x > 20).length, over33: f.filter((x) => x > 33.4).length, over50: f.filter((x) => x > 50).length,
    longTasks: d.long.length, longTaskMs: d.long.reduce((s, l) => s + l[1], 0), longestTask: Math.max(0, ...d.long.map((l) => l[1])),
    heapMB: d.heap && +d.heap.toFixed(1), field: d.field && { calls: d.field.calls, tris: d.field.triangles, geos: d.field.geometries, tex: d.field.textures, failed: d.field.failed },
  };
}
async function open(path) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message.slice(0, 200)));
  page.on('requestfailed', (r) => errors.push('reqfail ' + r.url()));
  await page.addInitScript(RECORDER);
  return { page, errors };
}
async function wheelThrough(page, px, step = 90, gap = 16) {
  await page.mouse.move(W / 2, H / 2);
  for (let y = 0; y < px; y += step) { await page.mouse.wheel(0, step); await sleep(gap); }
}
async function pageLoad(page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]));
    const res = performance.getEntriesByType('resource');
    return { dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), ...paint, requests: res.length,
      transferKB: Math.round(res.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024), decodedKB: Math.round(res.reduce((s, r) => s + (r.decodedBodySize || 0), 0) / 1024) };
  });
}

const scenarios = {
  async home() {
    const { page, errors } = await open('/');
    await page.goto(BASE + '/', { waitUntil: 'load' });
    const load = await pageLoad(page);
    await sleep(6000); // loader / settle
    const lcp = await page.evaluate(() => new Promise((res) => { new PerformanceObserver((l) => { const e = l.getEntries(); res(Math.round(e[e.length - 1].startTime)); }).observe({ type: 'largest-contentful-paint', buffered: true }); setTimeout(() => res(null), 500); }));
    await mark(page); await sleep(3000);
    const idle = await stats(page);
    const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    await mark(page);
    await wheelThrough(page, Math.min(total, 40000), 100, 16);
    const scroll = await stats(page);
    await page.close();
    return { load: { ...load, lcp }, idle, scroll: { ...scroll, scrolledPx: Math.min(total, 40000), pageHeight: total }, errors };
  },
  async studyEach() {
    const out = {};
    for (const id of STUDIES) {
      const { page, errors } = await open('/field/' + id);
      const t0 = Date.now();
      await page.goto(BASE + '/field/' + id, { waitUntil: 'load' });
      const load = await pageLoad(page);
      await page.waitForSelector('.fs-study[data-status="ready"]', { timeout: 30000 }).catch(() => {});
      const readyMs = Date.now() - t0;
      const status = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.status);
      await sleep(2500);
      await mark(page); await sleep(3000);
      const idle = await stats(page);
      const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      await mark(page);
      await wheelThrough(page, total, 110, 16);
      const scroll = await stats(page);
      out[id] = { status, readyMs, load, idle, scroll: { ...scroll, pageHeight: total }, errors };
      await page.close();
    }
    return out;
  },
  // Enter every study from the previous one with the real Next link, keeping the page (one canvas) alive.
  async studyToStudy() {
    const { page, errors } = await open('/field/great-indian-bustard');
    await page.goto(BASE + '/field/great-indian-bustard', { waitUntil: 'load' });
    await page.waitForSelector('.fs-study[data-status="ready"]', { timeout: 30000 }).catch(() => {});
    await sleep(3000);
    const steps = [];
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await sleep(1500);
      const next = page.locator(".fs-next").first();
      if (!(await next.count())) { steps.push({ i, error: 'no next link' }); break; }
      await mark(page);
      const from = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.study);
      await next.click();
      await sleep(3500);
      const s = await stats(page);
      const to = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.study);
      steps.push({ from, to, ...s });
    }
    await page.close();
    return { steps, errors };
  },
  // Many chapter jumps in one study, watching heap and GPU resource counts.
  async chapterChurn() {
    const out = {};
    for (const id of ['snow-leopard', 'bengal-tiger']) {
      const { page, errors } = await open('/field/' + id);
      await page.goto(BASE + '/field/' + id, { waitUntil: 'load' });
      await page.waitForSelector('.fs-study[data-status="ready"]', { timeout: 30000 }).catch(() => {});
      await sleep(3000);
      const ticks = page.locator('.fs-progress button');
      const n = await ticks.count();
      const cdp = await ctx.newCDPSession(page);
      const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); const m = await cdp.send('Performance.getMetrics').catch(() => null); return null; };
      await cdp.send('Performance.enable');
      const snap = async () => { await cdp.send('HeapProfiler.collectGarbage'); await sleep(300); const { metrics } = await cdp.send('Performance.getMetrics'); const g = (k) => metrics.find((m) => m.name === k)?.value; const f = await page.evaluate(() => window.__atlasField?.()); return { heapMB: +(g('JSHeapUsedSize') / 1048576).toFixed(1), nodes: g('Nodes'), listeners: g('JSEventListeners'), geos: f?.geometries, tex: f?.textures }; };
      const samples = [await snap()];
      await mark(page);
      for (let round = 0; round < 8; round++) {
        for (let i = 0; i < n; i++) { await ticks.nth(i).click().catch(() => {}); await sleep(900); }
        if (round % 2 === 1) samples.push(await snap());
      }
      const s = await stats(page);
      out[id] = { ticks: n, rounds: 8, samples, frameStats: s, errors };
      await page.close();
    }
    return out;
  },
  async routes() {
    const out = {};
    for (const path of ['/atlas', '/compare', '/conservation', '/species/snow-leopard', '/#field-studies']) {
      const { page, errors } = await open(path);
      await page.goto(BASE + path, { waitUntil: 'load' });
      const load = await pageLoad(page);
      await sleep(5000);
      await mark(page); await sleep(3000);
      const idle = await stats(page);
      const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      await mark(page);
      await wheelThrough(page, Math.min(total, 12000), 100, 16);
      const scroll = await stats(page);
      out[path] = { load, idle, scroll: { ...scroll, pageHeight: total }, errors };
      await page.close();
    }
    return out;
  },
};

try {
  const gl = await (async () => { const p = await ctx.newPage(); await p.goto('about:blank'); const r = await p.evaluate(() => { const c = document.createElement('canvas'); const g = c.getContext('webgl2'); const e = g?.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'n/a'; }); await p.close(); return r; })();
  results.env = { browser: browser.version(), gl, cores: (await import('node:os')).cpus().length, cpu: (await import('node:os')).cpus()[0].model };
  for (const [name, fn] of Object.entries(scenarios)) {
    if (only && !only.includes(name)) continue;
    console.error('>>', name);
    try { results.scenarios[name] = await fn(); } catch (e) { results.scenarios[name] = { error: String(e).slice(0, 300) }; }
    writeFileSync(`${OUT}${label}-${W}x${H}.json`, JSON.stringify(results, null, 1));
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(JSON.stringify(results.env));
