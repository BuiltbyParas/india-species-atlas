// Rhinoceros fast upward scroll: N trials of load, fast down, fast up, settle; records stage mode/tier/fail reason/mode log/context events.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://localhost:4200';
const N = +(process.env.N ?? 8), W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
console.log('load', readFileSync('/proc/loadavg', 'utf8').trim(), 'avail', readFileSync('/proc/meminfo', 'utf8').match(/MemAvailable:\s+(\d+)/)[1] / 1024 | 0, 'MB');
const browser = await chromium.launch({ headless: false });
let bad = 0;
for (let t = 1; t <= N; t++) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H } }); const page = await ctx.newPage(); const log = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.push(`[${m.type()}] ${m.text().slice(0, 160)}`); });
  page.on('pageerror', (e) => log.push('[pageerror] ' + e.message.slice(0, 160)));
  await page.addInitScript(() => { window.__lost = 0; window.__restored = 0; new MutationObserver(() => { for (const c of document.querySelectorAll('canvas')) if (!c.__w) { c.__w = 1; c.addEventListener('webglcontextlost', () => window.__lost++); c.addEventListener('webglcontextrestored', () => window.__restored++); } }).observe(document, { childList: true, subtree: true }); });
  await page.goto(`${BASE}/field/indian-rhinoceros`); await sleep(3500);
  for (let k = 0; k < 30; k++) { await page.mouse.wheel(0, 1400); await sleep(40); }
  await sleep(1500);
  for (let k = 0; k < 30; k++) { await page.mouse.wheel(0, -1400); await sleep(40); }
  await sleep(3000);
  const s = await page.evaluate(() => ({ ...(window.__atlasField?.() ?? {}), status: document.querySelector('.fs-study')?.dataset.status, lost: window.__lost, restored: window.__restored }));
  const ok = s.showing === 'indian-rhinoceros' && !s.failed && s.status !== 'flat';
  if (!ok) bad++;
  console.log(`trial ${t}`, ok ? 'OK' : 'FALLBACK', `mode=${s.mode} tier=${s.tier} rung=${s.rung} failed=${s.failed}(${s.failReason}) status=${s.status} lost=${s.lost}/${s.restored} showing=${s.showing}`);
  if (!ok) console.log('   modeLog', JSON.stringify(s.modeLog), 'windows', JSON.stringify(s.windows), 'console', JSON.stringify(log));
  else if (log.length) console.log('   console', JSON.stringify(log));
  await ctx.close();
}
console.log(`${bad}/${N} fallbacks`);
await browser.close();
