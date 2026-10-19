// Species section height, per study and per movement, in screens. W=1440 H=900 node scripts/audit/species-height.mjs
import { chromium } from 'playwright';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
await p.goto((process.env.BASE ?? 'http://localhost:5173') + '/', { waitUntil: 'load' });
await p.waitForTimeout(1500);
const r = await p.evaluate(() => {
  const vh = innerHeight;
  const sec = document.getElementById('field-studies');
  const out = { section: +(sec.offsetHeight / vh).toFixed(2), px: sec.offsetHeight, studies: [] };
  for (const st of sec.querySelectorAll('.fs-index-stretch')) {
    const a = st.querySelector('.fs-read');
    const parts = a ? [...a.querySelectorAll(':scope > section, :scope > .fs-beat, :scope > header')].map((x) => `${x.dataset.sec ?? x.dataset.beat ?? x.className}:${(x.offsetHeight / vh).toFixed(2)}`) : [];
    const cs = a && getComputedStyle(a);
    out.studies.push({ id: st.dataset.study, stretch: +(st.offsetHeight / vh).toFixed(2), panel: +(st.querySelector('.fs-index-panel').offsetHeight / vh).toFixed(2), article: a ? +(a.offsetHeight / vh).toFixed(2) : 0, mb: cs?.marginBottom, parts: parts.join(' ') });
  }
  return out;
});
console.log(`${W}x${H}`, JSON.stringify(r, null, 1));
await b.close();
