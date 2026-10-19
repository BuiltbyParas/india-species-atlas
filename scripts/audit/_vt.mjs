import { chromium } from 'playwright';
const [clip, exe, ...extra] = process.argv.slice(2);
const b = await chromium.launch({ headless: true, executablePath: exe === '-' ? undefined : exe, args: ['--autoplay-policy=no-user-gesture-required', ...extra] });
const p = await b.newPage();
await p.goto('http://127.0.0.1:4301/about', { waitUntil: 'domcontentloaded' });
const res = await p.evaluate(async (clip) => {
  const c = document.createElement('canvas'); const gl = c.getContext('webgl2');
  const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
  const ren = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'none';
  const v = document.createElement('video'); v.muted = true; v.src = '/assets/' + clip; document.body.append(v);
  let err = null; try { await v.play(); } catch (e) { err = e.name; }
  await new Promise((r) => setTimeout(r, 2500));
  return { ren, t: v.currentTime.toFixed(2), err, verr: v.error && v.error.message, glLost: gl.isContextLost() };
}, clip).catch((e) => e.message);
console.log(b.version(), extra.join(' '), JSON.stringify(res));
await b.close();
