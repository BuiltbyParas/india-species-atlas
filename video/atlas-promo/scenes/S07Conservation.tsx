/**
 * 07 · Conservation. The map re-forms; the lines reconnect; and the
 * programmes in the atlas switch on in the order they began, each lighting
 * the localities the site's Conservation layer places it at. The scene ends
 * on the atlas's three questions, which are its three map layers.
 */
import { AbsoluteFill } from 'remotion';
import { PROGRAMME_TIMELINE, shortProgrammeName } from '../data/atlas';
import { TYPE, COLOR, ink, withAlpha } from '../styles/tokens';
import { useTime, prog, clamp01 } from '../utils/anim';
import { Label, MaskLine } from '../components/type/Type';
import { CONSERVATION, SCENE_DUR, SCENE_START, yearAt } from '../timeline';

const X = 1130;

const QUESTIONS = ['Know where it lives.', 'Know what presses on it.', 'Know what protects it.'];

export function S07Conservation() {
  const t = useTime();
  const dur = SCENE_DUR.conservation;
  const T = SCENE_START.conservation + t;
  const year = yearAt(T);
  const listOut = prog(t, 7.0, 0.5, 'inExpo');
  const out = prog(t, dur - 0.6, 0.5, 'inExpo');
  const yearsIn = prog(t, CONSERVATION.yearsFrom - 0.3, 0.6);

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: X, top: 150 }}>
        <Label p={prog(t, 0.3, 0.7)} color={withAlpha(COLOR.protect, 0.9)} style={{ opacity: 1 - out }}>
          Conservation  ·  Programmes in the Atlas
        </Label>
      </div>

      {t < 7.6 && (
        <div style={{ position: 'absolute', left: X, top: 196, width: 680, opacity: 1 - listOut }}>
          <div style={{ ...TYPE.number, fontSize: 150, color: COLOR.ink, opacity: yearsIn, fontVariantNumeric: 'tabular-nums' }}>
            {year || PROGRAMME_TIMELINE[0]?.year}
          </div>
          <div style={{ marginTop: 26 }}>
            {PROGRAMME_TIMELINE.map((p) => {
              const on = year >= p.year;
              // Rows appear as the counter reaches their year.
              const tOn = CONSERVATION.yearsFrom + ((p.year - PROGRAMME_TIMELINE[0].year) / (PROGRAMME_TIMELINE[PROGRAMME_TIMELINE.length - 1].year - PROGRAMME_TIMELINE[0].year || 1)) * CONSERVATION.yearsDur;
              const pIn = prog(t, tOn, 0.6);
              return (
                <div key={p.id} style={{ display: 'flex', gap: 22, alignItems: 'baseline', minHeight: 36, paddingBottom: 6, opacity: on ? clamp01(0.25 + pIn) : 0.0, transform: `translateX(${(1 - pIn) * 14}px)` }}>
                  <span style={{ ...TYPE.micro, fontSize: 13, letterSpacing: '0.1em', color: withAlpha(COLOR.protect, 0.95), width: 48, fontVariantNumeric: 'tabular-nums' }}>{p.year}</span>
                  <span style={{ ...TYPE.body, fontSize: 20, lineHeight: 1.3, color: ink(0.88), maxWidth: 560 }}>{shortProgrammeName(p.name)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {t >= 7.0 && (
        <div style={{ position: 'absolute', left: X, top: 380, width: 680 }}>
          {QUESTIONS.map((q, i) => (
            <MaskLine key={q} p={prog(t, 7.25 + i * 0.42, 0.9)} out={out}>
              <div style={{ ...TYPE.section, fontSize: 66, color: i === 2 ? COLOR.protect : COLOR.ink, lineHeight: 1.18 }}>{q}</div>
            </MaskLine>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
}
