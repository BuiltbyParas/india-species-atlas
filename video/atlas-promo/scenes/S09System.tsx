/**
 * 09 · System view. Out of the interface and back over the whole map, with
 * every layer on at once — relief, rivers, every locality, every species'
 * line, every programme site. The site's own closing lines are set beside it.
 */
import { AbsoluteFill } from 'remotion';
import { STATS, PROGRAMME_SITES } from '../data/atlas';
import { CLOSING_LINES } from '../data/site';
import { TYPE, COLOR, ink, withAlpha } from '../styles/tokens';
import { useTime, prog } from '../utils/anim';
import { MaskLine, Label } from '../components/type/Type';
import { SCENE_DUR } from '../timeline';

export function S09System() {
  const t = useTime();
  const dur = SCENE_DUR.system;
  const out = prog(t, dur - 0.5, 0.5, 'inExpo');
  const legend: Array<[string, string]> = [
    [`${STATS.locations} localities`, COLOR.status.EN],
    [`${STATS.species} species lines`, ink(0.7)],
    [`${PROGRAMME_SITES.length} programme sites`, COLOR.protect],
  ];
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 120, top: 360, width: 470 }}>
        <MaskLine p={prog(t, 1.4, 1.0)} out={out}>
          <div style={{ ...TYPE.heading, fontSize: 50, color: COLOR.ink }}>{CLOSING_LINES[0]}</div>
        </MaskLine>
        <MaskLine p={prog(t, 2.6, 1.0)} out={out} style={{ marginTop: 22 }}>
          <div style={{ ...TYPE.heading, fontSize: 50, fontStyle: 'italic', color: withAlpha(COLOR.protect, 1) }}>{CLOSING_LINES[1]}</div>
        </MaskLine>
      </div>
      <div style={{ position: 'absolute', right: 120, top: 420, width: 300 }}>
        {legend.map(([text, color], i) => {
          const p = prog(t, 1.8 + i * 0.25, 0.8);
          return (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: i ? 20 : 0, opacity: p * (1 - out) }}>
              <span style={{ width: 9, height: 9, borderRadius: 99, background: color }} />
              <span style={{ ...TYPE.micro, fontSize: 13, color: ink(0.62) }}>{text}</span>
            </div>
          );
        })}
        <Label p={prog(t, 2.8, 0.8)} rule={0} style={{ marginTop: 34, opacity: 1 - out, fontSize: 12, color: ink(0.4) }}>
          One map, every layer
        </Label>
      </div>
    </AbsoluteFill>
  );
}
