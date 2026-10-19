/**
 * 04 · Life. Five species, one per landscape just crossed. Each arrives as a
 * photograph wiped on by a vertical line, tied by a hairline to its own
 * localities on the map, with its name, status and habitat from the dataset.
 * Photographs are the atlas's own credited Commons files; the credit stays on
 * screen with the picture.
 */
import { AbsoluteFill, Img, staticFile, useVideoConfig } from 'remotion';
import { FEATURED, featuredSpecies, regionOf, habitatLabel, largePhotoPath, SPECIES } from '../data/atlas';
import { TYPE, COLOR, ink, withAlpha, EASE } from '../styles/tokens';
import { useTime, prog, clamp01, windowed } from '../utils/anim';
import { MaskLine, Label, StatusChip, Chars } from '../components/type/Type';
import { LIFE, SCENE_START, SCENE_DUR, cameraAt } from '../timeline';
import { project } from '../data/geo';
import { toScreen } from '../components/map/camera';

const PHOTO = { x: 1000, y: 132, w: 800, h: 540 };
const TEXT_Y = PHOTO.y + PHOTO.h + 44;

function Photo({ index, reveal, push }: { index: number; reveal: number; push: number }) {
  const f = FEATURED[index];
  const s = featuredSpecies(index);
  const src = largePhotoPath(s.id) ? staticFile(largePhotoPath(s.id)!) : s.image.src!;
  const e = EASE.cinema(clamp01(reveal));
  const edge = PHOTO.w * e;
  return (
    <div style={{ position: 'absolute', left: PHOTO.x, top: PHOTO.y, width: PHOTO.w, height: PHOTO.h, clipPath: `inset(0 ${PHOTO.w - edge}px 0 0)` }}>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: f.focus,
          transform: `scale(${f.crop * (1.06 - 0.06 * push)})`,
          transformOrigin: f.focus,
        }}
      />
      {/* A soft floor so the credit reads on any picture */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,20,17,0) 70%, rgba(14,20,17,0.55) 100%)' }} />
      <div style={{ position: 'absolute', right: 16, bottom: 12, ...TYPE.micro, fontSize: 11, letterSpacing: '0.08em', textTransform: 'none', color: ink(0.75) }}>
        Photo: {s.image.credit} · {s.image.license}
      </div>
      {/* The wiping line */}
      {reveal < 1 && <div style={{ position: 'absolute', left: edge - 1, top: 0, width: 2, height: '100%', background: COLOR.ink }} />}
    </div>
  );
}

export function S04Life() {
  const t = useTime();
  const { width, height } = useVideoConfig();
  const T = SCENE_START.life + t;
  const dur = SCENE_DUR.life;
  const introOut = prog(t, LIFE.intro - 0.1, 0.4, 'inExpo');
  const sceneOut = prog(t, dur - 0.5, 0.5, 'inOutSine');
  const frameP = prog(t, 0.6, 0.8, 'cinema');

  // Which species is on screen, and how far into its beat.
  const beats = FEATURED.map((_, i) => {
    const b0 = LIFE.intro + i * LIFE.beat;
    return { i, local: t - b0 };
  });

  return (
    <AbsoluteFill style={{ opacity: 1 - sceneOut }}>
      {/* Intro: the hand-off from the landscape */}
      {t < LIFE.intro + 0.4 && (
        <div style={{ position: 'absolute', left: PHOTO.x, top: 430 }}>
          <Label p={prog(t, 0.1, 0.6)} style={{ opacity: 1 - introOut }}>
            {`Life  ·  ${FEATURED.length} of ${SPECIES.length} species in the Atlas`}
          </Label>
          <div style={{ ...TYPE.title, color: COLOR.ink, marginTop: 18, opacity: 1 - introOut, transform: `translateY(${-introOut * 30}px)` }}>
            <Chars text="Life, mapped." t={t} start={0.15} stagger={0.03} />
          </div>
        </div>
      )}

      {/* The photo frame's hairline, drawn once and kept */}
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
        <rect
          x={PHOTO.x - 12}
          y={PHOTO.y - 12}
          width={PHOTO.w + 24}
          height={PHOTO.h + 24}
          fill="none"
          stroke={ink(0.22)}
          strokeWidth={1}
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - frameP * prog(t, LIFE.intro - 0.4, 0.6)}
        />
      </svg>

      {beats.map(({ i, local }) => {
        if (local < -0.05 || local > LIFE.beat + 0.6) return null;
        const s = featuredSpecies(i);
        const f = FEATURED[i];
        const reveal = prog(local, 0, 0.75, 'linear');
        const push = prog(local, 0, LIFE.beat + 0.6, 'linear');
        const isLast = i === FEATURED.length - 1;
        const textOut = isLast ? 0 : prog(local, LIFE.beat - 0.3, 0.35, 'inExpo');
        const inP = (d: number) => prog(local, d, 0.8);
        // Hairline from the photo to the species' first locality on the map.
        const pt = s.distributionPoints[0];
        const [mx, my] = toScreen(...project(pt.lng, pt.lat), cameraAt(T), { width, height });
        const linkP = windowed(local, 0.35, LIFE.beat - 0.15, 0.6, 0.3, 'cinema');
        const lx = PHOTO.x - 12;
        const ly = PHOTO.y + PHOTO.h * 0.5;
        const hex = COLOR.status[s.status];
        return (
          <div key={s.id} style={{ position: 'absolute', inset: 0, zIndex: i }}>
            <Photo index={i} reveal={reveal} push={push} />
            <svg width={width} height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <path
                d={`M${lx} ${ly}L${lx - 60} ${ly}L${mx} ${my}`}
                fill="none"
                stroke={withAlpha(hex, 0.7)}
                strokeWidth={1}
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - linkP}
              />
            </svg>
            <div style={{ position: 'absolute', left: PHOTO.x, top: TEXT_Y, width: PHOTO.w, paddingTop: 2 }}>
              <MaskLine p={inP(0.22)} out={textOut}>
                <div style={{ ...TYPE.heading, fontSize: s.commonName.length > 22 ? 52 : 60, color: COLOR.ink, whiteSpace: 'nowrap' }}>{s.commonName}</div>
              </MaskLine>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <MaskLine p={inP(0.36)} out={textOut}>
                  <div style={{ ...TYPE.italic, fontSize: 28, color: ink(0.66) }}>{s.scientificName}</div>
                </MaskLine>
                <div style={{ opacity: 1 - textOut }}>
                  <StatusChip status={s.status} p={inP(0.55)} scale={1.5} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 56, marginTop: 30 }}>
                {[
                  ['Habitat', habitatLabel(f.habitat)],
                  ['Region', regionOf(f.region).name],
                  ['Status', `${s.statusFullName} · ${s.statusAssessedYear}`],
                ].map(([k, v], j) => {
                  const p = inP(0.6 + j * 0.1);
                  return (
                    <div key={k} style={{ opacity: clamp01(p * 1.4) * (1 - textOut), transform: `translateY(${(1 - p) * 10}px)` }}>
                      <div style={{ ...TYPE.micro, fontSize: 12, color: ink(0.42) }}>{k}</div>
                      <div style={{ ...TYPE.body, fontSize: 21, color: ink(0.86), marginTop: 8, whiteSpace: 'nowrap' }}>{v}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
