import * as THREE from 'three';
import { CREDITS, FEATURED, SITE_URL, SUBTITLE, TITLE } from '../timeline.mjs';
import type { Frame, Scene } from '../engine/film';
import { clamp01, easeInOutCubic, lerp, seg } from '../engine/ease';
import { placeholder } from '../engine/photo';
import { stateLines, terrainPlate, viewAt } from '../engine/layers';
import type { View } from '../engine/terrain';
import { INK, SANS, SERIF, drawRule, drawText } from '../engine/type';

/**
 * Where the film hands over to the India Species Atlas.
 *
 * The website appears as itself: screenshots of the live site taken by
 * scripts/video/capture-site.mjs, framed as plates with depth, never a screen
 * recording. Within chapters a single panel slides in beside the map; at the
 * end the camera passes through the site's pages in 3D, and the end card
 * gives the real address from the repository.
 */

type P = Record<string, any>;
const params = (f: Frame) => ((f.shot as { params?: P }).params ?? {}) as P;
/** The web's easing curve (--ease-cinema: cubic-bezier(0.7, 0, 0.2, 1)), approximated. */
const cinema = (x: number) => easeInOutCubic(x);

const REGION_VIEW: Record<string, View> = {
  'great-indian-bustard': { lng: 71.0, lat: 25.8, dist: 9, heading: 0, pitch: 70 },
  'bengal-tiger': { lng: 79.9, lat: 22.2, dist: 10, heading: 0, pitch: 72 },
  'ganges-river-dolphin': { lng: 85.0, lat: 25.6, dist: 12, heading: 0, pitch: 74 },
  'snow-leopard': { lng: 80.0, lat: 31.4, dist: 14, heading: 0, pitch: 76 },
  'indian-rhinoceros': { lng: 92.3, lat: 26.4, dist: 7, heading: 0, pitch: 72 },
};

/** A screenshot as a plate: rounded, lit from above, with a shadow. */
function plate(ctx: CanvasRenderingContext2D, img: HTMLImageElement | undefined, sx: number, sy: number, sw: number, sh: number, x: number, y: number, w: number, h: number, alpha: number) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = '#131a16';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.clip();
  if (img) ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  else placeholder(ctx, w, h, 'SITE SCREENSHOT MISSING — run npm run video:site');
  const sheen = ctx.createLinearGradient(x, y, x, y + h);
  sheen.addColorStop(0, 'rgba(232,225,207,0.06)');
  sheen.addColorStop(0.3, 'rgba(232,225,207,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(58,74,64,0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.stroke();
  ctx.restore();
}

/** The Atlas's species profile drawer, cropped from its screenshot (the drawer is the right 580 px). */
function profilePlate(f: Frame, id: string, x: number, y: number, scale: number, alpha: number, drift = 0) {
  const img = f.film.assets.site.get(`profile-${id}.png`);
  const sw = 580;
  const sh = 1080 - 40 - drift;
  plate(f.ctx, img, 1340, 40 + drift, sw, sh, x, y, sw * scale, sh * scale, alpha);
}

export const docAtlasPanel: Scene = (f) => {
  const { ctx, t, W, H } = f;
  const p = params(f);
  const t0 = f.shot.start;
  const d = f.shot.end - t0;
  const view = REGION_VIEW[p.species];
  const proj = terrainPlate(f, viewAt(t, [[t0, view], [f.shot.end, { ...view, dist: view.dist * 0.92 }]]), { exag: 14, shade: 4.5, outside: 0.14, map: 0.7, fog: 0.004, exposure: 0.7 });
  stateLines(f, proj, { color: 'rgba(232,225,207,0.22)', width: 1 });
  const s = f.film.assets.species.get(p.species)!;

  let enterAt = t0 + 0.3;
  if (p.actions) {
    // The record's community measures first, as a list, before the site.
    const acts = s.conservationActions.filter((a) => /community|insurance|corral|Livestock/i.test(a));
    acts.forEach((a, i) => drawText(ctx, { text: a, x: 60, y: 300 + i * 64, size: 28, family: SERIF, weight: 300, preset: 'slide', at: t0 + 0.4 + i * 1.3, dur: 0.8, until: t0 + 5.6, out: 0.5 }, t));
    drawText(ctx, { text: `${s.commonName} — conservation actions, as recorded`, x: 60, y: 230, size: 15, weight: 500, tracking: 0.24, upper: true, color: INK.canvasDim, preset: 'tracking', at: t0 + 0.2, dur: 0.8, until: t0 + 5.6, out: 0.5 }, t);
    enterAt = t0 + 5.9;
  }

  // Tiger: the interactive map first, then the profile.
  if (p.species === 'bengal-tiger') {
    const m = f.film.assets.site.get('atlas.png');
    const k = cinema(clamp01((t - t0 - 0.2) / 1.0));
    const out = cinema(clamp01((t - t0 - 3.6) / 0.8));
    plate(ctx, m, 700, 90, 1220, 700, lerp(W, 240, k) - out * 900, 200, 1220 * 0.9, 700 * 0.9, k * (1 - out));
    enterAt = t0 + 4.0;
  }

  const k = cinema(clamp01((t - enterAt) / 1.0));
  const scale = 0.84;
  const drift = 120 * seg(t, enterAt, f.shot.end);
  profilePlate(f, p.species, lerp(W + 40, W - 580 * scale - 120, k), 60 + (1 - k) * 40, scale, k, drift);

  // The invitation, left, in the Atlas's own words and type.
  const lead = enterAt + 0.4;
  drawText(ctx, { text: 'India Species Atlas', x: 120, y: H / 2 - 70, size: 15, weight: 500, tracking: 0.3, upper: true, color: INK.forest400, preset: 'tracking', at: lead, dur: 0.8 }, t);
  drawText(ctx, { text: p.verb, x: 120, y: H / 2, size: 54, family: SERIF, weight: 300, preset: 'mask', at: lead + 0.15, dur: 0.9 }, t);
  drawText(ctx, { text: 'Species profile · distribution · threats · conservation · sources', x: 122, y: H / 2 + 50, size: 16, weight: 400, tracking: 0.06, color: INK.canvasDim, preset: 'fade', at: lead + 0.6, dur: 0.8 }, t);
  drawRule(ctx, 122, H / 2 + 84, 60, seg(t, lead + 0.8, lead + 1.3), 'rgba(232,225,207,0.4)');
  drawText(ctx, { text: `${SITE_URL}/species`, x: 122, y: H / 2 + 118, size: 15, weight: 500, tracking: 0.1, color: INK.canvas, preset: 'fade', at: lead + 1.0, dur: 0.8 }, t);
  void d;
};

/* ---------- S038: through the Atlas ---------- */

let reveal: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; planes: THREE.Mesh[] } | null = null;

const PAGES = [
  { file: 'home.png', label: 'The documentary' },
  { file: 'atlas.png', label: 'The map' },
  { file: 'species.png', label: 'The species' },
  { file: 'profile-great-indian-bustard.png', label: 'Every profile' },
  { file: 'conservation.png', label: 'The conservation story' },
];
/** Pages stand in a row, a little staggered in depth, each turned slightly toward the lens. */
const SPACING = 3.9;

function buildReveal(f: Frame) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0e1411, 4, 11);
  const planes = PAGES.map((pg, i) => {
    const img = f.film.assets.site.get(pg.file);
    const tex = img ? new THREE.Texture(img) : null;
    if (tex) {
      tex.needsUpdate = true;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
    }
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: tex ? 0xffffff : 0x331111, transparent: true, fog: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8), mat);
    mesh.position.set(i * SPACING, 0, i % 2 ? -0.5 : 0);
    mesh.rotation.y = -0.14;
    scene.add(mesh);
    return mesh;
  });
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.05, 50);
  return { scene, camera, planes };
}

export const docAtlasReveal: Scene = (f) => {
  const { ctx, t, W, H } = f;
  const t0 = f.shot.start;
  const d = f.shot.end - t0;
  reveal ??= buildReveal(f);
  // The camera moves page to page and settles on each: a stepped dolly.
  const n = PAGES.length;
  const x = (seg(t, t0, t0 + d) * (n - 0.35)) ;
  const i = Math.min(n - 1, Math.floor(x));
  const frac = x - i;
  const eased = i + easeInOutCubic(clamp01((frac - 0.45) / 0.55));
  const camX = Math.min(n - 1, eased) * SPACING;
  const push = 0.25 * Math.sin(Math.PI * clamp01(frac));
  reveal.camera.position.set(camX - 0.35, 0.08, 3.4 - push);
  reveal.camera.lookAt(camX, 0, -0.2);
  reveal.planes.forEach((m, j) => {
    (m.material as THREE.MeshBasicMaterial).opacity = clamp01((t - t0 - j * 0.12) / 0.5);
  });
  ctx.fillStyle = '#0e1411';
  ctx.fillRect(0, 0, W, H);
  const c = f.film.terrain.renderScene(reveal.scene, reveal.camera);
  ctx.drawImage(c, 0, 0, W, H);
  const cur = Math.round(Math.min(n - 1, eased));
  const la = clamp01(1 - Math.abs(eased - cur) * 2.2);
  ctx.save();
  ctx.globalAlpha = la;
  ctx.font = `500 15px ${SANS}`;
  ctx.letterSpacing = '4px';
  ctx.fillStyle = INK.canvas;
  ctx.textAlign = 'center';
  ctx.fillText(PAGES[cur].label.toUpperCase(), W / 2, H - 96);
  ctx.globalAlpha = la * 0.7;
  ctx.font = `400 14px ${SANS}`;
  ctx.letterSpacing = '1px';
  ctx.fillText(`India Species Atlas · ${SITE_URL}`, W / 2, H - 66);
  ctx.restore();
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
};

/* ---------- S039: the invitation ---------- */

export const docEndcard: Scene = (f) => {
  const { ctx, t, W, H } = f;
  const t0 = f.shot.start;
  const end = f.shot.end;
  ctx.fillStyle = '#0e1411';
  ctx.fillRect(0, 0, W, H);
  // The site's own hero, very dim, behind the type: the same world.
  // The Atlas's own map, very dim, behind the type: the same world.
  const map = f.film.assets.site.get('atlas.png');
  if (map) {
    ctx.save();
    ctx.globalAlpha = 0.14 * clamp01((t - t0) / 1.2);
    ctx.filter = 'blur(3px)';
    ctx.drawImage(map, 800, 100, 1120, 630, 0, 0, W, H);
    ctx.restore();
  }
  const x = W / 2;
  drawText(ctx, { text: 'India Species Atlas', x, y: 420, size: 124, family: SERIF, weight: 300, tracking: -0.015, align: 'center', preset: 'chars', at: t0 + 0.2, dur: 1.3 }, t);
  const lines = ['Explore the species.', 'Explore the maps.', 'Explore the conservation story.'];
  lines.forEach((l, i) => drawText(ctx, { text: l, x, y: 520 + i * 48, size: 32, family: SERIF, weight: 300, italic: true, align: 'center', color: INK.canvasDim, preset: 'slide', at: t0 + 2.4 + i * 0.5, dur: 0.8 }, t));
  drawRule(ctx, x - 40, 690, 80, seg(t, t0 + 4.4, t0 + 5.0), 'rgba(232,225,207,0.5)');
  drawText(ctx, { text: 'Explore the full Atlas', x, y: 750, size: 22, weight: 500, tracking: 0.28, upper: true, align: 'center', preset: 'tracking', at: t0 + 4.8, dur: 0.9 }, t);
  drawText(ctx, { text: SITE_URL, x, y: 796, size: 22, weight: 400, tracking: 0.06, align: 'center', color: INK.forest400, preset: 'fade', at: t0 + 5.2, dur: 0.9 }, t);
  drawText(ctx, { text: `${TITLE} · ${SUBTITLE}`, x, y: H - 90, size: 14, weight: 500, tracking: 0.24, upper: true, align: 'center', color: INK.canvasFaint, preset: 'fade', at: t0 + 6.4, dur: 1 }, t);
  const out = easeInOutCubic(clamp01((t - (end - 0.9)) / 0.9));
  if (out > 0) {
    ctx.fillStyle = `rgba(0,0,0,${out})`;
    ctx.fillRect(0, 0, W, H);
  }
};

/* ---------- S040: credits ---------- */

function block(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, label: string, lines: string[]) {
  ctx.font = `500 12px ${SANS}`;
  ctx.letterSpacing = '2.4px';
  ctx.fillStyle = INK.canvasFaint;
  ctx.fillText(label.toUpperCase(), x, y);
  ctx.font = `400 15px ${SANS}`;
  ctx.letterSpacing = '0.2px';
  ctx.fillStyle = INK.canvasDim;
  let yy = y + 28;
  for (const line of lines) {
    let cur = '';
    for (const w0 of line.split(' ')) {
      const next = cur ? `${cur} ${w0}` : w0;
      if (ctx.measureText(next).width > w && cur) {
        ctx.fillText(cur, x, yy);
        yy += 22;
        cur = w0;
      } else cur = next;
    }
    if (cur) {
      ctx.fillText(cur, x, yy);
      yy += 22;
    }
    yy += 4;
  }
  return yy;
}

export const docCredits: Scene = (f) => {
  const { ctx, t, W, H } = f;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const t0 = f.shot.start;
  const a = easeInOutCubic(clamp01((t - t0 - 0.2) / 0.6)) * (1 - easeInOutCubic(clamp01((t - (f.shot.end - 0.9)) / 0.8)));
  if (a <= 0) return;
  const c = CREDITS as P;
  const featured = FEATURED.map((id: string) => f.film.assets.species.get(id)).filter(Boolean);
  const publishers = [...new Set(featured.flatMap((s) => s!.sources.map((src) => src.publisher)))];
  const progPublishers = [...new Set(f.film.assets.programmes.filter((p) => p.speciesIds.some((id) => FEATURED.includes(id))).flatMap((p) => p.sources.map((s) => s.publisher)))];
  const photos = FEATURED.map((id: string) => {
    const m = f.film.assets.photoMeta.get(id);
    const s = f.film.assets.species.get(id);
    return m && s ? `${s.commonName} — ${m.artist}, ${m.licence}` : `${id} — credit missing`;
  });
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `300 44px ${SERIF}`;
  ctx.fillStyle = INK.canvas;
  ctx.fillText(TITLE, 120, 150);
  ctx.font = `400 16px ${SANS}`;
  ctx.letterSpacing = '0.3px';
  ctx.fillStyle = INK.canvasDim;
  ctx.fillText(`${SUBTITLE} · a film for the India Species Atlas · ${SITE_URL}`, 120, 188);
  const col = 520;
  const x1 = 120;
  const x2 = x1 + col + 90;
  const x3 = x2 + col + 90;
  let y = block(ctx, x1, 270, col, 'Research and data', [
    'Every figure, category, place and programme in the narration is taken from the India Species Atlas dataset and checked against it automatically before each render.',
    `Sources the dataset cites for these species and programmes: ${[...new Set([...publishers, ...progPublishers])].join(' · ')}.`,
  ]);
  block(ctx, x1, y + 22, col, 'Geography', c.geography);
  y = block(ctx, x2, 270, col, 'Photographs (Wikimedia Commons)', [...photos, 'Cropped and colour-graded for the film.']);
  y = block(ctx, x2, y + 22, col, 'The website', [c.site]);
  block(ctx, x2, y + 22, col, 'Illustration and disclosure', c.illustration);
  y = block(ctx, x3, 270, col - 40, 'Narration', [c.voice]);
  y = block(ctx, x3, y + 22, col - 40, 'Music and sound', [c.music]);
  block(ctx, x3, y + 22, col - 40, 'Made with', [c.software]);
  ctx.restore();
};
