// /atlas marker reachability: every marker that shares a locality can be opened by a click on its own disc; on a
// phone, a tap that misses a disc by up to ~20 px opens the nearest marker rather than the state underneath; the
// captive record carries its ring; search still filters the markers. Prints PASS / FAIL per check.
// Env: BASE (default http://localhost:4302).
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:4302';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });
let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const markers = (page) =>
  page.$$eval('.leaflet-marker-icon', (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { title: el.getAttribute('title') ?? '', x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, out: el.classList.contains('is-out'), captive: !!el.querySelector('.is-captive'), leader: !!el.querySelector('.pin-leader') };
    }),
  );
const popupTitle = (page) => page.$eval('.leaflet-popup-content p', (p) => p.textContent.trim()).catch(() => null);

// Desktop: click each disc of every shared locality.
{
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(`${BASE}/atlas`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.leaflet-marker-icon');
  await sleep(2500);
  const all = await markers(page);
  check('52 markers drawn', all.length === 52, `${all.length}`);
  const stacked = all.filter((m) => m.leader);
  check('shared localities drawn side by side', stacked.length >= 4, `${stacked.length} markers with a leader to their shared point`);
  for (const s of stacked) {
    // Each popup pans the map, so measure the disc afresh, after the last popup has closed.
    const open = () => page.$$eval('.leaflet-popup', (e) => e.length);
    await page.keyboard.press('Escape');
    await sleep(500);
    check(`Escape closes the popup before ${s.title.split(' — ')[0]}`, (await open()) === 0);
    const m = (await markers(page)).find((o) => o.title === s.title);
    await page.mouse.click(m.x, m.y);
    await sleep(500);
    const t = await popupTitle(page);
    const want = m.title.split(' — ')[0];
    check(`click opens ${want} (${m.title.split(' — ')[1]})`, t === want, `popup: ${t}`);
  }
  check('the captive record is ringed', all.filter((m) => m.captive).length === 1, `${all.filter((m) => m.captive).length} ringed`);
  const legend = await page.textContent('body');
  check('legend explains the ring and the side-by-side markers', /conservation-breeding centre/.test(legend) && /share a locality/.test(legend));
  const box = await page.$('#species-search');
  if (box) {
    await box.fill('tiger');
    await sleep(1500);
    const after = await markers(page);
    const shown = after.filter((m) => !m.out);
    check('search filters the markers', shown.length > 0 && shown.every((m) => /Tiger/.test(m.title)), `${shown.length} shown`);
  } else check('search filters the markers', false, 'no #species-search');
  await page.context().close();
}

// Phone: a tap beside a marker opens it.
{
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await page.goto(`${BASE}/atlas`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.leaflet-marker-icon');
  await sleep(2500);
  // A marker with no neighbour within 50 px, so the nearest disc is unambiguous. At the opening zoom every disc
  // on a phone has a neighbour, so zoom in until one stands alone.
  let all = (await markers(page)).filter((m) => !m.out);
  const findLone = () => all.find((m) => all.every((o) => o === m || Math.hypot(o.x - m.x, o.y - m.y) > 50) && m.y > 120 && m.y < 700 && m.x > 30 && m.x < 360);
  let lone = findLone();
  for (let i = 0; !lone && i < 3; i++) {
    await page.click('.leaflet-control-zoom-in');
    await sleep(900);
    all = (await markers(page)).filter((m) => !m.out);
    lone = findLone();
  }
  if (!lone) check('a tap 15 px beside a lone marker opens it', false, 'no isolated marker on screen');
  else {
    await page.touchscreen.tap(lone.x + 15, lone.y);
    await sleep(700);
    const t = await popupTitle(page);
    check('a tap 15 px beside a lone marker opens it', t === lone.title.split(' — ')[0], `${lone.title} → popup ${t}`);
  }
  const sizes = all.map((m) => Math.round(m.w));
  console.log(`INFO  marker discs ${Math.min(...sizes)}–${Math.max(...sizes)} px; touch reach 22 px from the centre (44 px)`);
  await page.context().close();
}
await browser.close();
process.exit(failed ? 1 : 0);
