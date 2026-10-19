// Chapter 03 interactions: index preview, choose, rapid choices, commit → profile, Escape, early keyboard focus. OUT=dir
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? '.';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl', ...(process.env.NOGL ? ['--disable-webgl', '--disable-3d-apis'] : [])] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errs.push(m.text().slice(0, 200)));
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
const shot = (n) => page.screenshot({ path: `${OUT}/i-${W}-${n}.jpg`, type: 'jpeg', quality: 74 });
const state = () => page.evaluate(() => ({
  url: location.search,
  current: document.querySelector('.sel-row.is-current .sel-name')?.textContent,
  caption: document.querySelector('.dome-name')?.textContent,
  lit: document.querySelectorAll('.sel-mark.is-lit').length,
  pan: document.querySelector('.sel-pan')?.style.transform,
  risen: document.getElementById('selection-chapter')?.className,
  dialog: !!document.querySelector('[role="dialog"]'),
  y: Math.round(scrollY),
}));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await sleep(7000);
const sec = await page.evaluate(() => { const r = document.getElementById('selection-chapter').getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; });
// 1. Keyboard focus on the index before the dome has risen: should carry the reader to the plate at rest.
await page.evaluate((v) => window.scrollTo(0, v), Math.round(sec.top + 0.05 * sec.h)); await sleep(1500);
console.log('before focus', JSON.stringify(await state()));
await page.focus('.sel-row'); await sleep(2600);
console.log('after focus', JSON.stringify(await state()));
await shot('1-focus');
await page.evaluate(() => document.activeElement?.blur());
// 2. Preview: hover Snow Leopard.
const rows = page.locator('.sel-row');
await rows.nth(9).hover(); await sleep(1600);
console.log('hover snow leopard', JSON.stringify(await state()));
await shot('2-hover');
// 3. Choose Ganges River Dolphin, then rapid choices ending on Red Panda.
await rows.nth(5).click(); await sleep(1800);
console.log('chose dolphin', JSON.stringify(await state()));
await shot('3-dolphin');
for (const k of [2, 8, 11, 4]) { await rows.nth(k).click(); await sleep(90); }
await page.mouse.move(W * 0.7, H * 0.4); await sleep(2200);
console.log('rapid → red panda', JSON.stringify(await state()));
await shot('4-rapid');
// 4. Commit: Open profile, mid-choice and after.
await page.click('.dome-controls .text-link'); await sleep(300);
console.log('mid-commit', JSON.stringify(await state()), await page.evaluate(() => document.querySelector('.dome')?.dataset.opening));
await shot('5-commit');
await sleep(1100);
console.log('after commit', JSON.stringify(await state()));
await shot('6-profile');
await page.keyboard.press('Escape'); await sleep(1200);
console.log('after escape', JSON.stringify(await state()), 'focus', await page.evaluate(() => document.activeElement?.textContent?.slice(0, 30)));
await shot('7-back');
// 5. Arrow keys on the dome and Enter.
await page.focus('.dome-stage'); await page.keyboard.press('ArrowRight'); await sleep(900); await page.keyboard.press('ArrowRight'); await sleep(1500);
console.log('arrows', JSON.stringify(await state()));
// 6. Drag cancels a pending commit.
await page.click('.dome-controls .text-link'); await sleep(150);
const box = await page.locator('.dome-stage').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
for (let i = 0; i < 8; i++) { await page.mouse.move(box.x + box.width / 2 - i * 30, box.y + box.height / 2); await sleep(16); }
await page.mouse.up(); await sleep(1400);
console.log('drag during commit', JSON.stringify(await state()));
await shot('8-drag');
console.log('console', JSON.stringify(errs.slice(0, 12)));
await browser.close();
