// Route smoke + responsive overflow: every prerendered route at 320 / 390 / 820 / 1440 px. Fails on a non-200
// status, any console error or page error, no visible h1, or horizontal page overflow (documentElement.scrollWidth
// wider than the viewport). Env: BASE (default http://localhost:4302), WIDTHS (e.g. "320,1440"), GL=gpu to use the
// machine's GPU instead of SwiftShader (the software renderer needs >15 min for the full 100 loads).
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4302';
const ids = ['great-indian-bustard','bengal-tiger','red-panda','ganges-river-dolphin','nilgiri-tahr','gharial','white-rumped-vulture','snow-leopard','indian-rhinoceros','dugong','lion-tailed-macaque','asian-elephant'];
const field = ['great-indian-bustard','snow-leopard','ganges-river-dolphin','bengal-tiger','indian-rhinoceros'];
const routes = ['/', '/atlas', '/species', '/compare', '/conservation', '/about', '/sources', ...ids.map((i) => `/species/${i}`), ...field.map((i) => `/field/${i}`), '/no-such-page'];
const only = process.env.WIDTHS?.split(',').map(Number);
const widths = [[320, 640], [390, 844], [820, 1180], [1440, 900]].filter(([w]) => !only || only.includes(w));
const gl = process.env.GL === 'gpu'
  ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl']
  : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const browser = await chromium.launch({ headless: true, args: gl });
let bad = 0, n = 0;
for (const [w, h] of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800 });
  for (const r of routes) {
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(`pageerror ${e.message.slice(0, 120)}`));
    page.on('console', (m) => m.type() === 'error' && !/favicon|tile\.|arcgisonline|Failed to load resource/.test(m.text() + (m.location().url ?? '')) && errs.push(`console ${m.text().slice(0, 120)}`));
    const res = await page.goto(BASE + r, { waitUntil: 'domcontentloaded' }).catch((e) => ({ status: () => 0, err: e }));
    // Routes are lazy chunks, so the heading lands 0.7–1.6 s after DOMContentLoaded on an idle machine: wait for it
    // (a missing one still fails below, after 10 s) rather than for a fixed time that a loaded machine overruns.
    await page.waitForFunction(() => [...document.querySelectorAll('h1')].some((e) => e.textContent.trim()), null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(r.startsWith('/field') || r === '/' ? 3500 : 1800);
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h1: [...document.querySelectorAll('h1')].some((e) => e.textContent.trim()) }));
    const expect404 = r === '/no-such-page';
    const status = res.status();
    const issues = [];
    // vite preview answers unknown paths with the SPA shell (200); a static host serves dist/404.html with 404.
    if (expect404 ? ![200, 404].includes(status) : status !== 200) issues.push(`status ${status}`);
    if (m.sw > m.cw + 1) issues.push(`overflow ${m.sw - m.cw}px`);
    if (!m.h1) issues.push('no h1');
    issues.push(...errs);
    n++;
    if (issues.length) { bad++; console.log(`FAIL ${w} ${r} — ${issues.join('; ')}`); }
    await page.close();
  }
  await ctx.close();
}
console.log(`${n - bad}/${n} route×width checks clean`);
await browser.close();
process.exit(bad ? 1 : 0);
