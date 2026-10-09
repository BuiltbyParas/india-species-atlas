// Desktop regression: five studies x four viewports, chapter walk, history, keyboard, reduced motion, no-WebGL, context loss.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const PORT = 4177, BASE = `http://localhost:${PORT}`;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await sleep(200); }
const STUDIES = ['great-indian-bustard', 'snow-leopard', 'ganges-river-dolphin', 'bengal-tiger', 'indian-rhinoceros'];
const GPU = ['--use-gl=angle', '--use-angle=gl-egl', '--enable-gpu', '--ignore-gpu-blocklist'];
const report = [];
const log = (ok, what, extra = '') => { report.push({ ok, what, extra }); console.log(ok ? 'PASS' : 'FAIL', what, extra); };

async function newPage(browser, vp, opts = {}) {
  const ctx = await browser.newContext({ viewport: vp, ...opts });
  const page = await ctx.newPage(); const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message.slice(0, 160)));
  page.on('requestfailed', (r) => errs.push('reqfail ' + r.url()));
  return { ctx, page, errs };
}

let browser = await chromium.launch({ args: GPU });
for (const [w, h] of [[1920, 1080], [1440, 900], [1280, 800], [1024, 768]]) {
  for (const id of STUDIES) {
    const { ctx, page, errs } = await newPage(browser, { width: w, height: h });
    await page.goto(`${BASE}/field/${id}`, { waitUntil: 'load' });
    await page.waitForSelector('.fs-study[data-status="ready"]', { timeout: 30000 }).catch(() => {});
    const status = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.status);
    const ticks = page.locator('.fs-progress button'); const n = await ticks.count();
    const seen = [];
    for (let i = 0; i < n; i++) { await ticks.nth(i).click(); await sleep(1100); seen.push(await page.evaluate(() => +document.querySelector('.fs-study').dataset.current)); }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await sleep(1200);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const field = await page.evaluate(() => window.__atlasField?.());
    const walked = seen.every((v, i) => v === i);
    log(status === 'ready' && walked && over <= 0 && !errs.length && !field?.failed, `${w}x${h} ${id}`, `status=${status} chapters=${seen.join('')} overflow=${over} errs=${errs.length} ${errs[0] ?? ''}`);
    await ctx.close();
  }
}

// history + keyboard + Esc (1440x900)
{
  const { ctx, page, errs } = await newPage(browser, { width: 1440, height: 900 });
  await page.goto(`${BASE}/#field-studies`, { waitUntil: 'load' }); await sleep(4000);
  await page.goto(`${BASE}/field/bengal-tiger`, { waitUntil: 'load' });
  await page.waitForSelector('.fs-study[data-status="ready"]');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await sleep(1200);
  await page.locator('.fs-next').first().click(); await sleep(3500);
  const afterNext = new URL(page.url()).pathname;
  await page.goBack(); await sleep(2500); const afterBack = new URL(page.url()).pathname;
  await page.goForward(); await sleep(2500); const afterFwd = new URL(page.url()).pathname;
  log(afterNext === '/field/indian-rhinoceros' && afterBack === '/field/bengal-tiger' && afterFwd === '/field/indian-rhinoceros', 'history next/back/forward', `${afterNext} ${afterBack} ${afterFwd}`);
  await page.keyboard.press('Escape'); await sleep(3000);
  const afterEsc = page.url();
  log(!afterEsc.includes('/field/'), 'Esc leaves the study', afterEsc);
  // keyboard: Tab reaches interactive controls with visible focus on a study
  await page.goto(`${BASE}/field/snow-leopard`, { waitUntil: 'load' }); await page.waitForSelector('.fs-study[data-status="ready"]');
  const stops = [];
  for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); stops.push(await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return 'body'; const cs = getComputedStyle(e); const vis = cs.outlineStyle !== 'none' || cs.boxShadow !== 'none'; return `${e.tagName.toLowerCase()}:${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 22)}:${vis ? 'ring' : 'NOFOCUS'}`; })); }
  log(!stops.some((s) => s.endsWith('NOFOCUS')) && !stops.every((s) => s === 'body'), 'keyboard tab stops show focus', stops.join(' | '));
  log(!errs.length, 'history/keyboard errors', errs.join(';'));
  await ctx.close();
}

// reduced motion
for (const id of STUDIES) {
  const { ctx, page, errs } = await newPage(browser, { width: 1440, height: 900 }, { reducedMotion: 'reduce' });
  await page.goto(`${BASE}/field/${id}`, { waitUntil: 'load' });
  await page.waitForSelector('.fs-study[data-status="ready"]', { timeout: 30000 }).catch(() => {});
  const ticks = page.locator('.fs-progress button'); const n = await ticks.count();
  for (let i = 0; i < n; i++) { await ticks.nth(i).click(); await sleep(500); }
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const cur = await page.evaluate(() => +document.querySelector('.fs-study').dataset.current);
  log(cur === n - 1 && over <= 0 && !errs.length, `reduced-motion ${id}`, `last=${cur} errs=${errs.length} ${errs[0] ?? ''}`);
  await ctx.close();
}
await browser.close();

// no WebGL
browser = await chromium.launch({ args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
for (const id of STUDIES) {
  const { ctx, page, errs } = await newPage(browser, { width: 1440, height: 900 });
  await page.goto(`${BASE}/field/${id}`, { waitUntil: 'load' }); await sleep(2500);
  const st = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.status);
  const h1 = await page.locator('h1').first().innerText().catch(() => '');
  log(st === 'flat' && !!h1 && !errs.length, `no-WebGL ${id}`, `status=${st} h1=${h1.replace(/\n/g, ' ')} errs=${errs.length} ${errs[0] ?? ''}`);
  await ctx.close();
}
{
  const { ctx, page, errs } = await newPage(browser, { width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: 'load' }); await sleep(4000);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  log(!errs.length && over <= 0, 'no-WebGL home', `errs=${errs.length} ${errs[0] ?? ''}`);
  await ctx.close();
}
await browser.close();

// context loss on the field stage
browser = await chromium.launch({ args: GPU });
{
  const { ctx, page, errs } = await newPage(browser, { width: 1440, height: 900 });
  await page.goto(`${BASE}/field/snow-leopard`, { waitUntil: 'load' }); await page.waitForSelector('.fs-study[data-status="ready"]'); await sleep(1500);
  await page.evaluate(() => { const c = document.querySelector('canvas.field-canvas'); c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext(); });
  await sleep(2500);
  const st = await page.evaluate(() => ({ s: document.querySelector('.fs-study')?.dataset.status, f: window.__atlasField().failed, h1: !!document.querySelector('h1') }));
  log(st.f && st.s === 'flat' && st.h1, 'context loss falls back to the photograph', JSON.stringify(st) + ' errs=' + errs.length);
  await ctx.close();
}
await browser.close(); server.kill();
const bad = report.filter((r) => !r.ok); console.log(`\n${report.length - bad.length}/${report.length} passed`);
process.exit(0);
