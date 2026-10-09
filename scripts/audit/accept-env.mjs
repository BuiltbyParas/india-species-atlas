// Reports which GL renderer a default-flag Chromium actually gets (headed if a display exists).
import { chromium } from 'playwright';
const headless = process.env.HEADLESS === '1';
const browser = await chromium.launch({ headless });
const page = await browser.newPage();
await page.goto('http://localhost:4200/');
console.log(browser.version(), 'headless=', headless);
console.log(await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); if (!g) return 'no webgl2'; const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); }));
await browser.close();
