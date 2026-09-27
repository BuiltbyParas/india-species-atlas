import { DURATION, FPS, HEIGHT, SHOTS, VOICE, WIDTH, shotAt } from './timeline.mjs';
import { loadAssets } from './engine/data';
import { Film, slate } from './engine/film';
import { SCENES } from './scenes';
import { runChecks, type StageReport } from './qc';

/**
 * The film stage.
 *
 *   /?t=12.5            open at a time (dev player: space, ←/→, [ ])
 *   /?capture=1         no player; drive it with window.__film.seek(t)
 *   /?scale=0.5         draw at half size, for previews
 *
 * The render scripts open the stage with `?capture=1`, call `seek(t)` for
 * each frame, and read the frame back with `grab()`.
 */

declare global {
  interface Window {
    __film?: {
      duration: number;
      fps: number;
      ready: Promise<void>;
      seek: (t: number) => Promise<void>;
      grab: (type: 'jpeg' | 'png', quality?: number) => string;
      report: () => StageReport;
      shots: typeof SHOTS;
      voice: typeof VOICE;
    };
  }
}

const params = new URLSearchParams(location.search);
const capture = params.get('capture') === '1';
const scale = Number(params.get('scale')) || 1;
const canvas = document.getElementById('stage') as HTMLCanvasElement;
const hud = document.getElementById('hud')!;
if (capture) document.body.classList.add('capture');

const FONT_FILES: Array<[string, string, FontFaceDescriptors]> = [
  ['Newsreader', '/fonts/newsreader.woff2', { weight: '200 700', style: 'normal' }],
  ['Newsreader', '/fonts/newsreader-italic.woff2', { weight: '200 600', style: 'italic' }],
  ['Geist', '/fonts/geist.woff2', { weight: '300 700', style: 'normal' }],
];

async function loadFonts(missing: string[]) {
  await Promise.all(
    FONT_FILES.map(async ([family, url, desc]) => {
      try {
        const face = new FontFace(family, `url(${url})`, desc);
        document.fonts.add(await face.load());
      } catch {
        missing.push(url);
      }
    }),
  );
}

let film: Film | null = null;

const ready = (async () => {
  const assets = await loadAssets();
  await loadFonts(assets.missing);
  film = new Film(canvas, assets, scale, SCENES, slate);
  if (!capture) fit();
})();

function fit() {
  const k = Math.min(innerWidth / (WIDTH * scale), innerHeight / (HEIGHT * scale));
  canvas.style.transform = `scale(${k})`;
}

window.__film = {
  duration: DURATION,
  fps: FPS,
  ready,
  shots: SHOTS,
  voice: VOICE,
  seek: async (t: number) => {
    await ready;
    film!.render(t);
  },
  grab: (type, quality = 0.95) => canvas.toDataURL(`image/${type}`, quality),
  report: () => runChecks(film!),
};

/* --- the dev player --- */
if (!capture) {
  addEventListener('resize', fit);
  let t = Math.min(DURATION, Math.max(0, Number(params.get('t')) || 0));
  let playing = false;
  let last = 0;
  const show = () => {
    const s = shotAt(t);
    hud.textContent = `${t.toFixed(2)}s  ${s.id} ${s.seq} · ${s.title}   [space] play  [←/→] 1s  [ [ / ] ] frame`;
  };
  const tick = (now: number) => {
    if (playing) {
      t += Math.min(0.1, (now - last) / 1000);
      if (t >= DURATION) {
        t = DURATION;
        playing = false;
      }
    }
    last = now;
    film?.render(t);
    show();
    requestAnimationFrame(tick);
  };
  ready.then(() => requestAnimationFrame(tick));
  addEventListener('keydown', (e) => {
    if (e.key === ' ') playing = !playing;
    else if (e.key === 'ArrowRight') t = Math.min(DURATION, t + 1);
    else if (e.key === 'ArrowLeft') t = Math.max(0, t - 1);
    else if (e.key === ']') t = Math.min(DURATION, t + 1 / FPS);
    else if (e.key === '[') t = Math.max(0, t - 1 / FPS);
    else return;
    e.preventDefault();
  });
}
