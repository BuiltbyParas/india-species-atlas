// One headed session: hero hand-over frames, dome gallery, species profile, About, Documentary, atlas Threats / Conservation modes. OUT=dir
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:5173', OUT = process.env.OUT ?? '.';
const sl = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: false });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
await page.goto(BASE + '/'); await sl(9000);
for (const y of [2150, 3000]) { await page.evaluate((v) => (window.__l ?? window).scrollTo(0, v), y); await sl(1800); await shot('hero-' + y); }
const dome = await page.evaluate(() => document.querySelector('[data-env=data]')?.getBoundingClientRect().top + scrollY);
await page.evaluate((v) => scrollTo(0, v), dome); await sl(3000); await shot('dome');
for (const [n, path] of [['species', '/species/snow-leopard'], ['about', '/about'], ['documentary', '/documentary']]) {
  await page.goto(BASE + path); await sl(6000); await shot(n);
  await page.evaluate(() => scrollTo(0, 900)); await sl(1500); await shot(n + '-2');
}
await page.goto(BASE + '/atlas'); await sl(5000);
for (const m of ['Threats', 'Conservation']) { await page.getByRole('button', { name: m }).first().click().catch(() => page.getByText(m, { exact: true }).first().click()); await sl(2500); await page.evaluate(() => scrollTo(0, 120)); await sl(600); await shot('atlas-' + m); }
console.log('console errors:', errs.length, errs.slice(0, 4));
await browser.close();
