// Attribute long main-thread stalls on a route while scrolling: long-animation-frame scripts + the scroll position + stage.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const path = process.argv[2] ?? '/';
const PORT = 4174, BASE = `http://localhost:${PORT}`;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await sleep(200); }
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=gl-egl', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.addInitScript(() => {
  window.__loaf = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.duration > 45) window.__loaf.push({ t: Math.round(e.startTime), d: Math.round(e.duration), y: Math.round(scrollY), block: Math.round(e.blockingDuration), scripts: e.scripts.map((s) => `${s.invoker} ${s.sourceFunctionName || ''} ${s.sourceURL.split('/').pop()}:${s.sourceCharPosition} ${Math.round(s.duration)}ms (forced ${Math.round(s.forcedStyleAndLayoutDuration)})`) }); }).observe({ type: 'long-animation-frame', buffered: true });
});
await page.goto(BASE + path, { waitUntil: 'load' });
await sleep(6000);
await page.mouse.move(720, 450);
const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
for (let y = 0; y < total; y += 100) { await page.mouse.wheel(0, 100); await sleep(16); }
await sleep(1000);
console.log(JSON.stringify(await page.evaluate(() => window.__loaf), null, 1));
await browser.close(); server.kill();
