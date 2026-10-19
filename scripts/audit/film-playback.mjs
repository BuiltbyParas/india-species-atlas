// The film (opened from the end of the home page): bytes fetched, playback, seek, keyboard, close. One browser. RM=1 for reduced motion.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable');
const media = new Map(); let bytes = 0;
cdp.on('Network.responseReceived', (e) => { if (/\.mp4/.test(e.response.url)) media.set(e.requestId, e.response.url.split('/').pop() + ' ' + e.response.status); });
cdp.on('Network.loadingFinished', (e) => { if (media.has(e.requestId)) bytes += e.encodedDataLength; });
const errs = []; page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 140)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await sleep(8000);
for (let i = 0; i < 80; i++) { await page.mouse.wheel(0, 1500); await sleep(120); if (await page.locator('.film-entry').isVisible().catch(() => false)) { const b = await page.locator('.film-entry').boundingBox(); if (b && b.y < 700 && b.y > 0) break; } }
await sleep(1500);
console.log('film-entry visible', await page.locator('.film-entry').isVisible(), 'media bytes before open', bytes);
await page.locator('.film-entry').click(); await sleep(3500);
const st = () => page.evaluate(() => { const v = document.querySelector('.media-film video'); return v ? { paused: v.paused, t: +v.currentTime.toFixed(2), dur: +v.duration.toFixed(1), ready: v.readyState, src: (v.currentSrc || '').split('/').pop(), muted: v.muted, buffered: v.buffered.length ? +v.buffered.end(v.buffered.length - 1).toFixed(1) : 0, err: v.error?.code ?? null } : null; });
console.log('opened', JSON.stringify(await st()), 'bytes', bytes, [...media.values()]);
const play = await page.evaluate(() => { const v = document.querySelector('.media-film video'); return v?.play().then(() => 'play ok').catch((e) => 'play failed ' + e.name); }); console.log(play); await sleep(3000);
const a = await st(); console.log('after 3s', JSON.stringify(a));
const dur = a?.dur ?? 0;
for (const f of [0.5, 0.9, 0.1]) {
  const r = await page.evaluate(async (frac) => { const v = document.querySelector('.media-film video'); const t0 = performance.now(); const target = v.duration * frac; return await new Promise((res) => { const to = setTimeout(() => res({ timeout: true }), 8000); v.addEventListener('seeked', () => { clearTimeout(to); res({ ms: Math.round(performance.now() - t0), at: +v.currentTime.toFixed(2), target: +target.toFixed(2) }); }, { once: true }); v.currentTime = target; }); }, f);
  console.log(`seek ${f}`, JSON.stringify(r), 'bytes', bytes);
}
const before = (await st()).t; await page.keyboard.press('ArrowRight'); await sleep(700); console.log('ArrowRight +5s:', before, '->', (await st()).t);
const scrub = await page.locator('.media-film input[type=range]').count(); console.log('scrubber inputs', scrub);
await page.keyboard.press('Space'); await sleep(500); console.log('Space ->', (await st()).paused ? 'paused' : 'playing');
await page.keyboard.press('Space'); await sleep(800); console.log('Space ->', (await st()).paused ? 'paused' : 'playing');
await page.keyboard.press('Escape'); await sleep(2500); console.log('after Escape: stage video present', !!(await st()), 'scroll y', await page.evaluate(() => Math.round(scrollY)));
console.log('total mp4 bytes', bytes, 'MB', (bytes / 1048576).toFixed(2), 'errors', errs);
await browser.close();
