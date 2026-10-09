import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const PORT = 4175, BASE = `http://localhost:${PORT}`;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await sleep(200); }
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=gl-egl', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(BASE + (process.argv[2] ?? '/'), { waitUntil: 'load' });
await sleep(4000);
await page.mouse.move(720, 450);
const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
for (let y = 0; y < total; y += 100) { await page.mouse.wheel(0, 100); await sleep(16); }
await sleep(8000);
console.log(JSON.stringify((await page.evaluate(() => window.__atlasField())).buildMs));
await browser.close(); server.kill();
