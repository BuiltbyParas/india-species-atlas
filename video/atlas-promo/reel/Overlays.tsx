/**
 * Everything layered over the shots: slates for shots not built yet, the
 * captions, the character's placeholder slots, the safe-zone guides and the
 * audio (only what has actually been supplied in reel/audio/).
 */
import { AbsoluteFill, Html5Audio, getStaticFiles, staticFile } from 'remotion';
import { useTime, windowed, prog } from '../utils/anim';
import { COLOR, TYPE, ink, withAlpha } from '../styles/tokens';
import { SAFE, SHOTS, VOICE, characterWindow, type Shot } from './shots';

const STATUS_LABEL: Record<string, string> = {
  'awaiting-flow': 'Awaiting Flow footage',
  'existing-adapt': 'Existing Atlas, portrait layout to build',
  'test-standin': 'Visual test',
  approved: 'Approved',
};

/** A placeholder card that says exactly what the shot will be, so the timeline can be judged before it exists. */
export function Slate({ shot }: { shot: Shot }) {
  const t = useTime();
  const p = prog(t, 0, 0.35, 'outExpo');
  return (
    <AbsoluteFill style={{ background: COLOR.ground }}>
      <AbsoluteFill style={{ border: `1px solid ${COLOR.hairline}`, margin: 40 }} />
      <div style={{ position: 'absolute', left: SAFE.left, top: SAFE.top + 40, width: SAFE.right - SAFE.left, opacity: p }}>
        <div style={{ ...TYPE.micro, fontSize: 24, color: ink(0.55) }}>
          {shot.id} · {shot.in.toFixed(0).padStart(2, '0')}–{shot.out.toFixed(0).padStart(2, '0')} s · {shot.source}
        </div>
        <div style={{ ...TYPE.title, fontSize: 96, color: COLOR.ink, marginTop: 28 }}>{shot.section}</div>
        <div style={{ ...TYPE.body, fontSize: 30, color: ink(0.72), marginTop: 40, lineHeight: 1.42 }}>{shot.visual}</div>
        {shot.text.length > 0 && (
          <div style={{ ...TYPE.micro, fontSize: 22, color: COLOR.sageLight, marginTop: 40, lineHeight: 1.9 }}>
            {shot.text.map((x) => (
              <div key={x}>{x}</div>
            ))}
          </div>
        )}
        <div style={{ ...TYPE.micro, fontSize: 20, color: '#d9a441', marginTop: 48 }}>
          {STATUS_LABEL[shot.status] ?? shot.status}
          {shot.flowFile ? ` · ${shot.flowFile}` : ''}
        </div>
        <div style={{ ...TYPE.micro, fontSize: 18, color: ink(0.45), marginTop: 18, letterSpacing: '0.14em' }}>
          {shot.transitionIn} → {shot.transitionOut}
        </div>
      </div>
    </AbsoluteFill>
  );
}

/**
 * Burned-in captions on the voice script's planned times (most Reels are watched muted). The times are
 * replaced by the recording's measured times once it exists.
 */
export function Captions() {
  const t = useTime();
  const line = VOICE.find((v) => t >= v.in - 0.05 && t <= v.out + 0.25);
  if (!line) return null;
  const a = windowed(t, line.in - 0.05, line.out + 0.25, 0.12, 0.18, 'outExpo');
  return (
    <div style={{ position: 'absolute', left: SAFE.left, width: SAFE.right - SAFE.left, top: 1340, display: 'flex', justifyContent: 'center', opacity: a }}>
      <div
        style={{
          ...TYPE.body,
          fontWeight: 500,
          fontSize: 40,
          lineHeight: 1.25,
          color: ink(0.94),
          textAlign: 'center',
          textShadow: `0 1px 18px ${withAlpha(COLOR.ground, 0.9)}`,
        }}
      >
        {line.line}
      </div>
    </div>
  );
}

/** Where Rekha stands in each shot (frame px), until the rigged character replaces the box. */
const SLOTS: Record<string, { x: number; y: number; w: number; h: number; blur?: number }> = {
  S01: { x: 380, y: 720, w: 160, h: 300 },
  S03: { x: 700, y: 905, w: 64, h: 150 },
  S04: { x: -40, y: 860, w: 420, h: 1060, blur: 3 },
  S05: { x: 0, y: 1000, w: 210, h: 460 },
  S06: { x: 60, y: 1050, w: 300, h: 420 },
  S08: { x: 820, y: 700, w: 220, h: 360 },
  S09: { x: 520, y: 900, w: 320, h: 220 },
  S12: { x: 440, y: 760, w: 200, h: 360 },
  S15: { x: 180, y: 1120, w: 90, h: 200 },
  S17: { x: 800, y: 980, w: 260, h: 420 },
  S18: { x: 90, y: 1060, w: 260, h: 640 },
  S19: { x: 600, y: 1000, w: 200, h: 220 },
  S20: { x: 380, y: 1000, w: 320, h: 760 },
  S21: { x: 390, y: 1060, w: 300, h: 360 },
};

export function CharacterSlots() {
  const t = useTime();
  return (
    <>
      {SHOTS.map((s) => {
        const w = characterWindow(s);
        const slot = SLOTS[s.id];
        if (!w || !slot) return null;
        const a = windowed(t, w[0], w[1], 0.15, 0.15);
        if (a <= 0) return null;
        return (
          <div
            key={s.id}
            style={{
              position: 'absolute',
              left: slot.x,
              top: slot.y,
              width: slot.w,
              height: slot.h,
              opacity: a,
              border: `2px dashed ${withAlpha('#d9a441', 0.9)}`,
              borderRadius: slot.w / 2.2,
              background: withAlpha('#d9a441', 0.08),
              filter: slot.blur ? `blur(${slot.blur}px)` : undefined,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
          >
            <span style={{ ...TYPE.micro, fontSize: 15, color: '#d9a441', padding: 8, textAlign: 'center' }}>Rekha</span>
          </div>
        );
      })}
    </>
  );
}

/** The Instagram safe zone, drawn only with --guides. */
export function SafeZoneGuides() {
  const line = `1px solid ${withAlpha('#4fb3d9', 0.7)}`;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: SAFE.top, background: withAlpha('#4fb3d9', 0.12), borderBottom: line }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: SAFE.bottom, bottom: 0, background: withAlpha('#4fb3d9', 0.12), borderTop: line }} />
      <div style={{ position: 'absolute', left: SAFE.right, width: 1080 - SAFE.right, top: SAFE.top, height: SAFE.bottom - SAFE.top, background: withAlpha('#4fb3d9', 0.08), borderLeft: line }} />
      <div style={{ position: 'absolute', left: SAFE.left, top: SAFE.top, bottom: 1920 - SAFE.bottom, borderLeft: line }} />
    </AbsoluteFill>
  );
}

/** The recorded voice and the music, if they have been supplied (never synthesised). */
export function ReelAudio() {
  let files = new Set<string>();
  try {
    files = new Set(getStaticFiles().map((x) => x.name));
  } catch {
    /* Studio before the file list resolves */
  }
  const pick = (names: string[]) => names.find((n) => files.has(n));
  const voice = pick(['reel/audio/voice/character_voice.wav', 'reel/audio/voice/character_voice.aif', 'reel/audio/voice/character_voice.aiff']);
  const music = pick(['reel/audio/music/music.wav', 'reel/audio/music/music.mp3']);
  return (
    <>
      {music && <Html5Audio src={staticFile(music)} volume={0.5} />}
      {voice && <Html5Audio src={staticFile(voice)} volume={1} />}
    </>
  );
}
