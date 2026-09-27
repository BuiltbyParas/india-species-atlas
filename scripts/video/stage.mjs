/**
 * Starts the film stage and opens it in a headless browser, on the real GPU
 * where there is one.
 */
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

export const ROOT = resolve(import.meta.dirname, '../..');
const PORT = 4455;

const GPU_ARGS = ['--use-gl=angle', '--use-angle=gl-egl', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
const BASE_ARGS = ['--hide-scrollbars', '--force-color-profile=srgb', '--disable-lcd-text', '--mute-audio', '--font-render-hinting=none'];

export async function startServer(url) {
  if (url) return { url, stop() {} };
  // Spawned directly rather than through npx, so stopping it cannot orphan the server.
  const child = spawn(process.execPath, [join(ROOT, 'node_modules/vite/bin/vite.js'), '--config', 'video/vite.config.ts'], {
    cwd: ROOT,
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const base = `http://127.0.0.1:${PORT}`;
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(base)).ok) return { url: base, stop: () => child.kill() };
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill();
  throw new Error('the film stage did not start (vite --config video/vite.config.ts)');
}

/** Opens the stage in capture mode. Falls back to software GL if the GPU path fails. */
export async function openStage(url, { scale = 1 } = {}) {
  let browser;
  let gpu = true;
  try {
    browser = await chromium.launch({ args: [...BASE_ARGS, ...GPU_ARGS] });
  } catch {
    gpu = false;
    browser = await chromium.launch({ args: BASE_ARGS });
  }
  const page = await browser.newPage({
    viewport: { width: Math.round(1920 * scale), height: Math.round(1080 * scale) },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${url}/?capture=1&scale=${scale}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__film, null, { timeout: 60_000 });
  await page.evaluate(() => window.__film.ready);
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return gl ? gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) : 'no WebGL2';
  });
  return { browser, page, errors, renderer, gpu };
}

/** Draws the frame at t and returns it as an encoded image. */
export async function grabFrame(page, t, type = 'jpeg', quality = 0.95) {
  const data = await page.evaluate(
    async ([tt, ty, q]) => {
      await window.__film.seek(tt);
      return window.__film.grab(ty, q);
    },
    [t, type, quality],
  );
  return Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
}
