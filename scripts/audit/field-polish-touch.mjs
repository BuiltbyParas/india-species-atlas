// Field studies: the light by hand without a mouse (FieldLight.tsx). GPU on (ANGLE GL).
// A phone (touch, 390 × 844): a sideways drag turns the light and does not scroll; an upright drag scrolls and does
// not turn it; the hint shows once. A desktop keyboard: Tab to the light, arrows turn it. Listeners: after moving
// through studies and back, the window carries no extra pointer listeners. Reduced motion: the light still turns.
// Env: BASE (default dev :5173), Q (default '?hold=1&quality=balanced'), OUT.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const Q = process.env.Q ?? '?hold=1&quality=balanced';
const OUT = process.env.OUT ?? `${process.env.HOME}/.cache/ispa-field3/touch`;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const results = {};
const log = [];

async function ready(page) {
  for (let k = 0; k < 80; k++) {
    const st = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.status);
    if (st === 'ready' || st === 'flat') return st;
    await sleep(250);
  }
  return 'timeout';
}
const state = (page) =>
  page.evaluate(() => {
    const r = document.querySelector('.fs-light-range');
    return { value: r ? Number(r.value) : null, text: r?.getAttribute('aria-valuetext'), y: Math.round(window.scrollY), hint: document.querySelector('.fs-light')?.hasAttribute('data-hint') ?? null };
  });

async function drag(cdp, x0, y0, x1, y1, steps = 12) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t }] });
    await sleep(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

// ---------------------------------------------------------------- phone
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && log.push(`[phone ${m.type()}] ${m.text().slice(0, 200)}`));
  page.on('pageerror', (e) => log.push('[phone pageerror] ' + e.message.slice(0, 200)));
  await page.goto(`${BASE}/field/indian-rhinoceros${Q}`, { waitUntil: 'domcontentloaded' });
  results.phoneStatus = await ready(page);
  await sleep(2600);
  const cdp = await ctx.newCDPSession(page);
  results.phoneHintShown = (await state(page)).hint;
  await page.screenshot({ path: `${OUT}/phone-0-hint.jpg`, type: 'jpeg', quality: 84 });
  const s0 = await state(page);
  await drag(cdp, 90, 420, 300, 432);
  await sleep(1400);
  const s1 = await state(page);
  await page.screenshot({ path: `${OUT}/phone-1-right.jpg`, type: 'jpeg', quality: 84 });
  await drag(cdp, 300, 420, 40, 410, 16);
  await sleep(1400);
  const s2 = await state(page);
  await page.screenshot({ path: `${OUT}/phone-2-left.jpg`, type: 'jpeg', quality: 84 });
  await drag(cdp, 200, 640, 206, 300, 14);
  await sleep(1200);
  const s3 = await state(page);
  results.phone = { start: s0, afterRight: s1, afterLeft: s2, afterUpright: s3 };
  results.sidewaysTurns = s1.value > s0.value && s2.value < s1.value;
  results.sidewaysDoesNotScroll = Math.abs(s1.y - s0.y) < 4 && Math.abs(s2.y - s1.y) < 4;
  results.uprightScrolls = s3.y > s2.y + 100;
  results.uprightDoesNotTurn = s3.value === s2.value;
  results.hintGoneAfterUse = s1.hint === false;
  // Tapping a control does not turn the light.
  const tick = await page.locator('.fs-tick').nth(1).boundingBox();
  if (tick) await page.touchscreen.tap(tick.x + tick.width / 2, tick.y + tick.height / 2);
  await sleep(1500);
  results.tapOnControlKeepsLight = (await state(page)).value === s2.value;
  await ctx.close();
}

// ---------------------------------------------------------------- desktop keyboard + listener hygiene
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && log.push(`[desk ${m.type()}] ${m.text().slice(0, 200)}`));
  page.on('pageerror', (e) => log.push('[desk pageerror] ' + e.message.slice(0, 200)));
  await page.goto(`${BASE}/field/bengal-tiger${Q}`, { waitUntil: 'domcontentloaded' });
  results.deskStatus = await ready(page);
  await sleep(2400);
  await page.screenshot({ path: `${OUT}/desk-0.jpg`, type: 'jpeg', quality: 84 });
  // Reached by Tab from the top of the page, in the furniture's order.
  await page.evaluate(() => document.activeElement?.blur());
  const order = [];
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const el = await page.evaluate(() => {
      const a = document.activeElement;
      return a ? (a.getAttribute('aria-label') || a.textContent || a.tagName).trim().replace(/\s+/g, ' ').slice(0, 40) : '';
    });
    order.push(el);
    if (await page.evaluate(() => document.activeElement?.classList.contains('fs-light-range'))) break;
  }
  results.tabReachesLight = await page.evaluate(() => document.activeElement?.classList.contains('fs-light-range'));
  results.tabOrderTail = order.slice(-6);
  results.tabPresses = order.length;
  await page.focus('.fs-light-range');
  for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowRight');
  await sleep(1500);
  const k1 = await state(page);
  await page.screenshot({ path: `${OUT}/desk-1-keys-right.jpg`, type: 'jpeg', quality: 84 });
  const focus = await page.evaluate(() => {
    const el = document.activeElement;
    const cs = el ? getComputedStyle(el) : null;
    return { tag: el?.tagName, label: el?.getAttribute('aria-label'), outline: cs ? `${cs.outlineStyle} ${cs.outlineWidth}` : null };
  });
  for (let i = 0; i < 24; i++) await page.keyboard.press('ArrowLeft');
  await sleep(1500);
  const k2 = await state(page);
  await page.screenshot({ path: `${OUT}/desk-2-keys-left.jpg`, type: 'jpeg', quality: 84 });
  results.keyboard = { right: k1, left: k2, focus };
  results.keyboardTurns = k1.value === 60 && k2.value === -60;

  const cdp = await ctx.newCDPSession(page);
  const count = async () => {
    const { result } = await cdp.send('Runtime.evaluate', { expression: 'window' });
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
    const by = {};
    for (const l of listeners) by[l.type] = (by[l.type] ?? 0) + 1;
    return by;
  };
  const before = await count();
  // Through the studies by the client-side router and back.
  for (const id of ['indian-rhinoceros', 'great-indian-bustard', 'bengal-tiger']) {
    await page.evaluate((id) => {
      history.pushState({}, '', `/field/${id}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, id);
    await sleep(2500);
  }
  const after = await count();
  results.listeners = { before, after };
  results.noListenerGrowth = ['pointermove', 'pointerup', 'pointercancel', 'pointerdown'].every((t) => (after[t] ?? 0) <= (before[t] ?? 0));
  await ctx.close();
}

// ---------------------------------------------------------------- reduced motion
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => log.push('[rm pageerror] ' + e.message.slice(0, 200)));
  await page.goto(`${BASE}/field/snow-leopard${Q}`, { waitUntil: 'domcontentloaded' });
  results.rmStatus = await ready(page);
  await sleep(2000);
  const cdp = await ctx.newCDPSession(page);
  await page.screenshot({ path: `${OUT}/rm-0.jpg`, type: 'jpeg', quality: 84 });
  await drag(cdp, 60, 420, 330, 425);
  await sleep(500);
  results.rm = await state(page);
  await page.screenshot({ path: `${OUT}/rm-1-right.jpg`, type: 'jpeg', quality: 84 });
  await ctx.close();
}

console.log(JSON.stringify(results, null, 1));
console.log('console:', log.length ? log.join('\n') : 'none');
await browser.close();
