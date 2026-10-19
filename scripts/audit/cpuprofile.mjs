// Self-time by function for the main thread while a field study loads and builds its world.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const path = process.argv[2];
const PORT = 4176, BASE = `http://localhost:${PORT}`;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await sleep(200); }
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=gl-egl', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
await cdp.send('Profiler.start');
await page.goto(BASE + path, { waitUntil: 'load' });
await page.waitForSelector('.fs-study[data-status="ready"]', { timeout: 30000 }).catch(() => {});
await sleep(3000);
const { profile } = await cdp.send('Profiler.stop');
const self = new Map(); const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const dt = profile.timeDeltas; 
profile.samples.forEach((id, i) => { const n = byId.get(id); const f = n.callFrame; const k = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber}:${f.columnNumber}`; self.set(k, (self.get(k) || 0) + dt[i] / 1000); });
console.log([...self].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${v.toFixed(0).padStart(6)}ms ${k}`).join('\n'));
console.log(JSON.stringify(await page.evaluate(() => window.__atlasField().buildMs)));
await browser.close(); server.kill();
