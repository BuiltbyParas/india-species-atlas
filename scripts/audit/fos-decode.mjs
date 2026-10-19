// Does playing each shipped clip leave a WebGL context on the page alive? On the project's AMD Renoir laptop, hardware
// VP9 decoding crashed Chrome's GPU process and lost every WebGL context (the field stage's included); the clips are
// AV1 + H.264 since. Plays every clip in dist/assets next to a live WebGL2 context, with the GPU on.
//   BASE=http://127.0.0.1:4301 [EXE=/path/to/chrome] node scripts/audit/fos-decode.mjs
import { chromium } from 'playwright';
import { readdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4301';
const clips = readdirSync('dist/assets').filter((f) => /\.(webm|mp4)$/.test(f));
const b = await chromium.launch({
  headless: true,
  executablePath: process.env.EXE || undefined,
  args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl', '--autoplay-policy=no-user-gesture-required'],
});
let bad = 0;
for (const clip of clips) {
  const p = await b.newPage();
  await p.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded' });
  const r = await p.evaluate(async (clip) => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    const v = document.createElement('video');
    v.muted = true;
    v.src = '/assets/' + clip;
    document.body.append(v);
    let err = null;
    try {
      await v.play();
    } catch (e) {
      err = e.name;
    }
    await new Promise((r) => setTimeout(r, 2000));
    return { t: +v.currentTime.toFixed(2), err, mediaError: v.error?.message ?? null, glLost: gl ? gl.isContextLost() : 'no-gl' };
  }, clip);
  const ok = !r.err && !r.mediaError && r.glLost === false && r.t > 1;
  if (!ok) bad++;
  console.log(ok ? 'ok  ' : 'FAIL', clip, JSON.stringify(r));
  await p.close();
}
console.log(b.version(), bad ? `${bad} failing` : 'all clips play with WebGL intact');
await b.close();
process.exit(bad ? 1 : 0);
