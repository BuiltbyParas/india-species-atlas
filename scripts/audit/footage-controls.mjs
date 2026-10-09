// Snow-leopard footage controls with human-paced input: mouse hover+click, keyboard Tab/Enter, touch tap.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4200';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: JSON.parse(process.env.ARGS ?? '[]') });
const st = (page) => page.evaluate(() => { const v = document.querySelector('.fs-footage-video'); const b = document.querySelector('.fs-footage-toggle'); const o = b && getComputedStyle(b).opacity; return v ? `${v.paused ? 'paused ' : 'PLAYING'} label=${b.textContent} btnOpacity=${o}` : 'no video'; });
async function open(opts) { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts }); const page = await ctx.newPage(); await page.goto(`${BASE}/field/snow-leopard`); await sleep(3000);
  for (let k = 0; k < 40; k++) { const c = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.current); if (+c === 4) break; await page.mouse.wheel(0, 300); await sleep(250); } await sleep(1500); return { ctx, page }; }
const say = (k, v) => console.log(k.padEnd(30), v);
{ const { ctx, page } = await open(); const b = await page.locator('.fs-footage-frame').boundingBox(); const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  await page.mouse.move(cx, cy, { steps: 8 }); await sleep(1200); say('mouse: hover', await st(page));
  await page.mouse.move(b.x + b.width - 40, b.y + b.height - 20, { steps: 5 }); await sleep(500);
  await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(900); say('mouse: click (label said Pause)', await st(page));
  await page.mouse.move(5, 5, { steps: 8 }); await sleep(800); say('mouse: leave after pause', await st(page));
  await page.mouse.move(b.x + b.width - 40, b.y + b.height - 20, { steps: 8 }); await sleep(1000); say('mouse: re-enter', await st(page));
  await page.mouse.move(5, 5, { steps: 8 }); await sleep(600);
  // keyboard
  await page.mouse.move(5, 5); await page.focus('body'); await page.evaluate(() => document.querySelector('.fs-footage-toggle').focus({ focusVisible: true })); await sleep(1000); say('kbd: focus-visible', await st(page));
  await page.keyboard.press('Enter'); await sleep(800); say('kbd: Enter (label Pause)', await st(page));
  await page.keyboard.press('Space'); await sleep(1000); say('kbd: Space (label Play)', await st(page));
  await page.keyboard.press('Tab'); await sleep(800); say('kbd: Tab away', await st(page));
  await ctx.close(); }
{ const { ctx, page } = await open({ hasTouch: true, isMobile: false }); say('touch: initial', await st(page));
  const bb = await page.locator('.fs-footage-toggle').boundingBox(); await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await sleep(1500); say('touch: tap Play', await st(page));
  await sleep(800); say('touch: still playing later', await st(page));
  await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await sleep(800); say('touch: tap Pause', await st(page)); await ctx.close(); }
await browser.close();
