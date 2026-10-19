// Field of species: the flagship encounter, end to end. Opens it from the snow leopard's plate, then checks the dialog
// (focus, Tab containment, Escape, focus return), the held page, the muted footage, the adaptations, and — when a
// specimen model is installed (SPECIMEN=1) — the 3D viewer: loading, drag, keys, reset, the pins, and disposal on close.
//   BASE=http://127.0.0.1:4301 W=1440 H=900 [SPECIMEN=1] [REDUCED=1] [NOGL=1] [TOUCH=1] node scripts/audit/fos-encounter.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:4301';
const W = +(process.env.W ?? 1440);
const H = +(process.env.H ?? 900);
const OUT = process.env.OUT ?? `${process.env.HOME}/.cache/ispa-redesign/fos-after`;
const TAG = process.env.TAG ?? `${W}-enc`;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const args = ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl', '--autoplay-policy=no-user-gesture-required'];
if (process.env.NOGL) args.push('--disable-webgl', '--disable-3d-apis');
const browser = await chromium.launch({ headless: true, args });
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference',
  hasTouch: Boolean(process.env.TOUCH),
  isMobile: Boolean(process.env.TOUCH),
});
const page = await ctx.newPage();
const log = [];
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && log.push(`[${m.type()}] ${m.text().slice(0, 200)}`));
page.on('pageerror', (e) => log.push('[pageerror] ' + e.message.slice(0, 200)));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(ok ? 'pass' : 'FAIL', name, detail);
};

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await sleep(+(process.env.WAIT ?? 9000));
const top = await page.evaluate(() => document.querySelector('#field-studies').getBoundingClientRect().top + scrollY);
const at = top + 1.32 * H; // the snow leopard's third beat
await page.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y)), at);
await sleep(2600);

const btn = page.locator('.fs-comp.is-active .fs-encounter');
check('encounter button visible at the leopard', await btn.isVisible());
// From the keyboard: focus the button, press Enter.
await btn.focus();
await page.keyboard.press('Enter');
await sleep(1600);
const dlg = page.locator('.enc[role="dialog"]');
check('dialog open, aria-modal', (await dlg.count()) === 1 && (await dlg.getAttribute('aria-modal')) === 'true');
check('focus on the dialog title', await page.evaluate(() => document.activeElement?.id === 'enc-title'));
const v = await page.evaluate(() => {
  const el = document.querySelector('.enc-video');
  return el ? { muted: el.muted, paused: el.paused, t: el.currentTime, src: el.currentSrc.split('/').pop() } : null;
});
check('footage muted', v?.muted === true, JSON.stringify(v));
if (!process.env.REDUCED) check('footage playing', v && !v.paused, JSON.stringify(v));
else check('footage still under reduced motion', v && v.paused, JSON.stringify(v));
await page.screenshot({ path: `${OUT}/${TAG}-open.jpg`, type: 'jpeg', quality: 84 });

// The page is held: a wheel over the dialog does not move it.
const y0 = await page.evaluate(() => scrollY);
await page.mouse.move(W * 0.3, H * 0.5);
await page.mouse.wheel(0, 600);
await sleep(700);
check('page held while open', (await page.evaluate(() => scrollY)) === y0);

// Adaptations: choosing one shows its quote.
await page.locator('.enc-part', { hasText: 'Paws' }).click();
await sleep(500);
const note = await page.locator('.enc-note').innerText();
check('adaptation note follows the choice', /snow shoes/.test(note), note.slice(0, 60));

// Tab stays inside.
let inside = true;
for (let i = 0; i < 24; i++) {
  await page.keyboard.press('Tab');
  if (!(await page.evaluate(() => Boolean(document.activeElement?.closest('.enc'))))) inside = false;
}
check('Tab stays inside the dialog', inside);

if (process.env.SPECIMEN) {
  const sw = page.locator('.enc-mode', { hasText: 'Specimen' });
  check('specimen offered', (await sw.count()) === 1);
  await sw.click();
  await page.waitForFunction(() => ['ready', 'failed'].includes(document.querySelector('.enc-viewer')?.dataset.state), null, { timeout: 20000 });
  const st = await page.evaluate(() => document.querySelector('.enc-viewer').dataset.state);
  check('specimen loads', st === 'ready', st);
  if (st !== 'ready') console.log(log.join('\n'));
}
if (process.env.SPECIMEN && (await page.evaluate(() => document.querySelector('.enc-viewer')?.dataset.state)) === 'ready') {
  await sleep(1200);
  await page.screenshot({ path: `${OUT}/${TAG}-specimen.jpg`, type: 'jpeg', quality: 84 });
  const frames = () => page.evaluate(() => +document.querySelector('.enc-viewer').dataset.frames);
  const f0 = await frames();
  await sleep(1500);
  const fIdle = await frames();
  // Drag across the viewer.
  const box = await page.locator('.enc-viewer').boundingBox();
  const x0 = box.x + box.width * 0.4;
  const yy = box.y + box.height * 0.5;
  if (process.env.TOUCH) {
    // A finger, not a mouse: raw touch events through the protocol.
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await touch('touchStart', x0, yy);
    for (let i = 1; i <= 12; i++) await touch('touchMove', x0 + i * 14, yy + i);
    await touch('touchEnd', 0, 0);
  } else {
    await page.mouse.move(x0, yy);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(x0 + i * 22, yy + i * 2);
    await page.mouse.up();
  }
  await sleep(900);
  const f1 = await frames();
  const yaw = () => page.evaluate(() => +document.querySelector('.enc-viewer').dataset.yaw);
  check('drag draws frames', f1 > fIdle, `${f0} → idle ${fIdle} → after drag ${f1}`);
  const y1 = await yaw();
  check('drag turns the specimen', Math.abs(y1 - -0.5) > 0.2, `yaw -0.5 → ${y1}`);
  await page.screenshot({ path: `${OUT}/${TAG}-specimen-turned.jpg`, type: 'jpeg', quality: 84 });
  await page.locator('.enc-viewer').focus();
  await page.keyboard.press('ArrowRight');
  await sleep(900);
  check('arrow keys turn it', Math.abs((await yaw()) - y1) > 0.15, `${y1} → ${await yaw()}`);
  await page.locator('.enc-action', { hasText: 'Reset view' }).click();
  await sleep(1800);
  check('reset returns to the first view', Math.abs((await yaw()) - -0.5) < 0.05 || Math.abs(((await yaw()) + 0.5) % (Math.PI * 2)) < 0.05, String(await yaw()));
  const pins = await page.locator('.enc-pin').count();
  console.log('pins on the specimen:', pins);
  if (pins) {
    await page.locator('.enc-part', { hasText: 'Tail' }).click();
    await sleep(1400);
    await page.screenshot({ path: `${OUT}/${TAG}-specimen-tail.jpg`, type: 'jpeg', quality: 84 });
  }
  check('idle viewer stops drawing', await (async () => {
    await sleep(2500);
    const a = await frames();
    await sleep(1000);
    const b = await frames();
    // An animated asset keeps drawing by design.
    return b === a || (await page.evaluate(() => 'animated' in document.querySelector('.enc-viewer').dataset));
  })());
}

// Escape closes and gives focus back.
await page.keyboard.press('Escape');
await sleep(900);
check('Escape closes', (await page.locator('.enc').count()) === 0);
check('focus back on the encounter button', await page.evaluate(() => document.activeElement?.classList.contains('fs-encounter')));
if (process.env.SPECIMEN) check('viewer disposed (no canvas left)', (await page.locator('.enc-canvas').count()) === 0);
await page.mouse.wheel(0, 400);
await sleep(900);
check('page scrolls again after close', (await page.evaluate(() => scrollY)) !== y0);

console.log('console:', log.length ? log.join('\n') : 'none');
const bad = results.filter((r) => !r.ok).length;
console.log(bad ? `${bad} failing` : `all ${results.length} pass`);
await browser.close();
process.exit(bad ? 1 : 0);
