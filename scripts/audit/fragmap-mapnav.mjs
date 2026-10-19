// Reaches the working map the ways a reader does (hero link, header "Map", menu) and reports whether Leaflet is
// actually visible: markers in the DOM, the element at the map's centre, and a frame. argv: OUT. Env: W/H, BASE, Y (scroll first)
import { chromium } from 'playwright';
const [OUT] = process.argv.slice(2);
const BASE = process.env.BASE ?? 'http://localhost:4301';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
async function probe(label, how) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 160)));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  await how(page);
  await page.waitForTimeout(5000);
  const r = await page.evaluate(() => {
    const m = document.querySelector('.leaflet-container');
    const out = { path: location.pathname, markers: document.querySelectorAll('.leaflet-marker-icon').length };
    if (!m) return { ...out, map: 'none' };
    const b = m.getBoundingClientRect();
    const el = document.elementFromPoint(b.left + b.width / 2, b.top + Math.min(b.height / 2, innerHeight / 2 - b.top + 100));
    const cs = getComputedStyle(m);
    const fixed = [...document.body.children].filter((c) => getComputedStyle(c).position === 'fixed' && c.getBoundingClientRect().width > innerWidth * 0.5)
      .map((c) => `${c.tagName}.${(c.className + '').slice(0, 40)} z${getComputedStyle(c).zIndex} op${getComputedStyle(c).opacity} vis${getComputedStyle(c).visibility}`);
    return { ...out, rect: [b.left, b.top, b.width, b.height].map(Math.round), opacity: cs.opacity, vis: cs.visibility,
      atCentre: el ? `${el.tagName}.${(el.className?.baseVal ?? el.className + '').slice(0, 60)}` : null, fixed };
  });
  await page.screenshot({ path: `${OUT}/mapnav-${label}.jpg`, type: 'jpeg', quality: 70 });
  console.log(label, JSON.stringify(r), JSON.stringify(errs));
  await page.close();
}
await probe('hero-link', (p) => p.getByRole('link', { name: 'Or open the working map' }).click());
await probe('header-map', (p) => p.locator('header').getByRole('link', { name: 'Map', exact: true }).first().click());
await probe('scrolled-header-map', async (p) => {
  for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(50); }
  await p.waitForTimeout(800);
  await p.locator('header').getByRole('link', { name: 'Map', exact: true }).first().click();
});
await browser.close();
