// Usage: node hero-frames.mjs — rAF frame intervals over the hero entrance (from the loader hand-over), plus the GL renderer string.
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: (process.env.ARGS ?? '').split(' ').filter(Boolean) });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.addInitScript(() => {
  window.__f = [];
  const tick = (t) => { window.__f.push(t); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.hero-title .reveal-text.is-shown', { timeout: 60000 });
const start = await page.evaluate(() => performance.now());
await page.waitForTimeout(5000);
const r = await page.evaluate((start) => {
  const f = window.__f.filter((t) => t >= start);
  const d = f.slice(1).map((t, i) => t - f[i]);
  const gl = document.createElement('canvas').getContext('webgl');
  const ext = gl?.getExtension('WEBGL_debug_renderer_info');
  return { frames: f.length, longest: Math.max(...d).toFixed(0), over100: d.filter((x) => x > 100).length, gaps: d.filter((x) => x > 100).map((x) => x.toFixed(0)).join(','), renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '?' };
}, start);
console.log(JSON.stringify(r));
await browser.close();
