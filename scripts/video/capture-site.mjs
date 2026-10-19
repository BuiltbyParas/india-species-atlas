#!/usr/bin/env node
/**
 * Photographs the real India Species Atlas for the documentary.
 *
 *   npm run video:site
 *
 * Builds the site, serves it locally, and takes 1920×1080 screenshots of
 * the pages the film shows: the home page, the map, each featured species'
 * profile and the conservation page. The film frames these as plates (it
 * does not screen-record the site), so what the viewer sees of the Atlas is
 * exactly what they will find when they visit it.
 *
 * Written to video/public/site/ (git-ignored; re-run after the site changes).
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { ROOT } from './stage.mjs';

const PORT = 4466;
const OUT = join(ROOT, 'video/public/site');
const FEATURED = ['great-indian-bustard', 'bengal-tiger', 'ganges-river-dolphin', 'snow-leopard', 'indian-rhinoceros'];

const PAGES = [
  { file: 'home.png', path: '/', wait: 7000 },
  { file: 'atlas.png', path: '/atlas', wait: 5000 },
  { file: 'conservation.png', path: '/conservation', wait: 3000 },
  { file: 'species.png', path: '/species', wait: 3000 },
  ...FEATURED.map((id) => ({ file: `profile-${id}.png`, path: `/species?species=${id}`, wait: 2500 })),
];

function sh(cmd, args) {
  return new Promise((ok, fail) => {
    const c = spawn(cmd, args, { cwd: ROOT, stdio: 'inherit' });
    c.on('close', (code) => (code === 0 ? ok() : fail(new Error(`${cmd} exited ${code}`))));
  });
}

await mkdir(OUT, { recursive: true });
if (!process.argv.includes('--no-build')) await sh('npm', ['run', 'build']);
const server = spawn(process.execPath, [join(ROOT, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}`;
try {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=gl-egl', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const shots = [];
  for (const p of PAGES) {
    await page.goto(`${base}${p.path}`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(p.wait);
    await page.mouse.move(1900, 1070);
    await writeFile(join(OUT, p.file), await page.screenshot({ type: 'png' }));
    shots.push({ file: `site/${p.file}`, url: p.path });
    console.log(`  ${p.path} → ${p.file}`);
  }
  await writeFile(join(OUT, 'site.json'), JSON.stringify({ captured: new Date().toISOString(), shots }, null, 2));
  await browser.close();
} finally {
  server.kill();
}
