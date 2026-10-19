// Usage: OUT=dir [SECS=12] node hero-video.mjs — records a cold load of the home page as video (cheaper than screenshots under load).
import { chromium } from 'playwright';
const OUT = process.env.OUT, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: OUT, size: { width: W / 2, height: H / 2 } } });
const page = await ctx.newPage();
const t0 = Date.now();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.hero-title .reveal-text.is-shown', { timeout: 60000 });
console.log('ready at', Date.now() - t0);
await sleep(+(process.env.SECS ?? 7) * 1000);
await ctx.close(); await browser.close();
