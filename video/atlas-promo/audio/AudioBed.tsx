/**
 * Places whatever audio exists in video/public/promo/audio/ on the cue sheet.
 * Missing files are simply skipped, so the film renders silent until audio is
 * supplied — it never fails for want of a sound.
 */
import { Html5Audio, Sequence, getStaticFiles, interpolate, staticFile } from 'remotion';
import { CUES, MUSIC_FADE, type CueKind } from './cues';
import { FPS } from '../timeline';

function present(): Set<string> {
  try {
    return new Set(getStaticFiles().map((f) => f.name));
  } catch {
    return new Set();
  }
}

export function AudioBed() {
  const files = present();
  const music = ['promo/audio/music.wav', 'promo/audio/music.mp3'].find((f) => files.has(f));
  const sfx = (kind: CueKind) => (files.has(`promo/audio/sfx/${kind}.wav`) ? `promo/audio/sfx/${kind}.wav` : null);
  const endF = Math.round(MUSIC_FADE.end * FPS);
  return (
    <>
      {music && (
        <Html5Audio
          src={staticFile(music)}
          volume={(f) =>
            interpolate(f, [0, MUSIC_FADE.in * FPS, endF - MUSIC_FADE.out * FPS, endF], [0, 0.9, 0.9, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      )}
      {CUES.map((c, i) => {
        const file = sfx(c.kind);
        if (!file) return null;
        return (
          <Sequence key={i} from={Math.round(c.t * FPS)} name={`sfx ${c.kind}: ${c.note}`} layout="none">
            <Html5Audio src={staticFile(file)} volume={c.gain} />
          </Sequence>
        );
      })}
    </>
  );
}
