import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto('http://127.0.0.1:5173/about'); await p.waitForTimeout(3000);
console.log(await p.evaluate(() => ['.ab-open', '.ab-eyebrow', '.ab-display', '.ab-lede'].map((s) => { const r = document.querySelector(s).getBoundingClientRect(); return s + ' ' + Math.round(r.top) + '-' + Math.round(r.bottom); }).join('\n') + '\nfs ' + getComputedStyle(document.querySelector('.ab-display')).fontSize));
await b.close();
