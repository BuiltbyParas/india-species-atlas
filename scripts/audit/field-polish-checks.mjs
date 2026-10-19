// Field-study polish: route health on a production build. Every route at a desktop and a phone size — status of the
// field stage, horizontal overflow, console errors, failed requests — plus the home page's hero and field-studies
// index as screenshots, for comparison between two builds. GPU on (ANGLE GL).
// Env: BASE (default :4301), TAG (file prefix), OUT, RM=1 (reduced motion), NOGL=1 (no WebGL).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://localhost:4301';
const TAG = process.env.TAG ?? 'after';
const OUT = process.env.OUT ?? `${process.env.HOME}/.cache/ispa-field3/checks`;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// ONLY: a comma list of routes to check instead of all of them.
const ALL = ['/', '/atlas', '/species', '/species/snow-leopard', '/compare', '/conservation', '/about', '/sources',
  '/field/great-indian-bustard', '/field/snow-leopard', '/field/ganges-river-dolphin', '/field/bengal-tiger', '/field/indian-rhinoceros', '/no-such-page'];
const ROUTES = process.env.ONLY ? process.env.ONLY.split(',') : ALL;
const args = process.env.NOGL ? ['--disable-3d-apis'] : ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'];
const browser = await chromium.launch({ headless: true, args });
const rows = [];
for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
  for (const route of ROUTES) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      reducedMotion: process.env.RM ? 'reduce' : 'no-preference',
      ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}),
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
    page.on('pageerror', (e) => errs.push('pageerror ' + e.message.slice(0, 160)));
    page.on('requestfailed', (r) => errs.push('reqfail ' + r.url().slice(-80)));
    await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
    await sleep(route.startsWith('/field') || route === '/' ? 5000 : 2500);
    const info = await page.evaluate(() => ({
      over: document.documentElement.scrollWidth - window.innerWidth,
      status: document.querySelector('.fs-study')?.dataset.status ?? null,
      light: !!document.querySelector('.fs-light-range'),
      field: window.__atlasField?.() ?? null,
    }));
    if (route === '/') {
      await page.screenshot({ path: `${OUT}/${TAG}-${w}-home-hero.jpg`, type: 'jpeg', quality: 82 });
      // The field-studies index: scroll until it holds the screen.
      const top = await page.evaluate(() => {
        const el = document.querySelector('.fs-index');
        return el ? el.getBoundingClientRect().top + window.scrollY : null;
      });
      if (top != null) {
        await page.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)), top + h * 0.6);
        await sleep(3500);
        await page.screenshot({ path: `${OUT}/${TAG}-${w}-home-index.jpg`, type: 'jpeg', quality: 82 });
      }
    }
    // Scroll a study through to its end: overflow anywhere along the way, and the furniture stepping aside.
    if (route.startsWith('/field')) {
      const H = await page.evaluate(() => document.documentElement.scrollHeight);
      let maxOver = info.over;
      for (let y = 0; y <= H; y += h * 0.9) {
        await page.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)), y);
        await sleep(250);
        maxOver = Math.max(maxOver, await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
      }
      info.over = maxOver;
    }
    const row = { w, route, status: info.status, light: info.light, over: info.over, failed: info.field?.failed ?? null, rung: info.field?.rung ?? null, errs: errs.length, first: errs[0] ?? '' };
    rows.push(row);
    console.log(JSON.stringify(row));
    await ctx.close();
  }
}
const bad = rows.filter((r) => r.over > 0 || r.errs || r.failed || (r.route.startsWith('/field') && r.status !== (process.env.NOGL ? 'flat' : 'ready')));
console.log(`routes ${rows.length}, problems ${bad.length}`);
for (const b of bad) console.log('PROBLEM', JSON.stringify(b));
await browser.close();
