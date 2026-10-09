// Final desktop acceptance: headed Chromium, default flags (no forced GPU), 1440x900.
// MODE=seq (five studies, Next), low (same with ?quality=low), video (snow-leopard clip play/pause, repeat, away and back).
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4200';
const MODE = process.env.MODE ?? 'seq';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IDS = ['great-indian-bustard', 'snow-leopard', 'ganges-river-dolphin', 'bengal-tiger', 'indian-rhinoceros'];
const browser = await chromium.launch({ headless: false });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const log = []; page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.push(`[${m.type()}] ${m.text().slice(0, 220)}`); });
page.on('pageerror', (e) => log.push('[pageerror] ' + e.message.slice(0, 200)));
await page.addInitScript(() => { window.__lost = 0; window.__restored = 0; new MutationObserver(() => { for (const c of document.querySelectorAll('canvas')) if (!c.__w) { c.__w = 1; c.addEventListener('webglcontextlost', () => window.__lost++); c.addEventListener('webglcontextrestored', () => window.__restored++); } }).observe(document, { childList: true, subtree: true }); });
const lumOf = async () => { const png = await page.screenshot(); return page.evaluate(async (s) => { const i = new Image(); i.src = 'data:image/png;base64,' + s; await i.decode(); const c = document.createElement('canvas'); c.width = 32; c.height = 20; const x = c.getContext('2d'); x.drawImage(i, 0, 0, 32, 20); const d = x.getImageData(0, 0, 32, 20).data; let t = 0, mn = 255, mx = 0; for (let k = 0; k < d.length; k += 4) { const v = (d[k] + d[k + 1] + d[k + 2]) / 3; t += v; mn = Math.min(mn, v); mx = Math.max(mx, v); } return `lum=${Math.round(t / 640)} range=${Math.round(mn)}-${Math.round(mx)}`; }, png.toString('base64')); };
const state = async () => ({ ...(await page.evaluate(() => window.__atlasField?.() ?? {})), status: await page.evaluate(() => document.querySelector('.fs-study')?.dataset.status), lost: await page.evaluate(() => window.__lost), restored: await page.evaluate(() => window.__restored) });
let bad = 0;
const probe = async (id, tag) => { await sleep(700); const b = await state(); const ok = b.showing === id && !b.failed && b.calls >= 3 && b.status !== 'flat' && !b.lost; if (!ok) bad++; console.log(id.padEnd(22), tag.padEnd(8), `showing=${b.showing} mode=${b.mode} status=${b.status} calls=${b.calls} rung=${b.rung} failed=${b.failed} lost=${b.lost}`, await lumOf(), ok ? 'OK' : 'PROBLEM'); };
if (MODE === 'seq' || MODE === 'low') {
  await page.goto(`${BASE}/field/${IDS[0]}${MODE === 'low' ? '?quality=low' : ''}`); await sleep(3500);
  for (let i = 0; i < 5; i++) { await probe(IDS[i], 'arrive'); for (let k = 0; k < 10; k++) { await page.mouse.wheel(0, 700); await sleep(250); } await probe(IDS[i], 'end'); if (i < 4) { await page.locator('.fs-next').first().click(); await sleep(3500); } }
} else {
  await page.goto(`${BASE}/field/snow-leopard`); await sleep(3000);
  for (let k = 0; k < 40; k++) { const c = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.current); if (+c === 4) break; await page.mouse.wheel(0, 300); await sleep(250); }
  await sleep(1500);
  const vs = () => page.evaluate(() => { const v = document.querySelector('.fs-footage-video'); return v ? `${v.paused ? 'paused' : 'PLAYING'} t=${v.currentTime.toFixed(1)} err=${v.error?.code ?? 0}` : 'no video'; });
  const expect = async (label, want) => { const r = await vs(); const ok = want === 'play' ? r.startsWith('PLAYING') && r.endsWith('err=0') : r.startsWith('paused'); if (!ok) bad++; console.log(label.padEnd(14), r, ok ? '' : 'PROBLEM'); };
  await probe('snow-leopard', 'before');
  const btn = page.locator('.fs-footage-toggle');
  for (let r = 1; r <= 4; r++) {
    await btn.click(); await sleep(2500); await expect(`play #${r}`, 'play'); await probe('snow-leopard', 'playing');
    await btn.click(); await sleep(800); await expect(`pause #${r}`, 'pause'); await probe('snow-leopard', 'paused');
  }
  await btn.click(); await sleep(2000);
  for (const [lbl, nav] of [['go home', () => page.goto(`${BASE}/`)], ['back', () => page.goBack()]]) {
    await nav(); await sleep(3500); console.log(lbl.padEnd(14), page.url(), 'lost=', await page.evaluate(() => window.__lost));
  }
  await page.waitForSelector('.fs-study'); await probe('snow-leopard', 'returned');
  for (let k = 0; k < 40; k++) { const c = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.current); if (+c === 4) break; await page.mouse.wheel(0, 300); await sleep(250); }
  await sleep(1500); await btn.click(); await sleep(2500); await expect('play again', 'play'); await probe('snow-leopard', 'playing');
  await page.locator('.fs-next').first().click().catch(() => {}); await sleep(3500); await probe('ganges-river-dolphin', 'next');
  await page.goBack(); await sleep(3500); await probe('snow-leopard', 'back');
}
process.exitCode = bad ? 1 : 0;
console.log(bad ? `${bad} PROBLEMS` : 'ALL OK', 'lost/restored', await page.evaluate(() => [window.__lost, window.__restored].join('/')), 'console:', log.length ? log : 'none');
await browser.close();
