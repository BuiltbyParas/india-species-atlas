// Stage lifecycle repro: snow leopard clip -> Next (dolphin) -> Back, repeated. Sequential, one headed Chromium, 1440x900.
// ROUNDS=n (default 4). Every step waits for a settled stage and dumps the stage's own diagnostics on failure.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://localhost:4200';
const ROUNDS = +(process.env.ROUNDS ?? 4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mem = () => Object.fromEntries(readFileSync('/proc/meminfo', 'utf8').split('\n').filter((l) => /^(MemAvailable|SwapFree|SwapTotal)/.test(l)).map((l) => [l.split(':')[0], Math.round(parseInt(l.split(':')[1]) / 1024) + 'MB']));
console.log('system', JSON.stringify(mem()), 'load', readFileSync('/proc/loadavg', 'utf8').trim());
const browser = await chromium.launch({ headless: false });
console.log('chromium', browser.version());
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const log = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.push(`[${m.type()}] ${m.text().slice(0, 200)}`); });
page.on('pageerror', (e) => log.push('[pageerror] ' + e.message.slice(0, 200)));
await page.addInitScript(() => { window.__lost = 0; window.__restored = 0; new MutationObserver(() => { for (const c of document.querySelectorAll('canvas')) if (!c.__w) { c.__w = 1; c.addEventListener('webglcontextlost', () => window.__lost++); c.addEventListener('webglcontextrestored', () => window.__restored++); } }).observe(document, { childList: true, subtree: true }); });
const field = () => page.evaluate(() => ({ ...(window.__atlasField?.() ?? {}), status: document.querySelector('.fs-study')?.dataset.status, lost: window.__lost, restored: window.__restored }));
// settled: the stage is drawing the wanted world (or has given up); polled, not slept
const settle = async (id, ms = 9000) => { const t = Date.now(); let s; while (Date.now() - t < ms) { s = await field(); if (s.failed || (s.showing === id && s.mode === 'host' && s.calls >= 3)) break; await sleep(250); } await sleep(600); return field(); };
let bad = 0;
const check = async (id, tag) => {
  const s = await settle(id); const ok = s.showing === id && !s.failed && s.mode === 'host' && s.calls >= 3 && s.status !== 'flat' && !s.lost;
  if (!ok) bad++;
  console.log(tag.padEnd(22), `showing=${s.showing} mode=${s.mode} status=${s.status} calls=${s.calls} tier=${s.tier} rung=${s.rung} failed=${s.failed}(${s.failReason}) lost=${s.lost}`, ok ? 'OK' : 'PROBLEM');
  if (!ok) console.log('   diag', JSON.stringify({ modeLog: s.modeLog, windows: s.windows, raf: s.raf, worlds: s.worldCount, mem: mem() }));
  return ok;
};
const toEnd = async () => { for (let k = 0; k < 40; k++) { const c = await page.evaluate(() => document.querySelector('.fs-study')?.dataset.current); if (+c === 4) break; await page.mouse.wheel(0, 300); await sleep(250); } await sleep(1200); };
await page.goto(`${BASE}/field/snow-leopard`);
await check('snow-leopard', 'direct');
await toEnd();
for (let r = 1; r <= ROUNDS; r++) {
  const btn = page.locator('.fs-footage-toggle');
  await btn.click(); await sleep(2500);
  const v = await page.evaluate(() => { const v = document.querySelector('.fs-footage-video'); return v ? `${v.paused ? 'paused' : 'PLAYING'} t=${v.currentTime.toFixed(1)}` : 'none'; });
  console.log(`round ${r}`, 'clip', v);
  await check('snow-leopard', `r${r} playing`);
  await page.locator('.fs-next').first().click().catch(() => {});
  if (!(await check('ganges-river-dolphin', `r${r} next`))) break;
  await page.goBack();
  if (!(await check('snow-leopard', `r${r} back`))) break;
  await toEnd();
}
console.log(bad ? `${bad} PROBLEMS` : 'ALL OK', 'lost/restored', await page.evaluate(() => [window.__lost, window.__restored].join('/')), 'console:', log.length ? log : 'none', 'system', JSON.stringify(mem()));
process.exitCode = bad ? 1 : 0;
await browser.close();
