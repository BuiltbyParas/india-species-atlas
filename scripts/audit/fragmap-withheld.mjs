// The seven records that withhold their coordinates: on the home page, neither the working map's previews and popups
// nor anything else on the page (Fragments included) may print them. Production build. Env: BASE.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4301';
const WITHHELD = [
  ['Desert National Park', 26.78, 70.64], ['Pokhran', 27.55, 71.35], ['Abdasa', 23.34, 68.84],
  ['National Chambal Sanctuary', 26.75, 78.58], ['Girwa river', 28.35, 81.15], ['Son Gharial', 24.56, 82.24], ['Gandak river', 26.85, 84.5],
];
const deg = (v, axis) => {
  const hemi = axis === 'lat' ? 'N' : 'E';
  let d = Math.floor(v); let m = Math.round((v - d) * 60); if (m === 60) { d += 1; m = 0; }
  return `${d}°${String(m).padStart(2, '0')}′${hemi}`;
};
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const target = await page.evaluate(() => document.querySelector('#home-map-panel').getBoundingClientRect().top + scrollY - 120);
await page.evaluate((t) => window.scrollTo(0, t), target);
await page.waitForSelector('#home-map-panel .leaflet-marker-icon', { timeout: 20000 });
await page.waitForTimeout(1500);
let bad = 0;
for (const [label, lat, lng] of WITHHELD) {
  const coord = `${deg(lat, 'lat')} ${deg(lng, 'lng')}`;
  const markers = page.locator(`#home-map-panel .leaflet-marker-icon[title*="${label}"]`);
  const n = await markers.count();
  for (let i = 0; i < n; i++) {
    await markers.nth(i).dispatchEvent('mouseover');
    await page.waitForTimeout(250);
    const prev = await page.evaluate(() => [...document.querySelectorAll('.marker-preview')].map((e) => e.textContent).join(' | '));
    await markers.nth(i).dispatchEvent('mouseout');
    await markers.nth(i).dispatchEvent('click');
    await page.waitForTimeout(300);
    const pop = await page.evaluate(() => document.querySelector('#home-map-panel .leaflet-popup-content')?.textContent ?? '');
    await page.keyboard.press('Escape');
    const leak = prev.includes(coord) || pop.includes(coord) || !prev.includes('coordinates withheld');
    if (leak) bad++;
    console.log(leak ? 'FAIL' : 'PASS', label, '|', prev.slice(0, 110));
  }
  if (!n) { console.log('FAIL no marker for', label); bad++; }
}
const html = await page.evaluate(() => document.body.innerText);
for (const [label, lat, lng] of WITHHELD) {
  const coord = deg(lat, 'lat');
  const hit = html.includes(`${coord} ${deg(lng, 'lng')}`);
  if (hit) { bad++; console.log('FAIL page text prints', label); }
}
console.log(bad ? `${bad} FAIL` : 'ALL PASS');
await browser.close();
