// Does each field-study world move while the page is still? Two frames 1.5 s apart at rest on each study (no scroll,
// no pointer) and the mean pixel change between them, whole frame and around the animal. Production build, GPU on.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4301';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
const settle = async () => { let last = -1; for (let i = 0; i < 80; i++) { const y = await page.evaluate(() => Math.round(scrollY)); if (y === last) break; last = y; await page.waitForTimeout(100); } await page.waitForTimeout(2500); };
const studies = ['bustard', 'snow leopard', 'dolphin', 'tiger', 'rhinoceros'];
for (let i = 0; i < 5; i++) {
  const target = await page.evaluate((i) => { const el = document.querySelector('#field-studies'); return Math.round(el.getBoundingClientRect().top + scrollY + (i + 0.35) * innerHeight); }, i);
  let y = await page.evaluate(() => scrollY);
  const dir = Math.sign(target - y);
  while (Math.abs(target - y) > 300) { await page.mouse.wheel(0, dir * 300); y += dir * 300; await page.waitForTimeout(30); }
  await settle();
  await page.evaluate((t) => window.scrollTo(0, t), target); await settle();
  const grab = () => page.screenshot({ type: 'png' });
  const a = await grab(); await page.waitForTimeout(1500); const b = await grab();
  const r = await page.evaluate(async ([a, b]) => {
    const load = (s) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = 'data:image/png;base64,' + s; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const px = (im) => { const c = document.createElement('canvas'); c.width = 160; c.height = 100; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 160, 100); return x.getImageData(0, 0, 160, 100).data; };
    const pa = px(ia), pb = px(ib);
    let all = 0, n = 0, changed = 0;
    for (let i = 0; i < pa.length; i += 4) { const d = (Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2])) / 3; all += d; n++; if (d > 3) changed++; }
    return { mean: +(all / n).toFixed(2), changedPct: +(changed / n * 100).toFixed(1) };
  }, [a.toString('base64'), b.toString('base64')]);
  console.log(studies[i].padEnd(13), JSON.stringify(r));
}
console.log('errs', JSON.stringify(errs));
await browser.close();
