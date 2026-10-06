#!/usr/bin/env node
/**
 * Photographs the real India Species Atlas for the promotional film's product
 * section (scene 08) — one PNG per interface state, at 2× device pixels.
 *
 *   npm run video:promo:capture            # builds the site first
 *   npm run video:promo:capture -- --no-build
 *
 * The film never draws a fake interface. Every UI frame it shows is one of
 * these screenshots, and every place its cursor travels to is the on-screen
 * rectangle of a real element, recorded here as `ui.json`. The film moves a
 * camera over the plates and cross-cuts between them; it does not invent a
 * state the site does not have.
 *
 * Written to video/public/promo/ui/ as JPEG (git-ignored; re-run after the site changes).
 */
import { spawn, spawnSync } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const OUT = join(ROOT, 'video/public/promo/ui');
const PORT = 4467;
const BASE = `http://127.0.0.1:${PORT}`;
const VIEW = { width: 1920, height: 1080 };
const SCALE = 2;
/**
 * Plates are stored as 2880 px JPEGs: the film's closest UI camera needs
 * about 1.4 image px per CSS px, and a 3840 px PNG takes long enough to
 * decode on a small machine to time a render out.
 */
const PLATE_WIDTH = 2880;

function toJpeg(name) {
  const png = join(OUT, `${name}.png`);
  const jpg = join(OUT, `${name}.jpg`);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-vf', `scale=${PLATE_WIDTH}:-1:flags=lanczos`, '-q:v', '2', jpg]);
  if (r.status !== 0) throw new Error(`ffmpeg failed on ${png}`);
  return unlink(png);
}

if (process.argv.includes('--convert-only')) {
  const m = JSON.parse(await readFile(join(OUT, 'ui.json'), 'utf8'));
  for (const [name, shot] of Object.entries(m.shots)) {
    if (shot.file.endsWith('.png')) await toJpeg(name);
    shot.file = `promo/ui/${name}.jpg`;
  }
  await writeFile(join(OUT, 'ui.json'), JSON.stringify(m, null, 2));
  console.log('converted plates to JPEG');
  process.exit(0);
}

/** The species the product section opens, and the locality pin it clicks. */
const SPECIES_ID = 'bengal-tiger';
const PIN_TITLE = 'Bengal Tiger — Kanha Tiger Reserve, Madhya Pradesh';

function sh(cmd, args) {
  return new Promise((ok, fail) => {
    const c = spawn(cmd, args, { cwd: ROOT, stdio: 'inherit' });
    c.on('close', (code) => (code === 0 ? ok() : fail(new Error(`${cmd} exited ${code}`))));
  });
}

async function rectOf(locator) {
  const box = await locator.first().boundingBox();
  if (!box) throw new Error(`no box for ${locator}`);
  return { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) };
}

await mkdir(OUT, { recursive: true });
if (!process.argv.includes('--no-build')) await sh('npm', ['run', 'build']);

const server = spawn(
  process.execPath,
  [join(ROOT, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
  { cwd: ROOT, stdio: 'ignore' },
);

const shots = {};
try {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  // `npm run build` uses base '/' unless VITE_BASE is set (the Pages deploy sets it).
  const base = `${BASE}${(process.env.VITE_BASE ?? '/').replace(/\/$/, '')}`;

  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=gl-egl', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--force-color-profile=srgb'],
  });
  const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: SCALE });

  const snap = async (name, extra = {}) => {
    // Park the pointer where neither the custom cursor nor a hover state shows.
    await page.mouse.move(VIEW.width - 4, VIEW.height - 4);
    await page.waitForTimeout(400);
    await writeFile(join(OUT, `${name}.png`), await page.screenshot({ type: 'png' }));
    await toJpeg(name);
    shots[name] = { file: `promo/ui/${name}.jpg`, url: page.url().replace(base, ''), ...extra };
    console.log('captured', name);
  };
  const go = async (path, wait) => {
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(wait);
  };

  // 1. Home — the documentary's opening frame.
  await go('/', 7000);
  await snap('home');

  // 2. The interactive map, Species mode. Tiles must finish loading first.
  await go('/atlas', 6000);
  const modeTab = (label) => page.getByRole('tablist', { name: 'Map mode' }).getByRole('tab', { name: label });
  const atlasRects = {
    map: await rectOf(page.locator('.leaflet-container')),
    pin: await rectOf(page.locator(`[title="${PIN_TITLE}"]`)),
    tabSpecies: await rectOf(modeTab('Species')),
    tabThreats: await rectOf(modeTab('Threats')),
    tabConservation: await rectOf(modeTab('Conservation')),
    search: await rectOf(page.getByRole('searchbox').or(page.locator('input[type="search"], input[type="text"]'))),
  };
  await snap('atlas', { rects: atlasRects });

  // 3. A pin pressed: the popup with its "Open full profile" button.
  await page.locator(`[title="${PIN_TITLE}"]`).first().click();
  await page.waitForTimeout(900);
  const openBtn = page.locator('.leaflet-popup').getByRole('button', { name: 'Open full profile' });
  await snap('atlas-popup', { rects: { ...atlasRects, open: await rectOf(openBtn) } });

  // 4–7. The species profile and its tabs.
  await openBtn.click();
  await page.waitForTimeout(1600);
  const panel = page.getByRole('dialog', { name: /profile$/ });
  const tab = (label) => panel.getByRole('tab', { name: label, exact: true });
  // The dialog covers the whole page (its backdrop); the drawer is the
  // tab list's nearest ancestor narrower than the viewport.
  const drawer = await panel.getByRole('tablist').evaluate((el) => {
    let n = el;
    while (n.parentElement && n.getBoundingClientRect().width < 500) n = n.parentElement;
    while (n.parentElement && n.parentElement.getBoundingClientRect().width < window.innerWidth * 0.8) n = n.parentElement;
    const r = n.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  const profileRects = {
    drawer,
    tabOverview: await rectOf(tab('Overview')),
    tabDistribution: await rectOf(tab('Distribution')),
    tabThreats: await rectOf(tab('Threats')),
    tabConservation: await rectOf(tab('Conservation')),
  };
  await snap('profile-overview', { rects: profileRects });
  for (const [id, label] of [
    ['distribution', 'Distribution'],
    ['threats', 'Threats'],
    ['conservation', 'Conservation'],
  ]) {
    await tab(label).click();
    await page.waitForTimeout(900);
    await snap(`profile-${id}`, { rects: profileRects });
  }

  // 8–9. The map's other two layers.
  await go('/atlas?mode=threats', 5000);
  await snap('atlas-threats', { rects: atlasRects });
  await go('/atlas?mode=conservation', 5000);
  await snap('atlas-conservation', { rects: atlasRects });

  // 10. The species directory.
  await go('/species', 3500);
  await snap('species');

  await browser.close();
  await writeFile(
    join(OUT, 'ui.json'),
    JSON.stringify({ captured: new Date().toISOString(), viewport: VIEW, scale: SCALE, species: SPECIES_ID, shots }, null, 2),
  );
  console.log(`wrote ${Object.keys(shots).length} plates to ${OUT}`);
} finally {
  server.kill();
}
