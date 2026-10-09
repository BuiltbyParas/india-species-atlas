// Snow-leopard footage: poster, hover/keyboard/button control, offscreen pause, reduced motion, failure fallback, transfer size.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4200';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: JSON.parse(process.env.ARGS ?? '[]') });
const report = (k, v) => console.log(k.padEnd(34), v);
async function open(opts = {}, abort = false) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await ctx.newPage(); const errs = []; const reqs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  page.on('request', (r) => { if (/spiti/.test(r.url())) reqs.push(r.url().split('/').pop() + ' ' + (r.headers().range ?? '')); });
  page.on('requestfailed', (r) => reqs.push('FAILED ' + r.url().split('/').pop() + ' ' + r.failure()?.errorText));
  if (abort) await page.route('**/snow-leopard-spiti-*.webm', (r) => r.abort());
  await page.goto(`${BASE}/field/snow-leopard`); await sleep(3000);
  return { ctx, page, errs, reqs };
}
const toChapter = async (page, n) => { for (let k = 0; k < 40; k++) { const c = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.current); if (+c === n) break; await page.mouse.wheel(0, 300); await sleep(250); } await sleep(1200); };
const vid = (page) => page.evaluate(() => { const v = document.querySelector('.fs-footage-video'); const f = document.querySelector('.fs-footage'); const b = document.querySelector('.fs-footage-toggle'); return v ? { paused: v.paused, t: +v.currentTime.toFixed(2), state: f.dataset.state, btn: b?.textContent, pressed: b?.getAttribute('aria-pressed'), ready: v.readyState, muted: v.muted, loop: v.loop } : null; });

{ // 1 default
  const { ctx, page, errs, reqs } = await open();
  report('before reaching chapter', JSON.stringify(await vid(page)));
  await toChapter(page, 4);
  await page.screenshot({ path: 'scripts/audit/out/F1-photograph-chapter.png' });
  report('chapter 4, idle', JSON.stringify(await vid(page)));
  report('poster loaded', await page.evaluate(() => { const i = document.querySelector('.fs-footage-poster'); return i.complete && i.naturalWidth + 'px'; }));
  const frame = page.locator('.fs-footage-frame'); const box = await frame.boundingBox();
  report('frame box', JSON.stringify(box));
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await sleep(1800);
  await page.screenshot({ path: 'scripts/audit/out/F2-hover-playing.png' });
  report('hover', JSON.stringify(await vid(page)));
  await page.mouse.move(5, 5); await sleep(600);
  report('pointer left', JSON.stringify(await vid(page)));
  // keyboard
  await page.focus('.fs-footage-toggle'); await sleep(1200);
  report('keyboard focus', JSON.stringify(await vid(page)));
  await page.evaluate(() => document.activeElement.blur()); await sleep(500);
  report('blur', JSON.stringify(await vid(page)));
  // button
  await page.locator('.fs-footage-toggle').click({ force: true }); await sleep(1500);
  report('click Play', JSON.stringify(await vid(page)));
  await page.mouse.move(5, 5); await sleep(600);
  report('pressed, pointer away', JSON.stringify(await vid(page)));
  await page.locator('.fs-footage-toggle').click({ force: true }); await sleep(600);
  report('click Pause', JSON.stringify(await vid(page)));
  // offscreen: play then scroll to next chapter
  await page.locator('.fs-footage-toggle').click({ force: true }); await sleep(1200);
  report('playing before leaving', JSON.stringify((await vid(page))?.paused));
  await toChapter(page, 5); await sleep(800);
  report('after scrolling to ch5', JSON.stringify(await vid(page)));
  report('transfer', JSON.stringify(await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => /spiti/.test(e.name)).map((e) => [e.name.split('/').pop(), e.transferSize, e.encodedBodySize]))));
  report('requests', JSON.stringify(reqs)); report('errors', JSON.stringify(errs));
  await ctx.close();
}
{ // 2 reduced motion
  const { ctx, page, errs } = await open({ reducedMotion: 'reduce' }); await toChapter(page, 4);
  const box = await page.locator('.fs-footage-frame').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await sleep(1500);
  report('RM hover', JSON.stringify(await vid(page)));
  await page.locator('.fs-footage-toggle').click({ force: true }); await sleep(1500);
  report('RM click Play', JSON.stringify(await vid(page)));
  report('RM errors', JSON.stringify(errs)); await ctx.close();
}
{ // 3 failure
  const { ctx, page, errs } = await open({}, true); await toChapter(page, 4);
  const box = await page.locator('.fs-footage-frame').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await sleep(1500);
  report('FAIL state', JSON.stringify(await page.evaluate(() => ({ s: document.querySelector('.fs-footage').dataset.state, v: !!document.querySelector('.fs-footage-video'), b: !!document.querySelector('.fs-footage-toggle'), poster: document.querySelector('.fs-footage-poster').naturalWidth }))));
  await page.screenshot({ path: 'scripts/audit/out/F3-failed-fallback.png' });
  report('FAIL errors', JSON.stringify(errs)); await ctx.close();
}
await browser.close();
