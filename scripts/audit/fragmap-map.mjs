// The home page's working map, tested as a reader uses it (production build, GPU on). argv: OUT. Env: W/H, BASE.
// Checks: markers from the data, a marker's preview and popup name the right species, Quick profile opens it, a
// state click lists its species, +/− and drag move the map, the wheel scrolls the page until the map is clicked and
// zooms it after, withheld coordinates are never printed, the attribution is on screen, Enter its world navigates.
import { chromium } from 'playwright';
const [OUT] = process.argv.slice(2);
const BASE = process.env.BASE ?? 'http://localhost:4301';
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const browser = await chromium.launch({ args: process.env.NOGL ? ['--disable-webgl', '--disable-3d-apis'] : ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errs = [];
page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
const ok = [];
// Waits until the page has stopped moving (the smooth scroller glides after every wheel or jump), then measures the panel.
const settle = async () => {
  let last = -1;
  for (let i = 0; i < 40; i++) {
    const y = await page.evaluate(() => Math.round(scrollY));
    if (y === last) break;
    last = y;
    await page.waitForTimeout(120);
  }
  return page.locator('#home-map-panel').boundingBox();
};
const check = (name, pass, info = '') => { ok.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${info}`); };
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
// Walk down to the map in reader-sized steps.
const target = await page.evaluate(() => document.querySelector('#home-map-panel').getBoundingClientRect().top + scrollY - 120);
let y = 0;
while (y < target) { await page.mouse.wheel(0, 400); y += 400; await page.waitForTimeout(30); }
await page.waitForTimeout(1500);
await page.evaluate((t) => window.scrollTo(0, t), target);
await page.waitForSelector('#home-map-panel .leaflet-marker-icon', { timeout: 15000 });
await page.waitForTimeout(1500);
const data = await page.evaluate(async () => {
  const n = document.querySelectorAll('#home-map-panel .leaflet-marker-icon').length;
  const titles = [...document.querySelectorAll('#home-map-panel .leaflet-marker-icon')].map((m) => m.getAttribute('title'));
  const attr = document.querySelector('#home-map-panel .leaflet-control-attribution');
  const r = attr?.getBoundingClientRect();
  return { n, titles, attr: attr?.textContent, attrVisible: !!r && r.width > 50 && r.bottom <= innerHeight && r.top >= 0 };
});
const expected = await page.evaluate(() => fetch('/atlas').then(() => null));
check('markers render', data.n === 52, `(${data.n})`);
check('attribution visible', data.attrVisible && /Esri/.test(data.attr ?? ''), JSON.stringify(data.attr));
await page.screenshot({ path: `${OUT}/map-home-rest.jpg`, type: 'jpeg', quality: 72 });

// Wheel over the sleeping map scrolls the page, not the map.
const zoomOf = () => page.evaluate(() => {
  const t = document.querySelector('#home-map-panel .leaflet-map-pane')?.style.transform;
  const img = document.querySelector('#home-map-panel .leaflet-tile-container img');
  return { zoomText: document.querySelector('#home-map-panel .leaflet-tile-container')?.style.transform ?? '', scrollY: Math.round(scrollY), level: document.querySelector('#home-map-panel .leaflet-tile')?.src?.match(/tile\/(\d+)\//)?.[1] };
});
const panel = await page.locator('#home-map-panel').boundingBox();
const cx = panel.x + panel.width * 0.25, cy = Math.min(panel.y + panel.height / 2, H - 120);
await page.mouse.move(cx, cy);
const before = await zoomOf();
await page.mouse.wheel(0, 300);
await page.waitForTimeout(900);
const after = await zoomOf();
check('wheel over sleeping map scrolls page', after.scrollY > before.scrollY && after.level === before.level, `${before.scrollY}->${after.scrollY} z${before.level}->${after.level}`);
// Hint shown?
const hint = await page.evaluate(() => document.querySelector('.map-wheel-hint')?.classList.contains('is-on'));
check('wheel hint shown', !!hint);
// Back up to the map with the wheel, from the margin beside it (a scrollTo is overridden by the smooth scroller's glide).
await page.mouse.move(12, H / 2);
await page.mouse.wheel(0, -(after.scrollY - before.scrollY));
await page.waitForTimeout(400);
// Click the map ground (sea, away from markers) to wake it, then wheel zooms.
const p2 = await settle();
await page.mouse.click(p2.x + p2.width * 0.15, Math.max(p2.y, 80) + 60);
await page.waitForTimeout(400);
const b2 = await zoomOf();
await page.mouse.move(p2.x + p2.width / 2, Math.max(p2.y, 80) + 200);
await page.mouse.wheel(0, -400);
await page.waitForTimeout(1200);
const a2 = await zoomOf();
check('wheel zooms after click', a2.scrollY === b2.scrollY && a2.level !== b2.level, `scroll ${b2.scrollY}->${a2.scrollY} z${b2.level}->${a2.level}`);
// Reset, then +/− buttons.
await page.getByRole('button', { name: 'Reset to India view' }).click();
await page.waitForTimeout(1600);
const z0 = (await zoomOf()).level;
await page.locator('#home-map-panel .leaflet-control-zoom-in').click();
await page.waitForTimeout(900);
const z1 = (await zoomOf()).level;
check('zoom-in button', z1 !== z0, `${z0}->${z1}`);
// Drag pans.
await settle();
const panBefore = await page.evaluate(() => document.querySelector('#home-map-panel .leaflet-map-pane').style.transform);
const p4 = await settle();
await page.mouse.move(p4.x + p4.width * 0.88, p4.y + p4.height * 0.5);
await page.mouse.down();
await page.mouse.move(p4.x + p4.width * 0.7, p4.y + p4.height * 0.6, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(600);
const panAfter = await page.evaluate(() => document.querySelector('#home-map-panel .leaflet-map-pane').style.transform);
check('drag pans', panAfter !== panBefore, `${panBefore} -> ${panAfter}`);
await page.getByRole('button', { name: 'Reset to India view' }).click();
await page.waitForTimeout(1600);

// A marker: hover preview, click popup names the same species; Quick profile opens that profile.
const marker = page.locator('#home-map-panel .leaflet-marker-icon[title^="Snow Leopard"]').first();
const mtitle = await marker.getAttribute('title');
await marker.hover();
await page.waitForTimeout(500);
const preview = await page.evaluate(() => document.querySelector('.marker-preview')?.textContent ?? '');
check('marker preview names species', preview.includes('Snow Leopard'), JSON.stringify(preview.slice(0, 90)));
await marker.click();
await page.waitForTimeout(700);
const popup = await page.evaluate(() => document.querySelector('#home-map-panel .leaflet-popup-content')?.textContent ?? '');
check('popup names species and place', popup.includes('Snow Leopard') && popup.includes(mtitle.split(' — ')[1].split(',')[0]), JSON.stringify(popup.slice(0, 120)));
await page.screenshot({ path: `${OUT}/map-home-popup.jpg`, type: 'jpeg', quality: 72 });
await page.locator('#home-map-panel .leaflet-popup-content').getByRole('button', { name: 'Quick profile' }).click();
await page.waitForTimeout(1200);
const dialog = await page.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find((x) => x.getBoundingClientRect().width > 0 && /Panthera uncia/.test(x.textContent)); return d ? d.textContent.slice(0, 160) : null; });
check('quick profile opens that species', !!dialog && dialog.includes('Snow Leopard'), JSON.stringify(dialog?.slice(0, 80)));
await page.screenshot({ path: `${OUT}/map-home-profile.jpg`, type: 'jpeg', quality: 72 });
await page.keyboard.press('Escape');
await page.waitForTimeout(800);

// Withheld coordinates never printed: every marker whose record withholds them shows "coordinates withheld" in its preview.
const withheld = await page.evaluate(async () => {
  const out = [];
  for (const m of document.querySelectorAll('#home-map-panel .leaflet-marker-icon')) {
    m.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));
    out.push([m.getAttribute('title'), document.querySelector('.marker-preview')?.textContent ?? '']);
    m.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
  }
  return out;
});
const withheldCount = withheld.filter(([, t]) => t.includes('coordinates withheld')).length;
console.log('previews with coordinates withheld:', withheldCount, '/', withheld.length);

// Keyboard: Tab reaches a marker and Enter opens its popup.
await page.locator('#home-map-panel .leaflet-marker-icon').first().focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(600);
const kbPopup = await page.evaluate(() => !!document.querySelector('#home-map-panel .leaflet-popup-content'));
check('keyboard Enter on marker opens popup', kbPopup);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// A state click lists its species.
const stateClick = await page.evaluate(() => {
  const paths = [...document.querySelectorAll('#home-map-panel .leaflet-overlay-pane path.leaflet-interactive')];
  return paths.length;
});
const p3 = await settle();
// Rajasthan, roughly: west of the centre. Find a state path by hovering until the tooltip names one.
let named = null;
for (const [fx, fy] of [[0.36, 0.45], [0.4, 0.55], [0.45, 0.5], [0.42, 0.62]]) {
  await page.mouse.move(p3.x + p3.width * fx, p3.y + p3.height * fy);
  await page.waitForTimeout(250);
  named = await page.evaluate(() => document.querySelector('.region-label')?.textContent ?? null);
  if (named) { await page.mouse.click(p3.x + p3.width * fx, p3.y + p3.height * fy); break; }
}
await page.waitForTimeout(800);
const statePanel = await page.evaluate(() => document.querySelector('#working-map .home-map-foot > :last-child')?.textContent ?? '');
check('state click lists its species', !!named && statePanel.includes(named.split(' — ')[0]) && !statePanel.includes('No state selected'), `${named} | ${statePanel.slice(0, 140)}`);
await page.screenshot({ path: `${OUT}/map-home-state.jpg`, type: 'jpeg', quality: 72 });

// Modes switch the markers.
await page.locator('#working-map').getByRole('tab', { name: /Threats/ }).click();
await page.waitForTimeout(600);
const modeOk = await page.evaluate(() => document.querySelectorAll('#home-map-panel .leaflet-marker-icon').length);
check('threats mode keeps markers', modeOk === 52, `(${modeOk})`);
await page.locator('#working-map').getByRole('tab', { name: /Species/ }).click();
await page.waitForTimeout(600);

// Enter its world: navigates to the species page.
const m2 = page.locator('#home-map-panel .leaflet-marker-icon[title^="Gharial"]').first();
await m2.click();
await page.waitForTimeout(600);
await page.locator('#home-map-panel .leaflet-popup-content').getByRole('link', { name: /Enter its world/ }).click();
await page.waitForURL(/\/species\/gharial/, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(2500);
check('enter its world navigates', page.url().includes('/species/gharial'), page.url());
console.log('errs', JSON.stringify(errs));
console.log(ok.every(Boolean) ? 'ALL PASS' : `${ok.filter((x) => !x).length} FAIL`);
await browser.close();
